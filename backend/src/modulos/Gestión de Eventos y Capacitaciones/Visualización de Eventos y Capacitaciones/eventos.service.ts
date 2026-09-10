import { AppDataSource } from '../../../data-source';
import {
  EventosCapacitaciones,
  EstadoEventoCapacitacion,
  Temporada,
  TipoActividad,
} from '../../../models/EventosCapacitaciones';

export const LIMITE_EVENTOS = 9;

export interface FiltrosEventos {
  buscar?: string;
  temporada?: Temporada;
  tipoActividad?: TipoActividad;
  pagina?: number;
}

export type EventoPublico = ReturnType<EventosCapacitaciones['toPublic']> & {
  cuposDisponibles: number | null;
};

const serializarEvento = (evento: EventosCapacitaciones): EventoPublico => ({
  ...evento.toPublic(),
  // El modelo actual solo registra el cupo máximo y no tiene inscripciones.
  // Se utiliza ese cupo registrado; null significa que no se ha especificado.
  cuposDisponibles: evento.cupoMaximo,
});

export class EventosService {
  private repo = AppDataSource.getRepository(EventosCapacitaciones);

  async listar(filtros: FiltrosEventos = {}) {
    const pagina = filtros.pagina ?? 1;
    const consulta = this.repo
      .createQueryBuilder('evento')
      .where('evento.estado = :estado', {
        estado: EstadoEventoCapacitacion.PUBLICADO,
      });

    const buscar = filtros.buscar?.trim();

    if (buscar) {
      // LOCATE busca texto literal: % y _ no se interpretan como comodines.
      consulta.andWhere('LOCATE(:buscar, LOWER(evento.nombre)) > 0', {
        buscar: buscar.toLowerCase(),
      });
    }

    if (filtros.temporada) {
      consulta.andWhere('evento.temporada = :temporada', {
        temporada: filtros.temporada,
      });
    }

    // Los totales de las pestañas conservan los filtros de nombre/temporada,
    // pero no el tipo seleccionado ni la página actual.
    const consultaConteos = consulta
      .clone()
      .select('evento.tipoActividad', 'tipoActividad')
      .addSelect('COUNT(*)', 'total')
      .groupBy('evento.tipoActividad');

    if (filtros.tipoActividad) {
      consulta.andWhere('evento.tipoActividad = :tipoActividad', {
        tipoActividad: filtros.tipoActividad,
      });
    }

    const [[registros, total], conteosPorTipo] = await Promise.all([
      consulta
        .orderBy('evento.fecha', 'ASC')
        .addOrderBy('evento.hora', 'ASC')
        .addOrderBy('evento.id', 'ASC')
        .skip((pagina - 1) * LIMITE_EVENTOS)
        .take(LIMITE_EVENTOS)
        .getManyAndCount(),
      consultaConteos.getRawMany<{
        tipoActividad: TipoActividad;
        total: string | number;
      }>(),
    ]);

    const conteos = { todos: 0, eventos: 0, capacitaciones: 0 };

    for (const conteo of conteosPorTipo) {
      const cantidad = Number(conteo.total);
      conteos.todos += cantidad;

      if (conteo.tipoActividad === TipoActividad.EVENTO) {
        conteos.eventos = cantidad;
      } else if (conteo.tipoActividad === TipoActividad.CAPACITACION) {
        conteos.capacitaciones = cantidad;
      }
    }

    return {
      data: registros.map(serializarEvento),
      paginacion: {
        pagina,
        limite: LIMITE_EVENTOS,
        total,
        totalPaginas: Math.ceil(total / LIMITE_EVENTOS),
      },
      conteos,
    };
  }

  async obtenerDetalle(id: number): Promise<EventoPublico> {
    const evento = await this.repo.findOne({
      where: {
        id,
        estado: EstadoEventoCapacitacion.PUBLICADO,
      },
    });

    if (!evento) {
      const error = new Error('Evento o capacitación no encontrado.');
      error.name = 'NotFoundError';
      throw error;
    }

    return serializarEvento(evento);
  }
}
