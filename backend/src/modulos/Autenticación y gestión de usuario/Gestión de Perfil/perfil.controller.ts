import { Request, Response, NextFunction } from 'express';
import sharp, { type Sharp } from 'sharp';
import { parsePhoneNumberFromString } from 'libphonenumber-js';
import { PerfilError } from './perfil.service';
import {
  actualizarDatosPerfil,
  cambiarContrasena,
  confirmarCambioCorreo,
  eliminarFotoPerfil,
  guardarFotoPerfil,
  obtenerFotoPerfil,
  obtenerPerfil,
  solicitarCambioCorreo,
} from './perfil.service';

const CAMPOS_PERFIL_PERMITIDOS = new Set(['nombre', 'apellidos', 'telefono']);
const EXPRESION_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PIXELES_MAXIMOS = 16_777_216;
const TAMANO_FOTO_MAXIMO = 4 * 1024 * 1024;

function esObjeto(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === 'object' && valor !== null && !Array.isArray(valor);
}

function sanitizarTextoPerfil(
  valor: unknown,
  etiqueta: string,
): string {
  if (typeof valor !== 'string') {
    throw new PerfilError(`${etiqueta} no es válido.`, 400, 'INVALID_PROFILE_DATA');
  }

  const texto = valor.trim();
  if (
    !texto ||
    texto.length > 100 ||
    /[\u0000-\u001f\u007f]/.test(texto)
  ) {
    throw new PerfilError(
      `${etiqueta} debe contener entre 1 y 100 caracteres válidos.`,
      400,
      'INVALID_PROFILE_DATA',
    );
  }

  return texto;
}

function validarContrasena(contrasena: unknown, etiqueta: string): string {
  if (
    typeof contrasena !== 'string' ||
    Buffer.byteLength(contrasena, 'utf8') > 72 ||
    contrasena.length < 8 ||
    !/[a-z]/.test(contrasena) ||
    !/[A-Z]/.test(contrasena) ||
    !/[0-9]/.test(contrasena) ||
    !/[!@#$%^&*(),.?":{}|<>_\-+=]/.test(contrasena)
  ) {
    throw new PerfilError(
      `${etiqueta} debe tener al menos 8 caracteres, una minúscula, una mayúscula, un número y un carácter especial.`,
      400,
      'INVALID_PASSWORD',
    );
  }
  return contrasena;
}

function responderError(
  error: unknown,
  res: Response,
  next: NextFunction,
): void {
  if (error instanceof PerfilError) {
    res.status(error.status).json({
      ok: false,
      code: error.code,
      message: error.message,
    });
    return;
  }
  next(error);
}

function validarCamposPermitidos(
  cuerpo: Record<string, unknown>,
  permitidos: string[],
): void {
  if (Object.keys(cuerpo).some((campo) => !permitidos.includes(campo))) {
    throw new PerfilError(
      'La solicitud contiene campos no permitidos.',
      400,
      'INVALID_REQUEST_FIELDS',
    );
  }
}

export async function consultarMiPerfil(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const perfil = await obtenerPerfil(req.usuario!.id);
    res.setHeader('Cache-Control', 'no-store');
    res.json({ ok: true, data: perfil });
  } catch (error) {
    responderError(error, res, next);
  }
}

export async function actualizarMiPerfil(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    if (!esObjeto(req.body)) {
      throw new PerfilError('Los datos del perfil no son válidos.', 400, 'INVALID_PROFILE_DATA');
    }

    const camposRecibidos = Object.keys(req.body);
    if (
      camposRecibidos.some((campo) => !CAMPOS_PERFIL_PERMITIDOS.has(campo)) ||
      camposRecibidos.length === 0
    ) {
      throw new PerfilError(
        'Solo puedes modificar nombre, apellidos y teléfono.',
        400,
        'INVALID_PROFILE_FIELDS',
      );
    }

    const datos: { nombre?: string; apellidos?: string; telefono?: string } = {};
    if ('nombre' in req.body) datos.nombre = sanitizarTextoPerfil(req.body.nombre, 'El nombre');
    if ('apellidos' in req.body) datos.apellidos = sanitizarTextoPerfil(req.body.apellidos, 'Los apellidos');

    if ('telefono' in req.body) {
      if (typeof req.body.telefono !== 'string' || !req.body.telefono.trim()) {
        throw new PerfilError('El teléfono es obligatorio.', 400, 'INVALID_PHONE');
      }
      const numero = parsePhoneNumberFromString(req.body.telefono.trim(), 'CR');
      if (!numero || !numero.isValid() || numero.number.length > 20) {
        throw new PerfilError('El número de teléfono no es válido.', 400, 'INVALID_PHONE');
      }
      datos.telefono = numero.number;
    }

    const perfil = await actualizarDatosPerfil(req.usuario!.id, datos);
    res.json({ ok: true, data: perfil, message: 'Perfil actualizado correctamente.' });
  } catch (error) {
    responderError(error, res, next);
  }
}

export async function solicitarCambioCorreoPerfil(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    if (!esObjeto(req.body)) {
      throw new PerfilError('La solicitud no es válida.', 400, 'INVALID_REQUEST');
    }
    validarCamposPermitidos(req.body, ['correo', 'contrasenaActual']);
    const correo = typeof req.body.correo === 'string'
      ? req.body.correo.trim().toLowerCase()
      : '';
    if (correo.length > 150 || !EXPRESION_CORREO.test(correo)) {
      throw new PerfilError('El correo no tiene un formato válido.', 400, 'INVALID_EMAIL');
    }
    if (typeof req.body.contrasenaActual !== 'string' || !req.body.contrasenaActual) {
      throw new PerfilError('Debes confirmar tu contraseña actual.', 400, 'CURRENT_PASSWORD_REQUIRED');
    }

    await solicitarCambioCorreo(req.usuario!.id, correo, req.body.contrasenaActual);
    res.status(202).json({
      ok: true,
      message: 'Si el correo está disponible, recibirás un enlace de verificación que vence en 30 minutos.',
    });
  } catch (error) {
    responderError(error, res, next);
  }
}

