import { Router } from 'express';

import { NotificacionController } from './NotificacionReservaController';

import { verificarToken } from '../../../middlewares/auth.middleware';

const router = Router();

const controller = new NotificacionController();

// Obtener todas las notificaciones del usuario
router.get(
  '/',
  verificarToken,
  controller.obtenerMisNotificaciones.bind(controller),
);

// Obtener solamente las no leídas
router.get(
  '/no-leidas',
  verificarToken,
  controller.obtenerNoLeidas.bind(controller),
);

// Contar no leídas
router.get(
  '/no-leidas/count',
  verificarToken,
  controller.contarNoLeidas.bind(controller),
);

// Crear notificación
router.post(
  '/',
  verificarToken,
  controller.crear.bind(controller),
);

// Obtener detalle de una notificación
router.get(
  '/:id/detalle',
  verificarToken,
  controller.obtenerDetalle.bind(controller),
);

// Marcar una como leída
router.patch(
  '/:id/leida',
  verificarToken,
  controller.marcarComoLeida.bind(controller),
);

// Marcar todas como leídas
router.patch(
  '/marcar-todas-leidas',
  verificarToken,
  controller.marcarTodasComoLeidas.bind(controller),
);

// Eliminar notificación
router.delete(
  '/eliminar-todas',
  verificarToken,
  controller.eliminarTodas.bind(controller),
);

router.delete(
  '/:id',
  verificarToken,
  controller.eliminar.bind(controller),
);

export default router;
