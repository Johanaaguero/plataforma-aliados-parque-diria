import { Request, Response } from 'express';
import { NotificacionService } from './NotificacionReservaService';

export class NotificacionController {
  private service: NotificacionService;

  constructor() {
    this.service = new NotificacionService();
  }

  // GET /api/notificaciones
  async obtenerMisNotificaciones(req: Request, res: Response) {
    try {
      const usuarioId = Number((req as any).usuario?.id);

      if (!usuarioId) {
        return res.status(401).json({
          mensaje: 'Usuario no autenticado',
        });
      }

      const notificaciones =
        await this.service.obtenerPorUsuario(usuarioId);

      return res.json(notificaciones);
    } catch (error) {
      console.error('Error al obtener notificaciones:', error);

      return res.status(500).json({
        mensaje: 'Error al obtener las notificaciones',
      });
    }
  }

  // GET /api/notificaciones/no-leidas
  async obtenerNoLeidas(req: Request, res: Response) {
    try {
      const usuarioId = Number((req as any).usuario?.id);

      if (!usuarioId) {
        return res.status(401).json({
          mensaje: 'Usuario no autenticado',
        });
      }

      const notificaciones =
        await this.service.obtenerNoLeidas(usuarioId);

      return res.json(notificaciones);
    } catch (error) {
      console.error('Error al obtener notificaciones no leídas:', error);

      return res.status(500).json({
        mensaje: 'Error al obtener las notificaciones no leídas',
      });
    }
  }

  // GET /api/notificaciones/no-leidas/count
  async contarNoLeidas(req: Request, res: Response) {
    try {
      const usuarioId = Number((req as any).usuario?.id);

      if (!usuarioId) {
        return res.status(401).json({
          mensaje: 'Usuario no autenticado',
        });
      }

      const cantidad =
        await this.service.contarNoLeidas(usuarioId);

      return res.json({
        cantidad,
      });
    } catch (error) {
      console.error('Error al contar notificaciones:', error);

      return res.status(500).json({
        mensaje: 'Error al contar las notificaciones',
      });
    }
  }

  // POST /api/notificaciones
  async crear(req: Request, res: Response) {
    try {
      const usuarioId = Number((req as any).usuario?.id);

      if (!usuarioId) {
        return res.status(401).json({
          mensaje: 'Usuario no autenticado',
        });
      }

      const {
        tipo,
        titulo,
        mensaje,
        referenciaId,
        referenciaTipo,
      } = req.body;

      const notificacion = await this.service.crear({
        usuarioId,
        tipo,
        titulo,
        mensaje,
        referenciaId,
        referenciaTipo,
      });

      return res.status(201).json(notificacion);
    } catch (error) {
      console.error('Error al crear notificación:', error);

      return res.status(500).json({
        mensaje: 'Error al crear la notificación',
      });
    }
  }

  // GET /api/notificaciones/:id/detalle
  async obtenerDetalle(req: Request, res: Response) {
    try {
      const usuarioId = Number((req as any).usuario?.id);
      const id = Number(req.params.id);

      if (!usuarioId) {
        return res.status(401).json({
          mensaje: 'Usuario no autenticado',
        });
      }

      if (!id) {
        return res.status(400).json({
          mensaje: 'El ID de la notificación es obligatorio',
        });
      }

      const detalle = await this.service.obtenerDetalle(
        id,
        usuarioId,
      );

      return res.json(detalle);
    } catch (error: any) {
      if (error.message === 'Notificación no encontrada') {
        return res.status(404).json({
          mensaje: error.message,
        });
      }

      console.error(
        'Error al obtener detalle de notificación:',
        error,
      );

      return res.status(500).json({
        mensaje: 'Error al obtener el detalle',
      });
    }
  }

  // PATCH /api/notificaciones/:id/leida
  async marcarComoLeida(req: Request, res: Response) {
    try {
      const usuarioId = Number((req as any).usuario?.id);
      const id = Number(req.params.id);

      if (!usuarioId) {
        return res.status(401).json({
          mensaje: 'Usuario no autenticado',
        });
      }

      if (!id) {
        return res.status(400).json({
          mensaje: 'El ID de la notificación es obligatorio',
        });
      }

      const notificacion =
        await this.service.marcarComoLeida(id, usuarioId);

      return res.json(notificacion);
    } catch (error: any) {
      if (error.message === 'Notificación no encontrada') {
        return res.status(404).json({
          mensaje: error.message,
        });
      }

      console.error(
        'Error al marcar notificación como leída:',
        error,
      );

      return res.status(500).json({
        mensaje: 'Error al marcar la notificación como leída',
      });
    }
  }

  // PATCH /api/notificaciones/marcar-todas-leidas
  async marcarTodasComoLeidas(req: Request, res: Response) {
    try {
      const usuarioId = Number((req as any).usuario?.id);

      if (!usuarioId) {
        return res.status(401).json({
          mensaje: 'Usuario no autenticado',
        });
      }

      await this.service.marcarTodasComoLeidas(usuarioId);

      return res.json({
        mensaje: 'Todas las notificaciones fueron marcadas como leídas',
      });
    } catch (error) {
      console.error(
        'Error al marcar todas las notificaciones como leídas:',
        error,
      );

      return res.status(500).json({
        mensaje: 'Error al marcar las notificaciones como leídas',
      });
    }
  }

  // DELETE /api/notificaciones/:id
  async eliminar(req: Request, res: Response) {
    try {
      const usuarioId = Number((req as any).usuario?.id);
      const id = Number(req.params.id);

      if (!usuarioId) {
        return res.status(401).json({
          mensaje: 'Usuario no autenticado',
        });
      }

      if (!id) {
        return res.status(400).json({
          mensaje: 'El ID de la notificación es obligatorio',
        });
      }

      await this.service.eliminar(id, usuarioId);

      return res.json({
        mensaje: 'Notificación eliminada correctamente',
      });
    } catch (error: any) {
      if (error.message === 'Notificación no encontrada') {
        return res.status(404).json({
          mensaje: error.message,
        });
      }

      console.error('Error al eliminar notificación:', error);

      return res.status(500).json({
        mensaje: 'Error al eliminar la notificación',
      });
    }
  }

  async eliminarTodas(req: Request, res: Response) {
    try {
      const usuarioId = Number((req as any).usuario?.id);
      if (!usuarioId) return res.status(401).json({ mensaje: 'Usuario no autenticado' });

      const resultado = await this.service.eliminarTodas(usuarioId);
      return res.json({ mensaje: 'Notificaciones eliminadas correctamente', ...resultado });
    } catch (error) {
      console.error('Error al eliminar notificaciones:', error);
      return res.status(500).json({ mensaje: 'Error al eliminar las notificaciones' });
    }
  }
}
