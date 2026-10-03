import { Router } from 'express';

import {
  NotificacionIncidenciaController,
} from './NotificacionIncidenciaController';

import {
  verificarToken,
} from '../../../middlewares/auth.middleware';

const router = Router();

const controller =
  new NotificacionIncidenciaController();

router.get(
  '/incidencias',
  verificarToken,
  controller.obtenerMisNotificaciones.bind(
    controller,
  ),
);

router.patch(
  '/incidencias/:id/leida',
  verificarToken,
  controller.marcarComoLeida.bind(
    controller,
  ),
);

export default router;