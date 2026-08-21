import { AppDataSource } from '../../../data-source';
import {
  Emprendimiento,
  EstadoPublicacion,
} from '../../../models/Emprendimiento';
import { CategoriaEmprendimiento } from '../../../models/CategoriaEmprendimiento';

const emprendimientoRepository = AppDataSource.getRepository(Emprendimiento);
const categoriaRepository = AppDataSource.getRepository(CategoriaEmprendimiento);

interface CrearEmprendimientoDto {
  nombre: string;
  descripcion?: string;
  categoriaId: number;
  direccion?: string;
  latitud: number;
  longitud: number;
  correoElectronico: string;
  telefono: string;
  imagen?: Buffer;
}

interface ActualizarEmprendimientoDto {
  nombre?: string;
  descripcion?: string;
  categoriaId?: number;
  direccion?: string;
  latitud?: number;
  longitud?: number;
  correoElectronico?: string;
  telefono?: string;
  imagen?: Buffer;
  estadoPublicacion?: EstadoPublicacion;
}

export class EmprendimientoService {
  async crear(dto: CrearEmprendimientoDto): Promise<Emprendimiento> {
    // Validar que la categoría exista
    const categoria = await categoriaRepository.findOneBy({
      id: dto.categoriaId,
    });

    if (!categoria) {
      throw new Error('La categoría seleccionada no existe');
    }

    // Validar que el nombre no esté duplicado
    const existente = await emprendimientoRepository.findOneBy({
      nombre: dto.nombre,
    });

    if (existente) {
      throw new Error(
        'Ya existe un emprendimiento registrado con ese nombre'
      );
    }

    const emprendimiento = new Emprendimiento({
      nombre: dto.nombre,
      descripcion: dto.descripcion,
      categoria,
      direccion: dto.direccion,
      latitud: dto.latitud,
      longitud: dto.longitud,
      correoElectronico: dto.correoElectronico,
      telefono: dto.telefono,
      imagen: dto.imagen,
    });

    return await emprendimientoRepository.save(emprendimiento);
  }

  async obtenerTodos(): Promise<Emprendimiento[]> {
    return await emprendimientoRepository.find({
      relations: { categoria: true },
      order: { fechaCreacion: 'DESC' },
    });
  }

  async obtenerPorId(id: number): Promise<Emprendimiento> {
    const emprendimiento = await emprendimientoRepository.findOne({
      where: { id },
      relations: { categoria: true },
    });

    if (!emprendimiento) {
      throw new Error('Emprendimiento no encontrado');
    }

    return emprendimiento;
  }

  async obtenerPorEstado(
    estado: EstadoPublicacion
  ): Promise<Emprendimiento[]> {
    return await emprendimientoRepository.find({
      where: { estadoPublicacion: estado },
      relations: { categoria: true },
      order: { fechaCreacion: 'DESC' },
    });
  }

  async actualizar(
    id: number,
    dto: ActualizarEmprendimientoDto
  ): Promise<Emprendimiento> {
    const emprendimiento = await this.obtenerPorId(id);

    if (dto.categoriaId !== undefined) {
      const categoria = await categoriaRepository.findOneBy({
        id: dto.categoriaId,
      });

      if (!categoria) {
        throw new Error('La categoría seleccionada no existe');
      }

      emprendimiento.categoria = categoria;
    }

    if (
      dto.nombre !== undefined &&
      dto.nombre !== emprendimiento.nombre
    ) {
      const existente = await emprendimientoRepository.findOneBy({
        nombre: dto.nombre,
      });

      if (existente) {
        throw new Error(
          'Ya existe un emprendimiento registrado con ese nombre'
        );
      }

      emprendimiento.nombre = dto.nombre;
    }

    if (dto.descripcion !== undefined) {
      emprendimiento.descripcion = dto.descripcion;
    }

    if (dto.direccion !== undefined) {
      emprendimiento.direccion = dto.direccion;
    }

    if (dto.latitud !== undefined) {
      emprendimiento.latitud = dto.latitud;
    }

    if (dto.longitud !== undefined) {
      emprendimiento.longitud = dto.longitud;
    }

    if (dto.correoElectronico !== undefined) {
      emprendimiento.correoElectronico = dto.correoElectronico;
    }

    if (dto.telefono !== undefined) {
      emprendimiento.telefono = dto.telefono;
    }

    if (dto.imagen !== undefined) {
      emprendimiento.imagen = dto.imagen;
    }

    if (dto.estadoPublicacion !== undefined) {
      emprendimiento.estadoPublicacion = dto.estadoPublicacion;
    }

    return await emprendimientoRepository.save(emprendimiento);
  }

  async eliminar(id: number): Promise<void> {
    const emprendimiento = await this.obtenerPorId(id);

    await emprendimientoRepository.remove(emprendimiento);
  }
}

export const emprendimientoService = new EmprendimientoService();