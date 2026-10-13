import { AppDataSource } from '../../../../data-source';
import { Participantes, EstadoReserva } from '../../../../models/Participantes';
import { Reserva, EstadoReserva as EstadoReservaNueva } from '../../../../models/Reserva';
import { EventosCapacitaciones } from '../../../../models/EventosCapacitaciones';
import { serializarFechaCalendario, serializarFechaUtc } from '../../../../utils/fechas';

const validarDatosDevolucion = (valor: unknown): { tipo: 'sinpe_movil' | 'transferencia_bancaria'; telefono?: string; iban?: string; banco?: string } => {
  if (!valor || typeof valor !== 'object') { const error = new Error('Debes indicar los datos para la devolución.'); error.name = 'RefundDataError'; throw error; }
  const datos = valor as Record<string, unknown>;
  if (datos.tipo === 'sinpe_movil' && typeof datos.telefono === 'string' && datos.telefono.trim()) return { tipo: 'sinpe_movil', telefono: datos.telefono.trim() };
  if (datos.tipo === 'transferencia_bancaria' && typeof datos.iban === 'string' && datos.iban.trim() && typeof datos.banco === 'string' && datos.banco.trim()) return { tipo: 'transferencia_bancaria', iban: datos.iban.trim(), banco: datos.banco.trim() };
  const error = new Error('Completa los datos de devolución requeridos.'); error.name = 'RefundDataError'; throw error;
};

export interface MiInscripcionDTO {
  id: number;
  eventoCapacitacionId: number;
  nombreActividad: string;
  tipoActividad: string;
  descripcion: string | null;
  ubicacion: string | null;
  horaInicio: string | null;
  horaFin: string | null;
  cuposDisponibles: number | null;
  estado: string;
  fechaCancelacion: Date | string | null;
  fechaActividad: string | null;
  fechaInscripcion: Date | string | null;
  origen?: 'participante' | 'reserva';
  motivoRechazo?: string | null;
  numeroTicket?: string | null;
  comprobanteUrl?: string | null;
  metodoPago?: string | null;
  datosDevolucion?: unknown;
}

export const listarMisInscripciones = async (
  usuarioId: number,
): Promise<MiInscripcionDTO[]> => {
  const participantesRepo =
    AppDataSource.getRepository(Participantes);

  const registros = await participantesRepo
    .createQueryBuilder('participante')
    .innerJoinAndSelect(
      'participante.eventoCapacitacion',
      'evento',
    )
    .where('participante.usuarioId = :usuarioId', {
      usuarioId,
    })
    .orderBy('participante.createdAt', 'DESC')
    .getMany();

  const resultado: MiInscripcionDTO[] = [];

  for (const participante of registros) {
    const evento = participante.eventoCapacitacion;

    let cuposDisponibles: number | null = null;

    if (evento.cupoMaximo !== null) {
      cuposDisponibles = evento.cuposDisponibles;
    }

    resultado.push({
      id: participante.id,
      eventoCapacitacionId: evento.id,
      nombreActividad: evento.nombre ?? '',
      tipoActividad: evento.tipoActividad,
      descripcion: evento.descripcion ?? null,
      ubicacion: evento.lugar ?? null,
      horaInicio: evento.hora ?? null,
      horaFin: null,
      cuposDisponibles,
      estado: participante.estado,
      numeroTicket: participante.numeroTicket ?? null,
      fechaCancelacion: serializarFechaUtc(participante.fechaCancelacion),
      fechaActividad: serializarFechaCalendario(evento.fecha),
      fechaInscripcion: serializarFechaUtc(participante.createdAt),
    });
  }

  const reservas = await AppDataSource.getRepository(Reserva)
    .createQueryBuilder('reserva')
    .innerJoinAndSelect('reserva.eventoCapacitacion', 'evento')
    .where('reserva.usuarioId = :usuarioId', { usuarioId })
    .orderBy('reserva.createdAt', 'DESC')
    .getMany();

  const participantesPorEvento = new Map(
    registros.map((participante) => [
      participante.eventoCapacitacionId,
      participante,
    ]),
  );
  const reservasUnificadas = new Set<number>();

  for (const reserva of reservas) {
    const participante = participantesPorEvento.get(reserva.eventoCapacitacionId);

    if (reserva.estado === EstadoReservaNueva.APROBADA && participante) {
      const indiceParticipante = resultado.findIndex(
        (inscripcion) =>
          inscripcion.id === participante.id &&
          inscripcion.eventoCapacitacionId === reserva.eventoCapacitacionId,
      );

      const inscripcionParticipante = resultado[indiceParticipante];

      if (inscripcionParticipante) {
        resultado[indiceParticipante] = {
          ...inscripcionParticipante,
          id: reserva.id,
          estado: EstadoReservaNueva.APROBADA,
          numeroTicket: reserva.numeroTicket ?? participante.numeroTicket ?? null,
          fechaInscripcion: serializarFechaUtc(reserva.createdAt),
          origen: 'reserva',
        };
        reservasUnificadas.add(reserva.id);
      }
    }
  }

  resultado.push(...reservas
    .filter((reserva) => !reservasUnificadas.has(reserva.id))
    .map((reserva) => ({
      id: reserva.id,
      eventoCapacitacionId: reserva.eventoCapacitacionId,
      nombreActividad: reserva.eventoCapacitacion.nombre ?? '',
      tipoActividad: reserva.eventoCapacitacion.tipoActividad,
      descripcion: reserva.eventoCapacitacion.descripcion ?? null,
      esPago: reserva.eventoCapacitacion.esPago,
      precio: reserva.eventoCapacitacion.precio,
      politicasCancelacion: reserva.eventoCapacitacion.politicasCancelacion,
      ubicacion: reserva.eventoCapacitacion.lugar ?? null,
      horaInicio: reserva.eventoCapacitacion.hora ?? null,
      horaFin: null,
      cuposDisponibles: reserva.eventoCapacitacion.cuposDisponibles,
      estado: reserva.estado as string,
      motivoRechazo: reserva.motivoRechazo ?? null,
      comprobanteUrl: reserva.comprobanteUrl ?? null,
      metodoPago: reserva.metodoPago ?? reserva.eventoCapacitacion.tipoPago ?? null,
      datosDevolucion: reserva.datosDevolucion ?? null,
      numeroTicket: reserva.numeroTicket ?? null,
      fechaCancelacion: null,
      fechaActividad: serializarFechaCalendario(reserva.eventoCapacitacion.fecha),
      fechaInscripcion: serializarFechaUtc(reserva.createdAt),
      origen: 'reserva' as const,
    })));

  return resultado.sort((a, b) => {
    const fechaA = a.fechaInscripcion
      ? new Date(a.fechaInscripcion).getTime()
      : 0;
    const fechaB = b.fechaInscripcion
      ? new Date(b.fechaInscripcion).getTime()
      : 0;

    return fechaB - fechaA;
  });
};

