import { NextFunction, Request, Response } from 'express';
import {
  crearCapacidadEvidenciaAnonima,
  validarCapacidadEvidenciaAnonima,
} from './IncidenciaEvidenciaCapability';
import { verificarToken } from '../../../middlewares/auth.middleware';

const ENCABEZADO_CAPACIDAD_EVIDENCIA =
  'x-incidencia-evidencia-capability';

export function puedeAdjuntarEvidenciaComoPropietario(
  incidencia: { usuarioReporta?: { id: number } | null },
  actor: { id: number; rol?: string } | null,
): boolean {
  return actor !== null && incidencia.usuarioReporta?.id === actor.id;
}

export const emitirCapacidadEvidenciaAnonima = (
  incidenciaId: number,
): string => crearCapacidadEvidenciaAnonima(incidenciaId);

export const autorizarCargaEvidencia = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const encabezadoAutorizacion = req.headers.authorization;

  // La presencia de un Bearer siempre exige validación estricta: un token
  // inválido, vencido o revocado no puede degradarse a una carga anónima.
  if (encabezadoAutorizacion) {
    await verificarToken(req, res, next);
    return;
  }

  const incidenciaId = Number(req.params.id);
  const capacidad = req.header(ENCABEZADO_CAPACIDAD_EVIDENCIA);

  if (!Number.isSafeInteger(incidenciaId) || incidenciaId <= 0 || !capacidad) {
    res.status(401).json({
      mensaje: 'Se requiere autorización para adjuntar evidencias.',
    });
    return;
  }

  try {
    if (!validarCapacidadEvidenciaAnonima(capacidad, incidenciaId)) {
      res.status(403).json({
        mensaje: 'La credencial para adjuntar evidencias no es válida.',
      });
      return;
    }

    res.locals.autorizacionEvidenciaAnonima = true;
    next();
  } catch {
    res.status(403).json({
      mensaje: 'La credencial para adjuntar evidencias no es válida.',
    });
  }
};
