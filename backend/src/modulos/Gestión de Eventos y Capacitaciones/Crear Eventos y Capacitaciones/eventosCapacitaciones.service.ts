import { AppDataSource } from '../../../data-source';

import {
  EventosCapacitaciones,
  TipoActividad,
  EstadoEventoCapacitacion,
  Temporada,
} from '../../../models/EventosCapacitaciones';

import { EventoCapacitacionImagen } from '../../../models/EventoCapacitacionImagen';

import {
  EstadoReserva,
  Participantes,
} from '../../../models/Participantes';

import { In, Repository } from 'typeorm';

import { calcularCuposDisponibles } from '../cuposDisponibles';

import {
  notificacionEventoService,
} from '../../Notificaciones/Crear notificaciones Eventos/notificacionEvento.service';

export interface CreateEventoCapacitacionDTO {
  nombre?: string | null;

  descripcion?: string | null;

  fecha?: string | null;

  hora?: string | null;

  lugar?: string | null;

  tipoActividad: TipoActividad;

  cupoMinimo?: number | null;

  cupoMaximo?: number | null;

  edadMinima?: number | null;

  edadMaxima?: number | null;

  estado?: EstadoEventoCapacitacion;

  temporada?: Temporada | null;

  esPago?: boolean;

  precio?: number;

  tipoPago?: string | null;

  politicasCancelacion?: string | null;
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

const TAMANO_MAXIMO_BYTES = 5 * 1024 * 1024;

export class EventosCapacitacionesService {
  private repo: Repository<EventosCapacitaciones>;

  private imagenesRepo: Repository<EventoCapacitacionImagen>;

  private participantesRepo: Repository<Participantes>;

  constructor() {
    this.repo =
      AppDataSource.getRepository(
        EventosCapacitaciones,
      );

    this.imagenesRepo =
      AppDataSource.getRepository(
        EventoCapacitacionImagen,
      );

    this.participantesRepo =
      AppDataSource.getRepository(
        Participantes,
      );
  }

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

    if (data.esPago !== undefined && typeof data.esPago !== 'boolean') {
      errores.push('El campo esPago debe ser booleano.');
    }
    if (data.precio !== undefined && (!Number.isInteger(data.precio) || data.precio < 0)) {
      errores.push('El precio debe ser un número entero mayor o igual a 0.');
    }
    if (data.esPago === true && (!data.precio || data.precio <= 0)) {
      errores.push('Las actividades de pago deben indicar un precio mayor que 0.');
    }
    if (data.tipoPago !== undefined && data.tipoPago !== null && !['sinpe_movil', 'transferencia_bancaria'].includes(data.tipoPago)) {
      errores.push('El tipo de pago debe ser SINPE Móvil o transferencia bancaria.');
    }

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

    if (
      data.cupoMinimo !== undefined &&
      data.cupoMinimo !== null
    ) {
      if (
        !Number.isInteger(data.cupoMinimo) ||
        data.cupoMinimo <= 0
      ) {
        errores.push(
          'El cupo mínimo debe ser un número entero positivo.',
        );
      }
    }

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

    if (
      data.cupoMinimo !== undefined &&
      data.cupoMinimo !== null &&
      data.cupoMaximo !== undefined &&
      data.cupoMaximo !== null &&
      data.cupoMinimo > data.cupoMaximo
    ) {
      errores.push(
        'El cupo mínimo no puede ser mayor que el cupo máximo.',
      );
    }

    if (
      data.edadMinima !== undefined &&
      data.edadMinima !== null
    ) {
      if (
        !Number.isInteger(data.edadMinima) ||
        data.edadMinima < 0
      ) {
        errores.push(
          'La edad mínima debe ser un número entero mayor o igual a 0.',
        );
      }
    }

    if (
      data.edadMaxima !== undefined &&
      data.edadMaxima !== null
    ) {
      if (
        !Number.isInteger(data.edadMaxima) ||
        data.edadMaxima < 0
      ) {
        errores.push(
          'La edad máxima debe ser un número entero mayor o igual a 0.',
        );
      }
    }

