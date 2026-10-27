import { AppDataSource } from '../../../data-source';

import {
  Incidencia,
  CategoriaIncidencia,
  PrioridadIncidencia,
  EstadoIncidencia,
} from '../../../models/Incidencia';

import {
  Reporte,
  TipoReporte,
} from '../../../models/Reporte';

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

function calcularPorcentaje(
  cantidad: number,
  total: number,
): number {
  if (total === 0) {
    return 0;
  }

  return Math.round((cantidad / total) * 100);
}

interface FiltrosIncidencias {
  fechaInicio?: string;
  fechaFin?: string;
  categoria?: CategoriaIncidencia;
  prioridad?: PrioridadIncidencia;
  estado?: EstadoIncidencia;
}

export class ReportesIncidenciasService {
  private incidenciasRepository =
    AppDataSource.getRepository(Incidencia);

  private reporteRepository =
    AppDataSource.getRepository(Reporte);

  async obtenerEstadisticas(
    filtros: FiltrosIncidencias,
    usuarioGeneroId: number,
  ) {
    const hoy = new Date();

    let fechaInicio: Date;
    let fechaFin: Date;

    /*
     * Si se recibe fecha inicial,
     * se utiliza esa fecha.
     */
    if (filtros.fechaInicio) {
      fechaInicio = new Date(
        `${filtros.fechaInicio}T00:00:00`,
      );
    } else {
      /*
       * Todo el período disponible.
       */
      fechaInicio = new Date(
        '2000-01-01T00:00:00',
      );
    }

    /*
     * Si se recibe fecha final,
     * se utiliza esa fecha.
     */
    if (filtros.fechaFin) {
      fechaFin = new Date(
        `${filtros.fechaFin}T23:59:59`,
      );
    } else {
      fechaFin = hoy;
    }

    const fechaInicioAplicada =
      filtros.fechaInicio ?? '2000-01-01';
    const fechaFinAplicada =
      filtros.fechaFin ??
      `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;

    /*
     * CONSULTA BASE
     *
     * Se utiliza fecha_registro porque representa
     * cuándo fue reportada la incidencia.
     */
    const query =
      this.incidenciasRepository
        .createQueryBuilder('incidencia')
        .where(
          'incidencia.fecha_registro BETWEEN :fechaInicio AND :fechaFin',
          {
            fechaInicio,
            fechaFin,
          },
        );

    /*
     * FILTRO POR CATEGORÍA
     */
    if (filtros.categoria) {
      query.andWhere(
        'incidencia.categoria = :categoria',
        {
          categoria:
            filtros.categoria,
        },
      );
    }

    /*
     * FILTRO POR PRIORIDAD
     */
    if (filtros.prioridad) {
      query.andWhere(
        'incidencia.prioridad = :prioridad',
        {
          prioridad:
            filtros.prioridad,
        },
      );
    }

    /*
     * FILTRO POR ESTADO
     */
    if (filtros.estado) {
      query.andWhere(
        'incidencia.estado = :estado',
        {
          estado:
            filtros.estado,
        },
      );
    }

    /*
     * OBTENER INCIDENCIAS
     */
    const incidencias =
      eliminarDuplicadosPorId(
        await query
        .select([
          'incidencia.id AS id',
          'incidencia.codigo AS codigo',
          'incidencia.titulo AS titulo',
          'incidencia.descripcion AS descripcion',
          'incidencia.categoria AS categoria',
          'incidencia.prioridad AS prioridad',
          'incidencia.estado AS estado',
          'incidencia.ubicacion AS ubicacion',
          'incidencia.latitud AS latitud',
          'incidencia.longitud AS longitud',
          'incidencia.observaciones_admin AS observacionesAdmin',
          'incidencia.fecha_resolucion AS fechaResolucion',
          'incidencia.fecha_registro AS fechaRegistro',
          'incidencia.fecha_actualizacion AS fechaActualizacion',
        ])
        .orderBy(
          'incidencia.fecha_registro',
          'DESC',
        )
        .getRawMany(),
      );

    /*
     * TOTAL DE INCIDENCIAS
     */
    const totalIncidencias =
      incidencias.length;

    /*
     * INCIDENCIAS POR CATEGORÍA
     */
    const incidenciasPorCategoria = {
      seguridad: 0,
      incendio: 0,
      flora_fauna: 0,
      ambiental: 0,
      infraestructura: 0,
      senderos: 0,
      servicios: 0,
      otro: 0,
    };

    for (const incidencia of incidencias) {
      const categoria =
        incidencia.categoria;

      if (
        Object.prototype.hasOwnProperty.call(
          incidenciasPorCategoria,
          categoria,
        )
      ) {
        incidenciasPorCategoria[
          categoria as keyof typeof incidenciasPorCategoria
        ]++;
      }
    }

    const porcentajesPorCategoria =
      Object.fromEntries(
        Object.entries(
          incidenciasPorCategoria,
        ).map(([categoria, cantidad]) => [
          categoria,
          calcularPorcentaje(
            cantidad,
            totalIncidencias,
          ),
        ]),
      );

    /*
     * INCIDENCIAS POR PRIORIDAD
     */
    const incidenciasPorPrioridad = {
      baja: 0,
      media: 0,
      alta: 0,
      critica: 0,
    };

    for (const incidencia of incidencias) {
      const prioridad =
        incidencia.prioridad;

      if (
        Object.prototype.hasOwnProperty.call(
          incidenciasPorPrioridad,
          prioridad,
        )
      ) {
        incidenciasPorPrioridad[
          prioridad as keyof typeof incidenciasPorPrioridad
        ]++;
      }
    }

    /*
     * INCIDENCIAS POR ESTADO
     */
    const incidenciasPorEstado = {
      pendiente: 0,
      en_revision: 0,
      en_proceso: 0,
      resuelta: 0,
      rechazada: 0,
      cerrada: 0,
    };

    for (const incidencia of incidencias) {
      const estado =
        incidencia.estado;

      if (
        Object.prototype.hasOwnProperty.call(
          incidenciasPorEstado,
          estado,
        )
      ) {
        incidenciasPorEstado[
          estado as keyof typeof incidenciasPorEstado
        ]++;
      }
    }

    /*
     * INCIDENCIAS POR MES
     */
    const incidenciasPorMesMap =
      new Map<string, number>();

    for (const incidencia of incidencias) {
      if (!incidencia.fechaRegistro) {
        continue;
      }

      const fecha =
        incidencia.fechaRegistro instanceof Date
          ? incidencia.fechaRegistro
          : new Date(
              incidencia.fechaRegistro,
            );

      if (isNaN(fecha.getTime())) {
        continue;
      }

      const año =
        fecha.getUTCFullYear();

      const mes =
        fecha.getUTCMonth() + 1;

      const clave =
        `${año}-${String(mes).padStart(
          2,
          '0',
        )}`;

      incidenciasPorMesMap.set(
        clave,
        (
          incidenciasPorMesMap.get(
            clave,
          ) ?? 0
        ) + 1,
      );
    }

    const incidenciasPorMes =
      Array.from(
        incidenciasPorMesMap.entries(),
      )
        .sort(([a], [b]) =>
          a.localeCompare(b),
        )
        .map(
          ([mes, cantidad]) => ({
            mes,
            cantidad,
          }),
        );

    /*
     * MES CON MÁS INCIDENCIAS
     */
    let mesConMasIncidencias: {
      mes: string;
      cantidad: number;
    } | null = null;

    for (const item of incidenciasPorMes) {
      if (
        !mesConMasIncidencias ||
        item.cantidad >
          mesConMasIncidencias.cantidad
      ) {
        mesConMasIncidencias =
          item;
      }
    }

    /*
     * DETALLE DE INCIDENCIAS
     */
    const detalleIncidencias =
      incidencias.map(
        (incidencia) => ({
          id: Number(
            incidencia.id,
          ),

          codigo:
            incidencia.codigo ?? null,

          titulo:
            incidencia.titulo ??
            'Sin título',

          descripcion:
            incidencia.descripcion ??
            null,

          categoria:
            incidencia.categoria ??
            null,

          prioridad:
            incidencia.prioridad ??
            null,

          estado:
            incidencia.estado ??
            null,

          ubicacion:
            incidencia.ubicacion ??
            null,

          latitud:
            incidencia.latitud !==
              null &&
            incidencia.latitud !==
              undefined
              ? Number(
                  incidencia.latitud,
                )
              : null,

          longitud:
            incidencia.longitud !==
              null &&
            incidencia.longitud !==
              undefined
              ? Number(
                  incidencia.longitud,
                )
              : null,

          observacionesAdmin:
            incidencia.observacionesAdmin ??
            null,

          fechaResolucion:
            incidencia.fechaResolucion ??
            null,

          fechaRegistro:
            incidencia.fechaRegistro ??
            null,

          fechaActualizacion:
            incidencia.fechaActualizacion ??
            null,
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
        numeroReporte:
          `REP-${String(
            siguienteNumero,
          ).padStart(6, '0')}`,

        tipoReporte:
          TipoReporte.INCIDENCIAS,

        usuarioGenero: {
          id: usuarioGeneroId,
        } as import('../../../models/Usuario').Usuario,
      });

    await this.reporteRepository.save(
      nuevoReporte,
    );

    /*
     * RESPUESTA DEL REPORTE
     */
    return {
      informacionGeneral: {
        nombre:
          'Reporte de incidencias',
        tipo: TipoReporte.INCIDENCIAS,
        periodo: {
          fechaInicio: fechaInicioAplicada,
          fechaFin: fechaFinAplicada,
        },
        filtros: {
          categoria:
            filtros.categoria ?? null,
          prioridad:
            filtros.prioridad ?? null,
          estado:
            filtros.estado ?? null,
        },
        fechaGeneracion:
          nuevoReporte.fechaGeneracion,
        numeroReporte:
          nuevoReporte.numeroReporte,
      },

      reporte: {
        id:
          nuevoReporte.id,

        numeroReporte:
          nuevoReporte.numeroReporte,

        fechaGeneracion:
          nuevoReporte.fechaGeneracion,
      },

      periodo: {
        fechaInicio: fechaInicioAplicada,
        fechaFin: fechaFinAplicada,
      },

      fechaInicio: fechaInicioAplicada,
      fechaFin: fechaFinAplicada,

      filtros: {
        categoria:
          filtros.categoria ??
          null,

        prioridad:
          filtros.prioridad ??
          null,

        estado:
          filtros.estado ??
          null,
      },

      totalIncidencias,

      incidenciasPorCategoria,

      porcentajesPorCategoria,

      incidenciasPorPrioridad,

      incidenciasPorEstado,

      incidenciasPorMes,

      mesConMasIncidencias,

      detalleIncidencias,
    };
  }
}
