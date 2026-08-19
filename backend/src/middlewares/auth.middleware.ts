import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AppDataSource } from '../data-source';
import { TokenBlacklist } from '../models/TokenBlacklist';
import { registrarAuditoria, extraerIPDelRequest } from '../modulos/Autenticación y gestión de usuario/auditoria.service';

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
      message: 'Token no proporcionado',
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

  const blacklistRepo = AppDataSource.getRepository(TokenBlacklist);
  const tokenInvalido = await blacklistRepo.findOne({ where: { token } });

  if (tokenInvalido) {
    return res.status(401).json({
      ok: false,
      code: 'TOKEN_BLACKLISTED',
      message: 'Token inválido o ya cerrado',
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as unknown as TokenPayload;

    // Verificar inactividad (TTL)
    if (decoded.lastActivity) {
      const ahoraEnSegundos = Math.floor(Date.now() / 1000);
      const tiempoInactivoSegundos = ahoraEnSegundos - decoded.lastActivity;
      const tiempoInactivoMinutos = tiempoInactivoSegundos / 60;

      if (tiempoInactivoMinutos > MINUTOS_INACTIVIDAD) {
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

      // Actualizar lastActivity en el token
      decoded.lastActivity = ahoraEnSegundos;
    }

    req.usuario = decoded;
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({
        ok: false,
        code: 'TOKEN_EXPIRED',
        message: 'Token expirado',
      });
    }

    return res.status(401).json({
      ok: false,
      code: 'INVALID_TOKEN',
      message: 'Token inválido',
    });
  }
};