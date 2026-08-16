import { NextFunction, Request, Response } from 'express';
import {
  restablecerPassword,
  solicitarRecuperacionPassword,
} from './recuperacion.service';
import {
  MENSAJE_SOLICITUD_RECUPERACION,
  MENSAJE_TOKEN_INVALIDO,
  normalizarCorreo,
  validarCorreo,
  validarFormatoToken,
  validarPassword,
} from './recuperacion.validation';

const TIEMPO_MINIMO_RESPUESTA_MS = 400;

async function esperarTiempoMinimo(inicio: number): Promise<void> {
  const tiempoRestante = TIEMPO_MINIMO_RESPUESTA_MS - (Date.now() - inicio);

  if (tiempoRestante > 0) {
    await new Promise<void>((resolve) => {
      setTimeout(resolve, tiempoRestante);
    });
  }
}

export const solicitarRecuperacion = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const inicio = Date.now();
    const correo = req.body?.correo;

    if (typeof correo !== 'string' || !correo.trim()) {
      return res.status(400).json({
        ok: false,
        message: 'El correo es requerido',
      });
    }

    if (!validarCorreo(correo)) {
      return res.status(400).json({
        ok: false,
        message: 'El correo no tiene un formato válido',
      });
    }

    void solicitarRecuperacionPassword(normalizarCorreo(correo)).catch(() => {
      console.error('No se pudo procesar una solicitud de recuperación.');
    });
    await esperarTiempoMinimo(inicio);

    return res.status(200).json({
      ok: true,
      message: MENSAJE_SOLICITUD_RECUPERACION,
    });
  } catch {
    next(new Error('No se pudo procesar la recuperación de contraseña.'));
  }
};

export const restablecerContrasena = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const token = req.body?.token;
    const newPassword = req.body?.newPassword;

    if (
      typeof token !== 'string' ||
      !token.trim() ||
      typeof newPassword !== 'string' ||
      !newPassword.trim()
    ) {
      return res.status(400).json({
        ok: false,
        message: 'El token y la nueva contraseña son requeridos',
      });
    }

    const tokenNormalizado = token.trim();

    if (!validarFormatoToken(tokenNormalizado)) {
      return res.status(400).json({
        ok: false,
        message: MENSAJE_TOKEN_INVALIDO,
      });
    }

    const errorPassword = validarPassword(newPassword);

    if (errorPassword) {
      return res.status(400).json({
        ok: false,
        message: errorPassword,
      });
    }

    const resultado = await restablecerPassword(tokenNormalizado, newPassword);

    if (!resultado.ok) {
      return res.status(400).json(resultado);
    }

    return res.status(200).json(resultado);
  } catch {
    next(new Error('No se pudo procesar la recuperación de contraseña.'));
  }
};
