import { AppDataSource } from '../../../data-source';
import {
  EventosCapacitaciones,
  TipoActividad,
  EstadoEventoCapacitacion,
  Temporada,
} from '../../../models/EventosCapacitaciones';
import { EventoCapacitacionImagen } from '../../../models/EventoCapacitacionImagen';
import { Repository } from 'typeorm';

export interface CreateEventoCapacitacionDTO {
  nombre?: string | null;
  descripcion?: string | null;
  fecha?: string | null;
  hora?: string | null;
  lugar?: string | null;
  tipoActividad: TipoActividad;
  cupoMaximo?: number | null;
  estado?: EstadoEventoCapacitacion;
  temporada?: Temporada | null;
}

export type UpdateEventoCapacitacionDTO =
  Partial<CreateEventoCapacitacionDTO>;

export interface ImagenUploadDTO {
  buffer: Buffer;
  tipoMime: string;
  tamanoBytes: number;
  nombreArchivo?: string | null;
}

const TIPOS_MIME_PERMITIDOS = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
];

const TAMANO_MAXIMO_BYTES =
  5 * 1024 * 1024;

export class EventosCapacitacionesService {
  private repo: Repository<EventosCapacitaciones>;
  private imagenesRepo: Repository<EventoCapacitacionImagen>;

  constructor() {
    this.repo =
      AppDataSource.getRepository(
        EventosCapacitaciones,
      );

    this.imagenesRepo =
      AppDataSource.getRepository(
        EventoCapacitacionImagen,
      );
  }

  // =========================================================
  // VALIDACIONES GENERALES
  // =========================================================

