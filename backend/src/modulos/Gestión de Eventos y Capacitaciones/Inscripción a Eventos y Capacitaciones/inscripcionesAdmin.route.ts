import { Router } from 'express';
import { aprobarReserva, getInscripcionesAdministrativas, rechazarReserva, marcarDevolucionProcesada } from './inscripcionesAdmin.controller';
import { verificarToken } from '../../../middlewares/auth.middleware';
import { autorizarRoles } from '../../../middlewares/authorization.middleware';

const router = Router();

router.get(
  '/inscripciones',
  verificarToken,
  autorizarRoles('administrador'),
  getInscripcionesAdministrativas,
);

router.patch(
  '/inscripciones/:id/aprobar',
  verificarToken,
  autorizarRoles('administrador'),
  aprobarReserva,
);

router.patch(
  '/inscripciones/:id/rechazar',
  verificarToken,
  autorizarRoles('administrador'),
  rechazarReserva,
);
router.patch(
  '/inscripciones/:id/devolucion-procesada',
  verificarToken,
  autorizarRoles('administrador'),
  marcarDevolucionProcesada,
);

export default router;
