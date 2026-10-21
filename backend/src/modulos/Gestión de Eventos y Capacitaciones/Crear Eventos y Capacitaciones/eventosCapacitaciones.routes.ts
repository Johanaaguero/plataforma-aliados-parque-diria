import { Router } from 'express';
import { EventosCapacitacionesController } from './eventosCapacitaciones.controller';
import { verificarToken } from '../../../middlewares/auth.middleware';
import { InscripcionController } from '../Inscripción a Eventos y Capacitaciones/inscripcion.controller';
import { autorizarRoles } from '../../../middlewares/authorization.middleware';
import { uploadComprobante } from '../../../middlewares/upload';

const router = Router();
const controller = new EventosCapacitacionesController();
const inscripcionController = new InscripcionController();

// CREAR
router.post(
  '/',
  verificarToken,
  autorizarRoles('administrador', 'asociado'),
  (req, res) => controller.create(req, res),
);

// LISTADO ADMINISTRATIVO (todos los estados). Debe ir antes de cualquier '/:id'
router.get(
  '/admin',
  verificarToken,
  autorizarRoles('administrador'),
  (req, res) => controller.findAllAdmin(req, res),
);

// LISTADO PÚBLICO (solo publicados)
router.get('/', (req, res) => controller.findAll(req, res));

// CAMBIAR ESTADO
router.patch(
  '/:id/estado',
  verificarToken,
  autorizarRoles('administrador'),
  (req, res) => controller.cambiarEstado(req, res),
);

// INSCRIPCIÓN Y RESERVAS
router.post(
  '/:id/inscripcion',
  verificarToken,
  autorizarRoles('visitante', 'asociado'),
  (req, res) => inscripcionController.inscribir(req, res),
);

router.put(
  '/:id/reserva',
  verificarToken,
  autorizarRoles('visitante', 'asociado'),
  (req, res) => inscripcionController.editarReserva(req, res),
);

router.post(
  '/:id/reserva',
  verificarToken,
  autorizarRoles('visitante', 'asociado'),
  uploadComprobante.single('comprobante'),
  (req, res) => inscripcionController.crearReserva(req, res),
);

router.get(
  '/:id/reserva',
  verificarToken,
  autorizarRoles('visitante', 'asociado'),
  (req, res) => inscripcionController.consultarReserva(req, res),
);

// ACTUALIZAR
router.put(
  '/:id',
  verificarToken,
  autorizarRoles('administrador', 'asociado'),
  (req, res) => controller.update(req, res),
);

// ELIMINAR
router.delete(
  '/:id',
  verificarToken,
  autorizarRoles('administrador'),
  (req, res) => controller.remove(req, res),
);

// IMÁGENES
router.post(
  '/:id/imagenes',
  verificarToken,
  autorizarRoles('administrador'),
  (req, res) => controller.uploadImagen(req, res),
);

router.get('/:id/imagenes', (req, res) => controller.getImagenes(req, res));

router.get('/imagenes/:imagenId', (req, res) => controller.getImagen(req, res));

router.get('/imagenes/:imagenId/base64', (req, res) =>
  controller.getImagenBase64(req, res),
);

router.delete(
  '/:id/imagenes/:imagenId',
  verificarToken,
  autorizarRoles('administrador'),
  (req, res) => controller.removeImagen(req, res),
);

export default router;
