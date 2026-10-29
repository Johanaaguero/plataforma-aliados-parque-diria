import { Router, text } from 'express';
import type { Request } from 'express';
import { ipKeyGenerator, rateLimit } from 'express-rate-limit';
import { cierrePendiente, latido, login, logout } from './login.controller';
import { verificarToken } from '../../../middlewares/auth.middleware';

export const obtenerClaveRateLimitLogin = (req: Request): string => {
  const identificador =
    typeof req.body?.identificador === 'string'
      ? req.body.identificador.trim().toLowerCase()
      : 'sin-identificador';

  return `${ipKeyGenerator(req.ip ?? 'ip-desconocida')}:${identificador}`;
};

const loginRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // maximo 5 intentos de login por IP e identificador en 15 minutos
  keyGenerator: obtenerClaveRateLimitLogin,
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

// Control de sesión por pestaña. No usan verificarToken a propósito:
// no deben contar como actividad del usuario (ultimaActividad).
router.post('/session/heartbeat', latido);
router.post('/session/closing', text({ type: '*/*', limit: '4kb' }), cierrePendiente);

export default router;
