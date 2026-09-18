import { Request, Response } from 'express';
import { DatosReserva, InscripcionService } from './inscripcion.service';

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
        data: resultado,
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
      );

      return res.status(201).json({
        ok: true,
        message: 'Reserva creada correctamente.',
        data: {
          id: resultado.reserva.id,
          usuarioId: resultado.reserva.usuarioId,
          eventoCapacitacionId: resultado.reserva.eventoCapacitacionId,
          nombreCompleto: resultado.reserva.nombreCompleto,
          fechaNacimiento: resultado.reserva.fechaNacimiento,
          tipoIdentificacion: resultado.reserva.tipoIdentificacion,
          numeroIdentificacion: resultado.reserva.numeroIdentificacion,
          correo: resultado.reserva.correo,
          telefono: resultado.reserva.telefono,
          estado: resultado.reserva.estado,
          createdAt: resultado.reserva.createdAt,
          updatedAt: resultado.reserva.updatedAt,
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
          fechaNacimiento:
            resultado.reserva.fechaNacimiento,
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
          createdAt:
            resultado.reserva.createdAt,
          updatedAt:
            resultado.reserva.updatedAt,
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
          createdAt: resultado.participante.createdAt,
          cuposDisponibles: resultado.cuposDisponibles,
        },
      });
    } catch (error) {
      return manejarError(res, error);
    }
  }
}
