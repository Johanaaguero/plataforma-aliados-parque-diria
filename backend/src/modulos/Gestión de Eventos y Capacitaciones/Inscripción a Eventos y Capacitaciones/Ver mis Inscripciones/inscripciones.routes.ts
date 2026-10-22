import { Router } from 'express';

import { verificarToken } from '../../../../middlewares/auth.middleware';

import { InscripcionesController } from './inscripciones.controller';
import { InscripcionController } from '../inscripcion.controller';
import { uploadComprobante } from '../../../../middlewares/upload';

const router = Router();

const controller = new InscripcionesController();
const inscripcionController = new InscripcionController();

export const reservasRouter = Router();

reservasRouter.post('/:id/comprobante', verificarToken, uploadComprobante.single('comprobante'), (req, res) => inscripcionController.subirComprobante(req, res));
reservasRouter.get('/:id/comprobante', verificarToken, (req, res) => inscripcionController.descargarComprobante(req, res));

reservasRouter.patch(
  '/:id/cancelar',
  verificarToken,
  (req, res) => controller.cancelarReserva(req, res),
);

reservasRouter.patch(
  '/:id/datos-devolucion',
  verificarToken,
  (req, res) => controller.guardarDatosDevolucion(req, res),
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
