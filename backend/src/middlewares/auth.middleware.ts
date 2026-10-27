
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AppDataSource } from '../data-source';
import { TokenBlacklist } from '../models/TokenBlacklist';
import { SesionActiva } from '../models/SesionActiva';
import {
  registrarAuditoria,
  extraerIPDelRequest,
} from '../modulos/Autenticación y gestión de usuario/Autenticación y seguridad de acceso al sistema/auditoria.service';

interface TokenPayload {
  id: number;
  nombreUsuario: string;
  rol: string;
  iat?: number;
  lastActivity?: number;
  exp?: number;
  jti?: string;
}

declare global {
  namespace Express {
    interface Request {
      usuario?: TokenPayload;
    }
  }
}

const MINUTOS_INACTIVIDAD = 30;

export const verificarToken = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      ok: false,
      code: 'TOKEN_NOT_PROVIDED',
      message: 'Se requiere inicio de sesión',
    });
  }

  const token = authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      ok: false,
      code: 'TOKEN_NOT_PROVIDED',
      message: 'Token no proporcionado',
    });
  }

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET as string,
    ) as unknown as TokenPayload;

    // El token debe identificar al usuario y su sesión.
    if (!decoded.id || !decoded.jti) {
      return res.status(401).json({
        ok: false,
        code: 'INVALID_TOKEN',
        message: 'Token inválido o sin identificador de sesión',
      });
    }

    const blacklistRepo = AppDataSource.getRepository(TokenBlacklist);
    const tokenInvalido = await blacklistRepo.findOne({
      where: { token },
    });

    if (tokenInvalido) {
      return res.status(401).json({
        ok: false,
        code: 'TOKEN_BLACKLISTED',
        message: 'Token inválido o ya cerrado',
      });
    }

    const sesionesRepo = AppDataSource.getRepository(SesionActiva);

    const sesionActiva = await sesionesRepo.findOne({
      where: { usuarioId: decoded.id },
    });

    // No existe una sesión activa o el token pertenece a otra sesión.
    if (!sesionActiva || sesionActiva.jti !== decoded.jti) {
      return res.status(401).json({
        ok: false,
        code: 'SESSION_INVALIDATED',
        message: 'Esta sesión ya no está activa. Inicia sesión nuevamente.',
      });
    }

    const ahora = new Date();
    const limiteInactividad = new Date(
      ahora.getTime() - MINUTOS_INACTIVIDAD * 60 * 1000,
    );

    // Verificar el tiempo máximo de sesión.
    if (sesionActiva.expiraEn <= ahora) {
      await sesionesRepo.delete({ id: sesionActiva.id });

      return res.status(401).json({
        ok: false,
        code: 'TOKEN_EXPIRED',
        message: 'La sesión ha expirado. Inicia sesión nuevamente.',
      });
    }

    // Verificar la inactividad usando la última actividad persistida.
    if (sesionActiva.ultimaActividad <= limiteInactividad) {
      await sesionesRepo.delete({ id: sesionActiva.id });

      await registrarAuditoria({
        usuarioId: decoded.id,
        action: 'SESSION_TIMEOUT',
        description: 'Sesión cerrada por inactividad',
        ipAddress: extraerIPDelRequest(req),
        userAgent: (req.headers['user-agent'] || null) as string | null,
        status: 'failure',
      });

      return res.status(401).json({
        ok: false,
        code: 'SESSION_TIMEOUT',
        message: 'Sesión expirada por inactividad',
      });
    }

    // Actualizar la última actividad en la base de datos.
    sesionActiva.ultimaActividad = ahora;
    await sesionesRepo.save(sesionActiva);

    // Mantener el usuario disponible para los controladores existentes.
    req.usuario = decoded;

    return next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({
        ok: false,
        code: 'TOKEN_EXPIRED',
        message: 'Token expirado',
      });
    }

    console.error('Error al verificar el token:', error);

    return res.status(401).json({
      ok: false,
      code: 'INVALID_TOKEN',
      message: 'No se pudo validar la sesión o el token es inválido',
    });
  }
};
