import { AppDataSource } from '../../../data-source';
import { SelectQueryBuilder } from 'typeorm';

import {
  Emprendimiento,
  EstadoPublicacion,
} from '../../../models/Emprendimiento';
import { ConsultaEmprendimiento } from '../../../models/ConsultaEmprendimiento';

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

export class ReportesService {
  private emprendimientoRepository =
    AppDataSource.getRepository(Emprendimiento);

  private consultaEmprendimientoRepository =
    AppDataSource.getRepository(ConsultaEmprendimiento);

  private reporteRepository =
    AppDataSource.getRepository(Reporte);

  private aplicarFiltrosConsultas(
    query: SelectQueryBuilder<ConsultaEmprendimiento>,
    periodo: string,
    fechaInicio?: string,
    fechaFin?: string,
    emprendimientoId?: number,
    categoriaId?: number,
  ) {
    if (emprendimientoId) {
      query.andWhere(
        'emprendimiento.id = :emprendimientoId',
        { emprendimientoId },
      );
    }

    if (categoriaId) {
      query.andWhere(
        'categoria.id = :categoriaId',
        { categoriaId },
      );
    }

    if (periodo === 'hoy') {
      query.andWhere(
        'DATE(consulta.fecha_consulta) = CURDATE()',
      );
    }

    if (periodo === '7dias') {
      query.andWhere(
        'consulta.fecha_consulta >= DATE_SUB(NOW(), INTERVAL 7 DAY)',
      );
    }

    if (periodo === '30dias') {
      query.andWhere(
        'consulta.fecha_consulta >= DATE_SUB(NOW(), INTERVAL 30 DAY)',
      );
    }

    if (periodo === 'mes') {
      query.andWhere(
        'YEAR(consulta.fecha_consulta) = YEAR(CURDATE())',
      );

      query.andWhere(
        'MONTH(consulta.fecha_consulta) = MONTH(CURDATE())',
      );
    }

    if (
      periodo === 'personalizado' &&
      fechaInicio &&
      fechaFin
    ) {
      query.andWhere(
        'DATE(consulta.fecha_consulta) BETWEEN :fechaInicio AND :fechaFin',
        {
          fechaInicio,
          fechaFin,
        },
      );
    }

    return query;
  }

  private async obtenerEstadisticasConsultas(
    periodo: string,
    fechaInicio?: string,
    fechaFin?: string,
    emprendimientoId?: number,
    categoriaId?: number,
  ) {
    const totalQuery =
      this.consultaEmprendimientoRepository
        .createQueryBuilder('consulta')
        .innerJoin(
          'consulta.emprendimiento',
          'emprendimiento',
        )
        .leftJoin(
          'emprendimiento.categoria',
          'categoria',
        )
        .select(
          'COUNT(consulta.id)',
          'totalConsultas',
        );

    this.aplicarFiltrosConsultas(
      totalQuery,
      periodo,
      fechaInicio,
      fechaFin,
      emprendimientoId,
      categoriaId,
    );

    const totalResultado =
      await totalQuery.getRawOne<{
        totalConsultas: string | number | null;
      }>();

    const rankingQuery =
      this.consultaEmprendimientoRepository
        .createQueryBuilder('consulta')
        .innerJoin(
          'consulta.emprendimiento',
          'emprendimiento',
        )
        .leftJoin(
          'emprendimiento.categoria',
          'categoria',
        )
        .select(
          'emprendimiento.id',
          'emprendimientoId',
        )
        .addSelect(
          'emprendimiento.nombre',
          'nombre',
        )
        .addSelect(
          'COUNT(consulta.id)',
          'cantidadConsultas',
        )
        .groupBy('emprendimiento.id')
        .addGroupBy('emprendimiento.nombre')
        .orderBy(
          'cantidadConsultas',
          'DESC',
        )
        .addOrderBy(
          'emprendimiento.nombre',
          'ASC',
        );

    this.aplicarFiltrosConsultas(
      rankingQuery,
      periodo,
      fechaInicio,
      fechaFin,
      emprendimientoId,
      categoriaId,
    );

    const ranking =
      await rankingQuery.getRawMany<{
        emprendimientoId: string | number;
        nombre: string;
        cantidadConsultas: string | number;
      }>();

    return {
      totalConsultas: Number(
        totalResultado?.totalConsultas ?? 0,
      ),
      emprendimientosMasConsultados:
        ranking.map((item) => ({
          emprendimientoId: Number(
            item.emprendimientoId,
          ),
          nombre: item.nombre,
          cantidadConsultas: Number(
            item.cantidadConsultas,
          ),
        })),
    };
  }

  async obtenerEstadisticasEmprendimientos(
    periodo: string,
    fechaInicio?: string,
    fechaFin?: string,
    emprendimientoId?: number,
    categoriaId?: number,
    usuarioGeneroId?: number,
  ) {
    const query =
      this.emprendimientoRepository
        .createQueryBuilder('emprendimiento')
        .leftJoinAndSelect(
          'emprendimiento.categoria',
          'categoria',
        );

    // FILTRO POR EMPRENDIMIENTO
    if (emprendimientoId) {
      query.andWhere(
        'emprendimiento.id = :emprendimientoId',
        { emprendimientoId },
      );
    }

    // FILTRO POR CATEGORÍA
    if (categoriaId) {
      query.andWhere(
        'categoria.id = :categoriaId',
        { categoriaId },
      );
    }

    // FILTRO POR FECHA
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

    // OBTENER EMPRENDIMIENTOS
    const emprendimientos = eliminarDuplicadosPorId(
      await query.getMany(),
    );

    // ESTADÍSTICAS GENERALES
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

    const porcentajesPorEstado = {
      publicados: calcularPorcentaje(
        publicados,
        total,
      ),
      noPublicados: calcularPorcentaje(
        noPublicados,
        total,
      ),
      desactivados: calcularPorcentaje(
        desactivados,
        total,
      ),
      borradores: calcularPorcentaje(
        borradores,
        total,
      ),
    };

    // CATEGORÍAS MÁS REGISTRADAS
    const categoriasMap = new Map<string, number>();

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

    const estadisticasConsultas =
      await this.obtenerEstadisticasConsultas(
        periodo,
        fechaInicio,
        fechaFin,
        emprendimientoId,
        categoriaId,
      );

  
    // GUARDAR REPORTE GENERADO
    let reporteGenerado: Reporte | null = null;

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
          tipoReporte: TipoReporte.EMPRENDIMIENTOS,
          usuarioGenero: {
            id: usuarioGeneroId,
          } as import('../../../models/Usuario').Usuario,
        });

      await this.reporteRepository.save(reporte);

      reporteGenerado = reporte;
    }


    // RESPUESTA
    return {
      informacionGeneral: {
        nombre:
          'Reporte de emprendimientos',
        tipo: TipoReporte.EMPRENDIMIENTOS,
        periodo,
        filtros: {
          fechaInicio:
            fechaInicio ?? null,
          fechaFin:
            fechaFin ?? null,
          emprendimientoId:
            emprendimientoId ?? null,
          categoriaId:
            categoriaId ?? null,
        },
        fechaGeneracion:
          reporteGenerado?.fechaGeneracion ??
          null,
        numeroReporte:
          reporteGenerado?.numeroReporte ??
          null,
      },

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

      porcentajesPorEstado,

      categorias,

      totalConsultas:
        estadisticasConsultas.totalConsultas,

      emprendimientosMasConsultados:
        estadisticasConsultas.emprendimientosMasConsultados,

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
