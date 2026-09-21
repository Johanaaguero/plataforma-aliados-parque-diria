import { Router } from 'express';

import {
  registrarIncidencia,
  listarIncidencias,
} from './IncidenciaController';

import {
  registrarEvidencia,
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

// ============================================================
// REGISTRAR EVIDENCIA
// Público
// ============================================================

router.post(
  '/:id/evidencias',
  (req, res) => registrarEvidencia(req, res),
);

export default router;