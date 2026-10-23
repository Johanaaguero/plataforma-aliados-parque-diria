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

function enmascararCorreo(correo: string): string {
  const [usuario, dominio] = correo.trim().split('@');
  return usuario && dominio ? `${usuario.slice(0, 1)}***@${dominio}` : 'correo-inválido';
}

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

    const correoNormalizado = normalizarCorreo(correo);
    console.info('Recuperación de contraseña: solicitud recibida', {
      destinatario: enmascararCorreo(correoNormalizado),
    });

    void solicitarRecuperacionPassword(correoNormalizado).catch((error: unknown) => {
      const message = error instanceof Error ? error.message : 'Error desconocido';
      console.error('Recuperación de contraseña: procesamiento interno falló', {
        destinatario: enmascararCorreo(correoNormalizado),
        message,
      });
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
