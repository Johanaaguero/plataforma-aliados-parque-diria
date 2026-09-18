import { AppDataSource } from '../../../data-source';

import {
  EstadoReserva as EstadoParticipante,
  Participantes,
} from '../../../models/Participantes';

import {
  Reserva,
  EstadoReserva,
} from '../../../models/Reserva';

import { EventosCapacitaciones } from '../../../models/EventosCapacitaciones';

export interface InscripcionAdministrativaDTO {
  id: number;
  usuarioId: number;
  nombreUsuario: string;
  correo: string;
  nombreCompleto: string;
  fechaNacimiento: string | null;
  tipoIdentificacion: string | null;
  numeroIdentificacion: string | null;
  telefono: string | null;
  eventoCapacitacionId: number;
  nombreActividad: string;
  tipoActividad: string;
  fechaActividad: string | null;
  fechaInscripcion: Date | string | null;
  estado: string;
  origen: 'participante' | 'reserva';
}

export const listarInscripcionesAdministrativas = async (): Promise<
  InscripcionAdministrativaDTO[]
> => {
  const registros = await AppDataSource.getRepository(Participantes)
    .createQueryBuilder('participante')
    .innerJoinAndSelect('participante.usuario', 'usuario')
    .innerJoinAndSelect(
      'participante.eventoCapacitacion',
      'evento',
    )
    .select([
      'participante.id AS id',
      'participante.usuarioId AS usuarioId',
      'usuario.nombreUsuario AS nombreUsuario',
      'usuario.correo AS correo',
      'usuario.nombre AS nombre',
      'usuario.apellidos AS apellidos',
      'participante.eventoCapacitacionId AS eventoCapacitacionId',
      'evento.nombre AS nombreActividad',
      'evento.tipoActividad AS tipoActividad',
      "DATE_FORMAT(evento.fecha, '%Y-%m-%d') AS fechaActividad",
      'participante.createdAt AS fechaInscripcion',
    ])
    .orderBy('participante.createdAt', 'DESC')
    .getRawMany();

  const participantes = registros.map((registro) => {
    const nombreCompleto =
      `${registro.nombre ?? ''} ${registro.apellidos ?? ''}`.trim();

    return {
      id: Number(registro.id),
      usuarioId: Number(registro.usuarioId),
      nombreUsuario: registro.nombreUsuario,
      correo: registro.correo,
      nombreCompleto,
      fechaNacimiento: null,
      tipoIdentificacion: null,
      numeroIdentificacion: null,
      telefono: null,
      eventoCapacitacionId: Number(
        registro.eventoCapacitacionId,
      ),
      nombreActividad: registro.nombreActividad,
      tipoActividad: registro.tipoActividad,
      fechaActividad: registro.fechaActividad ?? null,
      fechaInscripcion: registro.fechaInscripcion ?? null,
      estado: 'confirmada',
      origen: 'participante' as const,
    };
  });

  const reservas = await AppDataSource.getRepository(Reserva)
    .createQueryBuilder('reserva')
    .innerJoinAndSelect('reserva.usuario', 'usuario')
    .innerJoinAndSelect(
      'reserva.eventoCapacitacion',
      'evento',
    )
    .select([
      'reserva.id AS id',
      'reserva.usuarioId AS usuarioId',
      'usuario.nombreUsuario AS nombreUsuario',
      'reserva.correo AS correo',
      'reserva.nombreCompleto AS nombreCompleto',
      'reserva.fechaNacimiento AS fechaNacimiento',
      'reserva.tipoIdentificacion AS tipoIdentificacion',
      'reserva.numeroIdentificacion AS numeroIdentificacion',
      'reserva.telefono AS telefono',
      'reserva.eventoCapacitacionId AS eventoCapacitacionId',
      'evento.nombre AS nombreActividad',
      'evento.tipoActividad AS tipoActividad',
      "DATE_FORMAT(evento.fecha, '%Y-%m-%d') AS fechaActividad",
      'reserva.createdAt AS fechaInscripcion',
      'reserva.estado AS estado',
    ])
    .orderBy('reserva.createdAt', 'DESC')
    .getRawMany();

  return [
    ...participantes,
    ...reservas.map((registro) => ({
      id: Number(registro.id),
      usuarioId: Number(registro.usuarioId),
      nombreUsuario: registro.nombreUsuario,
      correo: registro.correo,
      nombreCompleto: registro.nombreCompleto,
      fechaNacimiento: registro.fechaNacimiento ?? null,
      tipoIdentificacion: registro.tipoIdentificacion ?? null,
      numeroIdentificacion:
        registro.numeroIdentificacion ?? null,
      telefono: registro.telefono ?? null,
      eventoCapacitacionId: Number(
        registro.eventoCapacitacionId,
      ),
      nombreActividad: registro.nombreActividad,
      tipoActividad: registro.tipoActividad,
      fechaActividad: registro.fechaActividad ?? null,
      fechaInscripcion: registro.fechaInscripcion ?? null,
      estado: registro.estado,
      origen: 'reserva' as const,
    })),
  ].sort(
    (a, b) =>
      new Date(b.fechaInscripcion ?? 0).getTime() -
      new Date(a.fechaInscripcion ?? 0).getTime(),
  );
};

export const actualizarEstadoReserva = async (
  reservaId: number,
  estado: EstadoReserva.APROBADA | EstadoReserva.RECHAZADA,
) => {
  return AppDataSource.transaction(async (manager) => {
    const reservasRepo = manager.getRepository(Reserva);
    const participantesRepo = manager.getRepository(Participantes);
    const eventosRepo =
      manager.getRepository(EventosCapacitaciones);

    const reserva = await reservasRepo.findOneBy({
      id: reservaId,
    });

    if (!reserva) {
      const error = new Error('La reserva no existe.');
      error.name = 'NotFoundError';
      throw error;
    }

    const evento = await eventosRepo
      .createQueryBuilder('evento')
      .setLock('pessimistic_write')
      .where('evento.id = :id', {
        id: reserva.eventoCapacitacionId,
      })
      .getOne();

    if (!evento) {
      const error = new Error(
        'La actividad asociada a la reserva no existe.',
      );
      error.name = 'NotFoundError';
      throw error;
    }

    if (reserva.estado !== EstadoReserva.PENDIENTE) {
      const error = new Error(
        'La reserva ya no está pendiente.',
      );
      error.name = 'InvalidReservationStateError';
      throw error;
    }

    if (estado === EstadoReserva.APROBADA) {
      const participanteExistente =
        await participantesRepo.findOne({
          where: {
            usuarioId: reserva.usuarioId,
            eventoCapacitacionId:
              reserva.eventoCapacitacionId,
          },
        });

      const participante = participanteExistente
        ? Object.assign(participanteExistente, {
            estado: EstadoParticipante.CONFIRMADA,
            fechaCancelacion: null,
          })
        : participantesRepo.create({
            usuarioId: reserva.usuarioId,
            eventoCapacitacionId:
              reserva.eventoCapacitacionId,
            estado: EstadoParticipante.CONFIRMADA,
          });

      await participantesRepo.save(participante);
    }

    reserva.estado = estado;

    const reservaActualizada =
      await reservasRepo.save(reserva);

    if (
      estado === EstadoReserva.RECHAZADA &&
      evento.cuposDisponibles !== null
    ) {
      evento.cuposDisponibles += 1;
      await eventosRepo.save(evento);
    }

    return reservaActualizada;
  });
};