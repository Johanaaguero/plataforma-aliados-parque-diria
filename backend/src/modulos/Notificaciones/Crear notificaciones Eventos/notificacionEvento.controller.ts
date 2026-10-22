import { Request, Response } from 'express';

import { notificacionEventoService } from './notificacionEvento.service';

export class NotificacionEventoController {

  // Obtener todas las notificaciones de eventos y capacitaciones
  async obtenerMisNotificaciones(
    req: Request,
    res: Response,
  ) {
    try {
      const usuarioId = req.usuario!.id;

      const notificaciones =
        await notificacionEventoService.obtenerPorUsuario(
          usuarioId,
        );

      return res.status(200).json({
        ok: true,
        notificaciones,
      });
    } catch (error) {
      console.error(
        'Error al obtener notificaciones de eventos/capacitaciones:',
        error,
      );

      return res.status(500).json({
        ok: false,
        mensaje:
          'Error al obtener las notificaciones.',
      });
    }
  }

  // Marcar una notificación como leída
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
        await notificacionEventoService.marcarComoLeida(
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
        'Error al marcar notificación como leída:',
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