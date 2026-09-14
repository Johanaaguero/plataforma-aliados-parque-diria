import { AppDataSource } from '../../../../data-source';
import { Participantes, EstadoReserva } from '../../../../models/Participantes';
import { EventosCapacitaciones } from '../../../../models/EventosCapacitaciones';
import { In } from 'typeorm';

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
      cuposDisponibles = evento.cuposDisponibles ?? Math.max(
        evento.cupoMaximo - await participantesRepo.count({
          where: {
            eventoCapacitacionId: evento.id,
            estado: In([EstadoReserva.PENDIENTE, EstadoReserva.CONFIRMADA]),
          },
        }),
        0,
      );
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

  return resultado;
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
