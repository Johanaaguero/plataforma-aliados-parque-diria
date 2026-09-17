import { AppDataSource } from '../../../../data-source';
import { Participantes, EstadoReserva } from '../../../../models/Participantes';
import { Reserva, EstadoReserva as EstadoReservaNueva } from '../../../../models/Reserva';
import { EventosCapacitaciones } from '../../../../models/EventosCapacitaciones';

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
    .orderBy('evento.fecha', 'ASC')
    .addOrderBy('evento.hora', 'ASC')
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
      fechaCancelacion: participante.fechaCancelacion,
      fechaActividad: evento.fecha ?? null,
      fechaInscripcion: participante.createdAt ?? null,
    });
  }

  const reservas = await AppDataSource.getRepository(Reserva)
    .createQueryBuilder('reserva')
    .innerJoinAndSelect('reserva.eventoCapacitacion', 'evento')
    .where('reserva.usuarioId = :usuarioId', { usuarioId })
    .orderBy('evento.fecha', 'ASC')
    .addOrderBy('evento.hora', 'ASC')
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
          fechaInscripcion: reserva.createdAt ?? null,
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
      ubicacion: reserva.eventoCapacitacion.lugar ?? null,
      horaInicio: reserva.eventoCapacitacion.hora ?? null,
      horaFin: null,
      cuposDisponibles: reserva.eventoCapacitacion.cuposDisponibles,
      estado: reserva.estado as string,
      fechaCancelacion: null,
      fechaActividad: reserva.eventoCapacitacion.fecha ?? null,
      fechaInscripcion: reserva.createdAt ?? null,
      origen: 'reserva' as const,
    })));

  return resultado.sort((a, b) => {
    const fechaA = a.fechaActividad ? new Date(a.fechaActividad).getTime() : Number.MAX_SAFE_INTEGER;
    const fechaB = b.fechaActividad ? new Date(b.fechaActividad).getTime() : Number.MAX_SAFE_INTEGER;
    return fechaA - fechaB;
  });
};

export const cancelarInscripcion = async (
  usuarioId: number,
  inscripcionId: number,
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
