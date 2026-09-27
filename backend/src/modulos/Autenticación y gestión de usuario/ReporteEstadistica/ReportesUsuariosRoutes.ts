import { Router } from 'express';

import {
  ReportesUsuariosController,
} from './ReportesUsuariosController';

import {
  verificarTokenOpcional,
} from '../../../middlewares/verificarTokenOpcional';

import {
  autorizarRoles,
} from '../../../middlewares/authorization.middleware';

const router = Router();

const reportesUsuariosController =
  new ReportesUsuariosController();

router.get(
  '/',
  verificarTokenOpcional,
  autorizarRoles('administrador'),
  reportesUsuariosController.obtenerEstadisticasUsuarios.bind(
    reportesUsuariosController,
  ),
);

export default router;