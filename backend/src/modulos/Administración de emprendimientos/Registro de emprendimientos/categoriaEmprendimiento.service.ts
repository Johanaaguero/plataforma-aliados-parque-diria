import { AppDataSource } from '../../../data-source';
import { CategoriaEmprendimiento } from '../../../models/CategoriaEmprendimiento';

const categoriaRepository = AppDataSource.getRepository(CategoriaEmprendimiento);

interface CrearCategoriaDto {
  nombre?: unknown;
  descripcion?: unknown;
}

export class CategoriaEmprendimientoService {
  async crear(dto: CrearCategoriaDto): Promise<CategoriaEmprendimiento> {
    if (typeof dto?.nombre !== 'string' || !dto.nombre.trim()) {
      throw new Error('El nombre de la categoría es obligatorio');
    }

    const nombre = dto.nombre.trim();

    if (nombre.length > 100) {
      throw new Error('El nombre de la categoría no puede superar los 100 caracteres');
    }

    if (
      dto.descripcion !== undefined &&
      dto.descripcion !== null &&
      typeof dto.descripcion !== 'string'
    ) {
      throw new Error('La descripción de la categoría debe ser texto');
    }

    const descripcion = typeof dto.descripcion === 'string'
      ? dto.descripcion.trim() || undefined
      : undefined;

    const existente = await categoriaRepository.findOneBy({ nombre });
    if (existente) {
      throw new Error('Ya existe una categoría con ese nombre');
    }

    const categoria = categoriaRepository.create({
      nombre,
      ...(descripcion !== undefined ? { descripcion } : {}),
    });
    return await categoriaRepository.save(categoria);
  }

  async obtenerTodas(): Promise<CategoriaEmprendimiento[]> {
    return await categoriaRepository.find({
      order: { nombre: 'ASC' },
    });
  }
}

export const categoriaEmprendimientoService = new CategoriaEmprendimientoService();