export const cancelarInscripcion = async (
  usuarioId: number,
  inscripcionId: number,
  _datosDevolucion?: unknown,
): Promise<{ id: number; estado: EstadoReserva; fechaCancelacion: Date; cuposDisponibles: number | null }> => {
  return AppDataSource.transaction(async (manager) => {
    const participantesRepo = manager.getRepository(Participantes);
    const eventosRepo = manager.getRepository(EventosCapacitaciones);
    const participante = await participantesRepo.findOne({ where: { id: inscripcionId } });

    if (!participante) {
      const error = new Error('La reserva no existe.');
      error.name = 'NotFoundError';
      throw error;
    }
    if (participante.usuarioId !== usuarioId) {
      const error = new Error('No tienes permiso para cancelar esta reserva.');
      error.name = 'ForbiddenError';
      throw error;
    }
    if (![EstadoReserva.PENDIENTE, EstadoReserva.CONFIRMADA].includes(participante.estado)) {
      const error = new Error('La reserva ya fue cancelada o no puede cancelarse.');
      error.name = 'InvalidReservationStateError';
      throw error;
    }

    const evento = await eventosRepo.createQueryBuilder('evento')
      .setLock('pessimistic_write')
      .where('evento.id = :id', { id: participante.eventoCapacitacionId })
      .getOne();
    if (!evento) {
      const error = new Error('La actividad asociada a la reserva no existe.');
      error.name = 'NotFoundError';
      throw error;
    }

    if (evento.esPago) {
      const fechaEvento = new Date(`${evento.fecha ?? ''}T${evento.hora ?? '00:00'}:00`);
      if (Number.isNaN(fechaEvento.getTime()) || fechaEvento.getTime() - Date.now() < 48 * 60 * 60 * 1000) {
        const error = new Error('Las actividades de pago solo pueden cancelarse con al menos 48 horas de anticipación.');
        error.name = 'PaymentCancellationWindowError';
        throw error;
      }
    }

    const fechaCancelacion = new Date();
    participante.estado = EstadoReserva.CANCELADA;
    participante.fechaCancelacion = fechaCancelacion;
    await participantesRepo.save(participante);
    if (evento.cuposDisponibles !== null) {
      evento.cuposDisponibles += 1;
      await eventosRepo.save(evento);
    }

    return { id: participante.id, estado: participante.estado, fechaCancelacion, cuposDisponibles: evento.cuposDisponibles };
  });
};

