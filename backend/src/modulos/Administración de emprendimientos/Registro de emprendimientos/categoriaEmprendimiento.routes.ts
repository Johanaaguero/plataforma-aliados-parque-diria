import { Router } from 'express';
import { categoriaEmprendimientoController } from './categoriaEmprendimiento.controller';

const router = Router();

router.post('/', categoriaEmprendimientoController.crear.bind(categoriaEmprendimientoController));
router.get('/', categoriaEmprendimientoController.obtenerTodas.bind(categoriaEmprendimientoController));

export default router;