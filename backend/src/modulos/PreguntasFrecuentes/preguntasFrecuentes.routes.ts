import { Router } from 'express';
import { verificarToken } from '../../middlewares/auth.middleware';
import { autorizarRoles } from '../../middlewares/authorization.middleware';
import { PreguntasFrecuentesController } from './preguntasFrecuentes.controller';

const router = Router();
const controller = new PreguntasFrecuentesController();
const soloAdministracion = [verificarToken, autorizarRoles('administrador', 'super_admin')];

router.get('/', (req, res, next) => controller.listarPublicadas(req, res, next));
router.get('/administracion', ...soloAdministracion, (req, res, next) => controller.listarTodas(req, res, next));
router.post('/', ...soloAdministracion, (req, res, next) => controller.crear(req, res, next));
router.put('/:id', ...soloAdministracion, (req, res, next) => controller.editar(req, res, next));
router.patch('/:id/publicacion', ...soloAdministracion, (req, res, next) => controller.cambiarPublicacion(req, res, next));
router.delete('/:id', ...soloAdministracion, (req, res, next) => controller.eliminar(req, res, next));

export default router;
