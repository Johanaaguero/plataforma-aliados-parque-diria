import { Request, Response } from 'express';
import { InscripcionService } from './inscripcion.service';

const service = new InscripcionService();

function manejarError(res: Response, error: unknown) {
  if (error instanceof Error) {
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        ok: false,
        code: 'VALIDATION_ERROR',
        message: error.message,
      });
    }

    if (error.name === 'NotFoundError') {
      return res.status(404).json({
        ok: false,
        code: 'EVENT_NOT_FOUND',
        message: error.message,
      });
    }

    if (error.name === 'DuplicateRegistrationError') {
      return res.status(409).json({
        ok: false,
        code: 'ALREADY_REGISTERED',
        message: error.message,
      });
    }

    if (error.name === 'CapacityError') {
      return res.status(409).json({
        ok: false,
        code: 'NO_AVAILABLE_SLOTS',
        message: error.message,
      });
    }

    return res.status(500).json({
      ok: false,
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Error interno del servidor.',
    });
  }

  return res.status(500).json({
    ok: false,
    code: 'INTERNAL_SERVER_ERROR',
    message: 'Error interno del servidor.',
  });
}

export class InscripcionController {
  async inscribir(req: Request, res: Response) {
    try {
      if (!req.usuario?.id) {
        return res.status(401).json({
          ok: false,
          code: 'UNAUTHORIZED',
          message: 'Usuario no autenticado.',
        });
      }

      const idParam = req.params.id;

      if (
        typeof idParam !== 'string' ||
        !/^[1-9]\d*$/.test(idParam)
      ) {
        return res.status(400).json({
          ok: false,
          code: 'INVALID_EVENT_ID',
          message: 'El id debe ser un número entero positivo.',
        });
      }

      const eventoCapacitacionId = Number(idParam);

      if (!Number.isSafeInteger(eventoCapacitacionId)) {
        return res.status(400).json({
          ok: false,
          code: 'INVALID_EVENT_ID',
          message: 'El id debe ser un número entero positivo.',
        });
      }

      const resultado = await service.inscribir(
        req.usuario.id,
        eventoCapacitacionId,
      );

      return res.status(201).json({
        ok: true,
        message: 'Inscripción realizada correctamente.',
        data: {
          id: resultado.participante.id,
          usuarioId: resultado.participante.usuarioId,
          eventoCapacitacionId:
            resultado.participante.eventoCapacitacionId,
          createdAt: resultado.participante.createdAt,
          cuposDisponibles: resultado.cuposDisponibles,
        },
      });
    } catch (error) {
      return manejarError(res, error);
    }
  }
}
