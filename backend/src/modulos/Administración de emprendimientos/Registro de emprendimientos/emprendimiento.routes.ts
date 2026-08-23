import { Router } from 'express';

import { emprendimientoController } from './emprendimiento.controller';

import { upload } from '../../../middlewares/upload';

import { verificarToken } from '../../../middlewares/auth.middleware';

import { autorizarRoles } from '../../../middlewares/authorization.middleware';

import { EstadoPublicacion } from '../../../models/Emprendimiento';

const router = Router();

// ============================================================
// CREAR EMPRENDIMIENTO
// ============================================================

router.post(
  '/',
  verificarToken,
  autorizarRoles('administrador', 'asociado'),
  upload.single('imagen'),
  emprendimientoController.crear.bind(
    emprendimientoController,
  ),
);

// ============================================================
// CATÁLOGO PÚBLICO
// ============================================================
//
// Solo emprendimientos publicados.
// No requiere autenticación.
//
router.get(
  '/catalogo',
  emprendimientoController.obtenerCatalogoPublico.bind(
    emprendimientoController,
  ),
);

// ============================================================
// LISTADO POR USUARIO
// ============================================================
//
// ADMINISTRADOR:
// - Todos los emprendimientos.
//
// ASOCIADO:
// - Sus emprendimientos en cualquier estado.
// - Emprendimientos publicados de otros asociados.
//
// VISITANTE:
// - No entra aquí.
//
router.get(
  '/',
  verificarToken,
  autorizarRoles('administrador', 'asociado'),
  (req, res, next) => {
    // Si se solicita explícitamente PUBLICADO,
    // se mantiene la compatibilidad con el catálogo.
    if (
      req.query.estado ===
        EstadoPublicacion.PUBLICADO ||
      req.query.estado === 'Publicado'
    ) {
      return emprendimientoController.obtenerCatalogoPublico(
        req,
        res,
        next,
      );
    }

    return emprendimientoController.obtenerTodos(
      req,
      res,
      next,
    );
  },
);

// ============================================================
// OBTENER EMPRENDIMIENTO POR ID
// ============================================================

router.get(
  '/:id',
  verificarToken,
  autorizarRoles('administrador', 'asociado'),
  emprendimientoController.obtenerPorId.bind(
    emprendimientoController,
  ),
);

// ============================================================
// CAMBIAR ESTADO DE PUBLICACIÓN
// ============================================================
//
// SOLO ADMINISTRADOR.
//
router.patch(
  '/:id/publicacion',
  verificarToken,
  autorizarRoles('administrador'),
  emprendimientoController.cambiarPublicacion.bind(
    emprendimientoController,
  ),
);

// ============================================================
// ACTUALIZAR
// ============================================================

router.put(
  '/:id',
  verificarToken,
  autorizarRoles('administrador', 'asociado'),
  upload.single('imagen'),
  emprendimientoController.actualizar.bind(
    emprendimientoController,
  ),
);

// ============================================================
// ELIMINAR
// ============================================================

// router.delete(
//   '/:id',
//   verificarToken,
//   autorizarRoles('administrador'),
//   emprendimientoController.eliminar.bind(
//     emprendimientoController,
//   ),
// );

export default router;