import type { Request, Response } from 'express';
import {
  DashboardNoDisponibleError,
  obtenerDashboard,
} from './dashboard.service';

export const getDashboard = async (
  req: Request,
  res: Response,
) => {
  try {
    if (!req.usuario) {
      return res.status(401).json({
        ok: false,
        message: 'Usuario autenticado no encontrado',
      });
    }

    const dashboard = await obtenerDashboard(req.usuario);

    return res.status(200).json(dashboard);
  } catch (error) {
    if (error instanceof DashboardNoDisponibleError) {
      return res.status(403).json({
        ok: false,
        message: error.message,
      });
    }

    console.error('Error al obtener el dashboard:', error);

    return res.status(500).json({
      ok: false,
      message: 'Error interno del servidor',
    });
  }
};
