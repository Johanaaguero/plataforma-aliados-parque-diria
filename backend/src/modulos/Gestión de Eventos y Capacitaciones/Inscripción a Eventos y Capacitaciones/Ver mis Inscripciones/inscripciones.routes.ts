import { Router } from 'express';

import { verificarToken } from '../../../../middlewares/auth.middleware';

import { InscripcionesController } from './inscripciones.controller';

const router = Router();

const controller = new InscripcionesController();

router.get(
  '/mias',
  verificarToken,
  (req, res) => controller.listarMias(req, res),
);

router.delete(
  '/:id',
  verificarToken,
  (req, res) => controller.cancelar(req, res),
);

export default router;
