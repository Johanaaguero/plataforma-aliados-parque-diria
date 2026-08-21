import { Router } from 'express';
import { eliminar } from './eliminarEmprendimiento.controller';
import { verificarToken } from '../../../middlewares/auth.middleware';
import { autorizarRoles } from '../../../middlewares/authorization.middleware';

const router = Router();

router.delete(
  '/:id',
  verificarToken,
  autorizarRoles('administrador'),
  eliminar,
);

export default router;