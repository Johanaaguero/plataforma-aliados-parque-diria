import { AppDataSource } from '../../../data-source';
import {
  EventosCapacitaciones,
  TipoActividad,
  Temporada,
  EstadoEventoCapacitacion,
} from '../../../models/EventosCapacitaciones';
import { Reporte, TipoReporte } from '../../../models/Reporte';

function eliminarDuplicadosPorId<T extends { id: unknown }>(
  registros: T[],
): T[] {
  const ids = new Set<string>();

  return registros.filter((registro) => {
    const id = String(registro.id);

    if (ids.has(id)) {
      return false;
    }

    ids.add(id);
    return true;
  });
}

interface FiltrosEventos {
  fechaInicio?: string;
  fechaFin?: string;
  temporada?: Temporada;
  tipoActividad?: TipoActividad;
}

export class ReportesEventosService {
  private eventosRepository =
    AppDataSource.getRepository(EventosCapacitaciones);

  private reporteRepository =
    AppDataSource.getRepository(Reporte);

  async obtenerEstadisticas(
    filtros: FiltrosEventos,
    usuarioGeneroId: number,
  ) {
    let fechaInicio: Date;
    let fechaFin: Date;

    /*
     * Si no se reciben fechas, se consulta todo el período.
     */
    if (filtros.fechaInicio) {
      fechaInicio = new Date(
        `${filtros.fechaInicio}T00:00:00`,
      );
    } else {
      fechaInicio = new Date('2000-01-01T00:00:00');
    }

    if (filtros.fechaFin) {
      fechaFin = new Date(
        `${filtros.fechaFin}T23:59:59`,
      );
    } else {
      // Sin un rango explícito, el reporte debe incluir también las actividades
      // programadas a futuro, no solo las registradas hasta el día de hoy.
      fechaFin = new Date('2100-12-31T23:59:59');
    }

    /*
     * Consulta base.
     */
    const query =
      this.eventosRepository
        .createQueryBuilder('evento')
        .where(
          'evento.fecha BETWEEN :fechaInicio AND :fechaFin',
          {
            fechaInicio,
            fechaFin,
          },
        );

    /*
     * Filtro por temporada.
     */
    if (filtros.temporada) {
      query.andWhere(
        'evento.temporada = :temporada',
        {
          temporada: filtros.temporada,
        },
      );
    }

    /*
     * Filtro por tipo de actividad.
     */
    if (filtros.tipoActividad) {
      query.andWhere(
        'evento.tipo_actividad = :tipoActividad',
        {
          tipoActividad: filtros.tipoActividad,
        },
      );
    }

    const eventos = eliminarDuplicadosPorId(
      await query
        .select([
          'evento.id AS id',
          'evento.nombre AS nombre',
          'evento.fecha AS fecha',
          'evento.hora AS hora',
          'evento.lugar AS lugar',
          'evento.tipo_actividad AS tipoActividad',
          'evento.cupo_maximo AS cupoMaximo',
          'evento.cupos_disponibles AS cuposDisponibles',
          'evento.cupo_minimo AS cupoMinimo',
          'evento.edad_minima AS edadMinima',
          'evento.edad_maxima AS edadMaxima',
          'evento.estado AS estado',
          'evento.temporada AS temporada',
        ])
        .orderBy('evento.fecha', 'DESC')
        .getRawMany(),
    );

    /*
     * TOTAL DE ACTIVIDADES
     */
    const totalActividades = eventos.length;

    /*
     * ACTIVIDADES POR TIPO
     */
    const actividadesPorTipo = {
      evento: 0,
      capacitacion: 0,
    };

    for (const actividad of eventos) {
      if (
        actividad.tipoActividad ===
        TipoActividad.EVENTO
      ) {
        actividadesPorTipo.evento++;
      }

      if (
        actividad.tipoActividad ===
        TipoActividad.CAPACITACION
      ) {
        actividadesPorTipo.capacitacion++;
      }
    }

    /*
     * ACTIVIDADES POR ESTADO
     */
    const actividadesPorEstado = {
      borrador: 0,
      publicado: 0,
      no_publicado: 0,
      desactivado: 0,
    };

    for (const actividad of eventos) {
      const estado = actividad.estado;

      if (
        Object.prototype.hasOwnProperty.call(
          actividadesPorEstado,
          estado,
        )
      ) {
        actividadesPorEstado[
          estado as keyof typeof actividadesPorEstado
        ]++;
      }
    }

    /*
     * ACTIVIDADES POR TEMPORADA
     */
    const actividadesPorTemporada = {
      seca: 0,
      lluviosa: 0,
    };

    for (const actividad of eventos) {
      if (
        actividad.temporada ===
        Temporada.SECA
      ) {
        actividadesPorTemporada.seca++;
      }

      if (
        actividad.temporada ===
        Temporada.LLUVIOSA
      ) {
        actividadesPorTemporada.lluviosa++;
      }
    }

    /*
     * ACTIVIDADES POR MES
     *
     * La fecha viene desde MySQL como Date.
     * Ejemplo:
     * 2026-09-20T00:00:00.000Z
     *
     * Se utiliza UTC para evitar que la zona horaria
     * cambie el día o el mes.
     */
    const actividadesPorMesMap = new Map<
      string,
      number
    >();

    for (const actividad of eventos) {
      if (!actividad.fecha) {
        continue;
      }

      let fecha: Date;

      if (actividad.fecha instanceof Date) {
        fecha = actividad.fecha;
      } else {
        fecha = new Date(
          String(actividad.fecha),
        );
      }

      if (isNaN(fecha.getTime())) {
        continue;
      }

      const año = fecha.getUTCFullYear();
      const mes = fecha.getUTCMonth() + 1;

      const clave = `${año}-${String(
        mes,
      ).padStart(2, '0')}`;

      actividadesPorMesMap.set(
        clave,
        (actividadesPorMesMap.get(clave) ?? 0) + 1,
      );
    }

    const actividadesPorMes = Array.from(
      actividadesPorMesMap.entries(),
    )
      .sort(([a], [b]) =>
        a.localeCompare(b),
      )
      .map(([mes, cantidad]) => ({
        mes,
        cantidad,
      }));

    /*
     * MES CON MÁS ACTIVIDADES
     */
    let mesConMasActividades: {
      mes: string;
      cantidad: number;
    } | null = null;

    for (const item of actividadesPorMes) {
      if (
        !mesConMasActividades ||
        item.cantidad >
          mesConMasActividades.cantidad
      ) {
        mesConMasActividades = item;
      }
    }

    /*
     * DETALLE DE ACTIVIDADES
     */
    const detalleActividades = eventos.map(
      (actividad) => ({
        id: Number(actividad.id),
        nombre:
          actividad.nombre ??
          'Sin nombre',
        fecha: actividad.fecha ?? null,
        hora: actividad.hora ?? null,
        lugar: actividad.lugar ?? null,
        tipoActividad:
          actividad.tipoActividad ?? null,
        cupoMaximo:
          actividad.cupoMaximo !== null &&
          actividad.cupoMaximo !== undefined
            ? Number(
                actividad.cupoMaximo,
              )
            : null,
        cuposDisponibles:
          actividad.cuposDisponibles !==
            null &&
          actividad.cuposDisponibles !==
            undefined
            ? Number(
                actividad.cuposDisponibles,
              )
            : null,
        cupoMinimo:
          actividad.cupoMinimo !== null &&
          actividad.cupoMinimo !== undefined
            ? Number(
                actividad.cupoMinimo,
              )
            : null,
        edadMinima:
          actividad.edadMinima !== null &&
          actividad.edadMinima !== undefined
            ? Number(
                actividad.edadMinima,
              )
            : null,
        edadMaxima:
          actividad.edadMaxima !== null &&
          actividad.edadMaxima !== undefined
            ? Number(
                actividad.edadMaxima,
              )
            : null,
        estado: actividad.estado ?? null,
        temporada:
          actividad.temporada ?? null,
      }),
    );

    /*
     * REGISTRAR CONSULTA DEL REPORTE
     */
    const ultimoReporte =
      await this.reporteRepository.find({
        order: {
          id: 'DESC',
        },
        take: 1,
      });

    const siguienteNumero =
      (ultimoReporte[0]?.id ?? 0) + 1;

    const nuevoReporte =
      this.reporteRepository.create({
        numeroReporte: `REP-${String(
          siguienteNumero,
        ).padStart(6, '0')}`,
        tipoReporte: TipoReporte.EVENTOS,
        usuarioGeneroId,
      });

    await this.reporteRepository.save(
      nuevoReporte,
    );

    return {
      informacionGeneral: {
        nombre:
          'Reporte de eventos y capacitaciones',
        tipo: TipoReporte.EVENTOS,
        periodo: {
          fechaInicio:
            filtros.fechaInicio ?? null,
          fechaFin:
            filtros.fechaFin ?? null,
        },
        filtros: {
          temporada:
            filtros.temporada ?? null,
          tipoActividad:
            filtros.tipoActividad ?? null,
        },
        fechaGeneracion:
          nuevoReporte.fechaGeneracion,
        numeroReporte:
          nuevoReporte.numeroReporte,
      },

      reporte: {
        id: nuevoReporte.id,
        numeroReporte:
          nuevoReporte.numeroReporte,
        fechaGeneracion:
          nuevoReporte.fechaGeneracion,
      },

      periodo: {
        fechaInicio:
          filtros.fechaInicio ?? null,
        fechaFin:
          filtros.fechaFin ?? null,
      },

      filtros: {
        temporada:
          filtros.temporada ?? null,
        tipoActividad:
          filtros.tipoActividad ?? null,
      },

      totalActividades,

      actividadesPorTipo,

      actividadesPorEstado,

      actividadesPorTemporada,

      actividadesPorMes,

      mesConMasActividades,

      detalleActividades,
    };
  }
}
