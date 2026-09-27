import { AppDataSource } from '../../../data-source';

import {
  Emprendimiento,
  EstadoPublicacion,
} from '../../../models/Emprendimiento';

import {
  Reporte,
  TipoReporte,
} from '../../../models/Reporte';

export class ReportesService {
  private emprendimientoRepository =
    AppDataSource.getRepository(Emprendimiento);

  private reporteRepository =
    AppDataSource.getRepository(Reporte);

  async obtenerEstadisticasEmprendimientos(
    periodo: string,
    fechaInicio?: string,
    fechaFin?: string,
    usuarioGeneroId?: number,
  ) {
    const query =
      this.emprendimientoRepository
        .createQueryBuilder('emprendimiento')
        .leftJoinAndSelect(
          'emprendimiento.categoria',
          'categoria',
        );

    /*
     * FILTRO POR FECHA
     */

    if (periodo === 'hoy') {
      query.andWhere(
        'DATE(emprendimiento.fecha_creacion) = CURDATE()',
      );
    }

    if (periodo === '7dias') {
      query.andWhere(
        'emprendimiento.fecha_creacion >= DATE_SUB(NOW(), INTERVAL 7 DAY)',
      );
    }

    if (periodo === '30dias') {
      query.andWhere(
        'emprendimiento.fecha_creacion >= DATE_SUB(NOW(), INTERVAL 30 DAY)',
      );
    }

    if (periodo === 'mes') {
      query.andWhere(
        'YEAR(emprendimiento.fecha_creacion) = YEAR(CURDATE())',
      );

      query.andWhere(
        'MONTH(emprendimiento.fecha_creacion) = MONTH(CURDATE())',
      );
    }

    if (
      periodo === 'personalizado' &&
      fechaInicio &&
      fechaFin
    ) {
      query.andWhere(
        'DATE(emprendimiento.fecha_creacion) BETWEEN :fechaInicio AND :fechaFin',
        {
          fechaInicio,
          fechaFin,
        },
      );
    }

    /*
     * OBTENER EMPRENDIMIENTOS
     */

    const emprendimientos =
      await query.getMany();

    /*
     * ESTADÍSTICAS GENERALES
     */

    const total = emprendimientos.length;

    const publicados =
      emprendimientos.filter(
        (e) =>
          e.estadoPublicacion ===
          EstadoPublicacion.PUBLICADO,
      ).length;

    const noPublicados =
      emprendimientos.filter(
        (e) =>
          e.estadoPublicacion ===
          EstadoPublicacion.NO_PUBLICADO,
      ).length;

    const desactivados =
      emprendimientos.filter(
        (e) =>
          e.estadoPublicacion ===
          EstadoPublicacion.DESACTIVADO,
      ).length;

    const borradores =
      emprendimientos.filter(
        (e) =>
          e.estadoPublicacion ===
          EstadoPublicacion.BORRADOR,
      ).length;

    /*
     * CATEGORÍAS MÁS REGISTRADAS
     */

    const categoriasMap = new Map<
      string,
      number
    >();

    emprendimientos.forEach(
      (emprendimiento) => {
        const nombreCategoria =
          emprendimiento.categoria?.nombre ??
          'Sin categoría';

        const cantidad =
          categoriasMap.get(
            nombreCategoria,
          ) ?? 0;

        categoriasMap.set(
          nombreCategoria,
          cantidad + 1,
        );
      },
    );

    const categorias = Array.from(
      categoriasMap.entries(),
    )
      .map(([nombre, cantidad]) => ({
        nombre,
        cantidad,
      }))
      .sort(
        (a, b) =>
          b.cantidad - a.cantidad,
      );

    /*
     * GUARDAR REPORTE GENERADO
     */

    if (usuarioGeneroId) {
      const reportes =
        await this.reporteRepository.find({
          order: {
            id: 'DESC',
          },
          take: 1,
        });

      const ultimoReporte = reportes[0];

      const siguienteNumero =
        (ultimoReporte?.id ?? 0) + 1;

      const numeroReporte =
        `REP-${String(
          siguienteNumero,
        ).padStart(6, '0')}`;

      const reporte =
        this.reporteRepository.create({
          numeroReporte,
          tipoReporte:
            TipoReporte.EMPRENDIMIENTOS,
          usuarioGeneroId,
        });

      await this.reporteRepository.save(
        reporte,
      );
    }

    /*
     * RESPUESTA
     */

    return {
      periodo,

      fechaInicio:
        fechaInicio ?? null,

      fechaFin:
        fechaFin ?? null,

      total,

      publicados,

      noPublicados,

      desactivados,

      borradores,

      categorias,

      emprendimientos:
        emprendimientos.map((e) => ({
          id: e.id,
          nombre: e.nombre,
          estado: e.estadoPublicacion,
          fechaCreacion:
            e.fechaCreacion,
          categoria:
            e.categoria?.nombre ??
            'Sin categoría',
        })),
    };
  }
}