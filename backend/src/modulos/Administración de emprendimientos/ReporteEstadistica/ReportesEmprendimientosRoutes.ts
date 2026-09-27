import { Router } from 'express';
import { ReportesController } from './ReportesEmprendimientosController';

import { verificarTokenOpcional } from '../../../middlewares/verificarTokenOpcional';
import { autorizarRoles } from '../../../middlewares/authorization.middleware';

const router = Router();

const reportesController = new ReportesController();

router.get(
  '/estadisticas/emprendimientos',
  verificarTokenOpcional,
  autorizarRoles('administrador'),
  reportesController.obtenerEstadisticasEmprendimientos.bind(
    reportesController,
  ),
);

export default router;