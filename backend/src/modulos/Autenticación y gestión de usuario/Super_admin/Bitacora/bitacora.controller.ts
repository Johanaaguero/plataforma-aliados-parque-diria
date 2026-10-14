import { Request, Response } from 'express';
import {
  BitacoraValidationError,
  normalizarFiltrosBitacora,
  obtenerBitacora,
} from './bitacora.service';

export const getBitacora = async (
  req: Request,
  res: Response,
) => {
  try {
    const filtros = normalizarFiltrosBitacora(req.query);
    const bitacora = await obtenerBitacora(filtros);

    return res.status(200).json(bitacora);
  } catch (error) {
    if (error instanceof BitacoraValidationError) {
      return res.status(400).json({
        message: error.message,
      });
    }

    console.error('Error al obtener la bitacora:', error);

    return res.status(500).json({
      message: 'No se pudo obtener la bitacora.',
    });
  }
};