  private validar(
    data: Partial<CreateEventoCapacitacionDTO>,
    isUpdate = false,
  ) {
    const errores: string[] = [];

    const estado =
      data.estado ??
      EstadoEventoCapacitacion.BORRADOR;

    const esBorrador =
      estado ===
      EstadoEventoCapacitacion.BORRADOR;

    // ---------------------------------------------------------
    // NOMBRE
    // ---------------------------------------------------------

    if (
      data.nombre !== undefined &&
      data.nombre !== null
    ) {
      if (data.nombre.trim().length > 150) {
        errores.push(
          'El nombre no puede superar los 150 caracteres.',
        );
      }
    }

    // ---------------------------------------------------------
    // LUGAR
    // ---------------------------------------------------------

    if (
      data.lugar !== undefined &&
      data.lugar !== null
    ) {
      if (data.lugar.trim().length > 255) {
        errores.push(
          'El lugar no puede superar los 255 caracteres.',
        );
      }
    }

    // ---------------------------------------------------------
    // TIPO DE ACTIVIDAD
    // ---------------------------------------------------------

    if (
      data.tipoActividad !== undefined &&
      !Object.values(TipoActividad).includes(
        data.tipoActividad,
      )
    ) {
      errores.push(
        `El tipo de actividad debe ser uno de: ${Object.values(
          TipoActividad,
        ).join(', ')}.`,
      );
    }

    if (
      !isUpdate &&
      (!data.tipoActividad ||
        !Object.values(TipoActividad).includes(
          data.tipoActividad,
        ))
    ) {
      errores.push(
        `El tipo de actividad es obligatorio y debe ser uno de: ${Object.values(
          TipoActividad,
        ).join(', ')}.`,
      );
    }

    // ---------------------------------------------------------
    // CUPO MÁXIMO
    // ---------------------------------------------------------

    if (
      data.cupoMaximo !== undefined &&
      data.cupoMaximo !== null
    ) {
      if (
        !Number.isInteger(data.cupoMaximo) ||
        data.cupoMaximo <= 0
      ) {
        errores.push(
          'El cupo máximo debe ser un número entero positivo.',
        );
      }
    }

    // ---------------------------------------------------------
    // ESTADO
    // ---------------------------------------------------------

    if (
      data.estado !== undefined &&
      !Object.values(
        EstadoEventoCapacitacion,
      ).includes(data.estado)
    ) {
      errores.push(
        `El estado debe ser uno de: ${Object.values(
          EstadoEventoCapacitacion,
        ).join(', ')}.`,
      );
    }

    // ---------------------------------------------------------
    // TEMPORADA
    // ---------------------------------------------------------

    if (
      data.temporada !== undefined &&
      data.temporada !== null &&
      !Object.values(Temporada).includes(
        data.temporada,
      )
    ) {
      errores.push(
        `La temporada debe ser una de: ${Object.values(
          Temporada,
        ).join(', ')}.`,
      );
    }

    // ---------------------------------------------------------
    // FECHA
    // ---------------------------------------------------------

    if (
      data.fecha !== undefined &&
      data.fecha !== null
    ) {
      const fechaRegex =
        /^\d{4}-\d{2}-\d{2}$/;

      if (!fechaRegex.test(data.fecha)) {
        errores.push(
          'La fecha debe tener formato YYYY-MM-DD.',
        );
      } else {
        const fechaIngresada = new Date(
          `${data.fecha}T00:00:00`,
        );

        if (
          Number.isNaN(
            fechaIngresada.getTime(),
          )
        ) {
          errores.push(
            'La fecha ingresada no es válida.',
          );
        } else {
          const hoy = new Date();

          hoy.setHours(0, 0, 0, 0);

          if (fechaIngresada < hoy) {
            errores.push(
              'La fecha no puede ser anterior al día actual.',
            );
          }
        }
      }
    }

    // ---------------------------------------------------------
    // HORA
    // ---------------------------------------------------------

    if (
      data.hora !== undefined &&
      data.hora !== null
    ) {
      const horaRegex =
        /^([01]\d|2[0-3]):([0-5]\d)(:[0-5]\d)?$/;

      if (!horaRegex.test(data.hora)) {
        errores.push(
          'La hora debe tener formato HH:mm.',
        );
      }
    }

    // =========================================================
    // CAMPOS OBLIGATORIOS AL CREAR EN UN ESTADO NO BORRADOR
    // =========================================================

    if (!isUpdate && !esBorrador) {
      if (
        !data.nombre ||
        data.nombre.trim().length === 0
      ) {
        errores.push(
          'El nombre es obligatorio.',
        );
      }

      if (
        !data.descripcion ||
        data.descripcion.trim().length === 0
      ) {
        errores.push(
          'La descripción es obligatoria.',
        );
      }

      if (!data.fecha) {
        errores.push(
          'La fecha es obligatoria.',
        );
      }

      if (!data.hora) {
        errores.push(
          'La hora es obligatoria.',
        );
      }

      if (
        !data.lugar ||
        data.lugar.trim().length === 0
      ) {
        errores.push(
          'El lugar es obligatorio.',
        );
      }

      if (!data.temporada) {
        errores.push(
          'La temporada es obligatoria.',
        );
      }
    }

    if (errores.length > 0) {
      const err = new Error(
        errores.join(' '),
      );

      err.name = 'ValidationError';

      throw err;
    }
  }

  // =========================================================
  // VALIDAR QUE UN REGISTRO ESTÉ COMPLETO
  // ANTES DE PASAR A NO_PUBLICADO O PUBLICADO
  // =========================================================

