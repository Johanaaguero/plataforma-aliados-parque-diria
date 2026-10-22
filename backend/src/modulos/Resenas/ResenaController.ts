import type { NextFunction, Request, Response } from 'express';
import { ResenaService } from './ResenaService';

const service = new ResenaService();

export class ResenaController {
  async crear(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { puntuacion, comentario, nombreVisitante } = req.body as Record<string, unknown>;

      if (
        typeof puntuacion !== 'number' ||
        !Number.isInteger(puntuacion) ||
        puntuacion < 1 ||
        puntuacion > 5
      ) {
        res.status(400).json({ ok: false, message: 'La puntuacion debe ser un numero entero entre 1 y 5.' });
        return;
      }

      if (typeof comentario !== 'string' || comentario.trim().length === 0) {
        res.status(400).json({ ok: false, message: 'El comentario es obligatorio.' });
        return;
      }

      const usuarioId = req.usuario?.id;
      const nombre = typeof nombreVisitante === 'string' ? nombreVisitante.trim() : '';

      if (!usuarioId && !nombre) {
        res.status(400).json({ ok: false, message: 'El nombre del visitante es obligatorio para resenas anonimas.' });
        return;
      }

      if (!usuarioId && nombre.length > 150) {
        res.status(400).json({ ok: false, message: 'El nombre del visitante no puede exceder 150 caracteres.' });
        return;
      }

      const resena = await service.crear({
        puntuacion,
        comentario: comentario.trim(),
        ...(usuarioId ? { usuarioId } : { nombreVisitante: nombre }),
      });

      res.status(201).json({ ok: true, data: resena });
    } catch (error) {
      next(error);
    }
  }

  async listar(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const resenas = await service.listar();
      res.status(200).json({ ok: true, data: resenas });
    } catch (error) {
      next(error);
    }
  }
}
