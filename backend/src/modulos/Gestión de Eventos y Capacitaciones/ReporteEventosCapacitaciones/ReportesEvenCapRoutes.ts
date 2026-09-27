import { Router } from 'express';

import { ReportesEventosController } from './ReportesEvenCapController';

import { verificarTokenOpcional } from '../../../middlewares/verificarTokenOpcional';

import { autorizarRoles } from '../../../middlewares/authorization.middleware';

const router = Router();

const controller =
  new ReportesEventosController();

router.get(
  '/estadisticas/eventos',
  verificarTokenOpcional,
  autorizarRoles('administrador'),
  controller.obtenerEstadisticas.bind(
    controller,
  ),
);

export default router;