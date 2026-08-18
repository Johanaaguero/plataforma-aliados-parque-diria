import { Router } from 'express';
import { emprendimientoController } from './emprendimiento.controller';
import { upload } from '../../../middlewares/upload';

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
  emprendimientoController.actualizar.bind(emprendimientoController)
);

router.delete(
  '/:id',
  emprendimientoController.eliminar.bind(emprendimientoController)
);

export default router;