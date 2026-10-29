import { createHash, randomBytes } from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { AppDataSource } from '../../../data-source';
import type { EntityManager } from 'typeorm';
import { CambioCorreoPerfil } from '../../../models/CambioCorreoPerfil';
import { TokenBlacklist } from '../../../models/TokenBlacklist';
import { Usuario } from '../../../models/Usuario';
import { registrarAuditoria } from '../Autenticación y seguridad de acceso al sistema/auditoria.service';
import {
  enviarAvisoCambioContrasena,
  enviarAvisoCambioCorreo,
  enviarVerificacionCambioCorreo,
} from '../Recuperación de contraseña/correo.service';

const EXPIRACION_CAMBIO_CORREO_MINUTOS = 30;
const RONDAS_BCRYPT = 10;

export class PerfilError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string,
  ) {
    super(message);
    this.name = 'PerfilError';
  }
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function esDuplicadoBaseDatos(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: string }).code === 'ER_DUP_ENTRY'
  );
}

function lanzarUsuarioNoEncontrado(): never {
  throw new PerfilError('No se encontró la cuenta autenticada.', 404, 'PROFILE_NOT_FOUND');
}

async function obtenerUsuarioBloqueado(
  usuarioId: number,
  manager: EntityManager,
  incluirContrasena = false,
): Promise<Usuario> {
  const consulta = manager
    .getRepository(Usuario)
    .createQueryBuilder('usuario')
    .setLock('pessimistic_write')
    .where('usuario.id = :usuarioId', { usuarioId });

  if (incluirContrasena) {
    consulta.addSelect('usuario.contraseña');
  }

  const usuario = await consulta.getOne();
  if (!usuario) lanzarUsuarioNoEncontrado();
  return usuario;
}

export async function obtenerPerfil(usuarioId: number) {
  const usuario = await AppDataSource.getRepository(Usuario)
    .createQueryBuilder('usuario')
    .addSelect('usuario.fotoPerfilMime')
    .where('usuario.id = :usuarioId', { usuarioId })
    .getOne();

  if (!usuario) lanzarUsuarioNoEncontrado();

  const cambioPendiente = await AppDataSource
    .getRepository(CambioCorreoPerfil)
    .createQueryBuilder('cambio')
    .where('cambio.usuario_id = :usuarioId', { usuarioId })
    .andWhere('cambio.used_at IS NULL')
    .andWhere('cambio.expires_at > :ahora', { ahora: new Date() })
    .getOne();

  return {
    id: usuario.id,
    nombreUsuario: usuario.nombreUsuario,
    nombre: usuario.nombre,
    apellidos: usuario.apellidos,
    correo: usuario.correo,
    correoVerificado: usuario.correoVerificado,
    correoPendiente: cambioPendiente?.correoNuevo ?? null,
    telefono: usuario.telefono,
    telefonoVerificado: usuario.telefonoVerificado,
    tieneFotoPerfil: Boolean(usuario.fotoPerfilMime),
    fechaCreacion: usuario.createdAt,
  };
}

export async function actualizarDatosPerfil(
  usuarioId: number,
  datos: { nombre?: string; apellidos?: string; telefono?: string },
) {
  const cambios: string[] = [];

  await AppDataSource.transaction(async (manager) => {
    const usuario = await obtenerUsuarioBloqueado(usuarioId, manager);
    const usuarioRepository = manager.getRepository(Usuario);

    if (datos.telefono !== undefined && datos.telefono !== usuario.telefono) {
      const telefonoExistente = await usuarioRepository
        .createQueryBuilder('usuario')
        .where('usuario.id <> :usuarioId', { usuarioId })
        .andWhere('usuario.telefono = :telefono', { telefono: datos.telefono })
        .getOne();

      if (telefonoExistente) {
        throw new PerfilError('Ese número de teléfono ya está registrado.', 409, 'PHONE_IN_USE');
      }

      usuario.telefono = datos.telefono;
      usuario.telefonoVerificado = false;
      cambios.push('telefono');
    }

    if (datos.nombre !== undefined && datos.nombre !== usuario.nombre) {
      usuario.nombre = datos.nombre;
      cambios.push('nombre');
    }

    if (datos.apellidos !== undefined && datos.apellidos !== usuario.apellidos) {
      usuario.apellidos = datos.apellidos;
      cambios.push('apellidos');
    }

    await usuarioRepository.save(usuario);
    if (cambios.length > 0) {
      await registrarAuditoria(
        {
          usuarioId,
          action: 'PROFILE_UPDATED',
          description: 'El usuario actualizó sus datos de perfil',
          status: 'success',
        },
        manager,
      );
    }
  });

  return obtenerPerfil(usuarioId);
}

