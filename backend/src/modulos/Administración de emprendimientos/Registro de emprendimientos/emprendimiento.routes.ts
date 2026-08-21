import { Router } from 'express';
import { emprendimientoController } from './emprendimiento.controller';
import { upload } from '../../../middlewares/upload';
import { verificarToken } from '../../../middlewares/auth.middleware';
import { autorizarRoles } from '../../../middlewares/authorization.middleware';
import { EstadoPublicacion } from '../../../models/Emprendimiento';

const router = Router();

router.post(
  '/',
  upload.single('imagen'),
  emprendimientoController.crear.bind(emprendimientoController)
);

router.get(
  '/catalogo',
  emprendimientoController.obtenerCatalogoPublico.bind(
    emprendimientoController,
  ),
);

// Compatibilidad con el endpoint que consume actualmente el catálogo.
router.get('/', (req, res, next) => {
  if (
    req.query.estado === EstadoPublicacion.PUBLICADO ||
    req.query.estado === 'Publicado'
  ) {
    return emprendimientoController.obtenerCatalogoPublico(
      req,
      res,
      next,
    );
  }

  next();
});

router.get(
  '/',
  verificarToken,
  autorizarRoles('administrador', 'asociado'),
  emprendimientoController.obtenerTodos.bind(emprendimientoController),
);

router.patch(
  '/:id/publicacion',
  verificarToken,
  autorizarRoles('administrador'),
  emprendimientoController.cambiarPublicacion.bind(
    emprendimientoController,
  ),
);

router.get(
  '/:id',
  verificarToken,
  autorizarRoles('administrador', 'asociado'),
  emprendimientoController.obtenerPorId.bind(emprendimientoController),
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
