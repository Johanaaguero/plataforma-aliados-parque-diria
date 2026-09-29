import { Request, Response } from 'express';

import { ReportesService } from './ReportesEmprendimientosService';

export class ReportesController {
  private reportesService = new ReportesService();

  async obtenerEstadisticasEmprendimientos(
    req: Request,
    res: Response,
  ) {
    try {
      const {
        periodo = '30dias',
        fechaInicio,
        fechaFin,
        emprendimientoId,
        categoriaId,
      } = req.query;

      if (!req.usuario) {
        return res.status(401).json({
          mensaje:
            'Debe estar autenticado para generar un reporte',
        });
      }

const resultado =
  await this.reportesService.obtenerEstadisticasEmprendimientos(
    String(periodo),
    fechaInicio
      ? String(fechaInicio)
      : undefined,
    fechaFin
      ? String(fechaFin)
      : undefined,
    emprendimientoId
      ? Number(emprendimientoId)
      : undefined,
    categoriaId
      ? Number(categoriaId)
      : undefined,
    req.usuario.id,
  );

      return res.status(200).json(resultado);
    } catch (error) {
      console.error(
        'Error al obtener estadísticas de emprendimientos:',
        error,
      );

      return res.status(500).json({
        mensaje:
          'Error al obtener las estadísticas de emprendimientos',
      });
    }
  }
}