import { AppDataSource } from '../../../data-source';
import { Usuario } from '../../../models/Usuario';
import { LoginAttempt } from '../../../models/LoginAttempt';
import { registrarAuditoria } from '../auditoria.service';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

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

  const usuario = await usuarioRepo.findOne({
    where: [
      { correo: identificador },
      { nombreUsuario: identificador },
    ],
    relations: { rol: true },
  });

  if (!usuario) {
    await registrarAuditoria({
      action: 'LOGIN_ATTEMPT',
      description: `Intento de login con identificador no encontrado: ${identificador}`,
      ipAddress: ipAddress || null,
      userAgent: userAgent || null,
      status: 'failure',
    });

    return { ok: false, code: 'INVALID_CREDENTIALS', message: 'Usuario o contraseña incorrectos' };
  }

  // Buscar o crear el registro de intentos para este usuario
  let intento = await attemptRepo.findOne({ where: { usuarioId: usuario.id } });
  if (!intento) {
    intento = attemptRepo.create({ usuarioId: usuario.id, intentosFallidos: 0 });
  }

  // Verificar si está bloqueado
  if (intento.bloqueadoHasta && intento.bloqueadoHasta > new Date()) {
    const minutosRestantes = Math.ceil(
      (intento.bloqueadoHasta.getTime() - Date.now()) / 60000
    );

    await registrarAuditoria({
      usuarioId: usuario.id,
      action: 'LOGIN_BLOCKED',
      description: `Intento de login en cuenta bloqueada`,
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

  const passwordValida = await bcrypt.compare(password, usuario.contraseña);

  if (!passwordValida) {
    intento.intentosFallidos += 1;
    intento.fechaUltimoIntento = new Date();

    if (intento.intentosFallidos >= MAX_INTENTOS) {
      intento.bloqueadoHasta = new Date(Date.now() + MINUTOS_BLOQUEO * 60000);
      await attemptRepo.save(intento);

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

    await attemptRepo.save(intento);

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

  // Login exitoso: reiniciar contador de intentos
  intento.intentosFallidos = 0;
  intento.bloqueadoHasta = null;
  intento.fechaUltimoIntento = new Date();
  await attemptRepo.save(intento);

  // Token con TTL de inactividad
  const token = jwt.sign(
    {
      id: usuario.id,
      nombreUsuario: usuario.nombreUsuario,
      rol: usuario.rol.nombre,
      iat: Math.floor(Date.now() / 1000),
      lastActivity: Math.floor(Date.now() / 1000),
    },
    process.env.JWT_SECRET as string,
    { expiresIn: '2h' },
  );

  await registrarAuditoria({
    usuarioId: usuario.id,
    action: 'LOGIN_SUCCESS',
    description: `Login exitoso`,
    ipAddress: ipAddress || null,
    userAgent: userAgent || null,
    status: 'success',
  });

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