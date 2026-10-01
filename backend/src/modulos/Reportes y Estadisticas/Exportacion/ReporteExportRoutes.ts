import { Router } from 'express';
import { autorizarRoles } from '../../../middlewares/authorization.middleware';
import { verificarTokenOpcional } from '../../../middlewares/verificarTokenOpcional';
import { ReporteExportController } from './ReporteExportController';

const router = Router();
const reporteExportController = new ReporteExportController();

router.get('/:id/exportar', verificarTokenOpcional, autorizarRoles('administrador'), reporteExportController.exportar.bind(reporteExportController));

export default router;
