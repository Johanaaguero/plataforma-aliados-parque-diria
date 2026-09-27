import { Request, Response } from 'express';

import {
  ReportesUsuariosService,
} from './ReportesUsuariosService';

export class ReportesUsuariosController {
  private reportesUsuariosService =
    new ReportesUsuariosService();

  async obtenerEstadisticasUsuarios(
    req: Request,
    res: Response,
  ) {
    try {
      const {
        periodo = '30dias',
        fechaInicio,
        fechaFin,
      } = req.query;

      if (!req.usuario) {
        return res.status(401).json({
          mensaje:
            'Debe estar autenticado para generar un reporte',
        });
      }

      const resultado =
        await this.reportesUsuariosService.obtenerEstadisticasUsuarios(
          String(periodo),

          fechaInicio
            ? String(fechaInicio)
            : undefined,

          fechaFin
            ? String(fechaFin)
            : undefined,

          req.usuario.id,
        );

      return res.status(200).json(
        resultado,
      );
    } catch (error) {
      console.error(
        'Error al obtener estadísticas de usuarios:',
        error,
      );

      return res.status(500).json({
        mensaje:
          'Error al obtener las estadísticas de usuarios',
      });
    }
  }
}