
import { Request, Response } from 'express';
import { EventosCapacitacionesService } from './eventosCapacitaciones.service';
import { TipoActividad, EstadoEventoCapacitacion, Temporada, } from '../../../models/EventosCapacitaciones';
import { registrarAuditoria, extraerIPDelRequest } from '../../Autenticación y gestión de usuario/Autenticación y seguridad de acceso al sistema/auditoria.service';

const service = new EventosCapacitacionesService();

function manejarError(res: Response, error: unknown) {
  if (error instanceof Error) {
    if (error.name === 'ValidationError') {
      return res.status(400).json({ mensaje: error.message });
    }

    if (error.name === 'NotFoundError') {
      return res.status(404).json({ mensaje: error.message });
    }

    return res.status(500).json({
      mensaje: 'Error interno del servidor.',
      detalle: error.message,
    });
  }

  return res.status(500).json({
    mensaje: 'Error interno del servidor.',
  });
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
        return res.status(400).json({
          mensaje: 'El id debe ser numérico.',
        });
      }

      const actualizado = await service.update(id, req.body);

      await registrarAuditoria({
        usuarioId: req.usuario?.id ?? null,
        action: 'ACTUALIZAR_EVENTO_CAPACITACION',
        description: `Actualización del evento o capacitación #${id}`,
        ipAddress: extraerIPDelRequest(req),
        userAgent: (req.headers['user-agent'] as string | undefined) ?? null,
        status: 'success',
        details: JSON.stringify(req.body),
      });

      return res.status(200).json(actualizado.toPublic());
    } catch (error) {
      return manejarError(res, error);
    }
  }

  async findAll(req: Request, res: Response) {
    try {
      const { tipoActividad, estado, temporada } = req.query;

      const filtros: {
        tipoActividad?: TipoActividad;
        estado?: EstadoEventoCapacitacion;
        temporada?: Temporada;
      } = {};

      if (tipoActividad) {
        if (
          !Object.values(TipoActividad).includes(
            tipoActividad as TipoActividad,
          )
        ) {
          return res.status(400).json({
            mensaje: `tipoActividad inválido. Valores permitidos: ${Object.values(
              TipoActividad,
            ).join(', ')}.`,
          });
        }

        filtros.tipoActividad =
          tipoActividad as TipoActividad;
      }

      if (estado) {
        if (
          !Object.values(EstadoEventoCapacitacion).includes(
            estado as EstadoEventoCapacitacion,
          )
        ) {
          return res.status(400).json({
            mensaje: `estado inválido. Valores permitidos: ${Object.values(
              EstadoEventoCapacitacion,
            ).join(', ')}.`,
          });
        }

        filtros.estado =
          estado as EstadoEventoCapacitacion;
      }

      if (temporada) {
        if (
          !Object.values(Temporada).includes(
            temporada as Temporada,
          )
        ) {
          return res.status(400).json({
            mensaje: `temporada inválida. Valores permitidos: ${Object.values(
              Temporada,
            ).join(', ')}.`,
          });
        }

        filtros.temporada =
          temporada as Temporada;
      }

      const registros =
        await service.findAll(filtros);

      return res.status(200).json(registros);
    } catch (error) {
      return manejarError(res, error);
    }
  }

  /**
   * DELETE /api/eventos-capacitaciones/:id
   * Elimina físicamente una actividad. La ruta limita el acceso a
   * administradores y la base de datos elimina sus imágenes en cascada.
   * Respuestas: 204, 400, 401, 403, 404 o 500.
   */
  async remove(req: Request, res: Response) {
    try {
      const idParam = req.params.id;

      if (typeof idParam !== 'string' || !/^[1-9]\d*$/.test(idParam)) {
        return res.status(400).json({
          mensaje: 'El id debe ser un número entero positivo.',
        });
      }

      const id = Number(idParam);

      if (!Number.isSafeInteger(id)) {
        return res.status(400).json({
          mensaje: 'El id debe ser un número entero positivo.',
        });
      }

      await service.remove(id);

      return res.status(204).send();
    } catch (error) {
      return manejarError(res, error);
    }
  }

  async cambiarEstado(req: Request, res: Response) {
    try {
      const id = Number(req.params.id);

      if (Number.isNaN(id)) {
        return res.status(400).json({
          mensaje: 'El id debe ser numérico.',
        });
      }

      const { estado } = req.body as {
        estado?: EstadoEventoCapacitacion;
      };

      if (!estado) {
        return res.status(400).json({
          mensaje: 'El campo "estado" es obligatorio.',
        });
      }

      if (
        !Object.values(
          EstadoEventoCapacitacion,
        ).includes(estado)
      ) {
        return res.status(400).json({
          mensaje: `El estado debe ser uno de: ${Object.values(
            EstadoEventoCapacitacion,
          ).join(', ')}.`,
        });
      }

      const actualizado =
        await service.cambiarEstado(id, estado);

      return res.status(200).json(
        actualizado.toPublic(),
      );
    } catch (error) {
      return manejarError(res, error);
    }
  }

  async uploadImagen(req: Request, res: Response) {
    try {
      const id = Number(req.params.id);

      if (Number.isNaN(id)) {
        return res.status(400).json({
          mensaje: 'El id debe ser numérico.',
        });
      }

      const {
        imagenBase64,
        tipoMime,
        nombreArchivo,
      } = req.body as {
        imagenBase64?: string;
        tipoMime?: string;
        nombreArchivo?: string;
      };

      if (
        !imagenBase64 ||
        typeof imagenBase64 !== 'string'
      ) {
        return res.status(400).json({
          mensaje:
            'Debe enviar la imagen en el campo "imagenBase64" (cadena base64).',
        });
      }

      if (
        !tipoMime ||
        typeof tipoMime !== 'string'
      ) {
        return res.status(400).json({
          mensaje:
            'El campo "tipoMime" es obligatorio.',
        });
      }

      const indiceComa =
        imagenBase64.indexOf(',');

      const base64Limpio =
        indiceComa !== -1
          ? imagenBase64.slice(indiceComa + 1)
          : imagenBase64;

      if (base64Limpio.trim().length === 0) {
        return res.status(400).json({
          mensaje:
            'El campo "imagenBase64" no contiene datos válidos.',
        });
      }

      const buffer = Buffer.from(
        base64Limpio,
        'base64',
      );

      const imagen =
        await service.addImagen(id, {
          buffer,
          tipoMime,
          nombreArchivo:
            nombreArchivo ?? null,
          tamanoBytes: buffer.length,
        });

      return res.status(201).json({
        id: imagen.id,
        tipoMime: imagen.tipoMime,
        nombreArchivo:
          imagen.nombreArchivo,
        tamanoBytes:
          imagen.tamanoBytes,
        eventoCapacitacionId:
          imagen.eventoCapacitacionId,
        fechaCreacion:
          imagen.fechaCreacion,
      });
    } catch (error) {
      return manejarError(res, error);
    }
  }

  async getImagenes(req: Request, res: Response) {
    try {
      const id = Number(req.params.id);

      if (Number.isNaN(id)) {
        return res.status(400).json({
          mensaje: 'El id debe ser numérico.',
        });
      }

      const imagenes =
        await service.getImagenesPorEvento(id);

      return res.status(200).json(imagenes);
    } catch (error) {
      return manejarError(res, error);
    }
  }

  async getImagen(req: Request, res: Response) {
    try {
      const imagenId =
        Number(req.params.imagenId);

      if (Number.isNaN(imagenId)) {
        return res.status(400).json({
          mensaje:
            'El id de la imagen debe ser numérico.',
        });
      }

      const imagen =
        await service.getImagenPorId(imagenId);

      res.setHeader(
        'Content-Type',
        imagen.tipoMime,
      );

      res.setHeader(
        'Content-Length',
        imagen.imagen.length.toString(),
      );

      return res
        .status(200)
        .send(imagen.imagen);
    } catch (error) {
      return manejarError(res, error);
    }
  }

  async getImagenBase64(
    req: Request,
    res: Response,
  ) {
    try {
      const imagenId =
        Number(req.params.imagenId);

      if (Number.isNaN(imagenId)) {
        return res.status(400).json({
          mensaje:
            'El id de la imagen debe ser numérico.',
        });
      }

      const imagen =
        await service.getImagenPorId(imagenId);

      return res.status(200).json({
        id: imagen.id,
        tipoMime: imagen.tipoMime,
        nombreArchivo:
          imagen.nombreArchivo,
        tamanoBytes:
          imagen.tamanoBytes,
        eventoCapacitacionId:
          imagen.eventoCapacitacionId,
        fechaCreacion:
          imagen.fechaCreacion,
        imagenBase64:
          imagen.imagen.toString('base64'),
      });
    } catch (error) {
      return manejarError(res, error);
    }
  }

    async removeImagen(
    req: Request,
    res: Response,
  ) {
    try {
      const id = Number(req.params.id);
      const imagenId =
        Number(req.params.imagenId);

      if (Number.isNaN(id) || Number.isNaN(imagenId)) {
        return res.status(400).json({
          mensaje:
            'Los ids deben ser numéricos.',
        });
      }

      const resultado =
        await service.removeImagen(id, imagenId);

      return res.status(200).json(resultado);
    } catch (error) {
      return manejarError(res, error);
    }
  }
  }
