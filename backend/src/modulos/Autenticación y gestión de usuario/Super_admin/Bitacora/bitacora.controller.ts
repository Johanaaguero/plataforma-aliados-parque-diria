import { Request, Response } from 'express';
import { obtenerBitacora } from './bitacora.service';

export const getBitacora = async (
  _req: Request,
  res: Response,
) => {
  try {
    const bitacora = await obtenerBitacora();

    return res.status(200).json(bitacora);
  } catch (error) {
    console.error('Error al obtener la bitácora:', error);

    return res.status(500).json({
      message: 'No se pudo obtener la bitácora.',
    });
  }
};