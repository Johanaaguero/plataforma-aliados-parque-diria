//PARA INCIDENCIAS
import { Request, Response, NextFunction } from 'express';

import jwt from 'jsonwebtoken';

import { AppDataSource } from '../data-source';

import { TokenBlacklist } from '../models/TokenBlacklist';

interface TokenPayload {
  id: number;
  nombreUsuario: string;
  rol: string;
  iat?: number;
  lastActivity?: number;
  exp?: number;
  jti?: string;
}

export const verificarTokenOpcional = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const authHeader = req.headers.authorization;

  // ------------------------------------------------------------
  // Si no hay token, continúa como usuario anónimo
  // ------------------------------------------------------------

  if (
    !authHeader ||
    !authHeader.startsWith('Bearer ')
  ) {
    next();
    return;
  }

  const token = authHeader.split(' ')[1];

  if (!token) {
    next();
    return;
  }

  try {
    const blacklistRepo =
      AppDataSource.getRepository(TokenBlacklist);

    const tokenInvalido =
      await blacklistRepo.findOne({
        where: {
          token,
        },
      });

    // Si el token está en blacklist, se trata como anónimo
    if (tokenInvalido) {
      next();
      return;
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET as string,
    ) as unknown as TokenPayload;

    req.usuario = decoded;

    next();
  } catch (error) {
    // Si el token es inválido o expiró,
    // no bloqueamos el reporte.
    // La incidencia simplemente queda anónima.
    next();
  }
};