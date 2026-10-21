import { Request, Response } from 'express';
import { AppDataSource } from '../../../data-source';
import { EventosCapacitacionesService } from './eventosCapacitaciones.service';
import { conBloqueoNotificacionEvento } from '../../Notificaciones/Crear notificaciones Eventos/notificacionEventoLock';
import {
  TipoActividad,
  EstadoEventoCapacitacion,
  Temporada,
} from '../../../models/EventosCapacitaciones';
import {
  registrarAuditoria,
  extraerIPDelRequest,
} from '../../Autenticación y gestión de usuario/Autenticación y seguridad de acceso al sistema/auditoria.service';

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

interface FiltrosEventos {
  tipoActividad?: TipoActividad;
  estado?: EstadoEventoCapacitacion;
  temporada?: Temporada;
}

const CAMPOS_AUDITABLES_EVENTO = [
  'nombre',
  'descripcion',
  'fecha',
  'hora',
  'lugar',
  'tipoActividad',
  'cupoMinimo',
  'cupoMaximo',
  'edadMinima',
  'edadMaxima',
  'estado',
  'temporada',
  'esPago',
  'precio',
  'tipoPago',
  'politicasCancelacion',
] as const;

function datosAuditablesEvento(data: Record<string, unknown>) {
  return Object.fromEntries(
    CAMPOS_AUDITABLES_EVENTO
      .filter((campo) => Object.prototype.hasOwnProperty.call(data, campo))
      .map((campo) => [campo, data[campo]]),
  );
}

function fallar(mensaje: string): never {
  const err = new Error(mensaje);
  err.name = 'ValidationError';
  throw err;
}

function parsearFiltros(query: Request['query']): FiltrosEventos {
  const { tipoActividad, estado, temporada } = query;
  const filtros: FiltrosEventos = {};

  if (tipoActividad) {
    if (!Object.values(TipoActividad).includes(tipoActividad as TipoActividad)) {
      fallar(
        `tipoActividad inválido. Valores permitidos: ${Object.values(TipoActividad).join(', ')}.`,
      );
    }
    filtros.tipoActividad = tipoActividad as TipoActividad;
  }

  if (temporada) {
    if (!Object.values(Temporada).includes(temporada as Temporada)) {
      fallar(
        `temporada inválida. Valores permitidos: ${Object.values(Temporada).join(', ')}.`,
      );
    }
    filtros.temporada = temporada as Temporada;
  }

  if (estado) {
    if (
      !Object.values(EstadoEventoCapacitacion).includes(
        estado as EstadoEventoCapacitacion,
      )
    ) {
      fallar(
        `estado inválido. Valores permitidos: ${Object.values(EstadoEventoCapacitacion).join(', ')}.`,
      );
    }
    filtros.estado = estado as EstadoEventoCapacitacion;
  }

  return filtros;
}

export class EventosCapacitacionesController {
  async create(req: Request, res: Response) {
    try {
      const creado = await AppDataSource.transaction(async (manager) => {
        const transactionService = new EventosCapacitacionesService(manager);
        const creado = await transactionService.create(req.body);
        await registrarAuditoria({
          usuarioId: req.usuario?.id ?? null,
          action: 'CREAR_EVENTO_CAPACITACION',
          description: `Creación del evento o capacitación #${creado.id}`,
          ipAddress: extraerIPDelRequest(req),
          userAgent: (req.headers['user-agent'] as string | undefined) ?? null,
          status: 'success',
          details: JSON.stringify({
            eventoCapacitacionId: creado.id,
            tipoActividad: creado.tipoActividad,
            estado: creado.estado,
            campos: datosAuditablesEvento(req.body as Record<string, unknown>),
          }),
        }, manager);
        return creado;
      });
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

      const actualizarEnTransaccion = () =>
        AppDataSource.transaction(async (manager) => {
          const transactionService = new EventosCapacitacionesService(manager);
          const actualizado = await transactionService.update(id, req.body);
          await registrarAuditoria({
            usuarioId: req.usuario?.id ?? null,
            action: 'ACTUALIZAR_EVENTO_CAPACITACION',
            description: `Actualización del evento o capacitación #${id}`,
            ipAddress: extraerIPDelRequest(req),
            userAgent: (req.headers['user-agent'] as string | undefined) ?? null,
            status: 'success',
            details: JSON.stringify({
              eventoCapacitacionId: actualizado.id,
              tipoActividad: actualizado.tipoActividad,
              estado: actualizado.estado,
              campos: datosAuditablesEvento(req.body as Record<string, unknown>),
            }),
          }, manager);
          return actualizado;
        });
      const actualizado =
        req.body?.estado === EstadoEventoCapacitacion.PUBLICADO
          ? await conBloqueoNotificacionEvento(
              id,
              actualizarEnTransaccion,
            )
          : await actualizarEnTransaccion();

      return res.status(200).json(actualizado.toPublic());
    } catch (error) {
      return manejarError(res, error);
    }
  }

