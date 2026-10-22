import { Router } from 'express';
import {
  getBlockedAccounts,
  unlockAccount,
} from './cuentasBloqueadas.controller';
import { verificarToken } from '../../../../middlewares/auth.middleware';
import { autorizarRoles } from '../../../../middlewares/authorization.middleware';

const router = Router();

router.get(
  '/cuentas-bloqueadas',
  verificarToken,
  autorizarRoles('super_admin'),
  getBlockedAccounts,
);

router.post(
  '/usuarios/:id/desbloquear',
  verificarToken,
  autorizarRoles('super_admin'),
  unlockAccount,
);

export default router;
