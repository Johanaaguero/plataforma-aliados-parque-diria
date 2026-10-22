import { Router } from 'express';

import {
  ReportesIncidenciasController,
} from './ReportesIncidenciasController';

import {
  verificarTokenOpcional,
} from '../../../middlewares/verificarTokenOpcional';

import {
  autorizarRoles,
} from '../../../middlewares/authorization.middleware';

const router = Router();

const reportesIncidenciasController =
  new ReportesIncidenciasController();

router.get(
  '/',
  verificarTokenOpcional,
  autorizarRoles('administrador'),
  reportesIncidenciasController.obtenerEstadisticas.bind(
    reportesIncidenciasController,
  ),
);

export default router;