export async function solicitarCambioCorreo(
  usuarioId: number,
  correoNuevo: string,
  contrasenaActual: string,
): Promise<void> {
  const token = randomBytes(32).toString('hex');
  const tokenHash = hashToken(token);
  const ahora = new Date();
  const expira = new Date(
    ahora.getTime() + EXPIRACION_CAMBIO_CORREO_MINUTOS * 60_000,
  );
  let correoDestino = '';
  let nombreDestino = '';

  try {
    await AppDataSource.transaction(async (manager) => {
      const usuario = await obtenerUsuarioBloqueado(usuarioId, manager, true);

      if (!(await bcrypt.compare(contrasenaActual, usuario.contraseña))) {
        throw new PerfilError(
          'La contraseña actual no es correcta.',
          401,
          'CURRENT_PASSWORD_INVALID',
        );
      }

      if (usuario.correo.toLowerCase() === correoNuevo) {
        throw new PerfilError(
          'El nuevo correo debe ser diferente al actual.',
          400,
          'EMAIL_UNCHANGED',
        );
      }

      const correoOcupado = await manager
        .getRepository(Usuario)
        .createQueryBuilder('usuario')
        .where('LOWER(usuario.correo) = :correoNuevo', { correoNuevo })
        .andWhere('usuario.id <> :usuarioId', { usuarioId })
        .getOne();

      if (correoOcupado) {
        throw new PerfilError('Ese correo ya está registrado.', 409, 'EMAIL_IN_USE');
      }

      const cambiosRepository = manager.getRepository(CambioCorreoPerfil);
      await cambiosRepository
        .createQueryBuilder()
        .update(CambioCorreoPerfil)
        .set({ correoNuevo: null, usedAt: ahora })
        .where('used_at IS NULL')
        .andWhere('expires_at <= :ahora', { ahora })
        .execute();
      await cambiosRepository
        .createQueryBuilder()
        .update(CambioCorreoPerfil)
        .set({ correoNuevo: null, usedAt: ahora })
        .where('usuario_id = :usuarioId', { usuarioId })
        .andWhere('used_at IS NULL')
        .execute();

      const cambio = cambiosRepository.create({
        usuarioId,
        tokenHash,
        correoNuevo,
        expiresAt: expira,
        usedAt: null,
      });
      await cambiosRepository.save(cambio);
      correoDestino = correoNuevo;
      nombreDestino = usuario.nombre;
    });
  } catch (error) {
    if (esDuplicadoBaseDatos(error)) {
      throw new PerfilError('Ese correo tiene una solicitud pendiente.', 409, 'EMAIL_IN_USE');
    }
    throw error;
  }

  try {
    await enviarVerificacionCambioCorreo({
      destinatario: correoDestino,
      nombre: nombreDestino,
      token,
      minutosExpiracion: EXPIRACION_CAMBIO_CORREO_MINUTOS,
    });
  } catch {
    await AppDataSource.getRepository(CambioCorreoPerfil).update(
      { tokenHash },
      { correoNuevo: null, usedAt: new Date() },
    );
    throw new PerfilError(
      'No se pudo enviar el correo de verificación. Inténtalo más tarde.',
      503,
      'EMAIL_DELIVERY_FAILED',
    );
  }
}

