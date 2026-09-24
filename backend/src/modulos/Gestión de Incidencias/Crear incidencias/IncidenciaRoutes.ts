import { Router } from 'express';

import {
  registrarIncidencia,
  listarIncidencias,
  obtenerDetalleIncidencia,
} from './IncidenciaController';

import {
  registrarEvidencia,
  obtenerArchivoEvidencia,
} from './IncidenciaEvidenciaController';

import {
  verificarTokenOpcional,
} from '../../../middlewares/verificarTokenOpcional';


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
  '/:id',
  (req, res) => obtenerDetalleIncidencia(req, res),
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