  private validarDatosCompletosParaCambioEstado(
    registro: Pick<
      EventosCapacitaciones,
      | 'nombre'
      | 'descripcion'
      | 'fecha'
      | 'hora'
      | 'lugar'
      | 'tipoActividad'
      | 'temporada'
    >,
  ) {
    const errores: string[] = [];

    // ---------------------------------------------------------
    // NOMBRE
    // ---------------------------------------------------------

    if (
      !registro.nombre ||
      registro.nombre.trim().length === 0
    ) {
      errores.push(
        'El nombre es obligatorio.',
      );
    }

    // ---------------------------------------------------------
    // DESCRIPCIÓN
    // ---------------------------------------------------------

    if (
      !registro.descripcion ||
      registro.descripcion.trim().length === 0
    ) {
      errores.push(
        'La descripción es obligatoria.',
      );
    }

    // ---------------------------------------------------------
    // FECHA
    // ---------------------------------------------------------

    if (!registro.fecha) {
      errores.push(
        'La fecha es obligatoria.',
      );
    }

    // ---------------------------------------------------------
    // HORA
    // ---------------------------------------------------------

    if (!registro.hora) {
      errores.push(
        'La hora es obligatoria.',
      );
    }

    // ---------------------------------------------------------
    // LUGAR
    // ---------------------------------------------------------

    if (
      !registro.lugar ||
      registro.lugar.trim().length === 0
    ) {
      errores.push(
        'El lugar es obligatorio.',
      );
    }

    // ---------------------------------------------------------
    // TIPO DE ACTIVIDAD
    // ---------------------------------------------------------

    if (
      !registro.tipoActividad ||
      !Object.values(TipoActividad).includes(
        registro.tipoActividad,
      )
    ) {
      errores.push(
        'El tipo de actividad es obligatorio.',
      );
    }

    // ---------------------------------------------------------
    // TEMPORADA
    // ---------------------------------------------------------

    if (!registro.temporada) {
      errores.push(
        'La temporada es obligatoria.',
      );
    }

    // =========================================================
    // VALIDAR FORMATO DE FECHA
    // =========================================================

    if (registro.fecha) {
      const fechaRegex =
        /^\d{4}-\d{2}-\d{2}$/;

      if (!fechaRegex.test(registro.fecha)) {
        errores.push(
          'La fecha debe tener formato YYYY-MM-DD.',
        );
      } else {
        const fechaIngresada = new Date(
          `${registro.fecha}T00:00:00`,
        );

        if (
          Number.isNaN(
            fechaIngresada.getTime(),
          )
        ) {
          errores.push(
            'La fecha ingresada no es válida.',
          );
        } else {
          const hoy = new Date();

          hoy.setHours(0, 0, 0, 0);

          if (fechaIngresada < hoy) {
            errores.push(
              'La fecha no puede ser anterior al día actual.',
            );
          }
        }
      }
    }

    // =========================================================
    // VALIDAR FORMATO DE HORA
    // =========================================================

    if (registro.hora) {
      const horaRegex =
        /^([01]\d|2[0-3]):([0-5]\d)(:[0-5]\d)?$/;

      if (!horaRegex.test(registro.hora)) {
        errores.push(
          'La hora debe tener formato HH:mm.',
        );
      }
    }

    // =========================================================
    // VALIDAR LONGITUD
    // =========================================================

    if (
      registro.nombre &&
      registro.nombre.trim().length > 150
    ) {
      errores.push(
        'El nombre no puede superar los 150 caracteres.',
      );
    }

    if (
      registro.lugar &&
      registro.lugar.trim().length > 255
    ) {
      errores.push(
        'El lugar no puede superar los 255 caracteres.',
      );
    }

    // =========================================================
    // LANZAR ERROR
    // =========================================================

    if (errores.length > 0) {
      const err = new Error(
        `El registro no está completo. ${errores.join(' ')}`,
      );

      err.name = 'ValidationError';

      throw err;
    }
  }

  // =========================================================
  // VALIDAR IMAGEN
  // =========================================================

  private validarImagen(
    data: ImagenUploadDTO,
  ) {
    const errores: string[] = [];

    if (
      !data.buffer ||
      data.buffer.length === 0
    ) {
      errores.push(
        'El archivo de imagen es obligatorio.',
      );
    }

    if (
      !data.tipoMime ||
      !TIPOS_MIME_PERMITIDOS.includes(
        data.tipoMime,
      )
    ) {
      errores.push(
        `El tipo de imagen no es válido. Formatos permitidos: ${TIPOS_MIME_PERMITIDOS.join(
          ', ',
        )}.`,
      );
    }

    if (
      data.tamanoBytes >
      TAMANO_MAXIMO_BYTES
    ) {
      errores.push(
        `La imagen supera el tamaño máximo permitido de ${
          TAMANO_MAXIMO_BYTES /
          (1024 * 1024)
        } MB.`,
      );
    }

    if (errores.length > 0) {
      const err = new Error(
        errores.join(' '),
      );

      err.name = 'ValidationError';

      throw err;
    }
  }

