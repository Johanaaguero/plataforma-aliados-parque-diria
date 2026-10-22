import { Router } from 'express';
import { EventosController } from './eventos.controller';

const router = Router();
const controller = new EventosController();

// Catálogo público de actividades publicadas, disponible sin autenticación.
router.get('/', (req, res, next) => controller.listar(req, res, next));
router.get('/:id', (req, res, next) => controller.obtenerDetalle(req, res, next));

export default router;
