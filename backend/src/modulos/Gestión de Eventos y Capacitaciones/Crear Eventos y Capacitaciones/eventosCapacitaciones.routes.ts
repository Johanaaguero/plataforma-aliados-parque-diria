import { Router } from 'express';
import { EventosCapacitacionesController } from './eventosCapacitaciones.controller';
import { verificarToken } from '../../../middlewares/auth.middleware';
  import { InscripcionController } from '../Inscripción a Eventos y Capacitaciones/inscripcion.controller';

import { autorizarRoles } from '../../../middlewares/authorization.middleware';

const router = Router();
const controller = new EventosCapacitacionesController();
const inscripcionController = new InscripcionController();
/*
 * ============================================================
 * CREAR EVENTO / CAPACITACIÓN
 * Solo administrador
 * ============================================================
 */
router.post(
  '/',
  verificarToken,
  autorizarRoles('administrador', 'asociado'),
  (req, res) => controller.create(req, res),
);

/*
 * ============================================================
 * OBTENER EVENTOS Y CAPACITACIONES
 * Público / usuarios autenticados
 * ============================================================
 */
router.get(
  '/',
  verificarToken,
  autorizarRoles('administrador', 'asociado'),
  (req, res) => controller.findAll(req, res),
);

router.patch(
  '/:id/estado',
  verificarToken,
  autorizarRoles('administrador'),
  (req, res) => controller.cambiarEstado(req, res),
);

/**
 * ============================================================
 * INSCRIPCIÓN A EVENTO / CAPACITACIÓN
 * Usuario autenticado
 * ============================================================
 */
router.post(
  '/:id/inscripcion',
  verificarToken,
  (req, res) => inscripcionController.inscribir(req, res),
);

router.post(
  '/:id/reserva',
  verificarToken,
  (req, res) => inscripcionController.crearReserva(req, res),
);

router.get(
  '/:id/reserva',
  verificarToken,
  (req, res) => inscripcionController.consultarReserva(req, res),
);

/*
 * ============================================================
 * ACTUALIZAR EVENTO / CAPACITACIÓN
 * Solo administrador
 * ============================================================
 */
router.put(
  '/:id',
  verificarToken,
  autorizarRoles('administrador', 'asociado'),
  (req, res) => controller.update(req, res),
);

/*
 * ============================================================
 * DELETE /api/eventos-capacitaciones/:id
 * Solo administrador. Eliminación física; las imágenes relacionadas
 * se eliminan en MySQL mediante ON DELETE CASCADE.
 * Respuestas: 204, 400, 401, 403, 404 o 500.
 * ============================================================
 */
router.delete(
  '/:id',
  verificarToken,
  autorizarRoles('administrador'),
  (req, res) => controller.remove(req, res),
);

/*
 * ============================================================
 * SUBIR IMAGEN
 * Solo administrador
 * ============================================================
 */
router.post(
  '/:id/imagenes',
  verificarToken,
  autorizarRoles('administrador'),
  (req, res) => controller.uploadImagen(req, res),
);

/*
 * ============================================================
 * OBTENER IMÁGENES
 * Público
 * ============================================================
 */
router.get(
  '/:id/imagenes',
  (req, res) => controller.getImagenes(req, res),
);

/*
 * ============================================================
 * OBTENER IMAGEN
 * Público
 * ============================================================
 */
router.get(
  '/imagenes/:imagenId',
  (req, res) => controller.getImagen(req, res),
);

/*
 * ============================================================
 * OBTENER IMAGEN EN BASE64
 * Público
 * ============================================================
 */
router.get(
  '/imagenes/:imagenId/base64',
  (req, res) => controller.getImagenBase64(req, res),
);

/*
 * ============================================================
 * ELIMINAR IMAGEN
 * Solo administrador
 * ============================================================
 */
router.delete(
  '/:id/imagenes/:imagenId', verificarToken, autorizarRoles('administrador'),
  (req, res) => controller.removeImagen(req, res),
);

export default router;
