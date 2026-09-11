import { Router } from 'express';
import { getInscripcionesAdministrativas } from './inscripcionesAdmin.controller';
import { verificarToken } from '../../../middlewares/auth.middleware';
import { autorizarRoles } from '../../../middlewares/authorization.middleware';

const router = Router();

router.get(
  '/inscripciones',
  verificarToken,
  autorizarRoles('administrador'),
  getInscripcionesAdministrativas,
);

export default router;
