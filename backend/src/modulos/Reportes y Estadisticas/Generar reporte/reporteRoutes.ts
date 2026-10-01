import { Router } from 'express';

import { ReporteController } from '../Generar reporte/ReporteController';

import { verificarTokenOpcional} from '../../../middlewares/verificarTokenOpcional';
import { autorizarRoles } from '../../../middlewares/authorization.middleware';

const router = Router();

const reporteController = new ReporteController();

// Obtener todos los reportes
router.get(
  '/',
  verificarTokenOpcional,
  autorizarRoles('administrador'),
  reporteController.obtenerTodos.bind(reporteController)
);

// Obtener un reporte por ID
router.get(
  '/:id',
  verificarTokenOpcional,
  autorizarRoles('administrador'),
  reporteController.obtenerPorId.bind(reporteController)
);

// Generar un reporte
router.post(
  '/',
  verificarTokenOpcional,
  autorizarRoles('administrador'),
  reporteController.crear.bind(reporteController)
);

// Eliminar un reporte
router.delete(
  '/:id',
  verificarTokenOpcional,
  autorizarRoles('administrador'),
  reporteController.eliminar.bind(reporteController)
);

export default router;
