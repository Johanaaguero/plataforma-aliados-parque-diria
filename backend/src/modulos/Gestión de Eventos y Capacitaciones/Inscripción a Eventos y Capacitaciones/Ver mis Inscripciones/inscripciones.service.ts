import { AppDataSource } from '../../../../data-source';
import { Participantes } from '../../../../models/Participantes';
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
      const inscritos = await participantesRepo.count({
        where: {
          eventoCapacitacionId: evento.id,
        },
      });

      cuposDisponibles = Math.max(
        evento.cupoMaximo - inscritos,
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
      estado: 'confirmada',
      fechaActividad: evento.fecha ?? null,
      fechaInscripcion: participante.createdAt ?? null,
    });
  }

  return resultado;
};

export const cancelarInscripcion = async (
  usuarioId: number,
  inscripcionId: number,
): Promise<void> => {
  const participantesRepo =
    AppDataSource.getRepository(Participantes);

  const participante = await participantesRepo.findOne({
    where: {
      id: inscripcionId,
      usuarioId,
    },
  });

  if (!participante) {
    const error = new Error(
      'La inscripción no existe o no pertenece al usuario.',
    );

    error.name = 'NotFoundError';

    throw error;
  }

  await participantesRepo.remove(participante);
};
