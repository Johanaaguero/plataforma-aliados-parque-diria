import { createHash, randomBytes } from 'crypto';
import bcrypt from 'bcryptjs';
import { AppDataSource } from '../../../data-source';
import { RecuperacionContrasena } from '../../../models/RecuperacionContrasena';
import { Usuario } from '../../../models/Usuario';
import { enviarCorreoRecuperacion } from './correo.service';
import { MENSAJE_TOKEN_INVALIDO } from './recuperacion.validation';

const BCRYPT_SALT_ROUNDS = 10;
const MINUTOS_EXPIRACION_POR_DEFECTO = 30;

function obtenerMinutosExpiracion(): number {
  const valorConfigurado = process.env.PASSWORD_RESET_EXPIRES_MINUTES?.trim();

  if (!valorConfigurado) {
    return MINUTOS_EXPIRACION_POR_DEFECTO;
  }

  const minutos = Number(valorConfigurado);

  if (!Number.isSafeInteger(minutos) || minutos <= 0) {
    throw new Error('PASSWORD_RESET_EXPIRES_MINUTES debe ser un entero positivo');
  }

  return minutos;
}

function generarHashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export async function solicitarRecuperacionPassword(correo: string): Promise<void> {
  const minutosExpiracion = obtenerMinutosExpiracion();
  const tokenOriginal = randomBytes(32).toString('hex');
  const tokenHash = generarHashToken(tokenOriginal);
  const ahora = new Date();
  const expiresAt = new Date(ahora.getTime() + minutosExpiracion * 60 * 1000);

  if (Number.isNaN(expiresAt.getTime())) {
    throw new Error('PASSWORD_RESET_EXPIRES_MINUTES produce una fecha inválida');
  }

  let recuperacionId: number | undefined;
  let destinatario: string | undefined;
  let nombreDestinatario: string | undefined;

  try {
    await AppDataSource.transaction(async (manager) => {
      const usuarioBloqueado = await manager
        .getRepository(Usuario)
        .createQueryBuilder('usuario')
        .setLock('pessimistic_write')
        .where('usuario.correo = :correo', { correo })
        .getOne();

      if (!usuarioBloqueado) {
        return;
      }

      const recuperacionRepository =
        manager.getRepository(RecuperacionContrasena);

      await recuperacionRepository
        .createQueryBuilder()
        .update(RecuperacionContrasena)
        .set({ usedAt: ahora })
        .where('usuario_id = :usuarioId', { usuarioId: usuarioBloqueado.id })
        .andWhere('used_at IS NULL')
        .andWhere('expires_at > :ahora', { ahora })
        .execute();

      const nuevaRecuperacion = recuperacionRepository.create({
        usuarioId: usuarioBloqueado.id,
        tokenHash,
        expiresAt,
        usedAt: null,
      });
      const recuperacionGuardada =
        await recuperacionRepository.save(nuevaRecuperacion);

      recuperacionId = recuperacionGuardada.id;
      destinatario = usuarioBloqueado.correo;
      nombreDestinatario = usuarioBloqueado.nombre;
    });
  } catch {
    console.error('No se pudo generar un token de recuperación de contraseña.');
    return;
  }

  if (
    recuperacionId === undefined ||
    destinatario === undefined ||
    nombreDestinatario === undefined
  ) {
    return;
  }

  const idToken = recuperacionId;

  // El envío se desacopla para que el tiempo de respuesta no revele si la cuenta existe.
  void enviarCorreoRecuperacion({
    destinatario,
    nombre: nombreDestinatario,
    token: tokenOriginal,
    minutosExpiracion,
  }).catch(async () => {
    try {
      await AppDataSource.getRepository(RecuperacionContrasena).update(
        { id: idToken },
        { usedAt: new Date() },
      );
    } catch {
      console.error('No se pudo invalidar un token cuyo correo no fue enviado.');
    }

    console.error('No se pudo enviar un correo de recuperación de contraseña.');
  });
}

export async function restablecerPassword(
  token: string,
  newPassword: string,
): Promise<{ ok: boolean; message: string }> {
  const tokenHash = generarHashToken(token);
  const ahoraPreliminar = new Date();
  const recuperacionPreliminar =
    await AppDataSource.getRepository(RecuperacionContrasena).findOne({
      where: { tokenHash },
    });
  if (process.env.NODE_ENV !== 'production') {
    console.debug('Recuperación de contraseña: token localizado', {
      encontrado: Boolean(recuperacionPreliminar),
      usado: recuperacionPreliminar?.usedAt !== null,
      expirado: recuperacionPreliminar
        ? recuperacionPreliminar.expiresAt.getTime() <= ahoraPreliminar.getTime()
        : null,
    });
  }

  if (
    !recuperacionPreliminar ||
    recuperacionPreliminar.usedAt !== null ||
    recuperacionPreliminar.expiresAt.getTime() <= ahoraPreliminar.getTime()
  ) {
    return {
      ok: false,
      message: MENSAJE_TOKEN_INVALIDO,
    };
  }

  const nuevaContrasena = await bcrypt.hash(newPassword, BCRYPT_SALT_ROUNDS);

  return AppDataSource.transaction(async (manager) => {
    const recuperacionRepository = manager.getRepository(RecuperacionContrasena);
    const usuarioRepository = manager.getRepository(Usuario);
    const usuario = await usuarioRepository
      .createQueryBuilder('usuario')
      .setLock('pessimistic_write')
      .where('usuario.id = :usuarioId', {
        usuarioId: recuperacionPreliminar.usuarioId,
      })
      .getOne();

    if (!usuario) {
      return {
        ok: false,
        message: MENSAJE_TOKEN_INVALIDO,
      };
    }

    const recuperacion = await recuperacionRepository
      .createQueryBuilder('recuperacion')
      .setLock('pessimistic_write')
      .where('recuperacion.tokenHash = :tokenHash', { tokenHash })
      .getOne();
    const ahora = new Date();

    if (
      !recuperacion ||
      recuperacion.usuarioId !== usuario.id ||
      recuperacion.usedAt !== null ||
      recuperacion.expiresAt.getTime() <= ahora.getTime()
    ) {
      return {
        ok: false,
        message: MENSAJE_TOKEN_INVALIDO,
      };
    }

    usuario.contraseña = nuevaContrasena;
    usuario.updatedAt = ahora;

    await recuperacionRepository
      .createQueryBuilder()
      .update(RecuperacionContrasena)
      .set({ usedAt: ahora })
      .where('usuario_id = :usuarioId', { usuarioId: usuario.id })
      .andWhere('used_at IS NULL')
      .andWhere('expires_at > :ahora', { ahora })
      .execute();
    await usuarioRepository.save(usuario);

    return {
      ok: true,
      message:
        'Contraseña restablecida correctamente. Ya puedes iniciar sesión con tu nueva contraseña.',
    };
  });
}
