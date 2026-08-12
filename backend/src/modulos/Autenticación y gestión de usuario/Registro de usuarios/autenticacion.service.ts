import bcrypt from 'bcryptjs';
import { Usuario } from '../../../models/Usuario';
import { Rol } from '../../../models/Rol';
import { AppDataSource } from '../../../data-source';

interface RegisterInput {
  nombreUsuario: string;
  nombre: string;
  apellidos: string;
  correo: string;
  telefono: string;
  password: string;
}

export const registerUser = async (data: RegisterInput) => {
  const usuarioRepository = AppDataSource.getRepository(Usuario);
  const rolRepository = AppDataSource.getRepository(Rol);

  // 1. Verificar si ya existe un usuario con el mismo correo O el mismo nombreUsuario
  const usuarioExistente = await usuarioRepository.findOne({
    where: [
      { correo: data.correo },
      { nombreUsuario: data.nombreUsuario },
    ],
  });

  if (usuarioExistente) {
    const esMismoCorreo = usuarioExistente.correo === data.correo;
    return {
      ok: false,
      message: esMismoCorreo
        ? 'El correo ya está registrado'
        : 'El nombre de usuario ya está en uso',
    };
  }

  // 2. Buscar obligatoriamente el rol 'visitante' en la base de datos
  const rolVisitante = await rolRepository.findOne({
    where: { nombre: 'visitante' },
  });

  if (!rolVisitante) {
    return {
      ok: false,
      message: "El rol 'visitante' no existe en la base de datos. Por favor, asegúrate de haber insertado los roles iniciales.",
    };
  }

  // 3. Encriptar la contraseña
  const contraseñaEncriptada = await bcrypt.hash(data.password, 10);

  // 4. Crear la entidad asignando fijamente el rol visitante
  const nuevoUsuario = usuarioRepository.create({
    nombreUsuario: data.nombreUsuario,
    nombre: data.nombre,
    apellidos: data.apellidos,
    correo: data.correo,
    telefono: data.telefono,
    contraseña: contraseñaEncriptada,
    rol: rolVisitante,
  });

  // 5. Guardar en MySQL
  const usuarioGuardado = await usuarioRepository.save(nuevoUsuario);

  return {
    ok: true,
    message: 'Usuario registrado correctamente',
    data: usuarioGuardado.toPublic(),
  };
};