
import { AppDataSource } from '../../../data-source';

import {
  EventosCapacitaciones,
  TipoActividad,
  Temporada,
} from '../../../models/EventosCapacitaciones';

import {
  Reporte,
  TipoReporte,
} from '../../../models/Reporte';

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
    // CONSULTAR EVENTOS Y CAPACITACIONES
    const query =
      this.eventosRepository.createQueryBuilder('evento');

      
    // Filtrar por fecha inicial.
    // La columna fecha es de tipo DATE en MySQL.
    if (filtros.fechaInicio) {
      query.andWhere(
        'evento.fecha >= :fechaInicio',
        {
          fechaInicio: filtros.fechaInicio,
        },
      );
    }

    // Filtrar por fecha final.
    if (filtros.fechaFin) {
      query.andWhere(
        'evento.fecha <= :fechaFin',
        {
          fechaFin: filtros.fechaFin,
        },
      );
    }

    // Filtrar por temporada.
    if (filtros.temporada) {
      query.andWhere(
        'evento.temporada = :temporada',
        {
          temporada: filtros.temporada,
        },
      );
    }

    // Filtrar por tipo de actividad.
    if (filtros.tipoActividad) {
      query.andWhere(
        'evento.tipoActividad = :tipoActividad',
        {
          tipoActividad: filtros.tipoActividad,
        },
      );
    }

    // Obtener entidades completas con el mapeo de TypeORM.
    // No se filtra por estado: se contabilizan todos los estados.
    const eventos = await query
      .orderBy('evento.fecha', 'DESC')
      .addOrderBy('evento.id', 'DESC')
      .getMany();
      console.log('Filtros recibidos:', filtros);
console.log('Total recuperado por TypeORM:', eventos.length);
console.log('Actividades recuperadas:', eventos);

    console.log(
      '[Reporte eventos] Filtros aplicados:',
      filtros,
    );

    console.log(
      '[Reporte eventos] Registros encontrados:',
      eventos.length,
    );

    // TOTAL DE ACTIVIDADES
    const totalActividades = eventos.length;

    // ACTIVIDADES POR TIPO
    const actividadesPorTipo = {
      evento: 0,
      capacitacion: 0,
    };

    for (const actividad of eventos) {
      if (actividad.tipoActividad === TipoActividad.EVENTO) {
        actividadesPorTipo.evento++;
      }

      if (
        actividad.tipoActividad === TipoActividad.CAPACITACION
      ) {
        actividadesPorTipo.capacitacion++;
      }
    }

    // ACTIVIDADES POR ESTADO
    const actividadesPorEstado = {
      borrador: 0,
      publicado: 0,
      no_publicado: 0,
      desactivado: 0,
    };

    for (const actividad of eventos) {
      switch (actividad.estado) {
        case 'borrador':
          actividadesPorEstado.borrador++;
          break;

        case 'publicado':
          actividadesPorEstado.publicado++;
          break;

        case 'no_publicado':
          actividadesPorEstado.no_publicado++;
          break;

        case 'desactivado':
          actividadesPorEstado.desactivado++;
          break;
      }
    }

    // ACTIVIDADES POR TEMPORADA
    const actividadesPorTemporada = {
      seca: 0,
      lluviosa: 0,
    };

    for (const actividad of eventos) {
      if (actividad.temporada === Temporada.SECA) {
        actividadesPorTemporada.seca++;
      }

      if (actividad.temporada === Temporada.LLUVIOSA) {
        actividadesPorTemporada.lluviosa++;
      }
    }

    // ACTIVIDADES POR MES
    const actividadesPorMesMap = new Map<string, number>();

    for (const actividad of eventos) {
      if (!actividad.fecha) {
        continue;
      }

      // La columna es DATE: se toma directamente YYYY-MM.
      const fecha = String(actividad.fecha);
      const coincidencia = fecha.match(/^(\d{4})-(\d{2})/);

      if (!coincidencia) {
        continue;
      }

      const clave = `${coincidencia[1]}-${coincidencia[2]}`;

      actividadesPorMesMap.set(
        clave,
        (actividadesPorMesMap.get(clave) ?? 0) + 1,
      );
    }

    const actividadesPorMes = Array.from(
      actividadesPorMesMap.entries(),
    )
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([mes, cantidad]) => ({
        mes,
        cantidad,
      }));

    // MES CON MÁS ACTIVIDADES
    let mesConMasActividades: {
      mes: string;
      cantidad: number;
    } | null = null;

    for (const item of actividadesPorMes) {
      if (
        !mesConMasActividades ||
        item.cantidad > mesConMasActividades.cantidad
      ) {
        mesConMasActividades = item;
      }
    }

    // DETALLE DE ACTIVIDADES
    const detalleActividades = eventos.map((actividad) => ({
      id: Number(actividad.id),
      nombre: actividad.nombre ?? 'Sin nombre',
      fecha: actividad.fecha ?? null,
      hora: actividad.hora ?? null,
      lugar: actividad.lugar ?? null,
      tipoActividad: actividad.tipoActividad ?? null,

      cupoMaximo:
        actividad.cupoMaximo != null
          ? Number(actividad.cupoMaximo)
          : null,

      cuposDisponibles:
        actividad.cuposDisponibles != null
          ? Number(actividad.cuposDisponibles)
          : null,

      cupoMinimo:
        actividad.cupoMinimo != null
          ? Number(actividad.cupoMinimo)
          : null,

      edadMinima:
        actividad.edadMinima != null
          ? Number(actividad.edadMinima)
          : null,

      edadMaxima:
        actividad.edadMaxima != null
          ? Number(actividad.edadMaxima)
          : null,

      estado: actividad.estado ?? null,
      temporada: actividad.temporada ?? null,
    }));

    
    // REGISTRAR CONSULTA DEL REPORTE
    const ultimoReporte = await this.reporteRepository.find({
      order: {
        id: 'DESC',
      },
      take: 1,
    });

    const siguienteNumero = (ultimoReporte[0]?.id ?? 0) + 1;

    const nuevoReporte = this.reporteRepository.create({
      numeroReporte: `REP-${String(siguienteNumero).padStart(6, '0')}`,
      tipoReporte: TipoReporte.EVENTOS,
      usuarioGenero: {
        id: usuarioGeneroId,
      } as import('../../../models/Usuario').Usuario,
    });

    await this.reporteRepository.save(nuevoReporte);

    // RESPUESTA DEL REPORTE
    return {
      informacionGeneral: {
        nombre: 'Reporte de eventos y capacitaciones',
        tipo: TipoReporte.EVENTOS,

        periodo: {
          fechaInicio: filtros.fechaInicio ?? null,
          fechaFin: filtros.fechaFin ?? null,
        },

        filtros: {
          temporada: filtros.temporada ?? null,
          tipoActividad: filtros.tipoActividad ?? null,
        },

        fechaGeneracion: nuevoReporte.fechaGeneracion,
        numeroReporte: nuevoReporte.numeroReporte,
      },

      reporte: {
        id: nuevoReporte.id,
        numeroReporte: nuevoReporte.numeroReporte,
        fechaGeneracion: nuevoReporte.fechaGeneracion,
      },

      periodo: {
        fechaInicio: filtros.fechaInicio ?? null,
        fechaFin: filtros.fechaFin ?? null,
      },

      filtros: {
        temporada: filtros.temporada ?? null,
        tipoActividad: filtros.tipoActividad ?? null,
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
