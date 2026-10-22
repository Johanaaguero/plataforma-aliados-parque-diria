import { Request, Response, NextFunction } from 'express';
import { AppDataSource } from '../data-source';
import { Usuario } from '../models/Usuario';

export const autorizarRoles = (...rolesPermitidos: string[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.usuario) {
        return res.status(401).json({
          ok: false,
          message: 'Usuario autenticado no encontrado',
        });
      }

      const usuario = await AppDataSource.getRepository(Usuario).findOne({
        where: { id: req.usuario.id },
        relations: { rol: true },
      });

      if (!usuario) {
        return res.status(401).json({
          ok: false,
          message: 'Usuario autenticado no encontrado',
        });
      }

      const rolActual = usuario.rol.nombre;
      req.usuario.rol = rolActual;

      if (!rolesPermitidos.includes(rolActual)) {
        return res.status(403).json({
          ok: false,
          message: 'No tiene permisos para realizar esta operación',
        });
      }

      next();
    } catch (error) {
      console.error('Error al consultar permisos del usuario:', error);

      return res.status(500).json({
        ok: false,
        message: 'Error interno del servidor',
      });
    }
  };
};
