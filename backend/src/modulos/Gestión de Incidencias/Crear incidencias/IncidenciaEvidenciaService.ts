import { AppDataSource } from '../../../data-source';

import {
  IncidenciaEvidencia,
  TipoEvidenciaIncidencia,
} from '../../../models/IncidenciaEvidencia';

import { Incidencia } from '../../../models/Incidencia';

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
  const incidencia = await incidenciaRepository.findOne({
    where: {
      id: incidenciaId,
    },
  });

  if (!incidencia) {
    throw new Error('La incidencia no existe.');
  }

  if (!datos.archivo) {
    throw new Error('El archivo es obligatorio.');
  }

  let base64: string = datos.archivo;

  // Quitar el encabezado Base64 si existe
  // Ejemplo:
  // data:image/jpeg;base64,/9j/4AAQ...
  if (base64.includes(',')) {
    const partes = base64.split(',');

    if (partes.length < 2 || !partes[1]) {
      throw new Error('El archivo Base64 no es válido.');
    }

    base64 = partes[1];
  }

  const archivoBuffer = Buffer.from(
    base64,
    'base64',
  );

  if (archivoBuffer.length === 0) {
    throw new Error('El archivo no es válido.');
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
  });

  if (!evidencia) {
    throw new Error('La evidencia no existe.');
  }

  return evidencia;
};