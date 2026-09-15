import { Router } from 'express';
import { getDashboard } from './dashboard.controller';
import { verificarToken } from '../../middlewares/auth.middleware';
import { autorizarRoles } from '../../middlewares/authorization.middleware';

const router = Router();

router.get(
  '/',
  verificarToken,
  autorizarRoles('administrador'),
  getDashboard,
);

export default router;
