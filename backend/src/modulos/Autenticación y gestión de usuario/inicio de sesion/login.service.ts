
import { AppDataSource } from '../../../data-source';
import { Usuario } from '../../../models/Usuario';
import { LoginAttempt } from '../../../models/LoginAttempt';
import { IntentoAcceso } from '../../../models/IntentoAcceso';
import { SesionActiva } from '../../../models/SesionActiva';
import { registrarAuditoria } from '../Autenticación y seguridad de acceso al sistema/auditoria.service';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'node:crypto';

interface LoginInput {
  identificador: string;
  password: string;
  ipAddress?: string;
  userAgent?: string | undefined;
}

const MAX_INTENTOS = 3;
const MINUTOS_BLOQUEO = 15;
const MINUTOS_INACTIVIDAD = 30; // TTL de inactividad: 30 minutos

export const loginUser = async ({
  identificador,
  password,
  ipAddress,
  userAgent,
}: LoginInput) => {
  const usuarioRepo = AppDataSource.getRepository(Usuario);
  const attemptRepo = AppDataSource.getRepository(LoginAttempt);
  const intentoAccesoRepo = AppDataSource.getRepository(IntentoAcceso);
  const sesionesRepo = AppDataSource.getRepository(SesionActiva);

  const identificadorNormalizado = identificador.trim().toLowerCase();

  const usuario = await usuarioRepo
    .createQueryBuilder('usuario')
    .leftJoinAndSelect('usuario.rol', 'rol')
    .where('LOWER(usuario.correo) = :identificador', {
      identificador: identificadorNormalizado,
    })
    .orWhere('LOWER(usuario.nombreUsuario) = :identificador', {
      identificador: identificadorNormalizado,
    })
    .getOne();

  // USUARIO NO ENCONTRADO
  if (!usuario) {
    await intentoAccesoRepo.save({
      usuarioId: null,
      correo: identificadorNormalizado,
      exitoso: false,
      motivo: 'Usuario no encontrado',
      ip: ipAddress || null,
    });

    await registrarAuditoria({
      action: 'LOGIN_ATTEMPT',
      description: `Intento de login con identificador no encontrado: ${identificador}`,
      ipAddress: ipAddress || null,
      userAgent: userAgent || null,
      status: 'failure',
    });

    return {
      ok: false,
      code: 'INVALID_CREDENTIALS',
      message: 'Usuario o contraseña incorrectos',
    };
  }

  // BUSCAR O CREAR REGISTRO DE INTENTOS
  let intento = await attemptRepo.findOne({
    where: { usuarioId: usuario.id },
  });

  if (!intento) {
    intento = attemptRepo.create({
      usuarioId: usuario.id,
      intentosFallidos: 0,
    });
  }

  // VERIFICAR SI LA CUENTA ESTÁ BLOQUEADA
  if (intento.bloqueadoHasta && intento.bloqueadoHasta > new Date()) {
    const minutosRestantes = Math.ceil(
      (intento.bloqueadoHasta.getTime() - Date.now()) / 60000,
    );

    await intentoAccesoRepo.save({
      usuarioId: usuario.id,
      correo: usuario.correo,
      exitoso: false,
      motivo: 'Cuenta bloqueada temporalmente',
      ip: ipAddress || null,
    });

    await registrarAuditoria({
      usuarioId: usuario.id,
      action: 'LOGIN_BLOCKED',
      description: 'Intento de login en cuenta bloqueada',
      ipAddress: ipAddress || null,
      userAgent: userAgent || null,
      status: 'blocked',
    });

    return {
      ok: false,
      code: 'ACCOUNT_BLOCKED',
      message: `Cuenta bloqueada temporalmente. Intentá de nuevo en ${minutosRestantes} minuto(s)`,
    };
  }

  // VALIDAR CONTRASEÑA
  const passwordValida = await bcrypt.compare(
    password,
    usuario.contraseña,
  );

  // CONTRASEÑA INCORRECTA
  if (!passwordValida) {
    intento.intentosFallidos += 1;
    intento.fechaUltimoIntento = new Date();

    // Si llegó al máximo de intentos
    if (intento.intentosFallidos >= MAX_INTENTOS) {
      intento.bloqueadoHasta = new Date(
        Date.now() + MINUTOS_BLOQUEO * 60000,
      );

      await attemptRepo.save(intento);

      await intentoAccesoRepo.save({
        usuarioId: usuario.id,
        correo: usuario.correo,
        exitoso: false,
        motivo: `Cuenta bloqueada después de ${MAX_INTENTOS} intentos fallidos`,
        ip: ipAddress || null,
      });

      await registrarAuditoria({
        usuarioId: usuario.id,
        action: 'LOGIN_FAILED_BLOCKED',
        description: `Cuenta bloqueada tras ${MAX_INTENTOS} intentos fallidos`,
        ipAddress: ipAddress || null,
        userAgent: userAgent || null,
        status: 'blocked',
      });

      return {
        ok: false,
        code: 'ACCOUNT_BLOCKED',
        message: `Demasiados intentos fallidos. Cuenta bloqueada por ${MINUTOS_BLOQUEO} minutos`,
      };
    }

    // Guardar contador de intentos
    await attemptRepo.save(intento);

    await intentoAccesoRepo.save({
      usuarioId: usuario.id,
      correo: usuario.correo,
      exitoso: false,
      motivo: `Contraseña incorrecta. Intento ${intento.intentosFallidos}/${MAX_INTENTOS}`,
      ip: ipAddress || null,
    });

    await registrarAuditoria({
      usuarioId: usuario.id,
      action: 'LOGIN_FAILED',
      description: `Intento fallido ${intento.intentosFallidos}/${MAX_INTENTOS}`,
      ipAddress: ipAddress || null,
      userAgent: userAgent || null,
      status: 'failure',
    });

    return {
      ok: false,
      code: 'INVALID_CREDENTIALS',
      message: 'Usuario o contraseña incorrectos',
    };
  }

  // LOGIN EXITOSO: REINICIAR CONTADOR DE INTENTOS
  intento.intentosFallidos = 0;
  intento.bloqueadoHasta = null;
  intento.fechaUltimoIntento = new Date();

  await attemptRepo.save(intento);

  // REGISTRAR LOGIN EN intentos_acceso
  await intentoAccesoRepo.save({
    usuarioId: usuario.id,
    correo: usuario.correo,
    exitoso: true,
    motivo: 'Login exitoso',
    ip: ipAddress || null,
  });

  // VERIFICAR SI YA EXISTE UNA SESIÓN ACTIVA
  const ahoraFecha = new Date();
  const limiteInactividad = new Date(
    ahoraFecha.getTime() - MINUTOS_INACTIVIDAD * 60 * 1000,
  );

  const sesionExistente = await sesionesRepo.findOne({
    where: { usuarioId: usuario.id },
  });

  if (sesionExistente) {
    const sigueActiva =
      sesionExistente.ultimaActividad > limiteInactividad &&
      sesionExistente.expiraEn > ahoraFecha;

    if (sigueActiva) {
      await registrarAuditoria({
        usuarioId: usuario.id,
        action: 'LOGIN_SESSION_ALREADY_ACTIVE',
        description: 'Inicio de sesión rechazado porque la cuenta ya tiene una sesión activa',
        ipAddress: ipAddress || null,
        userAgent: userAgent || null,
        status: 'blocked',
      });

      return {
        ok: false,
        code: 'SESSION_ALREADY_ACTIVE',
        message:
          'Esta cuenta ya tiene una sesión activa en otro dispositivo. Cierra esa sesión antes de volver a ingresar.',
      };
    }

    // La sesión anterior expiró o superó el tiempo de inactividad.
    await sesionesRepo.delete({ id: sesionExistente.id });
  }

  // CREAR TOKEN JWT CON UN IDENTIFICADOR ÚNICO
  const ahora = Math.floor(ahoraFecha.getTime() / 1000);
  const jti = randomUUID();

  const token = jwt.sign(
    {
      id: usuario.id,
      nombreUsuario: usuario.nombreUsuario,
      rol: usuario.rol.nombre,
      iat: ahora,
      lastActivity: ahora,
    },
    process.env.JWT_SECRET as string,
    {
      expiresIn: '2h',
      jwtid: jti,
    },
  );

  // REGISTRAR LA SESIÓN ACTIVA
  await sesionesRepo.save(
    sesionesRepo.create({
      usuarioId: usuario.id,
      jti,
      ultimaActividad: ahoraFecha,
      expiraEn: new Date(ahoraFecha.getTime() + 2 * 60 * 60 * 1000),
    }),
  );

  // REGISTRAR AUDITORÍA
  await registrarAuditoria({
    usuarioId: usuario.id,
    action: 'LOGIN_SUCCESS',
    description: 'Login exitoso',
    ipAddress: ipAddress || null,
    userAgent: userAgent || null,
    status: 'success',
  });

  // RESPUESTA
  return {
    ok: true,
    code: 'LOGIN_SUCCESS',
    token,
    usuario: {
      id: usuario.id,
      nombreUsuario: usuario.nombreUsuario,
      correo: usuario.correo,
      rol: usuario.rol,
    },
  };
};
