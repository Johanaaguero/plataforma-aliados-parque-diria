import { AppDataSource } from '../../../data-source';
import {
  EventosCapacitaciones,
  TipoActividad,
} from '../../../models/EventosCapacitaciones';
import { EventoCapacitacionImagen } from '../../../models/EventoCapacitacionImagen';
import { Repository } from 'typeorm';

export interface CreateEventoCapacitacionDTO {
  nombre: string;
  descripcion: string;
  fecha: string;
  hora: string;
  lugar: string;
  tipoActividad: TipoActividad;
  cupoMaximo?: number | null;
}

export type UpdateEventoCapacitacionDTO = Partial<CreateEventoCapacitacionDTO>;

export interface ImagenUploadDTO {
  buffer: Buffer;
  tipoMime: string;
  tamanoBytes: number;
  nombreArchivo?: string | null;
}

const TIPOS_MIME_PERMITIDOS = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const TAMANO_MAXIMO_BYTES = 5 * 1024 * 1024; // 5 MB

export class EventosCapacitacionesService {
  private repo: Repository<EventosCapacitaciones>;
  private imagenesRepo: Repository<EventoCapacitacionImagen>;

  constructor() {
    this.repo = AppDataSource.getRepository(EventosCapacitaciones);
    this.imagenesRepo = AppDataSource.getRepository(EventoCapacitacionImagen);
  }

  private validar(data: Partial<CreateEventoCapacitacionDTO>, isUpdate = false) {
    const errores: string[] = [];

    if (!isUpdate || data.nombre !== undefined) {
      if (!data.nombre || data.nombre.trim().length === 0) {
        errores.push('El nombre es obligatorio.');
      } else if (data.nombre.length > 150) {
        errores.push('El nombre no puede superar los 150 caracteres.');
      }
    }

    if (!isUpdate || data.descripcion !== undefined) {
      if (!data.descripcion || data.descripcion.trim().length === 0) {
        errores.push('La descripción es obligatoria.');
      }
    }

    if (!isUpdate || data.fecha !== undefined) {
      const fechaRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!data.fecha || !fechaRegex.test(data.fecha)) {
        errores.push('La fecha es obligatoria y debe tener formato YYYY-MM-DD.');
      } else {
        const fechaIngresada = new Date(data.fecha);
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);
        if (fechaIngresada < hoy) {
          errores.push('La fecha no puede ser anterior al día actual.');
        }
      }
    }

    if (!isUpdate || data.hora !== undefined) {
      const horaRegex = /^([01]\d|2[0-3]):([0-5]\d)(:[0-5]\d)?$/;
      if (!data.hora || !horaRegex.test(data.hora)) {
        errores.push('La hora es obligatoria y debe tener formato HH:mm.');
      }
    }

    if (!isUpdate || data.lugar !== undefined) {
      if (!data.lugar || data.lugar.trim().length === 0) {
        errores.push('El lugar es obligatorio.');
      } else if (data.lugar.length > 255) {
        errores.push('El lugar no puede superar los 255 caracteres.');
      }
    }

    if (!isUpdate || data.tipoActividad !== undefined) {
      if (
        !data.tipoActividad ||
        !Object.values(TipoActividad).includes(data.tipoActividad)
      ) {
        errores.push(
          `El tipo de actividad es obligatorio y debe ser uno de: ${Object.values(
            TipoActividad,
          ).join(', ')}.`,
        );
      }
    }

    if (data.cupoMaximo !== undefined && data.cupoMaximo !== null) {
      if (!Number.isInteger(data.cupoMaximo) || data.cupoMaximo <= 0) {
        errores.push('El cupo máximo debe ser un número entero positivo.');
      }
    }

    if (errores.length > 0) {
      const err = new Error(errores.join(' '));
      err.name = 'ValidationError';
      throw err;
    }
  }

  private validarImagen(data: ImagenUploadDTO) {
    const errores: string[] = [];

    if (!data.buffer || data.buffer.length === 0) {
      errores.push('El archivo de imagen es obligatorio.');
    }

    if (!data.tipoMime || !TIPOS_MIME_PERMITIDOS.includes(data.tipoMime)) {
      errores.push(
        `El tipo de imagen no es válido. Formatos permitidos: ${TIPOS_MIME_PERMITIDOS.join(', ')}.`,
      );
    }

    if (data.tamanoBytes > TAMANO_MAXIMO_BYTES) {
      errores.push(
        `La imagen supera el tamaño máximo permitido de ${
          TAMANO_MAXIMO_BYTES / (1024 * 1024)
        } MB.`,
      );
    }

    if (errores.length > 0) {
      const err = new Error(errores.join(' '));
      err.name = 'ValidationError';
      throw err;
    }
  }

  private async obtenerOFallar(id: number) {
    const registro = await this.repo.findOne({ where: { id } });
    if (!registro) {
      const err = new Error('Evento o capacitación no encontrado.');
      err.name = 'NotFoundError';
      throw err;
    }
    return registro;
  }

  private async obtenerImagenOFallar(id: number) {
    const imagen = await this.imagenesRepo.findOne({ where: { id } });
    if (!imagen) {
      const err = new Error('Imagen no encontrada.');
      err.name = 'NotFoundError';
      throw err;
    }
    return imagen;
  }

  async create(data: CreateEventoCapacitacionDTO) {
    this.validar(data, false);
    const nuevo = this.repo.create(data);
    return this.repo.save(nuevo);
  }

  async update(id: number, data: UpdateEventoCapacitacionDTO) {
    const registro = await this.obtenerOFallar(id);
    this.validar(data, true);
    this.repo.merge(registro, data);
    return this.repo.save(registro);
  }

  async findAll(filtros?: { tipoActividad?: TipoActividad }) {
    const where = filtros?.tipoActividad
      ? { tipoActividad: filtros.tipoActividad }
      : {};

    return this.repo.find({ where, order: { fecha: 'ASC', hora: 'ASC' } });
  }

  async remove(id: number) {
    const registro = await this.obtenerOFallar(id);
    await this.repo.remove(registro);
    return { message: 'Registro eliminado correctamente.' };
  }

  // ---------- Imágenes ----------

  async addImagen(eventoCapacitacionId: number, data: ImagenUploadDTO) {
    await this.obtenerOFallar(eventoCapacitacionId);
    this.validarImagen(data);

    const nuevaImagen = this.imagenesRepo.create({
      imagen: data.buffer,
      tipoMime: data.tipoMime,
      nombreArchivo: data.nombreArchivo ?? null,
      tamanoBytes: data.tamanoBytes,
      eventoCapacitacionId,
    });

    return this.imagenesRepo.save(nuevaImagen);
  }

  async getImagenesPorEvento(eventoCapacitacionId: number) {
    await this.obtenerOFallar(eventoCapacitacionId);
    return this.imagenesRepo.find({
      where: { eventoCapacitacionId },
      select: {
        id: true,
        tipoMime: true,
        nombreArchivo: true,
        tamanoBytes: true,
        fechaCreacion: true,
        eventoCapacitacionId: true,
      },
      order: { fechaCreacion: 'DESC' },
    });
  }

  async getImagenPorId(imagenId: number) {
    return this.obtenerImagenOFallar(imagenId);
  }

  async removeImagen(imagenId: number) {
    const imagen = await this.obtenerImagenOFallar(imagenId);
    await this.imagenesRepo.remove(imagen);
    return { message: 'Imagen eliminada correctamente.' };
  }
}