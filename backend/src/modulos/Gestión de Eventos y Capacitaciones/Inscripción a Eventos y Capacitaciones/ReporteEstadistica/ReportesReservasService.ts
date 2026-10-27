import { Between, DataSource } from 'typeorm';
import { AppDataSource } from '../../../../data-source';

import { Reserva } from '../../../../models/Reserva';
import { Participantes } from '../../../../models/Participantes';
import {
  TipoActividad,
  Temporada,
} from '../../../../models/EventosCapacitaciones';

import { Reporte, TipoReporte } from '../../../../models/Reporte';

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

interface FiltrosReservas {
  fechaInicio?: string;
  fechaFin?: string;
  temporada?: Temporada;
  tipoActividad?: TipoActividad;
}

interface RegistroInscripcionReporte {
  id: number | string;
  usuarioId: number | string;
  estado: string;
  createdAt: Date | string;
  eventoId: number | string | null;
  eventoNombre: string | null;
  tipoActividad: TipoActividad | null;
  temporada: Temporada | null;
  fechaEvento: Date | string | null;
}

export class ReportesReservasService {
  private reservaRepository =
    AppDataSource.getRepository(Reserva);

  private reporteRepository =
    AppDataSource.getRepository(Reporte);

  async obtenerEstadisticas(
    filtros: FiltrosReservas,
    usuarioGeneroId: number,
  ) {
    const hoy = new Date();

    let fechaInicio: Date;
    let fechaFin: Date;

    /*
     * Si no se reciben fechas, se consulta todo el período.
     */
    if (filtros.fechaInicio) {
      fechaInicio = new Date(`${filtros.fechaInicio}T00:00:00`);
    } else {
      fechaInicio = new Date('2000-01-01T00:00:00');
    }

    if (filtros.fechaFin) {
      fechaFin = new Date(`${filtros.fechaFin}T23:59:59`);
    } else {
      fechaFin = hoy;
    }

    /*
     * Consulta base.
     *
     * La relación se hace directamente con
     * evento_capacitacion_id para no depender
     * del nombre de la relación TypeORM.
     */
    const query = this.reservaRepository
      .createQueryBuilder('reserva')
      .leftJoin(
        'eventos_capacitaciones',
        'evento',
        'evento.id = reserva.evento_capacitacion_id',
      )
      .where(
        'reserva.created_at BETWEEN :fechaInicio AND :fechaFin',
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

    /*
     * Obtenemos todas las reservas que cumplen
     * los filtros.
     */
    const reservas = eliminarDuplicadosPorId(
      await query
        .select([
          'reserva.id AS id',
          'reserva.usuario_id AS usuarioId',
          'reserva.estado AS estado',
          'reserva.created_at AS createdAt',
          'evento.id AS eventoId',
          'evento.nombre AS eventoNombre',
          'evento.tipo_actividad AS tipoActividad',
          'evento.temporada AS temporada',
          'evento.fecha AS fechaEvento',
        ])
        .orderBy('reserva.created_at', 'DESC')
        .getRawMany(),
    ) as RegistroInscripcionReporte[];

    const queryParticipantes = AppDataSource
      .getRepository(Participantes)
      .createQueryBuilder('participante')
      .leftJoin(
        'eventos_capacitaciones',
        'evento',
        'evento.id = participante.evento_capacitacion_id',
      )
      .where(
        'participante.created_at BETWEEN :fechaInicio AND :fechaFin',
        { fechaInicio, fechaFin },
      );

    if (filtros.temporada) {
      queryParticipantes.andWhere('evento.temporada = :temporada', {
        temporada: filtros.temporada,
      });
    }

    if (filtros.tipoActividad) {
      queryParticipantes.andWhere('evento.tipo_actividad = :tipoActividad', {
        tipoActividad: filtros.tipoActividad,
      });
    }

    const participantes = await queryParticipantes
      .select([
        'participante.id AS id',
        'participante.usuario_id AS usuarioId',
        "CASE WHEN participante.estado = 'confirmada' THEN 'aprobada' ELSE participante.estado END AS estado",
        'participante.created_at AS createdAt',
        'evento.id AS eventoId',
        'evento.nombre AS eventoNombre',
        'evento.tipo_actividad AS tipoActividad',
        'evento.temporada AS temporada',
        'evento.fecha AS fechaEvento',
      ])
      .orderBy('participante.created_at', 'DESC')
      .getRawMany<RegistroInscripcionReporte>();

    // Una reserva aprobada genera un participante para la misma actividad.
    // Conservamos la reserva como registro canónico para no duplicar la inscripción.
    const porUsuarioYActividad = new Map<string, RegistroInscripcionReporte>();
    for (const reserva of reservas) {
      porUsuarioYActividad.set(`${reserva.usuarioId}-${reserva.eventoId}`, reserva);
    }
    for (const participante of participantes) {
      const clave = `${participante.usuarioId}-${participante.eventoId}`;
      if (!porUsuarioYActividad.has(clave)) {
        porUsuarioYActividad.set(clave, participante);
      }
    }
    const inscripciones = Array.from(porUsuarioYActividad.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

    /*
     * TOTAL DE RESERVAS
     */
    const totalReservas = inscripciones.length;

    /*
     * RESERVAS POR ESTADO
     */
    const reservasPorEstado = {
      pendiente: 0,
      aprobada: 0,
      rechazada: 0,
      cancelada: 0,
    };

    for (const reserva of inscripciones) {
      const estado = reserva.estado;

      if (
        Object.prototype.hasOwnProperty.call(
          reservasPorEstado,
          estado,
        )
      ) {
        reservasPorEstado[
          estado as keyof typeof reservasPorEstado
        ]++;
      }
    }

    /*
     * RESERVAS POR MES
     */
    const reservasPorMesMap = new Map<
      string,
      number
    >();

    for (const reserva of inscripciones) {
      const fecha = new Date(reserva.createdAt);

      const año = fecha.getFullYear();
      const mes = fecha.getMonth() + 1;

      const clave = `${año}-${String(mes).padStart(
        2,
        '0',
      )}`;

      reservasPorMesMap.set(
        clave,
        (reservasPorMesMap.get(clave) ?? 0) + 1,
      );
    }

    const reservasPorMes = Array.from(
      reservasPorMesMap.entries(),
    )
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([mes, cantidad]) => ({
        mes,
        cantidad,
      }));

    /*
     * MES CON MÁS RESERVAS
     */
    let mesConMasReservas: {
      mes: string;
      cantidad: number;
    } | null = null;

    for (const item of reservasPorMes) {
      if (
        !mesConMasReservas ||
        item.cantidad >
          mesConMasReservas.cantidad
      ) {
        mesConMasReservas = item;
      }
    }

    /*
     * RESERVAS POR TIPO DE ACTIVIDAD
     */
    const reservasPorTipo = {
      evento: 0,
      capacitacion: 0,
    };

    for (const reserva of inscripciones) {
      if (
        reserva.tipoActividad ===
        TipoActividad.EVENTO
      ) {
        reservasPorTipo.evento++;
      }

      if (
        reserva.tipoActividad ===
        TipoActividad.CAPACITACION
      ) {
        reservasPorTipo.capacitacion++;
      }
    }

    /*
     * RESERVAS POR TEMPORADA
     */
    const reservasPorTemporada = {
      seca: 0,
      lluviosa: 0,
    };

    for (const reserva of inscripciones) {
      if (
        reserva.temporada === Temporada.SECA
      ) {
        reservasPorTemporada.seca++;
      }

      if (
        reserva.temporada ===
        Temporada.LLUVIOSA
      ) {
        reservasPorTemporada.lluviosa++;
      }
    }

    /*
     * DETALLE DE RESERVAS
     */
    const detalleReservas = inscripciones.map(
      (reserva) => ({
        id: Number(reserva.id),
        estado: reserva.estado,
        fechaReserva: reserva.createdAt,
        eventoId: reserva.eventoId
          ? Number(reserva.eventoId)
          : null,
        eventoNombre:
          reserva.eventoNombre ?? 'Sin actividad',
        tipoActividad:
          reserva.tipoActividad ?? null,
        temporada: reserva.temporada ?? null,
        fechaEvento: reserva.fechaEvento ?? null,
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

    const nuevoReporte = this.reporteRepository.create({
      numeroReporte: `REP-${String(
        siguienteNumero,
      ).padStart(6, '0')}`,
      tipoReporte: TipoReporte.RESERVAS,
      usuarioGenero: {
        id: usuarioGeneroId,
      } as import('../../../../models/Usuario').Usuario,
    });

    await this.reporteRepository.save(nuevoReporte);


    return {
      informacionGeneral: {
        nombre: 'Reporte de reservas',
        tipo: TipoReporte.RESERVAS,
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

      totalReservas,

      reservasPorEstado,

      reservasPorMes,

      mesConMasReservas,

      reservasPorTipo,

      reservasPorTemporada,

      detalleReservas,
    };
  }
}