  // =========================================================
  // OBTENER EVENTO
  // =========================================================

  private async obtenerOFallar(
    id: number,
  ) {
    const registro =
      await this.repo.findOne({
        where: { id },
      });

    if (!registro) {
      const err = new Error(
        'Evento o capacitación no encontrado.',
      );

      err.name = 'NotFoundError';

      throw err;
    }

    return registro;
  }

  // =========================================================
  // OBTENER IMAGEN
  // =========================================================

  private async obtenerImagenOFallar(
    id: number,
  ) {
    const imagen =
      await this.imagenesRepo.findOne({
        where: { id },
      });

    if (!imagen) {
      const err = new Error(
        'Imagen no encontrada.',
      );

      err.name = 'NotFoundError';

      throw err;
    }

    return imagen;
  }

  // =========================================================
  // CREAR
  // =========================================================

  async create(
    data: CreateEventoCapacitacionDTO,
  ) {
    const estado =
      data.estado ??
      EstadoEventoCapacitacion.BORRADOR;

    this.validar(
      {
        ...data,
        estado,
      },
      false,
    );

    const nuevo =
      this.repo.create({
        nombre: data.nombre ?? null,

        descripcion:
          data.descripcion ?? null,

        fecha:
          data.fecha ?? null,

        hora:
          data.hora ?? null,

        lugar:
          data.lugar ?? null,

        tipoActividad:
          data.tipoActividad,

        cupoMaximo:
          data.cupoMaximo ?? null,

        estado,

        temporada:
          data.temporada ?? null,
      });

    return this.repo.save(nuevo);
  }

  // =========================================================
  // ACTUALIZAR
  // =========================================================

  async update(
    id: number,
    data: UpdateEventoCapacitacionDTO,
  ) {
    const registro =
      await this.obtenerOFallar(id);

    // ---------------------------------------------------------
    // VALIDAR ESTADO
    // ---------------------------------------------------------

    if (data.estado !== undefined) {
      if (
        !Object.values(
          EstadoEventoCapacitacion,
        ).includes(data.estado)
      ) {
        const err = new Error(
          `El estado debe ser uno de: ${Object.values(
            EstadoEventoCapacitacion,
          ).join(', ')}.`,
        );

        err.name = 'ValidationError';

        throw err;
      }

      if (
        data.estado !== registro.estado
      ) {
        this.validarCambioEstado(
          registro.estado,
          data.estado,
        );
      }
    }

    // ---------------------------------------------------------
    // VALIDAR LOS DATOS RECIBIDOS
    // ---------------------------------------------------------

    this.validar(data, true);

    // ---------------------------------------------------------
    // CONSTRUIR LOS DATOS FINALES
    //
    // Se toman los valores nuevos cuando vienen en data
    // y los valores actuales cuando no vienen.
    // ---------------------------------------------------------

    const datosFinales: Pick<
      EventosCapacitaciones,
      | 'nombre'
      | 'descripcion'
      | 'fecha'
      | 'hora'
      | 'lugar'
      | 'tipoActividad'
      | 'temporada'
    > = {
      nombre:
        data.nombre !== undefined
          ? data.nombre
          : registro.nombre,

      descripcion:
        data.descripcion !== undefined
          ? data.descripcion
          : registro.descripcion,

      fecha:
        data.fecha !== undefined
          ? data.fecha
          : registro.fecha,

      hora:
        data.hora !== undefined
          ? data.hora
          : registro.hora,

      lugar:
        data.lugar !== undefined
          ? data.lugar
          : registro.lugar,

      tipoActividad:
        data.tipoActividad !== undefined
          ? data.tipoActividad
          : registro.tipoActividad,

      temporada:
        data.temporada !== undefined
          ? data.temporada
          : registro.temporada,
    };

    // =========================================================
    // BORRADOR → NO_PUBLICADO
    //
    // DEBE ESTAR COMPLETO
    // =========================================================

    if (
      data.estado ===
        EstadoEventoCapacitacion.NO_PUBLICADO &&
      registro.estado ===
        EstadoEventoCapacitacion.BORRADOR
    ) {
      this.validarDatosCompletosParaCambioEstado(
        datosFinales,
      );
    }

    // =========================================================
    // CUALQUIER TRANSICIÓN → PUBLICADO
    //
    // DEBE ESTAR COMPLETO
    // =========================================================

    if (
      data.estado ===
      EstadoEventoCapacitacion.PUBLICADO
    ) {
      this.validarDatosCompletosParaCambioEstado(
        datosFinales,
      );
    }

    // ---------------------------------------------------------
    // APLICAR CAMBIOS
    // ---------------------------------------------------------

    this.repo.merge(registro, {
      ...data,

      nombre:
        data.nombre !== undefined
          ? data.nombre
          : registro.nombre,

      descripcion:
        data.descripcion !== undefined
          ? data.descripcion
          : registro.descripcion,

      fecha:
        data.fecha !== undefined
          ? data.fecha
          : registro.fecha,

      hora:
        data.hora !== undefined
          ? data.hora
          : registro.hora,

      lugar:
        data.lugar !== undefined
          ? data.lugar
          : registro.lugar,

      tipoActividad:
        data.tipoActividad !== undefined
          ? data.tipoActividad
          : registro.tipoActividad,

      cupoMaximo:
        data.cupoMaximo !== undefined
          ? data.cupoMaximo
          : registro.cupoMaximo,

      estado:
        data.estado !== undefined
          ? data.estado
          : registro.estado,

      temporada:
        data.temporada !== undefined
          ? data.temporada
          : registro.temporada,
    });

    return this.repo.save(registro);
  }

