import bcrypt from 'bcryptjs';
import { Usuario } from '../../../models/Usuario';
import { Rol } from '../../../models/Rol';
import { CambioCorreoPerfil } from '../../../models/CambioCorreoPerfil';
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

 // 1. Verificar si ya existe un usuario con el mismo correo, nombreUsuario o teléfono
  const usuarioExistente = await usuarioRepository.findOne({
    where: [
      { correo: data.correo },
      { nombreUsuario: data.nombreUsuario },
      { telefono: data.telefono },
    ],
  });

  if (usuarioExistente) {
    let message = 'El nombre de usuario ya está en uso';

    if (usuarioExistente.correo === data.correo) {
      message = 'El correo ya está registrado';
    } else if (usuarioExistente.telefono === data.telefono) {
      message = 'El teléfono ya está registrado';
    }

    return { ok: false, message };
  }

  const correoReservado = await AppDataSource
    .getRepository(CambioCorreoPerfil)
    .createQueryBuilder('cambio')
    .where('LOWER(cambio.correoNuevo) = :correo', {
      correo: data.correo.trim().toLowerCase(),
    })
    .andWhere('cambio.usedAt IS NULL')
    .andWhere('cambio.expiresAt > :ahora', { ahora: new Date() })
    .getOne();

  if (correoReservado) {
    return {
      ok: false,
      message: 'El correo está en proceso de verificación para otra cuenta.',
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