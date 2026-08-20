import { Router } from 'express';
import { emprendimientoController } from './emprendimiento.controller';
import { upload } from '../../../middlewares/upload';
import { verificarToken } from '../../../middlewares/auth.middleware';

const router = Router();

router.post(
  '/',
  upload.single('imagen'),
  emprendimientoController.crear.bind(emprendimientoController)
);

router.get(
  '/',
  emprendimientoController.obtenerTodos.bind(emprendimientoController)
);

router.get(
  '/:id',
  emprendimientoController.obtenerPorId.bind(emprendimientoController)
);

router.put(
 '/:id',
  verificarToken,
  emprendimientoController.actualizar.bind(emprendimientoController)
);

router.delete(
  '/:id',
  verificarToken,
  emprendimientoController.eliminar.bind(emprendimientoController)
);

export default router;