import { Request, Response } from 'express';
import {
  getUsersWithRoles,
  updateUserRole,
} from './roles.service';

export const getUsersRoles = async (req: Request, res: Response) => {
  try {
    const usuarios = await getUsersWithRoles();

    return res.status(200).json({
      ok: true,
      message: 'Usuarios y roles consultados correctamente',
      data: usuarios,
    });
  } catch (error) {
    console.error('Error al consultar usuarios y roles:', error);

    return res.status(500).json({
      ok: false,
      message: 'Error interno del servidor',
    });
  }
};

export const updateRole = async (req: Request, res: Response) => {
  try {
    const usuarioId = Number(req.params.id);
    const actorId = req.usuario!.id;
    const { rol } = req.body;

    // Validar que el ID sea un número
    if (!Number.isInteger(usuarioId) || usuarioId <= 0) {
      return res.status(400).json({
        ok: false,
        message: 'El ID del usuario no es válido',
      });
    }

    // Validar que se haya enviado el rol
    if (!rol || typeof rol !== 'string') {
      return res.status(400).json({
        ok: false,
        message: 'Debe indicar el nuevo rol',
      });
    }

    const resultado = await updateUserRole({
      usuarioId,
      nuevoRol: rol,
      actorId,
    });

    if (!resultado.ok) {
      return res.status(resultado.status).json({
        ok: false,
        message: resultado.message,
      });
    }

    return res.status(200).json(resultado);
  } catch (error) {
    console.error('Error al actualizar el rol:', error);

    return res.status(500).json({
      ok: false,
      message: 'Error interno del servidor',
    });
  }
};
