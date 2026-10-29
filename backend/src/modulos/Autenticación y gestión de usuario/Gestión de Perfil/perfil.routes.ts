import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import multer from 'multer';
import { verificarToken } from '../../../middlewares/auth.middleware';
import {
  actualizarContrasenaPerfil,
  actualizarMiPerfil,
  confirmarCambioCorreoPerfil,
  consultarFotoPerfil,
  consultarMiPerfil,
  quitarFotoPerfil,
  solicitarCambioCorreoPerfil,
  subirFotoPerfil,
} from './perfil.controller';

const router = Router();

function crearLimitadorPerfil() {
  return rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 5,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: {
      ok: false,
      code: 'TOO_MANY_REQUESTS',
      message: 'Demasiadas solicitudes. Inténtalo de nuevo más tarde.',
    },
  });
}

const limiteCambioCorreo = crearLimitadorPerfil();
const limiteConfirmacionCorreo = crearLimitadorPerfil();
const limiteContrasena = crearLimitadorPerfil();
const limiteFoto = crearLimitadorPerfil();

const cargaFotoPerfil = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 4 * 1024 * 1024, files: 1 },
});
const procesarFotoPerfil = cargaFotoPerfil.single('foto');

function manejarErrorCargaFoto(
  error: unknown,
  req: Parameters<typeof procesarFotoPerfil>[0],
  res: Parameters<typeof procesarFotoPerfil>[1],
  next: Parameters<typeof procesarFotoPerfil>[2],
) {
  if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({
      ok: false,
      code: 'FILE_TOO_LARGE',
      message: 'La imagen de perfil no puede superar 4 MB.',
    });
  }
  return next(error);
}

router.post(
  '/profile/email/confirm',
  limiteConfirmacionCorreo,
  confirmarCambioCorreoPerfil,
);
router.use('/profile', verificarToken);
router.get('/profile', consultarMiPerfil);
router.patch('/profile', actualizarMiPerfil);
router.post(
  '/profile/email',
  limiteCambioCorreo,
  solicitarCambioCorreoPerfil,
);
router.put(
  '/profile/password',
  limiteContrasena,
  actualizarContrasenaPerfil,
);
router.get('/profile/photo', consultarFotoPerfil);
router.post(
  '/profile/photo',
  limiteFoto,
  (req, res, next) => {
    procesarFotoPerfil(req, res, (error) => {
      if (error) {
        return manejarErrorCargaFoto(error, req, res, next);
      }
      next();
    });
  },
  subirFotoPerfil,
);
router.delete('/profile/photo', limiteFoto, quitarFotoPerfil);

export default router;
