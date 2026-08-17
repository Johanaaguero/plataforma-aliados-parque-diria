import { AppDataSource } from '../../../data-source';
import { TokenBlacklist } from '../../../models/TokenBlacklist';

// Implementado por: Dallane
export const logoutUser = async (token: string, motivo = 'logout') => {
  if (!token) {
    return { ok: false, message: 'Token no proporcionado' };
  }

  const repo = AppDataSource.getRepository(TokenBlacklist);

  const yaExiste = await repo.findOne({ where: { token } });

  if (yaExiste) {
    return { ok: true, message: 'El token ya estaba invalidado' };
  }

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
};