  // =========================================================
  // OBTENER TODOS
  // =========================================================

  async findAll(filtros?: {
    tipoActividad?: TipoActividad;
    estado?: EstadoEventoCapacitacion;
    temporada?: Temporada;
  }) {
    const where: Record<
      string,
      unknown
    > = {};

    if (filtros?.tipoActividad) {
      where.tipoActividad =
        filtros.tipoActividad;
    }

    if (filtros?.estado) {
      where.estado =
        filtros.estado;
    }

    if (filtros?.temporada) {
      where.temporada =
        filtros.temporada;
    }

    return this.repo.find({
      where,
      order: {
        fecha: 'ASC',
        hora: 'ASC',
      },
    });
  }

  // =========================================================
  // ELIMINAR FÍSICAMENTE
  // Las imágenes relacionadas se eliminan por ON DELETE CASCADE.
  // =========================================================

  async remove(id: number): Promise<void> {
    const registro =
      await this.obtenerOFallar(id);

    await this.repo.remove(registro);
  }

  // =========================================================
  // VALIDAR TRANSICIONES DE ESTADO
  // =========================================================

  private validarCambioEstado(
    estadoActual: EstadoEventoCapacitacion,
    nuevoEstado: EstadoEventoCapacitacion,
  ) {
    const cambiosPermitidos: Record<
      EstadoEventoCapacitacion,
      EstadoEventoCapacitacion[]
    > = {
      // BORRADOR → NO_PUBLICADO
      [EstadoEventoCapacitacion.BORRADOR]: [
        EstadoEventoCapacitacion.NO_PUBLICADO,
      ],

      // NO_PUBLICADO → PUBLICADO / DESACTIVADO
      [EstadoEventoCapacitacion.NO_PUBLICADO]: [
        EstadoEventoCapacitacion.PUBLICADO,
        EstadoEventoCapacitacion.DESACTIVADO,
      ],

      // PUBLICADO → NO_PUBLICADO / DESACTIVADO
      [EstadoEventoCapacitacion.PUBLICADO]: [
        EstadoEventoCapacitacion.NO_PUBLICADO,
        EstadoEventoCapacitacion.DESACTIVADO,
      ],

      // DESACTIVADO → NO_PUBLICADO
      [EstadoEventoCapacitacion.DESACTIVADO]: [
        EstadoEventoCapacitacion.NO_PUBLICADO,
      ],
    };

    const estadosPermitidos =
      cambiosPermitidos[estadoActual];

    if (
      !estadosPermitidos.includes(
        nuevoEstado,
      )
    ) {
      const err = new Error(
        `No se puede cambiar el estado de "${estadoActual}" a "${nuevoEstado}".`,
      );

      err.name = 'ValidationError';

      throw err;
    }
  }

