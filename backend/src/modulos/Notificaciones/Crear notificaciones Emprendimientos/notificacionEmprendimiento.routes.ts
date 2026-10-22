import { Router } from 'express';

import { NotificacionEmprendimientoController } from './NotificacionEmprendimientoController';

import { verificarToken } from '../../../middlewares/auth.middleware';

const router = Router();

const controller =
  new NotificacionEmprendimientoController();

/**
 * Obtener mis notificaciones de emprendimientos
 */
router.get(
  '/emprendimientos',
  verificarToken,
  controller.obtenerMisNotificaciones.bind(controller),
);

/**
 * Marcar una notificación de emprendimiento como leída
 */
router.patch(
  '/emprendimientos/:id/leida',
  verificarToken,
  controller.marcarComoLeida.bind(controller),
);

export default router;