    if (
      data.edadMinima !== undefined &&
      data.edadMinima !== null &&
      data.edadMaxima !== undefined &&
      data.edadMaxima !== null &&
      data.edadMinima > data.edadMaxima
    ) {
      errores.push(
        'La edad mínima no puede ser mayor que la edad máxima.',
      );
    }

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

  private validarDatosCompletosParaCambioEstado(
    registro: Pick<
      EventosCapacitaciones,
      | 'nombre'
      | 'descripcion'
      | 'fecha'
      | 'hora'
      | 'lugar'
      | 'tipoActividad'
      | 'cupoMinimo'
      | 'cupoMaximo'
      | 'edadMinima'
      | 'edadMaxima'
      | 'temporada'
    >,
  ) {
    const errores: string[] = [];

    if (
      !registro.nombre ||
      registro.nombre.trim().length === 0
    ) {
      errores.push(
        'El nombre es obligatorio.',
      );
    }

    if (
      !registro.descripcion ||
      registro.descripcion.trim().length === 0
    ) {
      errores.push(
        'La descripción es obligatoria.',
      );
    }

    if (!registro.fecha) {
      errores.push(
        'La fecha es obligatoria.',
      );
    }

    if (!registro.hora) {
      errores.push(
        'La hora es obligatoria.',
      );
    }

    if (
      !registro.lugar ||
      registro.lugar.trim().length === 0
    ) {
      errores.push(
        'El lugar es obligatorio.',
      );
    }

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

    if (!registro.temporada) {
      errores.push(
        'La temporada es obligatoria.',
      );
    }

    if (registro.cupoMinimo === null) {
      errores.push(
        'El cupo mínimo es obligatorio.',
      );
    } else if (
      !Number.isInteger(
        registro.cupoMinimo,
      ) ||
      registro.cupoMinimo <= 0
    ) {
      errores.push(
        'El cupo mínimo debe ser un número entero positivo.',
      );
    }

    if (registro.cupoMaximo === null) {
      errores.push(
        'El cupo máximo es obligatorio.',
      );
    } else if (
      !Number.isInteger(
        registro.cupoMaximo,
      ) ||
      registro.cupoMaximo <= 0
    ) {
      errores.push(
        'El cupo máximo debe ser un número entero positivo.',
      );
    }

    if (
      registro.cupoMinimo !== null &&
      registro.cupoMaximo !== null &&
      registro.cupoMinimo >
        registro.cupoMaximo
    ) {
      errores.push(
        'El cupo mínimo no puede ser mayor que el cupo máximo.',
      );
    }

    if (registro.edadMinima === null) {
      errores.push(
        'La edad mínima es obligatoria.',
      );
    } else if (
      !Number.isInteger(
        registro.edadMinima,
      ) ||
      registro.edadMinima < 0
    ) {
      errores.push(
        'La edad mínima debe ser un número entero mayor o igual a 0.',
      );
    }

    if (registro.edadMaxima === null) {
      errores.push(
        'La edad máxima es obligatoria.',
      );
    } else if (
      !Number.isInteger(
        registro.edadMaxima,
      ) ||
      registro.edadMaxima < 0
    ) {
      errores.push(
        'La edad máxima debe ser un número entero mayor o igual a 0.',
      );
    }

    if (
      registro.edadMinima !== null &&
      registro.edadMaxima !== null &&
      registro.edadMinima >
        registro.edadMaxima
    ) {
      errores.push(
        'La edad mínima no puede ser mayor que la edad máxima.',
      );
    }

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

    if (registro.hora) {
      const horaRegex =
        /^([01]\d|2[0-3]):([0-5]\d)(:[0-5]\d)?$/;

      if (!horaRegex.test(registro.hora)) {
        errores.push(
          'La hora debe tener formato HH:mm.',
        );
      }
    }

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

    if (errores.length > 0) {
      const err = new Error(
        `El registro no está completo. ${errores.join(
          ' ',
        )}`,
      );

      err.name = 'ValidationError';

      throw err;
    }
  }

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
          TAMANO_MAXIMO_BYTES / (1024 * 1024)
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