  // =========================================================
  // CAMBIAR ESTADO
  // =========================================================

  async cambiarEstado(
    id: number,
    estado: EstadoEventoCapacitacion,
  ) {
    const registro =
      await this.obtenerOFallar(id);

    // ---------------------------------------------------------
    // VALIDAR QUE EL ESTADO EXISTA
    // ---------------------------------------------------------

    if (
      !Object.values(
        EstadoEventoCapacitacion,
      ).includes(estado)
    ) {
      const err = new Error(
        `El estado debe ser uno de: ${Object.values(
          EstadoEventoCapacitacion,
        ).join(', ')}.`,
      );

      err.name = 'ValidationError';

      throw err;
    }

    // ---------------------------------------------------------
    // SI YA TIENE ESE ESTADO
    // ---------------------------------------------------------

    if (registro.estado === estado) {
      return registro;
    }

    // ---------------------------------------------------------
    // VALIDAR LA TRANSICIÓN
    // ---------------------------------------------------------

    this.validarCambioEstado(
      registro.estado,
      estado,
    );

    // =========================================================
    // BORRADOR → NO_PUBLICADO
    //
    // AQUÍ ESTÁ LA CORRECCIÓN PRINCIPAL
    // =========================================================

    if (
      registro.estado ===
        EstadoEventoCapacitacion.BORRADOR &&
      estado ===
        EstadoEventoCapacitacion.NO_PUBLICADO
    ) {
      this.validarDatosCompletosParaCambioEstado(
        registro,
      );
    }

    // =========================================================
    // NO_PUBLICADO → PUBLICADO
    //
    // TAMBIÉN DEBE ESTAR COMPLETO
    // =========================================================

    if (
      estado ===
      EstadoEventoCapacitacion.PUBLICADO
    ) {
      this.validarDatosCompletosParaCambioEstado(
        registro,
      );
    }

    // ---------------------------------------------------------
    // CAMBIAR ESTADO
    // ---------------------------------------------------------

    registro.estado = estado;

    return this.repo.save(registro);
  }

  // =========================================================
  // AGREGAR IMAGEN
  // =========================================================

  async addImagen(
    eventoCapacitacionId: number,
    data: ImagenUploadDTO,
  ) {
    await this.obtenerOFallar(
      eventoCapacitacionId,
    );

    this.validarImagen(data);

    const nuevaImagen =
      this.imagenesRepo.create({
        imagen: data.buffer,
        tipoMime: data.tipoMime,
        nombreArchivo:
          data.nombreArchivo ?? null,
        tamanoBytes:
          data.tamanoBytes,
        eventoCapacitacionId,
      });

    return this.imagenesRepo.save(
      nuevaImagen,
    );
  }

  // =========================================================
  // OBTENER IMÁGENES DE UN EVENTO
  // =========================================================

  async getImagenesPorEvento(
    eventoCapacitacionId: number,
  ) {
    await this.obtenerOFallar(
      eventoCapacitacionId,
    );

    return this.imagenesRepo.find({
      where: {
        eventoCapacitacionId,
      },
      select: {
        id: true,
        tipoMime: true,
        nombreArchivo: true,
        tamanoBytes: true,
        fechaCreacion: true,
        eventoCapacitacionId: true,
      },
      order: {
        fechaCreacion: 'DESC',
      },
    });
  }

  // =========================================================
  // OBTENER UNA IMAGEN
  // =========================================================

  async getImagenPorId(
    imagenId: number,
  ) {
    return this.obtenerImagenOFallar(
      imagenId,
    );
  }

  // =========================================================
  // ELIMINAR IMAGEN
  // =========================================================

  async removeImagen(
    imagenId: number,
  ) {
    const imagen =
      await this.obtenerImagenOFallar(
        imagenId,
      );

    await this.imagenesRepo.remove(
      imagen,
    );

    return {
      message:
        'Imagen eliminada correctamente.',
    };
  }
}
