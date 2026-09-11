import { AppDataSource } from '../../../data-source';
import { Participantes } from '../../../models/Participantes';

export interface InscripcionAdministrativaDTO {
  id: number;
  usuarioId: number;
  nombreUsuario: string;
  correo: string;
  nombreCompleto: string;
  eventoCapacitacionId: number;
  nombreActividad: string;
  tipoActividad: string;
  fechaActividad: string | null;
  fechaInscripcion: Date | string | null;
}

export const listarInscripcionesAdministrativas = async (): Promise<InscripcionAdministrativaDTO[]> => {
  const registros = await AppDataSource.getRepository(Participantes)
    .createQueryBuilder('participante')
    .innerJoinAndSelect('participante.usuario', 'usuario')
    .innerJoinAndSelect('participante.eventoCapacitacion', 'evento')
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

  return registros.map((registro) => {
    const nombreCompleto = `${registro.nombre ?? ''} ${registro.apellidos ?? ''}`.trim();

    return {
      id: Number(registro.id),
      usuarioId: Number(registro.usuarioId),
      nombreUsuario: registro.nombreUsuario,
      correo: registro.correo,
      nombreCompleto,
      eventoCapacitacionId: Number(registro.eventoCapacitacionId),
      nombreActividad: registro.nombreActividad,
      tipoActividad: registro.tipoActividad,
      fechaActividad: registro.fechaActividad ?? null,
      fechaInscripcion: registro.fechaInscripcion ?? null,
    };
  });
};