  private async obtenerCantidadInscritos(
    eventoCapacitacionId: number,
  ): Promise<number> {
    const resultado =
      await this.participantesRepo
        .createQueryBuilder('participante')
        .where(
          'participante.eventoCapacitacionId = :eventoCapacitacionId',
          {
            eventoCapacitacionId,
          },
        )
        .andWhere(
          'participante.estado IN (:...estadosActivos)',
          {
            estadosActivos: [
              EstadoReserva.PENDIENTE,
              EstadoReserva.CONFIRMADA,
            ],
          },
        )
        .getCount();

    return resultado;
  }

  private async actualizarCuposDisponibles(
    registro: EventosCapacitaciones,
  ) {
    const inscritos =
      await this.obtenerCantidadInscritos(
        registro.id,
      );

    registro.cuposDisponibles =
      calcularCuposDisponibles(
        registro.cupoMaximo,
        inscritos,
      );

    return registro;
  }

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

    const registroFinal: Pick<
      EventosCapacitaciones,
      | 'nombre'
      | 'descripcion'
      | 'fecha'
      | 'hora'
      | 'lugar'
      | 'tipoActividad'
      | 'cupoMinimo'
      | 'cupoMaximo'
      | 'edadMinima'
      | 'edadMaxima'
      | 'temporada'
    > = {
      nombre: data.nombre ?? null,
      descripcion: data.descripcion ?? null,
      fecha: data.fecha ?? null,
      hora: data.hora ?? null,
      lugar: data.lugar ?? null,
      tipoActividad: data.tipoActividad,
      cupoMinimo: data.cupoMinimo ?? null,
      cupoMaximo: data.cupoMaximo ?? null,
      edadMinima: data.edadMinima ?? null,
      edadMaxima: data.edadMaxima ?? null,
      temporada: data.temporada ?? null,

    };

    if (
      estado ===
        EstadoEventoCapacitacion.NO_PUBLICADO ||
      estado ===
        EstadoEventoCapacitacion.PUBLICADO
    ) {
      this.validarDatosCompletosParaCambioEstado(
        registroFinal,
      );
    }

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

        cupoMinimo:
          data.cupoMinimo ?? null,

        cupoMaximo:
          data.cupoMaximo ?? null,

        cuposDisponibles:
          data.cupoMaximo ?? null,

        edadMinima:
          data.edadMinima ?? null,

        edadMaxima:
          data.edadMaxima ?? null,

        estado,

        temporada:
          data.temporada ?? null,

        esPago: data.esPago ?? false,

        precio: data.esPago ? data.precio ?? 0 : 0,

        tipoPago: data.esPago ? data.tipoPago ?? 'sinpe_movil' : null,

