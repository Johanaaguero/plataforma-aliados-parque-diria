
import { AppDataSource } from '../../../data-source';
import { TokenBlacklist } from '../../../models/TokenBlacklist';
import { SesionActiva } from '../../../models/SesionActiva';
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
    // Leer los datos del token.
    const decoded = jwt.decode(token) as {
      id?: number;
      jti?: string;
      exp?: number;
    } | null;

    if (!decoded || !decoded.jti || !decoded.id) {
      return {
        ok: false,
        message: 'Token inválido: no contiene los datos de sesión necesarios',
      };
    }

    const repo = AppDataSource.getRepository(TokenBlacklist);
    const sesionesRepo = AppDataSource.getRepository(SesionActiva);

    // Invalidar el token para que no vuelva a utilizarse.
    const yaExiste = await repo.findOne({
      where: { token },
    });

    if (!yaExiste) {
      const tokenInvalidado = repo.create({
        token,
        motivo,
        expiracion: null,
      });

      await repo.save(tokenInvalidado);
    }

    // Eliminar únicamente la sesión que corresponde a este token.
    // Así, un token antiguo no puede borrar una sesión nueva.
    const sesionActiva = await sesionesRepo.findOne({
      where: {
        usuarioId: decoded.id,
        jti: decoded.jti,
      },
    });

    if (sesionActiva) {
      await sesionesRepo.delete({
        id: sesionActiva.id,
      });
    }

    return {
      ok: true,
      message: yaExiste
        ? 'El token ya estaba invalidado y se verificó la sesión'
        : 'Sesión cerrada correctamente',
    };
  } catch (error) {
    console.error('Error al cerrar sesión:', error);

    return {
      ok: false,
      message: 'No se pudo cerrar la sesión',
    };
  }
};