export async function confirmarCambioCorreoPerfil(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    if (!esObjeto(req.body)) {
      throw new PerfilError('El enlace de verificación no es válido.', 400, 'EMAIL_TOKEN_INVALID');
    }
    validarCamposPermitidos(req.body, ['token']);
    if (typeof req.body.token !== 'string' || req.body.token.length > 128 || !req.body.token) {
      throw new PerfilError('El enlace de verificación no es válido.', 400, 'EMAIL_TOKEN_INVALID');
    }

    const resultado = await confirmarCambioCorreo(req.body.token);
    res.json({
      ok: true,
      data: resultado,
      message: resultado.notificacionAnteriorEnviada
        ? 'Correo actualizado y confirmado.'
        : 'Correo actualizado, pero no se pudo enviar el aviso a la dirección anterior.',
    });
  } catch (error) {
    responderError(error, res, next);
  }
}

export async function actualizarContrasenaPerfil(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    if (!esObjeto(req.body)) {
      throw new PerfilError('La solicitud no es válida.', 400, 'INVALID_REQUEST');
    }
    validarCamposPermitidos(req.body, [
      'contrasenaActual',
      'contrasenaNueva',
      'confirmacion',
    ]);
    if (typeof req.body.contrasenaActual !== 'string' || !req.body.contrasenaActual) {
      throw new PerfilError('Debes escribir tu contraseña actual.', 400, 'CURRENT_PASSWORD_REQUIRED');
    }

    const contrasenaNueva = validarContrasena(req.body.contrasenaNueva, 'La nueva contraseña');
    if (req.body.confirmacion !== contrasenaNueva) {
      throw new PerfilError('La confirmación no coincide.', 400, 'PASSWORD_CONFIRMATION_MISMATCH');
    }

    const token = req.headers.authorization?.slice('Bearer '.length);
    if (!token) {
      throw new PerfilError('La sesión no es válida.', 401, 'TOKEN_NOT_PROVIDED');
    }
    const resultado = await cambiarContrasena(
      req.usuario!.id,
      req.body.contrasenaActual,
      contrasenaNueva,
      token,
    );
    res.json({
      ok: true,
      data: resultado,
      message: resultado.notificacionEnviada
        ? 'Contraseña actualizada. Inicia sesión de nuevo.'
        : 'Contraseña actualizada, pero no se pudo enviar el aviso por correo. Inicia sesión de nuevo.',
    });
  } catch (error) {
    responderError(error, res, next);
  }
}

export async function subirFotoPerfil(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    if (!req.file || req.file.size > TAMANO_FOTO_MAXIMO) {
      throw new PerfilError('Selecciona una imagen de hasta 4 MB.', 400, 'INVALID_IMAGE');
    }

    let sharpImage: Sharp;
    try {
      sharpImage = sharp(req.file.buffer, {
        limitInputPixels: PIXELES_MAXIMOS,
        animated: false,
      });
      const metadata = await sharpImage.metadata();
      if (!['jpeg', 'png', 'webp'].includes(metadata.format ?? '')) {
        throw new Error('Formato no admitido');
      }
      if (
        !metadata.width ||
        !metadata.height ||
        metadata.width * metadata.height > PIXELES_MAXIMOS
      ) {
        throw new Error('Dimensiones no admitidas');
      }
    } catch {
      throw new PerfilError(
        'El archivo no es una imagen JPEG, PNG o WebP válida.',
        400,
        'INVALID_IMAGE',
      );
    }

    let fotoNormalizada: Buffer;
    try {
      fotoNormalizada = await sharpImage
        .rotate()
        .resize(512, 512, {
          fit: 'cover',
          position: 'attention',
          withoutEnlargement: true,
        })
        .webp({ quality: 82, effort: 4 })
        .toBuffer();
    } catch {
      throw new PerfilError(
        'No se pudo procesar la imagen seleccionada.',
        400,
        'INVALID_IMAGE',
      );
    }

    await guardarFotoPerfil(req.usuario!.id, fotoNormalizada);
    res.json({ ok: true, message: 'Foto de perfil actualizada.' });
  } catch (error) {
    responderError(error, res, next);
  }
}

export async function consultarFotoPerfil(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const usuario = await obtenerFotoPerfil(req.usuario!.id);
    if (!usuario) {
      throw new PerfilError('No se encontró la cuenta autenticada.', 404, 'PROFILE_NOT_FOUND');
    }
    if (!usuario.fotoPerfil || !usuario.fotoPerfilMime) {
      return res.status(404).json({
        ok: false,
        code: 'PROFILE_PHOTO_NOT_FOUND',
        message: 'No hay una foto de perfil guardada.',
      });
    }

    res.setHeader('Content-Type', usuario.fotoPerfilMime);
    res.setHeader('Cache-Control', 'private, no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.send(usuario.fotoPerfil);
  } catch (error) {
    responderError(error, res, next);
  }
}

export async function quitarFotoPerfil(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    await eliminarFotoPerfil(req.usuario!.id);
    res.json({ ok: true, message: 'Foto de perfil eliminada.' });
  } catch (error) {
    responderError(error, res, next);
  }
}