        politicasCancelacion: data.esPago ? data.politicasCancelacion ?? null : null,
      });

    const guardado =
      await this.repo.save(nuevo);

    await this.actualizarCuposDisponibles(
      guardado,
    );

    const eventoFinal =
      await this.repo.save(guardado);

   
    if (
      eventoFinal.estado ===
      EstadoEventoCapacitacion.PUBLICADO
    ) {
      await notificacionEventoService.notificarNuevoEvento(
        eventoFinal,
      );
    }

    return eventoFinal;
  }

  async update(
    id: number,
    data: UpdateEventoCapacitacionDTO,
  ) {
    const registro =
      await this.obtenerOFallar(id);

    const estadoAnterior =
      registro.estado;

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
        data.estado !==
        registro.estado
      ) {
        this.validarCambioEstado(
          registro.estado,
          data.estado,
        );
      }
    }

    this.validar(data, true);

    if (
      data.tipoActividad !== undefined &&
      data.tipoActividad !==
        registro.tipoActividad &&
      registro.estado ===
        EstadoEventoCapacitacion.PUBLICADO
    ) {
      const err = new Error(
        'No se puede cambiar el tipo de actividad una vez que fue publicado.',
      );

      err.name = 'ValidationError';

      throw err;
    }

    const datosFinales: Pick<
      EventosCapacitaciones,
      | 'nombre'
      | 'descripcion'
      | 'fecha'
      | 'hora'
      | 'lugar'
      | 'tipoActividad'
      | 'cupoMinimo'
      | 'cupoMaximo'
      | 'edadMinima'
      | 'edadMaxima'
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

      cupoMinimo:
        data.cupoMinimo !== undefined
          ? data.cupoMinimo
          : registro.cupoMinimo,

      cupoMaximo:
        data.cupoMaximo !== undefined
          ? data.cupoMaximo
          : registro.cupoMaximo,

      edadMinima:
        data.edadMinima !== undefined
          ? data.edadMinima
          : registro.edadMinima,

      edadMaxima:
        data.edadMaxima !== undefined
          ? data.edadMaxima
          : registro.edadMaxima,

      temporada:
        data.temporada !== undefined
          ? data.temporada
          : registro.temporada,
    };

    if (
      data.cupoMinimo !== undefined ||
      data.cupoMaximo !== undefined ||
      data.edadMinima !== undefined ||
      data.edadMaxima !== undefined
    ) {
      this.validar(
        {
          cupoMinimo:
            datosFinales.cupoMinimo,

          cupoMaximo:
            datosFinales.cupoMaximo,

          edadMinima:
            datosFinales.edadMinima,

          edadMaxima:
            datosFinales.edadMaxima,
        },
        true,
      );
    }

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

    if (
      data.estado ===
      EstadoEventoCapacitacion.PUBLICADO
    ) {
      this.validarDatosCompletosParaCambioEstado(
        datosFinales,
      );
    }

    const cambioCupoMaximo =
      data.cupoMaximo !== undefined &&
      data.cupoMaximo !==
        registro.cupoMaximo;

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

      cupoMinimo:
        data.cupoMinimo !== undefined
          ? data.cupoMinimo
          : registro.cupoMinimo,

      cupoMaximo:
        data.cupoMaximo !== undefined
          ? data.cupoMaximo
          : registro.cupoMaximo,

      edadMinima:
        data.edadMinima !== undefined
          ? data.edadMinima
          : registro.edadMinima,

      edadMaxima:
        data.edadMaxima !== undefined
          ? data.edadMaxima
          : registro.edadMaxima,

      estado:
        data.estado !== undefined
          ? data.estado
          : registro.estado,

      temporada:
        data.temporada !== undefined
          ? data.temporada
          : registro.temporada,
    });

    let guardado =
      await this.repo.save(registro);

    if (cambioCupoMaximo) {
      await this.actualizarCuposDisponibles(
        guardado,
      );

      guardado =
        await this.repo.save(guardado);
    }

    /*
     * Solo notificar cuando realmente cambia
     * de un estado NO PUBLICADO a PUBLICADO.
     *
     * Si solamente se edita un evento que ya estaba
     * publicado, no se genera otra notificación.
     */
    if (
      estadoAnterior !==
        EstadoEventoCapacitacion.PUBLICADO &&
      guardado.estado ===
        EstadoEventoCapacitacion.PUBLICADO
    ) {
      await notificacionEventoService.notificarNuevoEvento(
        guardado,
      );
    }

    return guardado;
  }

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

    const registros =
      await this.repo.find({
        where,

        order: {
          fecha: 'ASC',
          hora: 'ASC',
        },
      });

    if (registros.length === 0) {
      return [];
    }

    const idsEventos =
      registros.map(
        (registro) => registro.id,
      );

    const conteos =
      await this.participantesRepo
        .createQueryBuilder('participante')
        .select(
          'participante.eventoCapacitacionId',
          'eventoCapacitacionId',
        )
        .addSelect(
          'COUNT(*)',
          'inscritos',
        )
        .where(
          'participante.eventoCapacitacionId IN (:...idsEventos)',
          { idsEventos },
        )
        .andWhere(
          'participante.estado IN (:...estadosActivos)',
          {
            estadosActivos: [
              EstadoReserva.PENDIENTE,
              EstadoReserva.CONFIRMADA,
            ],
          },
        )
        .groupBy(
          'participante.eventoCapacitacionId',
        )
        .getRawMany<{
          eventoCapacitacionId:
            | string
            | number;

          inscritos: string | number;
        }>();

    const inscritosPorEvento =
      new Map(
        conteos.map((conteo) => [
          Number(
            conteo.eventoCapacitacionId,
          ),

          Number(
            conteo.inscritos,
          ),
        ]),
      );

    return registros.map((registro) => {
      const cuposDisponibles =
        calcularCuposDisponibles(
          registro.cupoMaximo,

          inscritosPorEvento.get(
            registro.id,
          ) ?? 0,
        );

      registro.cuposDisponibles =
        cuposDisponibles;

      return {
        ...registro.toPublic(),

        cuposDisponibles,
      };
    });
  }

  async remove(
    id: number,
  ): Promise<void> {
    const registro =
      await this.obtenerOFallar(id);

    await this.repo.remove(registro);
  }

  private validarCambioEstado(
    estadoActual: EstadoEventoCapacitacion,

    nuevoEstado: EstadoEventoCapacitacion,
  ) {
    const cambiosPermitidos: Record<
      EstadoEventoCapacitacion,
      EstadoEventoCapacitacion[]
    > = {
      [EstadoEventoCapacitacion.BORRADOR]: [
        EstadoEventoCapacitacion.NO_PUBLICADO,
      ],

      [EstadoEventoCapacitacion.NO_PUBLICADO]: [
        EstadoEventoCapacitacion.PUBLICADO,

        EstadoEventoCapacitacion.DESACTIVADO,
      ],

      [EstadoEventoCapacitacion.PUBLICADO]: [
        EstadoEventoCapacitacion.NO_PUBLICADO,

        EstadoEventoCapacitacion.DESACTIVADO,
      ],

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

  async cambiarEstado(
    id: number,

    estado: EstadoEventoCapacitacion,
  ) {
    const registro =
      await this.obtenerOFallar(id);

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

    if (registro.estado === estado) {
      await this.actualizarCuposDisponibles(
        registro,
      );

      return this.repo.save(registro);
    }

    const estadoAnterior =
      registro.estado;

    this.validarCambioEstado(
      registro.estado,
      estado,
    );

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

    if (
      estado ===
      EstadoEventoCapacitacion.PUBLICADO
    ) {
      this.validarDatosCompletosParaCambioEstado(
        registro,
      );
    }

    registro.estado = estado;

    await this.actualizarCuposDisponibles(
      registro,
    );

    const guardado =
      await this.repo.save(registro);

    /*
     * La notificación solamente se crea cuando
     * el evento cambia a PUBLICADO.
     */
    if (
      estadoAnterior !==
        EstadoEventoCapacitacion.PUBLICADO &&
      guardado.estado ===
        EstadoEventoCapacitacion.PUBLICADO
    ) {
      await notificacionEventoService.notificarNuevoEvento(
        guardado,
      );
    }

    return guardado;
  }

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

  async getImagenPorId(
    imagenId: number,
  ) {
    return this.obtenerImagenOFallar(
      imagenId,
    );
  }

  async removeImagen(
    eventoCapacitacionId: number,

    imagenId: number,
  ) {
    const imagen =
      await this.obtenerImagenOFallar(
        imagenId,
      );

    if (
      imagen.eventoCapacitacionId !==
      eventoCapacitacionId
    ) {
      const err = new Error(
        'La imagen no pertenece al evento o capacitación indicado.',
      );

      err.name = 'ValidationError';

      throw err;
    }

    await this.imagenesRepo.remove(
      imagen,
    );

    return {
      message:
        'Imagen eliminada correctamente.',
    };
  }
}
