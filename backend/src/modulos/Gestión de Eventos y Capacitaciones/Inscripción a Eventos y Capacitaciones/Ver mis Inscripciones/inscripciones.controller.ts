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
          ok: false,
          code: 'UNAUTHORIZED',
          message: 'Usuario no autenticado.',
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
          code: 'INVALID_ID',
          message:
            'El id de la inscripción debe ser un número entero positivo.',
        });
      }

      const inscripcionId = Number(idParam);

      if (!Number.isSafeInteger(inscripcionId)) {
        return res.status(400).json({
          ok: false,
          code: 'INVALID_ID',
          message:
            'El id de la inscripción no es válido.',
        });
      }

      await cancelarInscripcion(
        req.usuario.id,
        inscripcionId,
      );

      return res.status(200).json({
        ok: true,
        message: 'Inscripción cancelada correctamente.',
      });
    } catch (error) {
      if (
        error instanceof Error &&
        error.name === 'NotFoundError'
      ) {
        return res.status(404).json({
          ok: false,
          code: 'REGISTRATION_NOT_FOUND',
          message: error.message,
        });
      }

      console.error(
        'Error al cancelar inscripción:',
        error,
      );

      return res.status(500).json({
        ok: false,
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Error interno del servidor.',
      });
    }
  }
}
