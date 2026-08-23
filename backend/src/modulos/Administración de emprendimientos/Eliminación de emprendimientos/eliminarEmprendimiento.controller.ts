import { Request, Response } from 'express';
import { eliminarEmprendimiento } from './eliminarEmprendimiento.service';

export const eliminar = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const id = Number(req.params.id);

    await eliminarEmprendimiento(id);

    return res.status(204).send();
  } catch (error) {
    const err = error as {
      statusCode?: number;
      message?: string;
    };

    return res.status(err.statusCode || 500).json({
      message: err.message || 'Error interno del servidor.',
    });
  }
};