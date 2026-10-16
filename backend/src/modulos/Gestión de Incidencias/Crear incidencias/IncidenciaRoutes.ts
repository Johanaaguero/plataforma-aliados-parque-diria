import { Router } from 'express';

import {
  registrarIncidencia,
  listarIncidencias,
  listarMisIncidencias,
  obtenerDetalleIncidencia,
  actualizarIncidenciaAdmin,
  actualizarVisibilidadPublica,
  finalizarSeguimientoAdmin,
  cerrarMiIncidencia,
  compartirIncidencia,
  agregarComentarioIncidencia,
  obtenerComentariosIncidencia,
} from './IncidenciaController';
import {
  registrarEvidencia,
  obtenerArchivoEvidencia,
} from './IncidenciaEvidenciaController';

import {
  verificarTokenOpcional,
} from '../../../middlewares/verificarTokenOpcional';
import { verificarToken } from '../../../middlewares/auth.middleware';
import { autorizarRoles } from '../../../middlewares/authorization.middleware';


const router = Router();

// ============================================================
// REGISTRAR INCIDENCIA
// Público: usuarios registrados y no registrados
// ============================================================

router.post(
  '/',
  verificarTokenOpcional,
  (req, res) => registrarIncidencia(req, res),
);

// ============================================================
// OBTENER TODAS LAS INCIDENCIAS
// Público
// ============================================================

router.get(
  '/',
  (req, res) => listarIncidencias(req, res),
);

router.get(
  '/mis-incidencias',
  verificarToken,
  autorizarRoles('visitante', 'asociado'),
  (req, res) => listarMisIncidencias(req, res),
);

router.patch(
  '/:id/cerrar',
  verificarToken,
  autorizarRoles('visitante', 'asociado'),
  (req, res) => cerrarMiIncidencia(req, res),
);
router.post('/:id/comentarios', verificarToken, autorizarRoles('administrador', 'super_admin'), (req, res) => agregarComentarioIncidencia(req, res));
router.get('/:id/comentarios', verificarToken, (req, res) => obtenerComentariosIncidencia(req, res));

router.get(
  '/:id',
  (req, res) => obtenerDetalleIncidencia(req, res),
);

router.patch(
  '/:id/administracion',
  verificarToken,
  autorizarRoles('administrador'),
  (req, res) => actualizarIncidenciaAdmin(req, res),
);
router.post(
  '/:id/finalizar-seguimiento',
  verificarToken,
  autorizarRoles('administrador'),
  (req, res) => finalizarSeguimientoAdmin(req, res),
);
router.post(
  '/:id/compartir',
  verificarToken,
  autorizarRoles('administrador'),
  (req, res) => compartirIncidencia(req, res),
);
router.patch(
  '/:id/visibilidad',
  verificarToken,
  autorizarRoles('administrador', 'super_admin'),
  (req, res) => actualizarVisibilidadPublica(req, res),
);

router.get(
  '/evidencias/:id/archivo',
  (req, res) => obtenerArchivoEvidencia(req, res),
);

router.post(
  '/:id/evidencias',
  (req, res) => registrarEvidencia(req, res),
);


export default router;
