import { AppDataSource } from '../../../data-source';

import {
  IncidenciaEvidencia,
  TipoEvidenciaIncidencia,
} from '../../../models/IncidenciaEvidencia';

import { Incidencia } from '../../../models/Incidencia';
import {
  decodificarYValidarArchivoEvidencia,
} from './IncidenciaEvidenciaValidation';

const evidenciaRepository =
  AppDataSource.getRepository(IncidenciaEvidencia);

const incidenciaRepository =
  AppDataSource.getRepository(Incidencia);

export interface CrearEvidenciaDTO {
  archivo: string;
  tipoMime: string;
  nombreArchivo: string | null;
  tamanoBytes: number | null;
  tipo: TipoEvidenciaIncidencia;
}

export const crearEvidencia = async (
  incidenciaId: number,
  datos: CrearEvidenciaDTO,
): Promise<IncidenciaEvidencia> => {
  const archivoBuffer =
    decodificarYValidarArchivoEvidencia(datos);

  const incidencia = await incidenciaRepository.findOne({
    where: {
      id: incidenciaId,
    },
  });

  if (!incidencia) {
    throw new Error('La incidencia no existe.');
  }

  const evidencia = evidenciaRepository.create({
    archivo: archivoBuffer,
    tipoMime: datos.tipoMime,
    nombreArchivo: datos.nombreArchivo,
    tamanoBytes:
      datos.tamanoBytes ?? archivoBuffer.length,
    tipo: datos.tipo,
    incidenciaId: incidencia.id,
    incidencia,
  });

  return await evidenciaRepository.save(evidencia);
};
export const obtenerEvidenciaPorId = async (
  id: number,
): Promise<IncidenciaEvidencia> => {
  const evidencia = await evidenciaRepository.findOne({
    where: { id },
    relations: {
      incidencia: {
        usuarioReporta: true,
      },
    },
  });

  if (!evidencia) {
    throw new Error('La evidencia no existe.');
  }

  return evidencia;
};