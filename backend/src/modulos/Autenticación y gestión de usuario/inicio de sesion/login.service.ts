import { AppDataSource } from '../../../data-source';
import { Usuario } from '../../../models/Usuario';
import { LoginAttempt } from '../../../models/LoginAttempt';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

interface LoginInput {
  identificador: string;
  password: string;
}

const MAX_INTENTOS = 3;
const MINUTOS_BLOQUEO = 15;  //definir mejor con el grupo

export const loginUser = async ({ identificador, password }: LoginInput) => {
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
    return { ok: false, message: 'Usuario o contraseña incorrectos' };
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
    return {
      ok: false,
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
      return {
        ok: false,
        message: `Demasiados intentos fallidos. Cuenta bloqueada por ${MINUTOS_BLOQUEO} minutos`,
      };
    }

    await attemptRepo.save(intento);
    return { ok: false, message: 'Usuario o contraseña incorrectos' };
  }

  // Login exitoso: reiniciar contador de intentos
  intento.intentosFallidos = 0;
  intento.bloqueadoHasta = null;
  intento.fechaUltimoIntento = new Date();
  await attemptRepo.save(intento);

  const token = jwt.sign(
    {
      id: usuario.id,
      nombreUsuario: usuario.nombreUsuario,
      rol: usuario.rol.nombre,
    },
    process.env.JWT_SECRET as string,
    { expiresIn: '2h' }
  );

//returnar token y datos del usuario
  return {
    ok: true,
    token,
    usuario: {
      id: usuario.id,
      nombreUsuario: usuario.nombreUsuario,
      correo: usuario.correo,
      rol: usuario.rol,
    },
  };
};