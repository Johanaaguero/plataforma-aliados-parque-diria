import { AppDataSource } from '../../../../data-source';
import { LoginAttempt } from '../../../../models/LoginAttempt';
import { Usuario } from '../../../../models/Usuario';
import { registrarAuditoria } from '../../Autenticación y seguridad de acceso al sistema/auditoria.service';

interface UnlockAccountInput {
  usuarioId: number;
  actorId: number;
  ipAddress: string | null;
  userAgent: string | null;
}

export const getBlockedAccounts = async () => {
  const ahora = new Date();

  const intentos = await AppDataSource.getRepository(LoginAttempt)
    .createQueryBuilder('loginAttempt')
    .innerJoinAndSelect('loginAttempt.usuario', 'usuario')
    .select([
      'loginAttempt.id',
      'loginAttempt.intentosFallidos',
      'loginAttempt.fechaUltimoIntento',
      'loginAttempt.bloqueadoHasta',
      'usuario.id',
      'usuario.nombreUsuario',
      'usuario.correo',
    ])
    .where('loginAttempt.bloqueadoHasta > :ahora', { ahora })
    .orderBy('loginAttempt.bloqueadoHasta', 'ASC')
    .getMany();

  return intentos.map((intento) => ({
    id: intento.usuario.id,
    nombreUsuario: intento.usuario.nombreUsuario,
    correo: intento.usuario.correo,
    intentosFallidos: intento.intentosFallidos,
    fechaUltimoIntento: intento.fechaUltimoIntento,
    bloqueadoHasta: intento.bloqueadoHasta,
  }));
};

export const unlockAccount = async ({
  usuarioId,
  actorId,
  ipAddress,
  userAgent,
}: UnlockAccountInput) => {
  return AppDataSource.transaction(async (manager) => {
    const usuario = await manager
      .getRepository(Usuario)
      .createQueryBuilder('usuario')
      .select(['usuario.id', 'usuario.nombreUsuario'])
      .where('usuario.id = :usuarioId', { usuarioId })
      .getOne();

    if (!usuario) {
      return {
        ok: false as const,
        status: 404 as const,
        message: 'El usuario no existe',
      };
    }

    const intentoRepository = manager.getRepository(LoginAttempt);
    const intento = await intentoRepository
      .createQueryBuilder('loginAttempt')
      .where('loginAttempt.usuarioId = :usuarioId', { usuarioId })
      .setLock('pessimistic_write')
      .getOne();

    if (!intento) {
      return {
        ok: false as const,
        status: 404 as const,
        message: 'El registro de intentos de inicio de sesión no existe',
      };
    }

    const intentosFallidosAnteriores = intento.intentosFallidos;
    const bloqueadoHastaAnterior = intento.bloqueadoHasta;

    intento.intentosFallidos = 0;
    intento.bloqueadoHasta = null;

    await intentoRepository.save(intento);

    await registrarAuditoria(
      {
        usuarioId: actorId,
        action: 'ACCOUNT_UNLOCKED',
        description: `Cuenta del usuario ${usuarioId} desbloqueada administrativamente`,
        ipAddress,
        userAgent,
        status: 'success',
        details: JSON.stringify({
          usuarioAfectadoId: usuarioId,
          nombreUsuarioAfectado: usuario.nombreUsuario,
          intentosFallidosAnteriores,
          bloqueadoHastaAnterior:
            bloqueadoHastaAnterior?.toISOString() ?? null,
          intentosFallidosNuevos: 0,
          bloqueadoHastaNuevo: null,
        }),
      },
      manager,
    );

    return {
      ok: true as const,
      message: 'Cuenta desbloqueada correctamente',
      data: {
        id: usuario.id,
        nombreUsuario: usuario.nombreUsuario,
        intentosFallidos: intento.intentosFallidos,
        bloqueadoHasta: intento.bloqueadoHasta,
      },
    };
  });
};
