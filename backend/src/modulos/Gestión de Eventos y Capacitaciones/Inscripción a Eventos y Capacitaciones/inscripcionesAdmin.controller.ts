import { Request, Response } from 'express';
import { listarInscripcionesAdministrativas } from './inscripcionesAdmin.service';

export const getInscripcionesAdministrativas = async (
  _req: Request,
  res: Response,
) => {
  try {
    const inscripciones = await listarInscripcionesAdministrativas();

    return res.status(200).json({
      ok: true,
      message: 'Inscripciones consultadas correctamente.',
      data: inscripciones,
    });
  } catch (error) {
    console.error('Error al consultar inscripciones administrativas:', error);

    return res.status(500).json({
      ok: false,
      message: 'Error interno del servidor',
    });
  }
};
