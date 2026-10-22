import { Router } from 'express';

import { ReportesReservasController } from './ReportesReservasController';

import { verificarTokenOpcional } from '../../../../middlewares/verificarTokenOpcional';

import { autorizarRoles } from '../../../../middlewares/authorization.middleware';

const router = Router();

const controller =
  new ReportesReservasController();

router.get(
  '/estadisticas/reservas',
  verificarTokenOpcional,
  autorizarRoles('administrador'),
  controller.obtenerEstadisticas.bind(
    controller,
  ),
);

export default router;