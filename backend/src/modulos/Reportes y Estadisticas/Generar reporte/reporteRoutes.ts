
import { Router } from 'express';

import { ReporteController } from '../Generar reporte/ReporteController';
import { verificarToken } from '../../../middlewares/auth.middleware';
import { autorizarRoles } from '../../../middlewares/authorization.middleware';

const router = Router();
const reporteController = new ReporteController();

// Consultar todos los reportes: solo administrador autenticado
router.get(
  '/',
  verificarToken,
  autorizarRoles('administrador'),
  reporteController.obtenerTodos.bind(reporteController)
);

// Consultar un reporte por ID
router.get(
  '/:id',
  verificarToken,
  autorizarRoles('administrador'),
  reporteController.obtenerPorId.bind(reporteController)
);

// Generar un reporte
router.post(
  '/',
  verificarToken,
  autorizarRoles('administrador'),
  reporteController.crear.bind(reporteController)
);

// Eliminar un reporte
router.delete(
  '/:id',
  verificarToken,
  autorizarRoles('administrador'),
  reporteController.eliminar.bind(reporteController)
);

export default router;
