import { Request, Response } from 'express';
import { listarInscripcionesAdministrativas, actualizarEstadoReserva } from './inscripcionesAdmin.service';
import { EstadoReserva } from '../../../models/Reserva';

export const getInscripcionesAdministrativas = async (
  _req: Request,
  res: Response,
) => {
  try {
    const inscripciones = await listarInscripcionesAdministrativas();

    return res.status(200).json({
      ok: true,
      message: 'Inscripciones consultadas correctamente.',
      data: inscripciones,
    });
  } catch (error) {
    console.error('Error al consultar inscripciones administrativas:', error);

    return res.status(500).json({
      ok: false,
      message: 'Error interno del servidor',
    });
  }
};

const cambiarEstadoReserva = (estado: 'aprobada' | 'rechazada') => async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isSafeInteger(id) || id <= 0) {
      return res.status(400).json({ ok: false, code: 'INVALID_ID', message: 'El id de la reserva no es válido.' });
    }

    const motivoRechazo = typeof req.body?.motivoRechazo === 'string'
      ? req.body.motivoRechazo.trim()
      : '';
    if (estado === 'rechazada' && !motivoRechazo) {
      return res.status(400).json({ ok: false, code: 'REJECTION_REASON_REQUIRED', message: 'El motivo del rechazo es obligatorio.' });
    }

    const reserva = await actualizarEstadoReserva(
      id,
      estado === 'aprobada' ? EstadoReserva.APROBADA : EstadoReserva.RECHAZADA,
      motivoRechazo || null,
      req.usuario?.id ?? null,
    );
    return res.status(200).json({ ok: true, message: `Reserva ${estado} correctamente.`, data: { id: reserva.id, estado: reserva.estado, motivoRechazo: reserva.motivoRechazo } });
  } catch (error) {
    if (error instanceof Error && error.name === 'NotFoundError') {
      return res.status(404).json({ ok: false, code: 'RESERVATION_NOT_FOUND', message: error.message });
    }
    if (error instanceof Error && error.name === 'InvalidReservationStateError') {
      return res.status(409).json({ ok: false, code: 'INVALID_RESERVATION_STATE', message: error.message });
    }
    return res.status(500).json({ ok: false, code: 'INTERNAL_SERVER_ERROR', message: 'Error interno del servidor.' });
  }
};

export const aprobarReserva = cambiarEstadoReserva('aprobada');
export const rechazarReserva = cambiarEstadoReserva('rechazada');
