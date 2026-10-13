import { AppDataSource } from '../../../data-source';
import { CategoriaEmprendimiento } from '../../../models/CategoriaEmprendimiento';
import { QueryFailedError } from 'typeorm';

const categoriaRepository = AppDataSource.getRepository(CategoriaEmprendimiento);

const errorCategoriaDuplicada = (): Error => {
  const error = new Error('Ya existe una categoría con ese nombre');
  error.name = 'DuplicateCategoryError';
  return error;
};

const esDuplicadoMysql = (error: unknown): boolean => {
  if (!(error instanceof QueryFailedError)) return false;

  const driverError = error.driverError as { code?: string } | undefined;
  return driverError?.code === 'ER_DUP_ENTRY';
};

interface CrearCategoriaDto {
  nombre?: unknown;
  descripcion?: unknown;
}

export class CategoriaEmprendimientoService {
  async crear(dto: CrearCategoriaDto): Promise<CategoriaEmprendimiento> {
    if (typeof dto?.nombre !== 'string' || !dto.nombre.trim()) {
      const error = new Error('El nombre de la categoría es obligatorio');
      error.name = 'ValidationError';
      throw error;
    }

    const nombre = dto.nombre.trim();

    if (nombre.length > 100) {
      const error = new Error('El nombre de la categoría no puede superar los 100 caracteres');
      error.name = 'ValidationError';
      throw error;
    }

    if (
      dto.descripcion !== undefined &&
      dto.descripcion !== null &&
      typeof dto.descripcion !== 'string'
    ) {
      const error = new Error('La descripción de la categoría debe ser texto');
      error.name = 'ValidationError';
      throw error;
    }

    const descripcion = typeof dto.descripcion === 'string'
      ? dto.descripcion.trim() || undefined
      : undefined;

    const existente = await categoriaRepository.findOneBy({ nombre });
    if (existente) throw errorCategoriaDuplicada();

    const categoria = categoriaRepository.create({
      nombre,
      ...(descripcion !== undefined ? { descripcion } : {}),
    });
    try {
      return await categoriaRepository.save(categoria);
    } catch (error: unknown) {
      // El índice único también protege peticiones concurrentes.
      if (esDuplicadoMysql(error)) throw errorCategoriaDuplicada();

      throw error;
    }
  }

  async obtenerTodas(): Promise<CategoriaEmprendimiento[]> {
    return await categoriaRepository.find({
      order: { nombre: 'ASC' },
    });
  }
}

export const categoriaEmprendimientoService = new CategoriaEmprendimientoService();
