import { AppDataSource } from '../../../data-source';
import { Emprendimiento } from '../../../models/Emprendimiento';

const emprendimientoRepository =
  AppDataSource.getRepository(Emprendimiento);

interface ErrorServicio {
  statusCode: number;
  message: string;
}

export const eliminarEmprendimiento = async (id: number): Promise<void> => {
  if (!Number.isInteger(id) || id <= 0) {
    const error: ErrorServicio = {
      statusCode: 400,
      message: 'El ID del emprendimiento no es válido.',
    };

    throw error;
  }

  const emprendimiento = await emprendimientoRepository.findOne({
    where: { id },
  });

  if (!emprendimiento) {
    const error: ErrorServicio = {
      statusCode: 404,
      message: 'El emprendimiento no fue encontrado.',
    };

    throw error;
  }

  await emprendimientoRepository.remove(emprendimiento);
};