import { Router } from 'express';

import {
  NotificacionEventoController,
} from './notificacionEvento.controller';

import {
  verificarToken,
} from '../../../middlewares/auth.middleware';

const router = Router();

const controller =
  new NotificacionEventoController();

// Obtener todas las notificaciones
router.get(
  '/',
  verificarToken,
  controller.obtenerMisNotificaciones.bind(controller),
);

// Marcar una notificación como leída
router.patch(
  '/:id/leida',
  verificarToken,
  controller.marcarComoLeida.bind(controller),
);

export default router;