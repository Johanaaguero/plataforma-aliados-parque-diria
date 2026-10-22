import type { NextFunction, Request, Response } from 'express';
import { PreguntasFrecuentesService } from './preguntasFrecuentes.service';

const service = new PreguntasFrecuentesService();

const esObjeto = (valor: unknown): valor is Record<string, unknown> =>
  typeof valor === 'object' && valor !== null && !Array.isArray(valor);

const validarContenido = (body: unknown, parcial = false): string | null => {
  if (!esObjeto(body)) return 'El cuerpo de la solicitud no es válido.';
  if (!parcial || body.pregunta !== undefined) {
    if (typeof body.pregunta !== 'string' || !body.pregunta.trim()) {
      return 'La pregunta es obligatoria.';
    }
  }
  if (!parcial || body.respuesta !== undefined) {
    if (typeof body.respuesta !== 'string' || !body.respuesta.trim()) {
      return 'La respuesta es obligatoria.';
    }
  }
  if (body.palabrasClave !== undefined &&
    (!Array.isArray(body.palabrasClave) || body.palabrasClave.some((palabra) => typeof palabra !== 'string'))) {
    return 'Las palabras clave deben ser una lista de textos.';
  }
  if (body.publicada !== undefined && typeof body.publicada !== 'boolean') {
    return 'El estado de publicación debe ser verdadero o falso.';
  }
  return null;
};

const enviarError = (res: Response, status: number, message: string) =>
  res.status(status).json({ ok: false, message });

export class PreguntasFrecuentesController {
  constructor(private readonly preguntas = service) {}

  async listarPublicadas(_req: Request, res: Response, next: NextFunction) {
    try {
      res.status(200).json({ ok: true, data: await this.preguntas.listarPublicadas() });
    } catch (error) { next(error); }
  }

  async listarTodas(_req: Request, res: Response, next: NextFunction) {
    try {
      res.status(200).json({ ok: true, data: await this.preguntas.listarTodas() });
    } catch (error) { next(error); }
  }

  async crear(req: Request, res: Response, next: NextFunction) {
    const error = validarContenido(req.body);
    if (error) return enviarError(res, 400, error);
    try {
      const body = req.body as { pregunta: string; respuesta: string; palabrasClave?: string[]; publicada?: boolean };
      const creada = await this.preguntas.crear(body);
      return res.status(201).json({ ok: true, data: creada });
    } catch (cause) { return next(cause); }
  }

  async editar(req: Request, res: Response, next: NextFunction) {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) return enviarError(res, 400, 'El identificador no es válido.');
    const error = validarContenido(req.body, true);
    if (error) return enviarError(res, 400, error);
    try {
      const actualizada = await this.preguntas.editar(id, req.body);
      if (!actualizada) return enviarError(res, 404, 'La pregunta frecuente no existe.');
      return res.status(200).json({ ok: true, data: actualizada });
    } catch (cause) { return next(cause); }
  }

  async cambiarPublicacion(req: Request, res: Response, next: NextFunction) {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) return enviarError(res, 400, 'El identificador no es válido.');
    if (!esObjeto(req.body) || typeof req.body.publicada !== 'boolean') {
      return enviarError(res, 400, 'Indica el estado de publicación.');
    }
    try {
      const actualizada = await this.preguntas.cambiarPublicacion(id, req.body.publicada);
      if (!actualizada) return enviarError(res, 404, 'La pregunta frecuente no existe.');
      return res.status(200).json({ ok: true, data: actualizada });
    } catch (cause) { return next(cause); }
  }

  async eliminar(req: Request, res: Response, next: NextFunction) {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) return enviarError(res, 400, 'El identificador no es válido.');
    try {
      if (!(await this.preguntas.eliminar(id))) return enviarError(res, 404, 'La pregunta frecuente no existe.');
      return res.sendStatus(204);
    } catch (cause) { return next(cause); }
  }
}
