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
}

type ResultadoCambioPublicacion =
  | {
      ok: true;
      message: string;
      emprendimiento: Emprendimiento;
    }
  | {
      ok: false;
      status: 400 | 404;
      message: string;
      camposFaltantes?: string[];
    };

const tieneTexto = (valor: string | null | undefined): boolean =>
  typeof valor === 'string' && valor.trim().length > 0;

const coordenadaValida = (
  valor: unknown,
  minimo: number,
  maximo: number,
): boolean => {
  if (
    valor === null ||
    valor === undefined ||
    (typeof valor === 'string' && valor.trim().length === 0)
  ) {
    return false;
  }

  const numero = Number(valor);
  return Number.isFinite(numero) && numero >= minimo && numero <= maximo;
};

const obtenerCamposFaltantesParaPublicar = (
  emprendimiento: Emprendimiento,
): string[] => {
  const camposFaltantes: string[] = [];

  if (!tieneTexto(emprendimiento.nombre)) camposFaltantes.push('nombre');
  if (!tieneTexto(emprendimiento.descripcion)) {
    camposFaltantes.push('descripción');
  }
  if (!emprendimiento.categoria?.id) camposFaltantes.push('categoría');
  if (
    !Buffer.isBuffer(emprendimiento.imagen) ||
    emprendimiento.imagen.length === 0
  ) {
    camposFaltantes.push('imagen o logotipo');
  }
  if (!tieneTexto(emprendimiento.correoElectronico)) {
    camposFaltantes.push('correo electrónico');
  }
  if (!tieneTexto(emprendimiento.telefono)) {
    camposFaltantes.push('teléfono');
  }
  if (!coordenadaValida(emprendimiento.latitud, -90, 90)) {
    camposFaltantes.push('latitud');
  }
  if (!coordenadaValida(emprendimiento.longitud, -180, 180)) {
    camposFaltantes.push('longitud');
  }

  return camposFaltantes;
};

export class EmprendimientoService {
  private async buscarPorId(id: number): Promise<Emprendimiento | null> {
    return emprendimientoRepository.findOne({
      where: { id },
      relations: { categoria: true },
    });
  }

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
    const emprendimiento = await this.buscarPorId(id);

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

  async obtenerCatalogoPublico(): Promise<Emprendimiento[]> {
    return this.obtenerPorEstado(EstadoPublicacion.PUBLICADO);
  }

  async cambiarPublicacion(
    id: number,
    nuevoEstado: EstadoPublicacion,
  ): Promise<ResultadoCambioPublicacion> {
    const emprendimiento = await this.buscarPorId(id);

    if (!emprendimiento) {
      return {
        ok: false,
        status: 404,
        message: 'Emprendimiento no encontrado',
      };
    }

    if (nuevoEstado === EstadoPublicacion.PUBLICADO) {
      const camposFaltantes =
        obtenerCamposFaltantesParaPublicar(emprendimiento);

      if (camposFaltantes.length > 0) {
        return {
          ok: false,
          status: 400,
          message:
            'El emprendimiento no tiene toda la información requerida para publicarse',
          camposFaltantes,
        };
      }

      if (
        emprendimiento.estadoPublicacion !== EstadoPublicacion.PUBLICADO ||
        emprendimiento.fechaPublicacion === null
      ) {
        emprendimiento.fechaPublicacion = new Date();
      }
    }

    emprendimiento.estadoPublicacion = nuevoEstado;
    const emprendimientoActualizado =
      await emprendimientoRepository.save(emprendimiento);

    return {
      ok: true,
      message:
        nuevoEstado === EstadoPublicacion.PUBLICADO
          ? 'Emprendimiento publicado correctamente.'
          : 'Emprendimiento ocultado correctamente.',
      emprendimiento: emprendimientoActualizado,
    };
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

    if (
      emprendimiento.estadoPublicacion === EstadoPublicacion.PUBLICADO
    ) {
      const camposFaltantes =
        obtenerCamposFaltantesParaPublicar(emprendimiento);

      if (camposFaltantes.length > 0) {
        throw new Error(
          `Un emprendimiento publicado debe conservar toda la información requerida: ${camposFaltantes.join(', ')}`,
        );
      }
    }

    return await emprendimientoRepository.save(emprendimiento);
  }

  async eliminar(id: number): Promise<void> {
    const emprendimiento = await this.obtenerPorId(id);

    await emprendimientoRepository.remove(emprendimiento);
  }
}

export const emprendimientoService = new EmprendimientoService();
