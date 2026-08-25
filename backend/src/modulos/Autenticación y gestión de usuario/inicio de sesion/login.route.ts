import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { login, logout } from './login.controller';
import { verificarToken } from '../../../middlewares/auth.middleware';

const loginRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // máximo 5 intentos de login por IP en 15 minutos
  message: {
    ok: false,
    code: 'RATE_LIMIT_EXCEEDED',
    message: 'Demasiados intentos de login. Inténtalo más tarde.',
  },
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    return req.method !== 'POST';
  },
});

const router = Router();

router.post('/login', loginRateLimit, login);
router.post('/logout', verificarToken, logout);

export default router;
