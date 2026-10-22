import { Router } from 'express';
import { verificarTokenOpcional } from '../../middlewares/verificarTokenOpcional';
import { ResenaController } from './ResenaController';

const router = Router();
const controller = new ResenaController();

router.post('/', verificarTokenOpcional, (req, res, next) => controller.crear(req, res, next));
router.get('/', (req, res, next) => controller.listar(req, res, next));

export default router;