  /** GET /api/eventos-capacitaciones  -> público, solo publicados */
  async findAll(req: Request, res: Response) {
    try {
      const filtros = parsearFiltros(req.query);

      if (
        filtros.estado &&
        filtros.estado !== EstadoEventoCapacitacion.PUBLICADO
      ) {
        return res.status(400).json({
          mensaje: 'El listado público solo permite actividades publicadas.',
        });
      }

      const registros = await service.findAll({
        ...filtros,
        estado: EstadoEventoCapacitacion.PUBLICADO,
      });

      return res.status(200).json(registros);
    } catch (error) {
      return manejarError(res, error);
    }
  }

  /** GET /api/eventos-capacitaciones/admin -> todos los estados */
  async findAllAdmin(req: Request, res: Response) {
    try {
      const filtros = parsearFiltros(req.query);
      const registros = await service.findAll(filtros);
      return res.status(200).json(registros);
    } catch (error) {
      return manejarError(res, error);
    }
  }

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

      await AppDataSource.transaction(async (manager) => {
        const transactionService = new EventosCapacitacionesService(manager);
        const eliminado = await transactionService.remove(id);
        await registrarAuditoria({
          usuarioId: req.usuario?.id ?? null,
          action: 'ELIMINAR_EVENTO_CAPACITACION',
          description: `Eliminación del evento o capacitación #${id}`,
          ipAddress: extraerIPDelRequest(req),
          userAgent: (req.headers['user-agent'] as string | undefined) ?? null,
          status: 'success',
          details: JSON.stringify({
            eventoCapacitacionId: eliminado.id,
            tipoActividad: eliminado.tipoActividad,
            estado: eliminado.estado,
            nombre: eliminado.nombre,
          }),
        }, manager);
      });
      return res.status(204).send();
    } catch (error) {
      return manejarError(res, error);
    }
  }

  async cambiarEstado(req: Request, res: Response) {
    try {
      const id = Number(req.params.id);

      if (Number.isNaN(id)) {
        return res.status(400).json({ mensaje: 'El id debe ser numérico.' });
      }

      const { estado } = req.body as { estado?: EstadoEventoCapacitacion };

      if (!estado) {
        return res.status(400).json({
          mensaje: 'El campo "estado" es obligatorio.',
        });
      }

      if (!Object.values(EstadoEventoCapacitacion).includes(estado)) {
        return res.status(400).json({
          mensaje: `El estado debe ser uno de: ${Object.values(
            EstadoEventoCapacitacion,
          ).join(', ')}.`,
        });
      }

      const cambiarEstadoEnTransaccion = () =>
        AppDataSource.transaction(async (manager) => {
          const transactionService = new EventosCapacitacionesService(manager);
          const anterior = await transactionService.obtenerDetalle(id);
          const actualizado = await transactionService.cambiarEstado(id, estado);
          await registrarAuditoria({
            usuarioId: req.usuario?.id ?? null,
            action: 'CAMBIAR_ESTADO_EVENTO_CAPACITACION',
            description: `Cambio de estado del evento o capacitación #${id}`,
            ipAddress: extraerIPDelRequest(req),
            userAgent: (req.headers['user-agent'] as string | undefined) ?? null,
            status: 'success',
            details: JSON.stringify({
              eventoCapacitacionId: actualizado.id,
              tipoActividad: actualizado.tipoActividad,
              estadoAnterior: anterior.estado,
              estadoNuevo: actualizado.estado,
            }),
          }, manager);
          return actualizado;
        });
      const actualizado =
        estado === EstadoEventoCapacitacion.PUBLICADO
          ? await conBloqueoNotificacionEvento(
              id,
              cambiarEstadoEnTransaccion,
            )
          : await cambiarEstadoEnTransaccion();
      return res.status(200).json(actualizado.toPublic());
    } catch (error) {
      return manejarError(res, error);
    }
  }

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
          mensaje:
            'Debe enviar la imagen en el campo "imagenBase64" (cadena base64).',
        });
      }

      if (!tipoMime || typeof tipoMime !== 'string') {
        return res.status(400).json({
          mensaje: 'El campo "tipoMime" es obligatorio.',
        });
      }

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
        return res.status(400).json({
          mensaje: 'El id de la imagen debe ser numérico.',
        });
      }

      const imagen = await service.getImagenPorId(imagenId);

      res.setHeader('Content-Type', imagen.tipoMime);
      res.setHeader('Content-Length', imagen.imagen.length.toString());

      return res.status(200).send(imagen.imagen);
    } catch (error) {
      return manejarError(res, error);
    }
  }

  async getImagenBase64(req: Request, res: Response) {
    try {
      const imagenId = Number(req.params.imagenId);

      if (Number.isNaN(imagenId)) {
        return res.status(400).json({
          mensaje: 'El id de la imagen debe ser numérico.',
        });
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
      const id = Number(req.params.id);
      const imagenId = Number(req.params.imagenId);

      if (Number.isNaN(id) || Number.isNaN(imagenId)) {
        return res.status(400).json({
          mensaje: 'Los ids deben ser numéricos.',
        });
      }

      const resultado = await service.removeImagen(id, imagenId);
      return res.status(200).json(resultado);
    } catch (error) {
      return manejarError(res, error);
    }
  }
}
