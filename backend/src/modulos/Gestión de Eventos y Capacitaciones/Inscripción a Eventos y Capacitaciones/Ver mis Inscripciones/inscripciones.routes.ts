import { Router } from 'express';

import { verificarToken } from '../../../../middlewares/auth.middleware';

import { InscripcionesController } from './inscripciones.controller';

const router = Router();

const controller = new InscripcionesController();

export const reservasRouter = Router();

reservasRouter.patch(
  '/:id/cancelar',
  verificarToken,
  (req, res) => controller.cancelarReserva(req, res),
);

router.get(
  '/mias',
  verificarToken,
  (req, res) => controller.listarMias(req, res),
);

router.patch(
  '/:id/cancelar',
  verificarToken,
  (req, res) => controller.cancelar(req, res),
);

// Compatibilidad con clientes que usaban la ruta original de cancelación.
router.delete(
  '/:id',
  verificarToken,
  (req, res) => controller.cancelar(req, res),
);

export default router;
