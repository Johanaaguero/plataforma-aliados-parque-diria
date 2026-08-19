import { AppDataSource } from '../../../data-source';
import { TokenBlacklist } from '../../../models/TokenBlacklist';
import jwt from 'jsonwebtoken';

export const logoutUser = async (
  token: string,
  motivo = 'logout',
) => {
  if (!token) {
    return {
      ok: false,
      message: 'Token no proporcionado',
    };
  }

  try {
    const decoded = jwt.decode(token) as {
      id?: number;
      jti?: string;
      exp?: number;
    } | null;

    if (!decoded || !decoded.jti) {
      return {
        ok: false,
        message: 'Token inválido: no contiene JTI',
      };
    }

    const repo = AppDataSource.getRepository(TokenBlacklist);

    const yaExiste = await repo.findOne({
      where: { token,
      },
    });

    if (yaExiste) {
      return {
        ok: true,
        message: 'El token ya estaba invalidado',
      };
    }

    const expiracion = decoded.exp
      ? new Date(decoded.exp * 1000)
      : new Date(Date.now() + 2 * 60 * 60 * 1000);

    const tokenInvalidado = repo.create({
       token,
  motivo,
  expiracion: null,
    });

    await repo.save(tokenInvalidado);

    return {
      ok: true,
      message: 'Sesión cerrada correctamente',
    };
  } catch (error) {
    console.error('Error al invalidar token:', error);

    return {
      ok: false,
      message: 'No se pudo invalidar el token',
    };
  }
};