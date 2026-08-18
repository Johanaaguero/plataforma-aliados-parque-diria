import { AppDataSource } from '../../../data-source';
import { CategoriaEmprendimiento } from '../../../models/CategoriaEmprendimiento';

const categoriaRepository = AppDataSource.getRepository(CategoriaEmprendimiento);

interface CrearCategoriaDto {
  nombre: string;
  descripcion?: string;
}

export class CategoriaEmprendimientoService {
  async crear(dto: CrearCategoriaDto): Promise<CategoriaEmprendimiento> {
    const existente = await categoriaRepository.findOneBy({ nombre: dto.nombre });
    if (existente) {
      throw new Error('Ya existe una categoría con ese nombre');
    }

   const categoria = new CategoriaEmprendimiento({
  nombre: dto.nombre,
  ...(dto.descripcion !== undefined && {
    descripcion: dto.descripcion,
  }),
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