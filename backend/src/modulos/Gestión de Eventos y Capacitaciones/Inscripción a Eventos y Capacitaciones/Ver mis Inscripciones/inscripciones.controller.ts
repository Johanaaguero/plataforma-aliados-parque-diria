import { Request, Response } from 'express';

import {
  listarMisInscripciones,
  cancelarInscripcion,
} from './inscripciones.service';

export class InscripcionesController {
  async listarMias(req: Request, res: Response) {
    try {
      if (!req.usuario?.id) {
        return res.status(401).json({
          status: 'error',
          code: 'UNAUTHORIZED',
          message: 'Usuario no autenticado.',
          data: null,
        });
      }

      const inscripciones = await listarMisInscripciones(
        req.usuario.id,
      );

      return res.status(200).json({
        ok: true,
        message: 'Inscripciones consultadas correctamente.',
        data: inscripciones,
      });
    } catch (error) {
      console.error(
        'Error al consultar mis inscripciones:',
        error,
      );

      return res.status(500).json({
        ok: false,
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Error interno del servidor.',
      });
    }
  }

  async cancelar(req: Request, res: Response) {
    try {
      if (!req.usuario?.id) {
        return res.status(401).json({
          status: 'error',
          code: 'UNAUTHORIZED',
          message: 'Usuario no autenticado.',
          data: null,
        });
      }

      const idParam = req.params.id;

      if (
        typeof idParam !== 'string' ||
        !/^[1-9]\d*$/.test(idParam)
      ) {
        return res.status(400).json({
          status: 'error',
          code: 'INVALID_ID',
          message:
            'El id de la inscripción debe ser un número entero positivo.',
          data: null,
        });
      }

      const inscripcionId = Number(idParam);

      if (!Number.isSafeInteger(inscripcionId)) {
        return res.status(400).json({
          status: 'error',
          code: 'INVALID_ID',
          message:
            'El id de la inscripción no es válido.',
          data: null,
        });
      }

      const reserva = await cancelarInscripcion(
        req.usuario.id,
        inscripcionId,
      );

      return res.status(200).json({
        status: 'success',
        message: 'Reserva cancelada correctamente.',
        data: reserva,
      });
    } catch (error) {
      if (
        error instanceof Error &&
        error.name === 'NotFoundError'
      ) {
        return res.status(404).json({
          status: 'error',
          code: 'REGISTRATION_NOT_FOUND',
          message: error.message,
          data: null,
        });
      }

      if (error instanceof Error && error.name === 'ForbiddenError') {
        return res.status(403).json({ status: 'error', message: error.message, data: null });
      }

      if (error instanceof Error && error.name === 'InvalidReservationStateError') {
        return res.status(400).json({ status: 'error', message: error.message, data: null });
      }

      console.error(
        'Error al cancelar inscripción:',
        error,
      );

      return res.status(500).json({
        status: 'error',
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Error interno del servidor.',
        data: null,
      });
    }
  }
}
