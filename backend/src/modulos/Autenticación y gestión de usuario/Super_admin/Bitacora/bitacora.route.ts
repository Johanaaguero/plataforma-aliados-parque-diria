import { Router } from 'express';
import { getBitacora } from './bitacora.controller';
import { verificarToken } from '../../../../middlewares/auth.middleware';
import { autorizarRoles } from '../../../../middlewares/authorization.middleware';

const router = Router();

router.get(
  '/bitacora',
  verificarToken,
  autorizarRoles('super_admin'),
  getBitacora,
);

export default router;