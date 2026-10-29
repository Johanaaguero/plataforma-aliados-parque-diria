import { AppDataSource } from '../../../data-source';
import { Usuario } from '../../../models/Usuario';
import { LoginAttempt } from '../../../models/LoginAttempt';
import { IntentoAcceso } from '../../../models/IntentoAcceso';
import { registrarAuditoria } from '../Autenticación y seguridad de acceso al sistema/auditoria.service';
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
  const intentoAccesoRepo = AppDataSource.getRepository(IntentoAcceso);
  const identificadorNormalizado = identificador.trim().toLowerCase();

  const usuario = await usuarioRepo
    .createQueryBuilder('usuario')
    .addSelect('usuario.contraseña')
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
    // Registrar en intentos_acceso
    await intentoAccesoRepo.save({
      usuarioId: null,
      correo: identificadorNormalizado,
      exitoso: false,
      motivo: 'Usuario no encontrado',
      ip: ipAddress || null,
    });

    // Registrar también en auditoría
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
  
  if (
    intento.bloqueadoHasta &&
    intento.bloqueadoHasta > new Date()
  ) {
    const minutosRestantes = Math.ceil(
      (intento.bloqueadoHasta.getTime() - Date.now()) / 60000,
    );

    // Registrar en intentos_acceso
    await intentoAccesoRepo.save({
      usuarioId: usuario.id,
      correo: usuario.correo,
      exitoso: false,
      motivo: 'Cuenta bloqueada temporalmente',
      ip: ipAddress || null,
    });

    // Registrar en auditoría
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

      // Registrar en intentos_acceso
      await intentoAccesoRepo.save({
        usuarioId: usuario.id,
        correo: usuario.correo,
        exitoso: false,
        motivo: `Cuenta bloqueada después de ${MAX_INTENTOS} intentos fallidos`,
        ip: ipAddress || null,
      });

      // Registrar en auditoría
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

    // Registrar en intentos_acceso
    await intentoAccesoRepo.save({
      usuarioId: usuario.id,
      correo: usuario.correo,
      exitoso: false,
      motivo: `Contraseña incorrecta. Intento ${intento.intentosFallidos}/${MAX_INTENTOS}`,
      ip: ipAddress || null,
    });

    // Registrar en auditoría
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

  
  // LOGIN EXITOSO
  

  // Reiniciar contador de intentos
  intento.intentosFallidos = 0;
  intento.bloqueadoHasta = null;
  intento.fechaUltimoIntento = new Date();

  await attemptRepo.save(intento);

  // Registrar login exitoso en intentos_acceso
  await intentoAccesoRepo.save({
    usuarioId: usuario.id,
    correo: usuario.correo,
    exitoso: true,
    motivo: 'Login exitoso',
    ip: ipAddress || null,
  });

  
  // CREAR TOKEN JWT
  

  const ahora = Math.floor(Date.now() / 1000);

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
        jwtid: `${usuario.id}-${ahora}`,
    },
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
