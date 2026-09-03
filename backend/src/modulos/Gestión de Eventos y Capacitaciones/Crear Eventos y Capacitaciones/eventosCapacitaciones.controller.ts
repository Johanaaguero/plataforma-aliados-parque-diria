import { Request, Response } from 'express';
import { EventosCapacitacionesService } from './eventosCapacitaciones.service';
import { TipoActividad } from '../../../models/EventosCapacitaciones';

const service = new EventosCapacitacionesService();

function manejarError(res: Response, error: unknown) {
  if (error instanceof Error) {
    if (error.name === 'ValidationError') {
      return res.status(400).json({ mensaje: error.message });
    }
    if (error.name === 'NotFoundError') {
      return res.status(404).json({ mensaje: error.message });
    }
    return res.status(500).json({ mensaje: 'Error interno del servidor.', detalle: error.message });
  }
  return res.status(500).json({ mensaje: 'Error interno del servidor.' });
}

export class EventosCapacitacionesController {
  async create(req: Request, res: Response) {
    try {
      const creado = await service.create(req.body);
      return res.status(201).json(creado.toPublic());
    } catch (error) {
      return manejarError(res, error);
    }
  }

  async update(req: Request, res: Response) {
    try {
      const id = Number(req.params.id);
      if (Number.isNaN(id)) {
        return res.status(400).json({ mensaje: 'El id debe ser numérico.' });
      }
      const actualizado = await service.update(id, req.body);
      return res.status(200).json(actualizado.toPublic());
    } catch (error) {
      return manejarError(res, error);
    }
  }

  async findAll(req: Request, res: Response) {
    try {
      const { tipoActividad } = req.query;
      const filtros: { tipoActividad?: TipoActividad } = {};

      if (tipoActividad) {
        if (!Object.values(TipoActividad).includes(tipoActividad as TipoActividad)) {
          return res.status(400).json({
            mensaje: `tipoActividad inválido. Valores permitidos: ${Object.values(
              TipoActividad,
            ).join(', ')}.`,
          });
        }
        filtros.tipoActividad = tipoActividad as TipoActividad;
      }

      const registros = await service.findAll(filtros);
      return res.status(200).json(registros.map((r) => r.toPublic()));
    } catch (error) {
      return manejarError(res, error);
    }
  }

  async remove(req: Request, res: Response) {
    try {
      const id = Number(req.params.id);
      if (Number.isNaN(id)) {
        return res.status(400).json({ mensaje: 'El id debe ser numérico.' });
      }
      const resultado = await service.remove(id);
      return res.status(200).json(resultado);
    } catch (error) {
      return manejarError(res, error);
    }
  }

  // ---------- Imágenes ----------

  /**
   * Espera un body JSON:
   * {
   *   "imagenBase64": "iVBORw0KGgoAAAANSUhEUgAA..." (o "data:image/png;base64,....")
   *   "tipoMime": "image/png",
   *   "nombreArchivo": "portada.png"   // opcional
   * }
   */
  async uploadImagen(req: Request, res: Response) {
    try {
      const id = Number(req.params.id);
      if (Number.isNaN(id)) {
        return res.status(400).json({ mensaje: 'El id debe ser numérico.' });
      }

      const { imagenBase64, tipoMime, nombreArchivo } = req.body as {
        imagenBase64?: string;
        tipoMime?: string;
        nombreArchivo?: string;
      };

      if (!imagenBase64 || typeof imagenBase64 !== 'string') {
        return res.status(400).json({
          mensaje: 'Debe enviar la imagen en el campo "imagenBase64" (cadena base64).',
        });
      }

      if (!tipoMime || typeof tipoMime !== 'string') {
        return res.status(400).json({ mensaje: 'El campo "tipoMime" es obligatorio.' });
      }

      // admite tanto el data URI completo ("data:image/png;base64,AAAA...")
      // como el base64 puro
      const indiceComa = imagenBase64.indexOf(',');
      const base64Limpio =
        indiceComa !== -1 ? imagenBase64.slice(indiceComa + 1) : imagenBase64;

      if (base64Limpio.trim().length === 0) {
        return res.status(400).json({
          mensaje: 'El campo "imagenBase64" no contiene datos válidos.',
        });
      }

      const buffer = Buffer.from(base64Limpio, 'base64');

      const imagen = await service.addImagen(id, {
        buffer,
        tipoMime,
        nombreArchivo: nombreArchivo ?? null,
        tamanoBytes: buffer.length,
      });

      return res.status(201).json({
        id: imagen.id,
        tipoMime: imagen.tipoMime,
        nombreArchivo: imagen.nombreArchivo,
        tamanoBytes: imagen.tamanoBytes,
        eventoCapacitacionId: imagen.eventoCapacitacionId,
        fechaCreacion: imagen.fechaCreacion,
      });
    } catch (error) {
      return manejarError(res, error);
    }
  }

  async getImagenes(req: Request, res: Response) {
    try {
      const id = Number(req.params.id);
      if (Number.isNaN(id)) {
        return res.status(400).json({ mensaje: 'El id debe ser numérico.' });
      }
      const imagenes = await service.getImagenesPorEvento(id);
      return res.status(200).json(imagenes);
    } catch (error) {
      return manejarError(res, error);
    }
  }

  async getImagen(req: Request, res: Response) {
    try {
      const imagenId = Number(req.params.imagenId);
      if (Number.isNaN(imagenId)) {
        return res.status(400).json({ mensaje: 'El id de la imagen debe ser numérico.' });
      }
      const imagen = await service.getImagenPorId(imagenId);
      res.setHeader('Content-Type', imagen.tipoMime);
      res.setHeader('Content-Length', imagen.imagen.length.toString());
      return res.status(200).send(imagen.imagen);
    } catch (error) {
      return manejarError(res, error);
    }
  }

  /** Igual que getImagen, pero responde en JSON con el binario en base64. */
  async getImagenBase64(req: Request, res: Response) {
    try {
      const imagenId = Number(req.params.imagenId);
      if (Number.isNaN(imagenId)) {
        return res.status(400).json({ mensaje: 'El id de la imagen debe ser numérico.' });
      }
      const imagen = await service.getImagenPorId(imagenId);
      return res.status(200).json({
        id: imagen.id,
        tipoMime: imagen.tipoMime,
        nombreArchivo: imagen.nombreArchivo,
        tamanoBytes: imagen.tamanoBytes,
        eventoCapacitacionId: imagen.eventoCapacitacionId,
        fechaCreacion: imagen.fechaCreacion,
        imagenBase64: imagen.imagen.toString('base64'),
      });
    } catch (error) {
      return manejarError(res, error);
    }
  }

  async removeImagen(req: Request, res: Response) {
    try {
      const imagenId = Number(req.params.imagenId);
      if (Number.isNaN(imagenId)) {
        return res.status(400).json({ mensaje: 'El id de la imagen debe ser numérico.' });
      }
      const resultado = await service.removeImagen(imagenId);
      return res.status(200).json(resultado);
    } catch (error) {
      return manejarError(res, error);
    }
  }
}