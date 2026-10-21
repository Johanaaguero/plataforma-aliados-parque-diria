import { Request, Response } from 'express';
import { AppDataSource } from '../../../data-source';
import { Reserva } from '../../../models/Reserva';
import { Usuario } from '../../../models/Usuario';
import { ComprobantePago } from '../../../models/ComprobantePago';
import { validarContenidoComprobante } from '../../../services/StorageService';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { DatosReserva, InscripcionService } from './inscripcion.service';
import { serializarFechaCalendario, serializarFechaUtc } from '../../../utils/fechas';

const service = new InscripcionService();

const serializarReservaConsulta = (reserva: Reserva | null) => {
  if (!reserva) return null;

  return {
    id: reserva.id,
    usuarioId: reserva.usuarioId,
    eventoCapacitacionId: reserva.eventoCapacitacionId,
    nombreCompleto: reserva.nombreCompleto,
    fechaNacimiento: serializarFechaCalendario(reserva.fechaNacimiento),
    tipoIdentificacion: reserva.tipoIdentificacion,
    numeroIdentificacion: reserva.numeroIdentificacion,
    correo: reserva.correo,
    telefono: reserva.telefono,
    estado: reserva.estado,
    numeroTicket: reserva.numeroTicket,
    comprobanteUrl: reserva.comprobanteUrl,
    metodoPago: reserva.metodoPago ?? reserva.eventoCapacitacion?.tipoPago ?? null,
    datosDevolucion: reserva.datosDevolucion ?? null,
    motivoRechazo: reserva.motivoRechazo ?? null,
    esPago: reserva.eventoCapacitacion?.esPago ?? false,
    precio: reserva.eventoCapacitacion?.precio ?? null,
    politicasCancelacion: reserva.eventoCapacitacion?.politicasCancelacion ?? null,
    createdAt: serializarFechaUtc(reserva.createdAt),
    updatedAt: serializarFechaUtc(reserva.updatedAt),
  };
};

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

    if (error.name === 'EventNotFoundError') {
      return res.status(404).json({
        ok: false,
        code: 'EVENT_NOT_FOUND',
        message: error.message,
      });
    }

    if (error.name === 'EventNotPublishedError') {
      return res.status(409).json({
        ok: false,
        code: 'EVENT_NOT_PUBLISHED',
        message: error.message,
      });
    }

    if (error.name === 'EventDatePassedError') {
      return res.status(409).json({
        ok: false,
        code: 'EVENT_DATE_PASSED',
        message: error.message,
      });
    }

    if (error.name === 'AgeNotAllowedError') {
      return res.status(400).json({
        ok: false,
        code: 'AGE_NOT_ALLOWED',
        message: error.message,
      });
    }

    if (error.name === 'ReservationAlreadyExistsError') {
      return res.status(409).json({
        ok: false,
        code: 'RESERVATION_ALREADY_EXISTS',
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

    if (error.name === 'PaymentProofRequiredError') {
      return res.status(409).json({
        ok: false,
        code: 'PAYMENT_PROOF_REQUIRED',
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
  async descargarComprobante(req: Request, res: Response) {
    const reservaId = Number(req.params.id);
    if (!req.usuario?.id || !Number.isSafeInteger(reservaId)) return res.status(404).end();
    const reserva = await AppDataSource.getRepository(Reserva).findOneBy({ id: reservaId });
    if (!reserva) return res.status(404).end();
    if (reserva.devolucionProcesadaEn) return res.status(404).end();
    const usuario = await AppDataSource.getRepository(Usuario).findOne({ where: { id: req.usuario.id }, relations: { rol: true } });
    if (!usuario || (reserva.usuarioId !== usuario.id && usuario.rol?.nombre !== 'administrador')) return res.status(404).end();
    const comprobante = await AppDataSource.getRepository(ComprobantePago).findOneBy({ reservaId });
    if (!comprobante) {
      // Compatibilidad de solo lectura durante la migración. La ruta sigue protegida.
      if (!reserva.comprobanteUrl) return res.status(404).end();
      const directorio = path.resolve(process.cwd(), 'uploads', 'comprobantes');
      const archivo = path.resolve(directorio, path.basename(reserva.comprobanteUrl));
      if (!archivo.startsWith(`${directorio}${path.sep}`)) return res.status(404).end();
      return res.sendFile(archivo, (error) => { if (error && !res.headersSent) res.status(404).end(); });
    }
    try {
      if (!comprobante.contenido) return res.status(404).end();
      res.setHeader('Content-Type', comprobante.contentType);
      res.setHeader('Content-Disposition', `inline; filename="comprobante-${reservaId}"`);
      res.setHeader('Cache-Control', 'private, no-store');
      return res.send(comprobante.contenido);
    } catch {
      return res.status(404).end();
    }
  }
  async subirComprobante(req: Request, res: Response) {
    try {
      const reservaId = Number(req.params.id);
      if (!req.usuario?.id || !Number.isSafeInteger(reservaId) || !req.file) {
        return res.status(400).json({ ok: false, message: 'Reserva o comprobante inválido.' });
      }
      const repo = AppDataSource.getRepository(Reserva);
      const reserva = await repo.findOne({ where: { id: reservaId }, relations: { eventoCapacitacion: true } });
      if (!reserva || reserva.usuarioId !== req.usuario.id) return res.status(404).json({ ok: false, message: 'Reserva no encontrada.' });
      if (!reserva.eventoCapacitacion.esPago) return res.status(409).json({ ok: false, message: 'Esta actividad no requiere comprobante de pago.' });
      const archivoSubido = req.file;
      validarContenidoComprobante(archivoSubido.buffer, archivoSubido.mimetype);
      const comprobantes = AppDataSource.getRepository(ComprobantePago);
      const anterior = await comprobantes.findOneBy({ reservaId: reserva.id });
      try {
        await AppDataSource.transaction(async (manager) => {
          await manager.getRepository(ComprobantePago).upsert({ reservaId: reserva.id, usuarioId: reserva.usuarioId, storageKey: null, contenido: archivoSubido.buffer, originalFilename: archivoSubido.originalname.slice(0, 255), contentType: archivoSubido.mimetype, sizeBytes: archivoSubido.buffer.length, sha256: createHash('sha256').update(archivoSubido.buffer).digest('hex'), storageProvider: 'mysql' }, ['reservaId']);
          reserva.comprobanteUrl = null;
          await manager.getRepository(Reserva).save(reserva);
        });
      } catch (error) {
        throw error;
      }
      return res.status(200).json({ ok: true });
    } catch {
      return res.status(500).json({ ok: false, message: 'No se pudo subir el comprobante.' });
    }
  }
  async consultarReserva(req: Request, res: Response) {
    try {
      if (!req.usuario?.id) {
        return res.status(401).json({
          ok: false,
          code: 'UNAUTHORIZED',
          message: 'Usuario no autenticado.',
        });
      }

      const idParam = req.params.id;
      if (typeof idParam !== 'string' || !/^[1-9]\d*$/.test(idParam)) {
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

      const resultado = await service.consultarReserva(
        req.usuario.id,
        eventoCapacitacionId,
      );

      return res.status(200).json({
        ok: true,
        message: 'Reserva consultada correctamente.',
        data: {
          existe: resultado.existe,
          inscrito: resultado.existe,
          estado: resultado.estado,
          reserva: serializarReservaConsulta(resultado.reserva),
        },
      });
    } catch {
      return res.status(500).json({
        ok: false,
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Error interno del servidor.',
      });
    }
  }

  async crearReserva(req: Request, res: Response) {
    try {
      if (!req.usuario?.id) {
        return res.status(401).json({
          ok: false,
          code: 'UNAUTHORIZED',
          message: 'Usuario no autenticado.',
        });
      }

      const idParam = req.params.id;
      if (typeof idParam !== 'string' || !/^[1-9]\d*$/.test(idParam)) {
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

      const resultado = await service.crearReserva(
        req.usuario.id,
        eventoCapacitacionId,
        req.body as DatosReserva,
        req.file
          ? { buffer: req.file.buffer, mimetype: req.file.mimetype, originalname: req.file.originalname }
          : undefined,
      );

      return res.status(201).json({
        ok: true,
        message: 'Reserva creada correctamente.',
        data: {
          id: resultado.reserva.id,
          usuarioId: resultado.reserva.usuarioId,
          eventoCapacitacionId: resultado.reserva.eventoCapacitacionId,
          nombreCompleto: resultado.reserva.nombreCompleto,
          fechaNacimiento: serializarFechaCalendario(resultado.reserva.fechaNacimiento),
          tipoIdentificacion: resultado.reserva.tipoIdentificacion,
          numeroIdentificacion: resultado.reserva.numeroIdentificacion,
          correo: resultado.reserva.correo,
          telefono: resultado.reserva.telefono,
          estado: resultado.reserva.estado,
          numeroTicket: resultado.reserva.numeroTicket,
          comprobanteUrl: resultado.reserva.comprobanteUrl,
          createdAt: serializarFechaUtc(resultado.reserva.createdAt),
          updatedAt: serializarFechaUtc(resultado.reserva.updatedAt),
          cuposDisponibles: resultado.cuposDisponibles,
        },
      });
    } catch (error) {
      return manejarError(res, error);
    }
  }

    async editarReserva(req: Request, res: Response) {
    try {
      // ---------------------------------------------------------
      // 1. Verificar usuario autenticado
      // ---------------------------------------------------------
      if (!req.usuario?.id) {
        return res.status(401).json({
          ok: false,
          code: 'UNAUTHORIZED',
          message: 'Usuario no autenticado.',
        });
      }

      // ---------------------------------------------------------
      // 2. Validar ID del evento/capacitación
      // ---------------------------------------------------------
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

      // ---------------------------------------------------------
      // 3. Editar reserva
      // ---------------------------------------------------------
      const resultado = await service.editarReserva(
        req.usuario.id,
        eventoCapacitacionId,
        req.body as DatosReserva,
      );

      // ---------------------------------------------------------
      // 4. Respuesta exitosa
      // ---------------------------------------------------------
      return res.status(200).json({
        ok: true,
        message: 'Su reserva ah sido actualizada correctamente.',
        data: {
          id: resultado.reserva.id,
          usuarioId: resultado.reserva.usuarioId,
          eventoCapacitacionId:
            resultado.reserva.eventoCapacitacionId,
          nombreCompleto:
            resultado.reserva.nombreCompleto,
          fechaNacimiento: serializarFechaCalendario(resultado.reserva.fechaNacimiento),
          tipoIdentificacion:
            resultado.reserva.tipoIdentificacion,
          numeroIdentificacion:
            resultado.reserva.numeroIdentificacion,
          correo:
            resultado.reserva.correo,
          telefono:
            resultado.reserva.telefono,
          estado:
            resultado.reserva.estado,
          numeroTicket: resultado.reserva.numeroTicket,
          comprobanteUrl: resultado.reserva.comprobanteUrl,
          createdAt: serializarFechaUtc(resultado.reserva.createdAt),
          updatedAt: serializarFechaUtc(resultado.reserva.updatedAt),
          cuposDisponibles:
            resultado.cuposDisponibles,
        },
      });
    } catch (error) {
      // ---------------------------------------------------------
      // 5. Manejar errores del service
      // ---------------------------------------------------------
      if (
        error instanceof Error &&
        error.name === 'ReservationNotEditableError'
      ) {
        return res.status(409).json({
          ok: false,
          code: 'RESERVATION_NOT_EDITABLE',
          message: error.message,
        });
      }

      return manejarError(res, error);
    }
  }

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
          numeroTicket: resultado.participante.numeroTicket,
          createdAt: serializarFechaUtc(resultado.participante.createdAt),
          cuposDisponibles: resultado.cuposDisponibles,
        },
      });
    } catch (error) {
      return manejarError(res, error);
    }
  }
}
