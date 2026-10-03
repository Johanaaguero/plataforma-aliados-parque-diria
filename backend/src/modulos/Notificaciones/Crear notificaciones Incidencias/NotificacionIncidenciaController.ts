import { Request, Response } from 'express';

import {
  notificacionIncidenciaService,
} from './NotificacionIncidenciaService';

export class NotificacionIncidenciaController {
  /**
   * Obtener las notificaciones de incidencias
   * del usuario autenticado.
   */
  async obtenerMisNotificaciones(
    req: Request,
    res: Response,
  ) {
    try {
      const usuarioId = req.usuario!.id;

      const notificaciones =
        await notificacionIncidenciaService.obtenerPorUsuario(
          usuarioId,
        );

      return res.status(200).json({
        ok: true,
        notificaciones,
      });
    } catch (error) {
      console.error(
        'Error al obtener notificaciones de incidencias:',
        error,
      );

      return res.status(500).json({
        ok: false,
        mensaje:
          'Error al obtener las notificaciones de incidencias.',
      });
    }
  }

  /**
   * Marcar una notificación de incidencia
   * como leída.
   */
  async marcarComoLeida(
    req: Request,
    res: Response,
  ) {
    try {
      const id = Number(req.params.id);
      const usuarioId = req.usuario!.id;

      if (!id || Number.isNaN(id)) {
        return res.status(400).json({
          ok: false,
          mensaje:
            'El ID de la notificación no es válido.',
        });
      }

      const notificacion =
        await notificacionIncidenciaService.marcarComoLeida(
          id,
          usuarioId,
        );

      if (!notificacion) {
        return res.status(404).json({
          ok: false,
          mensaje:
            'Notificación no encontrada.',
        });
      }

      return res.status(200).json({
        ok: true,
        mensaje:
          'Notificación marcada como leída.',
        notificacion,
      });
    } catch (error) {
      console.error(
        'Error al marcar notificación de incidencia como leída:',
        error,
      );

      return res.status(500).json({
        ok: false,
        mensaje:
          'Error al actualizar la notificación.',
      });
    }
  }
}