export async function confirmarCambioCorreo(token: string): Promise<{
  correo: string;
  notificacionAnteriorEnviada: boolean;
}> {
  const tokenHash = hashToken(token);
  let correoAnterior = '';
  let correoNuevo = '';
  let nombre = '';
  let usuarioId = 0;
  let correoOcupadoAlConfirmar = false;

  try {
    await AppDataSource.transaction(async (manager) => {
      const cambiosRepository = manager.getRepository(CambioCorreoPerfil);
      const cambio = await cambiosRepository
        .createQueryBuilder('cambio')
        .setLock('pessimistic_write')
        .where('cambio.token_hash = :tokenHash', { tokenHash })
        .getOne();
      const ahora = new Date();

      if (
        !cambio ||
        cambio.usedAt !== null ||
        !cambio.correoNuevo ||
        cambio.expiresAt.getTime() <= ahora.getTime()
      ) {
        throw new PerfilError(
          'El enlace no es válido, venció o ya fue utilizado.',
          400,
          'EMAIL_TOKEN_INVALID',
        );
      }

      const usuario = await obtenerUsuarioBloqueado(cambio.usuarioId, manager);
      const correoOcupado = await manager
        .getRepository(Usuario)
        .createQueryBuilder('usuario')
        .where('LOWER(usuario.correo) = :correoNuevo', {
          correoNuevo: cambio.correoNuevo.toLowerCase(),
        })
        .andWhere('usuario.id <> :usuarioId', { usuarioId: usuario.id })
        .getOne();

      if (correoOcupado) {
        cambio.correoNuevo = null;
        cambio.usedAt = ahora;
        await cambiosRepository.save(cambio);
        correoOcupadoAlConfirmar = true;
        return;
      }

      correoAnterior = usuario.correo;
      correoNuevo = cambio.correoNuevo;
      nombre = usuario.nombre;
      usuarioId = usuario.id;
      usuario.correo = correoNuevo;
      usuario.correoVerificado = true;
      await manager.getRepository(Usuario).save(usuario);

      cambio.correoNuevo = null;
      cambio.usedAt = ahora;
      await cambiosRepository.save(cambio);
      await registrarAuditoria(
        {
          usuarioId,
          action: 'EMAIL_CHANGED',
          description: 'El usuario confirmó un cambio de correo',
          status: 'success',
        },
        manager,
      );
    });
  } catch (error) {
    if (esDuplicadoBaseDatos(error)) {
      throw new PerfilError('Ese correo ya está registrado.', 409, 'EMAIL_IN_USE');
    }
    throw error;
  }

  if (correoOcupadoAlConfirmar) {
    throw new PerfilError('Ese correo ya está registrado.', 409, 'EMAIL_IN_USE');
  }

  try {
    await enviarAvisoCambioCorreo({
      destinatario: correoAnterior,
      nombre,
      nuevoCorreo: correoNuevo,
    });
    return { correo: correoNuevo, notificacionAnteriorEnviada: true };
  } catch {
    return { correo: correoNuevo, notificacionAnteriorEnviada: false };
  }
}

export async function cambiarContrasena(
  usuarioId: number,
  contrasenaActual: string,
  contrasenaNueva: string,
  tokenSesion: string,
): Promise<{ notificacionEnviada: boolean }> {
  let correo = '';
  let nombre = '';

  await AppDataSource.transaction(async (manager) => {
    const usuario = await obtenerUsuarioBloqueado(usuarioId, manager, true);
    if (!(await bcrypt.compare(contrasenaActual, usuario.contraseña))) {
      throw new PerfilError(
        'La contraseña actual no es correcta.',
        401,
        'CURRENT_PASSWORD_INVALID',
      );
    }

    if (await bcrypt.compare(contrasenaNueva, usuario.contraseña)) {
      throw new PerfilError(
        'La nueva contraseña debe ser diferente a la actual.',
        400,
        'PASSWORD_UNCHANGED',
      );
    }

    usuario.contraseña = await bcrypt.hash(contrasenaNueva, RONDAS_BCRYPT);
    await manager.getRepository(Usuario).save(usuario);

    const payload = jwt.decode(tokenSesion) as { exp?: number } | null;
    await manager.getRepository(TokenBlacklist).save({
      token: tokenSesion,
      motivo: 'Contraseña actualizada',
      expiracion: payload?.exp ? new Date(payload.exp * 1000) : null,
    });

    correo = usuario.correo;
    nombre = usuario.nombre;
    await registrarAuditoria(
      {
        usuarioId,
        action: 'PASSWORD_CHANGED',
        description: 'El usuario cambió su contraseña',
        status: 'success',
      },
      manager,
    );
  });

  try {
    await enviarAvisoCambioContrasena({ destinatario: correo, nombre });
    return { notificacionEnviada: true };
  } catch {
    return { notificacionEnviada: false };
  }
}

export async function obtenerFotoPerfil(usuarioId: number) {
  return AppDataSource.getRepository(Usuario).findOne({
    where: { id: usuarioId },
    select: { id: true, fotoPerfil: true, fotoPerfilMime: true },
  });
}

export async function guardarFotoPerfil(
  usuarioId: number,
  imagen: Buffer,
): Promise<void> {
  await AppDataSource.getRepository(Usuario).update(usuarioId, {
    fotoPerfil: imagen,
    fotoPerfilMime: 'image/webp',
  });
  await registrarAuditoria({
    usuarioId,
    action: 'PROFILE_PHOTO_UPDATED',
    description: 'El usuario actualizó su foto de perfil',
    status: 'success',
  });
}

export async function eliminarFotoPerfil(usuarioId: number): Promise<void> {
  await AppDataSource.getRepository(Usuario).update(usuarioId, {
    fotoPerfil: null,
    fotoPerfilMime: null,
  });
  await registrarAuditoria({
    usuarioId,
    action: 'PROFILE_PHOTO_REMOVED',
    description: 'El usuario eliminó su foto de perfil',
    status: 'success',
  });
}
