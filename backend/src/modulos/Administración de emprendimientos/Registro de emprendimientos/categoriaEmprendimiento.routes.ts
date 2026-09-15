import { Router } from 'express';
import { categoriaEmprendimientoController } from './categoriaEmprendimiento.controller';
import { verificarToken } from '../../../middlewares/auth.middleware';
import { autorizarRoles } from '../../../middlewares/authorization.middleware';

const router = Router();

router.post(
  '/',
  verificarToken,
  autorizarRoles('administrador'),
  categoriaEmprendimientoController.crear.bind(categoriaEmprendimientoController),
);
router.get('/', categoriaEmprendimientoController.obtenerTodas.bind(categoriaEmprendimientoController));

export default router;
