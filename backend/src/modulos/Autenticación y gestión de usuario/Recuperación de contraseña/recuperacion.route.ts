import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import {
  restablecerContrasena,
  solicitarRecuperacion,
} from './recuperacion.controller';

const router = Router();

const recuperacionRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: {
    ok: false,
    message: 'Demasiadas solicitudes de recuperación. Inténtalo de nuevo más tarde.',
  },
});

router.post('/forgot-password', recuperacionRateLimit, solicitarRecuperacion);
router.post('/reset-password', restablecerContrasena);

export default router;
