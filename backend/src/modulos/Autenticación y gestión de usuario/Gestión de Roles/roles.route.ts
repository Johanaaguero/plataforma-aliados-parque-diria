import { Router } from 'express';
import {
  getUsersRoles,
  updateRole,
} from './roles.controller';
import { verificarToken } from '../../../middleware/auth.middleware';
import { autorizarRoles } from '../../../middleware/authorization.middleware';

const router = Router();

router.get(
  '/roles',
  verificarToken,
  autorizarRoles('administrador'),
  getUsersRoles,
);

router.put(
  '/:id/role',
  verificarToken,
  autorizarRoles('administrador'),
  updateRole,
);

export default router;
