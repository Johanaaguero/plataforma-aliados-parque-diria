import { AppDataSource } from '../../../data-source';
import { Usuario } from '../../../models/Usuario';
import { Rol, NombreRol } from '../../../models/Rol';
import { HistorialCambioRol } from '../../../models/HistorialCambioRol';
import { registrarAuditoria } from '../Autenticación y seguridad de acceso al sistema/auditoria.service';

interface CambiarRolInput {
  usuarioId: number;
  nuevoRol: string;
  actorId: number;
}

const nombresRol: readonly string[] = [
  'administrador',
  'asociado',
  'visitante',
];

const esNombreRol = (rol: string): rol is NombreRol =>
  nombresRol.includes(rol);

export const getUsersWithRoles = async () => {
  const usuarioRepository = AppDataSource.getRepository(Usuario);

  const usuarios = await usuarioRepository.find();

  return usuarios.map((usuario) => ({
    id: usuario.id,
    nombreUsuario: usuario.nombreUsuario,
    nombre: usuario.nombre,
    apellidos: usuario.apellidos,
    correo: usuario.correo,
    telefono: usuario.telefono,
    rol: usuario.rol ? usuario.rol.nombre : null,
  }));
};

export const updateUserRole = async ({
  usuarioId,
  nuevoRol,
  actorId,
}: CambiarRolInput) => {
  if (!esNombreRol(nuevoRol)) {
    return {
      ok: false as const,
      status: 404,
      message: 'El rol no existe',
    };
  }

  return AppDataSource.transaction(async (manager) => {
    const usuarioRepository = manager.getRepository(Usuario);
    const rolRepository = manager.getRepository(Rol);
    const historialRepository = manager.getRepository(HistorialCambioRol);

    // Bloquear los administradores antes de contarlos evita degradaciones
    // concurrentes que puedan dejar al sistema sin administradores.
    const administradores = await usuarioRepository
      .createQueryBuilder('usuario')
      .innerJoinAndSelect('usuario.rol', 'rolActual')
      .where('rolActual.nombre = :nombreRol', {
        nombreRol: 'administrador',
      })
      .setLock('pessimistic_write')
      .getMany();

    const usuario = await usuarioRepository
      .createQueryBuilder('usuario')
      .innerJoinAndSelect('usuario.rol', 'rolActual')
      .where('usuario.id = :usuarioId', { usuarioId })
      .setLock('pessimistic_write')
      .getOne();

    if (!usuario) {
      return {
        ok: false as const,
        status: 404,
        message: 'El usuario no existe',
      };
    }

    const rol = await rolRepository.findOne({
      where: { nombre: nuevoRol },
    });

    if (!rol) {
      return {
        ok: false as const,
        status: 404,
        message: 'El rol no existe',
      };
    }

    const rolAnterior = usuario.rol.nombre;
    if (rolAnterior === rol.nombre) {
      return {
        ok: true as const,
        message: 'El usuario ya tiene ese rol',
        data: {
          id: usuario.id,
          nombreUsuario: usuario.nombreUsuario,
          nombre: usuario.nombre,
          apellidos: usuario.apellidos,
          correo: usuario.correo,
          rolAnterior,
          rolNuevo: rol.nombre,
        },
      };
    }

    const degradaAdministrador =
      rolAnterior === 'administrador' &&
      rol.nombre !== 'administrador';

    if (degradaAdministrador && actorId === usuarioId) {
      return {
        ok: false as const,
        status: 400,
        message: 'No puede quitarse su propio rol de administrador',
      };
    }

    if (degradaAdministrador && administradores.length <= 1) {
      return {
        ok: false as const,
        status: 400,
        message:
          'El sistema debe conservar al menos un administrador',
      };
    }

    usuario.rol = rol;

    const usuarioActualizado = await usuarioRepository.save(usuario);

    const eventoAuditoria = historialRepository.create({
      actorId,
      usuarioAfectadoId: usuarioId,
      rolAnterior,
      rolNuevo: rol.nombre,
    });

    await historialRepository.save(eventoAuditoria);

    const actor =
      actorId === usuarioId
        ? usuarioActualizado
        : await usuarioRepository.findOne({ where: { id: actorId } });

    if (!actor) {
      throw new Error('El actor autenticado no existe');
    }

    await registrarAuditoria(
      {
        usuarioId: actorId,
        action: 'CAMBIO_ROL',
        description: `Cambio de rol de ${usuario.nombreUsuario} (ID ${usuarioId}), realizado por ${actor.nombreUsuario} (ID ${actorId}): de ${rolAnterior} a ${rol.nombre}`,
        status: 'success',
        details: JSON.stringify({
          actorId,
          actorNombreUsuario: actor.nombreUsuario,
          actorNombreCompleto: `${actor.nombre} ${actor.apellidos}`.trim(),
          usuarioAfectadoId: usuarioId,
          usuarioAfectadoNombreUsuario: usuario.nombreUsuario,
          usuarioAfectadoNombreCompleto:
            `${usuario.nombre} ${usuario.apellidos}`.trim(),
          rolAnterior,
          rolNuevo: rol.nombre,
        }),
      },
      manager,
    );

    return {
      ok: true as const,
      message: 'Rol actualizado correctamente',
      data: {
        id: usuarioActualizado.id,
        nombreUsuario: usuarioActualizado.nombreUsuario,
        nombre: usuarioActualizado.nombre,
        apellidos: usuarioActualizado.apellidos,
        correo: usuarioActualizado.correo,
        rolAnterior,
        rolNuevo: usuarioActualizado.rol.nombre,
      },
    };
  });
};