export const cancelarReserva = async (
  usuarioId: number,
  reservaId: number,
  datosDevolucion?: unknown,
): Promise<{ id: number; estado: EstadoReservaNueva.CANCELADA; fechaCancelacion: Date; cuposDisponibles: number | null }> => {
  return AppDataSource.transaction(async (manager) => {
    const reservasRepo = manager.getRepository(Reserva);
    const participantesRepo = manager.getRepository(Participantes);
    const eventosRepo = manager.getRepository(EventosCapacitaciones);
    const reserva = await reservasRepo.findOne({ where: { id: reservaId } });

    if (!reserva) {
      const error = new Error('La reserva no existe.');
      error.name = 'NotFoundError';
      throw error;
    }
    if (reserva.usuarioId !== usuarioId) {
      const error = new Error('No tienes permiso para cancelar esta reserva.');
      error.name = 'ForbiddenError';
      throw error;
    }
    if (![EstadoReservaNueva.PENDIENTE, EstadoReservaNueva.APROBADA].includes(reserva.estado)) {
      const error = new Error('La reserva ya fue cancelada o no puede cancelarse.');
      error.name = 'InvalidReservationStateError';
      throw error;
    }

    const evento = await eventosRepo.createQueryBuilder('evento')
      .setLock('pessimistic_write')
      .where('evento.id = :id', { id: reserva.eventoCapacitacionId })
      .getOne();
    if (!evento) {
      const error = new Error('La actividad asociada a la reserva no existe.');
      error.name = 'NotFoundError';
      throw error;
    }

    if (evento.esPago) {
      const fechaEvento = new Date(`${evento.fecha ?? ''}T${evento.hora ?? '00:00'}:00`);
      if (Number.isNaN(fechaEvento.getTime()) || fechaEvento.getTime() - Date.now() < 48 * 60 * 60 * 1000) {
        const error = new Error('Las actividades de pago solo pueden cancelarse con al menos 48 horas de anticipación.');
        error.name = 'PaymentCancellationWindowError';
        throw error;
      }
      const datos = validarDatosDevolucion(datosDevolucion);
      reserva.datosDevolucion = datos;
    }

    if (reserva.estado === EstadoReservaNueva.APROBADA) {
      const participante = await participantesRepo.findOne({
        where: {
          usuarioId: reserva.usuarioId,
          eventoCapacitacionId: reserva.eventoCapacitacionId,
        },
      });
      if (!participante) {
        const error = new Error('La inscripción aprobada no tiene un participante asociado.');
        error.name = 'NotFoundError';
        throw error;
      }
      participante.estado = EstadoReserva.CANCELADA;
      participante.fechaCancelacion = new Date();
      await participantesRepo.save(participante);
    }

    const fechaCancelacion = new Date();
    reserva.estado = EstadoReservaNueva.CANCELADA;
    await reservasRepo.save(reserva);
    if (evento.cuposDisponibles !== null) {
      evento.cuposDisponibles += 1;
      await eventosRepo.save(evento);
    }

    return {
      id: reserva.id,
      estado: EstadoReservaNueva.CANCELADA,
      fechaCancelacion,
      cuposDisponibles: evento.cuposDisponibles,
    };
  });
};

export const registrarDatosDevolucion = async (
  usuarioId: number,
  reservaId: number,
  datosDevolucion: unknown,
): Promise<{ id: number; datosDevolucion: Reserva['datosDevolucion'] }> => {
  return AppDataSource.transaction(async (manager) => {
    const reservasRepo = manager.getRepository(Reserva);
    const reserva = await reservasRepo.findOne({
      where: { id: reservaId },
      relations: { eventoCapacitacion: true },
    });

    if (!reserva) {
      const error = new Error('La reserva no existe.');
      error.name = 'NotFoundError';
      throw error;
    }
    if (reserva.usuarioId !== usuarioId) {
      const error = new Error('No tienes permiso para actualizar esta reserva.');
      error.name = 'ForbiddenError';
      throw error;
    }
    if (!reserva.eventoCapacitacion.esPago || ![EstadoReservaNueva.RECHAZADA, EstadoReservaNueva.CANCELADA].includes(reserva.estado)) {
      const error = new Error('Los datos de devolución solo se solicitan para reservas de pago rechazadas o canceladas.');
      error.name = 'InvalidReservationStateError';
      throw error;
    }

    reserva.datosDevolucion = validarDatosDevolucion(datosDevolucion);
    await reservasRepo.save(reserva);

    return { id: reserva.id, datosDevolucion: reserva.datosDevolucion };
  });
};
