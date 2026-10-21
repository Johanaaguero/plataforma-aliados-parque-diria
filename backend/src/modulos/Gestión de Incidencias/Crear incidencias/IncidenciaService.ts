import { AppDataSource } from '../../../data-source';

import {
  Incidencia,
  CategoriaIncidencia,
  PrioridadIncidencia,
  EstadoIncidencia,
} from '../../../models/Incidencia';

import { Usuario } from '../../../models/Usuario';
import { IncidenciaHistorial } from '../../../models/IncidenciaHistorial';
import { ejecutarConBloqueoCodigoIncidencia } from './IncidenciaCodeLock';
import { puedeIniciarProcesoIncidencia } from './IncidenciaEstado';
import { obtenerCambiosClasificacionIncidencia } from './IncidenciaHistorialUtils';

import {
  puedeConsultarIncidencia,
  puedeListarIncidenciasOcultas,
} from './IncidenciaAccess';

import { notificacionIncidenciaService } from '../../Notificaciones/Crear notificaciones Incidencias/NotificacionIncidenciaService';

const incidenciaRepository =
  AppDataSource.getRepository(Incidencia);

const usuarioRepository =
  AppDataSource.getRepository(Usuario);

export const obtenerActorIncidencia = async (usuarioId?: number) => {
  if (!Number.isSafeInteger(usuarioId) || !usuarioId || usuarioId <= 0) {
    return null;
  }

  const usuario = await usuarioRepository.findOne({
    where: { id: usuarioId },
    relations: { rol: true },
  });

  return usuario
    ? { id: usuario.id, rol: usuario.rol.nombre }
    : null;
};

export const puedeVerIncidenciasOcultas = async (
  usuarioId?: number,
): Promise<boolean> => {
  const actor = await obtenerActorIncidencia(usuarioId);

  return puedeListarIncidenciasOcultas(actor);
};

export const puedeConsultarIncidenciaConUsuario = async (
  incidencia: Incidencia,
  usuarioId?: number,
): Promise<boolean> => {
  if (incidencia.esPublica) {
    return true;
  }

  const actor = await obtenerActorIncidencia(usuarioId);

  return puedeConsultarIncidencia(incidencia, actor);
};

/**
 * Determina automáticamente la prioridad
 * según la categoría de la incidencia.
 */
export const determinarPrioridad = (
  categoria: CategoriaIncidencia,
): PrioridadIncidencia => {
  switch (categoria) {
    case CategoriaIncidencia.INCENDIO:
      return PrioridadIncidencia.CRITICA;

    case CategoriaIncidencia.SEGURIDAD:
    case CategoriaIncidencia.FLORA_FAUNA:
      return PrioridadIncidencia.ALTA;

    case CategoriaIncidencia.AMBIENTAL:
    case CategoriaIncidencia.INFRAESTRUCTURA:
    case CategoriaIncidencia.SENDEROS:
      return PrioridadIncidencia.MEDIA;

    case CategoriaIncidencia.SERVICIOS:
    case CategoriaIncidencia.OTRO:
    default:
      return PrioridadIncidencia.BAJA;
  }
};

/**
 * Datos necesarios para crear una incidencia.
 */
export interface CrearIncidenciaDTO {
  titulo: string;
  descripcion: string;
  categoria: CategoriaIncidencia;
  prioridad?: PrioridadIncidencia;

  ubicacion?: string | null;
  latitud?: number | null;
  longitud?: number | null;

  /**
   * ID del usuario que reporta.
   * Si es null o undefined, el reporte es anónimo.
   */
  usuarioReportaId?: number | null;

  nombreContacto?: string | null;
  telefonoContacto?: string | null;
}

const obtenerSufijoCodigoActual = (): string => {
  const partes = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Costa_Rica',
    month: '2-digit',
    year: '2-digit',
  }).formatToParts(new Date());

  const valor = (tipo: string) =>
    partes.find((parte) => parte.type === tipo)?.value ?? '';

  return `${valor('month')}${valor('year')}`;
};

const generarCodigoIncidencia = async (
  repository = incidenciaRepository,
): Promise<string> => {
  const sufijo = obtenerSufijoCodigoActual();

  const resultado = await repository
    .createQueryBuilder('incidencia')
    .select(
      'MAX(CAST(SUBSTRING(incidencia.codigo, 6, 4) AS UNSIGNED))',
      'ultimo',
    )
    .where('incidencia.codigo LIKE :patron', {
      patron: `%${sufijo}`,
    })
    .getRawOne<{ ultimo: string | null }>();

  const consecutivo =
    Number(resultado?.ultimo ?? 0) + 1;

  if (consecutivo > 9999) {
    throw new Error(
      'Se alcanzó el límite mensual de incidencias.',
    );
  }

  return `#INC-${String(consecutivo).padStart(4, '0')}${sufijo}`;
};

/**
 * Datos permitidos para actualizar una incidencia.
 */
export interface ActualizarIncidenciaDTO {
  titulo?: string;
  descripcion?: string;
  categoria?: CategoriaIncidencia;
  ubicacion?: string | null;
  latitud?: number | null;
  longitud?: number | null;
  observacionesAdmin?: string | null;
  adminActualizaId?: number;
}

/**
 * Datos para cambiar el estado.
 */
export interface CambiarEstadoIncidenciaDTO {
  estado: EstadoIncidencia;
  adminId: number;
  observacionesAdmin?: string | null;
}

export interface FiltrosIncidenciaDTO {
  buscar?: string;
  categoria?: CategoriaIncidencia;
  prioridad?: PrioridadIncidencia;
  estado?: EstadoIncidencia;
  fechaDesde?: Date;
  fechaHasta?: Date;
  soloPublicas?: boolean;
}

export interface PaginacionIncidenciasDTO {
  pagina: number;
  limite: number;
}

export interface ResultadoIncidenciasPaginadas {
  incidencias: Incidencia[];
  total: number;
  pagina: number;
  limite: number;
  totalPaginas: number;
}

export interface ActualizarIncidenciaAdministrativaDTO {
  categoria?: CategoriaIncidencia;
  prioridad?: PrioridadIncidencia;
  estado?: EstadoIncidencia;
  adminId: number;
}

const incidenciaBloqueaEscrituraAdministrativa = (
  incidencia: Incidencia,
): boolean =>
  incidencia.estado === EstadoIncidencia.RESUELTA ||
  incidencia.estado === EstadoIncidencia.CERRADA ||
  (incidencia.estado ===
    EstadoIncidencia.EN_REVISION &&
    incidencia.conformidadUsuario === 'pendiente');

/**
 * Actualizar si una incidencia es pública o privada.
 */
export const actualizarVisibilidadIncidencia = async (
  id: number,
  esPublica: boolean,
): Promise<Incidencia> => {
  const incidencia = await incidenciaRepository.findOne({
    where: { id },
    relations: {
      usuarioReporta: true,
      adminActualiza: true,
      evidencias: true,
    },
  });

  if (!incidencia) {
    throw new Error('Incidencia no encontrada.');
  }

  if (incidenciaBloqueaEscrituraAdministrativa(incidencia)) {
    throw new Error(
      'No se puede modificar una incidencia durante la revisión de conformidad o después de resolverla.',
    );
  }

  incidencia.esPublica = esPublica;

  return incidenciaRepository.save(incidencia);
};

export type AccionCierreIncidencia =
  | 'satisfecho'
  | 'no_satisfecho';

/**
 * Crear una nueva incidencia.
 *
 * Al registrarse:
 * - Si es anónima, no hay usuario destinatario.
 * - Si tiene usuario, se conserva la relación.
 * - Se notifica a todos los administradores.
 */
export const crearIncidencia = async (
  datos: CrearIncidenciaDTO,
): Promise<Incidencia> => {
  const prioridad =
    datos.prioridad ?? determinarPrioridad(datos.categoria);

  let usuarioReporta: Usuario | null = null;

  if (
    datos.usuarioReportaId !== undefined &&
    datos.usuarioReportaId !== null
  ) {
    usuarioReporta =
      await usuarioRepository.findOne({
        where: {
          id: datos.usuarioReportaId,
        },
      });

    if (!usuarioReporta) {
      throw new Error(
        'El usuario que reporta no existe.',
      );
    }
  }

  const incidenciaGuardada =
    await ejecutarConBloqueoCodigoIncidencia(
      () => AppDataSource.createQueryRunner(),
      async (manager) => {
        const repository = manager.getRepository(Incidencia);
        const incidencia = repository.create({
          codigo: await generarCodigoIncidencia(repository),
          titulo: datos.titulo.trim(),
          descripcion: datos.descripcion.trim(),
          categoria: datos.categoria,
          prioridad,
          estado: EstadoIncidencia.PENDIENTE,
          usuarioReporta,
          nombreContacto: datos.nombreContacto?.trim() || null,
          telefonoContacto: datos.telefonoContacto?.trim() || null,
          ubicacion: datos.ubicacion?.trim() || null,
          latitud: datos.latitud ?? null,
          longitud: datos.longitud ?? null,
          observacionesAdmin: null,
          fechaResolucion: null,
        });

        return repository.save(incidencia);
      },
    );

  /*
   * NOTIFICACIÓN:
   * Se avisa a todos los administradores
   * que existe una nueva incidencia.
   *
   * Esto también funciona para incidencias
   * anónimas.
   */
  try {
    await notificacionIncidenciaService
      .notificarNuevaIncidenciaAAdministradores(
        incidenciaGuardada,
      );
  } catch (error) {
    // La incidencia ya fue persistida: una notificación secundaria no debe
    // transformar un registro exitoso en un error para la persona reportante.
    console.error('No se pudo notificar la nueva incidencia:', error);
  }

  return incidenciaGuardada;
};

/**
 * Obtener todas las incidencias.
 */
export const obtenerIncidencias = async (
  filtros?: FiltrosIncidenciaDTO,
  paginacion?: PaginacionIncidenciasDTO,
): Promise<
  Incidencia[] | ResultadoIncidenciasPaginadas
> => {
  const consulta = incidenciaRepository
    .createQueryBuilder('incidencia')
    .leftJoinAndSelect('incidencia.usuarioReporta', 'usuarioReporta')
    .leftJoinAndSelect('incidencia.adminActualiza', 'adminActualiza')
    .leftJoinAndSelect('incidencia.evidencias', 'evidencias')
    .orderBy('incidencia.fechaRegistro', 'DESC');

  if (filtros?.categoria) {
    consulta.andWhere('incidencia.categoria = :categoria', { categoria: filtros.categoria });
  }

  if (filtros?.prioridad) {
    consulta.andWhere('incidencia.prioridad = :prioridad', { prioridad: filtros.prioridad });
  }

  if (filtros?.estado) {
    consulta.andWhere('incidencia.estado = :estado', { estado: filtros.estado });
  }

  if (filtros?.fechaDesde) {
    consulta.andWhere('incidencia.fechaRegistro >= :fechaDesde', { fechaDesde: filtros.fechaDesde });
  }

  if (filtros?.fechaHasta) {
    consulta.andWhere('incidencia.fechaRegistro <= :fechaHasta', { fechaHasta: filtros.fechaHasta });
  }

  if (filtros?.soloPublicas) {
    consulta.andWhere('incidencia.esPublica = :soloPublicas', { soloPublicas: true });
  }

  if (filtros?.buscar?.trim()) {
    const termino = `%${filtros.buscar.trim()}%`;
    consulta.andWhere(
      '(incidencia.codigo LIKE :termino OR CAST(incidencia.id AS CHAR) LIKE :termino)',
      { termino },
    );
  }

  if (paginacion) {
    consulta
      .skip(
        (paginacion.pagina - 1) *
          paginacion.limite,
      )
      .take(paginacion.limite);

    const [incidencias, total] =
      await consulta.getManyAndCount();

    return {
      incidencias,
      total,
      pagina: paginacion.pagina,
      limite: paginacion.limite,
      totalPaginas: Math.ceil(
        total / paginacion.limite,
      ),
    };
  }

  return consulta.getMany();
};

/**
 * Obtener una incidencia por ID.
 */
export const obtenerIncidenciaPorId = async (
  id: number,
): Promise<Incidencia> => {
  const incidencia =
    await incidenciaRepository.findOne({
      where: {
        id,
      },
      relations: {
        usuarioReporta: true,
        adminActualiza: true,
        evidencias: true,
      },
    });

  if (!incidencia) {
    throw new Error(
      'Incidencia no encontrada.',
    );
  }

  return incidencia;
};

/**
 * Lista únicamente las incidencias
 * reportadas por el usuario autenticado.
 */
export const obtenerMisIncidencias = async (
  usuarioId: number,
): Promise<Incidencia[]> => {
  return await incidenciaRepository.find({
    where: {
      usuarioReporta: {
        id: usuarioId,
      },
    },
    relations: {
      usuarioReporta: true,
      adminActualiza: true,
      evidencias: true,
    },
    order: {
      fechaRegistro: 'DESC',
    },
  });
};

/**
 * Registra la conformidad del reportante.
 *
 * Si está satisfecho:
 * - pasa a RESUELTA.
 *
 * Si no está satisfecho:
 * - pasa a EN_PROCESO.
 *
 * Después de guardar la respuesta:
 * - se notifica a todos los administradores.
 */
export const cerrarIncidenciaPorUsuario =
  async (
    id: number,
    usuarioId: number,
    accion:
      | 'satisfecho'
      | 'no_satisfecho',
    observacionesUsuario?: string | null,
  ): Promise<Incidencia> => {
    const incidenciaActualizada =
      await AppDataSource.transaction(
        async (manager) => {
          const incidenciaRepo =
            manager.getRepository(
              Incidencia,
            );

          const historialRepo =
            manager.getRepository(
              IncidenciaHistorial,
            );

          const incidencia =
            await incidenciaRepo
              .createQueryBuilder(
                'incidencia',
              )
              .setLock('pessimistic_write')
              .leftJoinAndSelect(
                'incidencia.usuarioReporta',
                'usuarioReporta',
              )
              .leftJoinAndSelect(
                'incidencia.adminActualiza',
                'adminActualiza',
              )
              .leftJoinAndSelect(
                'incidencia.evidencias',
                'evidencias',
              )
              .where(
                'incidencia.id = :id',
                { id },
              )
              .andWhere(
                'usuarioReporta.id = :usuarioId',
                { usuarioId },
              )
              .getOne();

          if (!incidencia) {
            throw new Error(
              'Incidencia no encontrada.',
            );
          }

          if (
            incidencia.estado !==
            EstadoIncidencia.EN_REVISION
          ) {
            throw new Error(
              'La incidencia no está disponible para respuesta.',
            );
          }

          if (
            incidencia.conformidadUsuario !==
            'pendiente'
          ) {
            throw new Error(
              'La incidencia ya tiene una respuesta registrada.',
            );
          }

          const ahora = new Date();

          const estadoAnterior =
            incidencia.estado;

          const conformidadAnterior =
            incidencia.conformidadUsuario;

          incidencia.fechaRespuestaUsuario =
            ahora;

          if (
            accion === 'satisfecho'
          ) {
            incidencia.conformidadUsuario =
              'satisfecho';

            incidencia.estado =
              EstadoIncidencia.RESUELTA;

            incidencia.observacionesUsuario =
              null;

            const fechaCierreProgramado =
              new Date(ahora);

            fechaCierreProgramado.setDate(
              fechaCierreProgramado.getDate() +
                7,
            );

            incidencia.fechaCierreProgramado =
              fechaCierreProgramado;

            incidencia.fechaLimiteRespuesta =
              null;
          } else {
            const observaciones =
              observacionesUsuario?.trim() ||
              null;

            if (!observaciones) {
              throw new Error(
                'Debes indicar las observaciones cuando no estás satisfecho.',
              );
            }

            incidencia.conformidadUsuario =
              'no_satisfecho';

            incidencia.estado =
              EstadoIncidencia.EN_PROCESO;

            incidencia.observacionesUsuario =
              observaciones;

            incidencia.fechaCierreProgramado =
              null;

            incidencia.fechaLimiteRespuesta =
              null;
          }

          incidencia.fechaActualizacion =
            ahora;

          const incidenciaGuardada =
            await incidenciaRepo.save(
              incidencia,
            );

          await historialRepo.save([
            historialRepo.create({
              incidencia:
                incidenciaGuardada,

              incidenciaId:
                incidenciaGuardada.id,

              usuario:
                incidencia.usuarioReporta!,

              usuarioId,

              campoModificado:
                'conformidad_usuario',

              valorAnterior:
                conformidadAnterior,

              valorNuevo:
                incidenciaGuardada.conformidadUsuario,
            }),

            historialRepo.create({
              incidencia:
                incidenciaGuardada,

              incidenciaId:
                incidenciaGuardada.id,

              usuario:
                incidencia.usuarioReporta!,

              usuarioId,

              campoModificado:
                'estado',

              valorAnterior:
                estadoAnterior,

              valorNuevo:
                incidenciaGuardada.estado,
            }),
          ]);

          if (
            accion ===
              'no_satisfecho' &&
            incidenciaGuardada.observacionesUsuario
          ) {
            await historialRepo.save(
              historialRepo.create({
                incidencia:
                  incidenciaGuardada,

                incidenciaId:
                  incidenciaGuardada.id,

                usuario:
                  incidencia.usuarioReporta!,

                usuarioId,

                campoModificado:
                  'observaciones_usuario',

                valorAnterior: null,

                valorNuevo:
                  incidenciaGuardada.observacionesUsuario,
              }),
            );
          }

          return incidenciaGuardada;
        },
      );

    /*
     * NOTIFICACIÓN:
     * Se informa a los administradores
     * si el usuario está satisfecho o
     * no satisfecho.
     */
    await notificacionIncidenciaService
      .notificarRespuestaUsuarioAAdministradores(
        incidenciaActualizada,
        accion,
      );

    return incidenciaActualizada;
  };

/**
 * Actualizar los datos de una incidencia.
 */
export const actualizarIncidencia =
  async (
    id: number,
    datos: ActualizarIncidenciaDTO,
  ): Promise<Incidencia> => {
    const incidencia =
      await incidenciaRepository.findOne({
        where: {
          id,
        },
      });

    if (!incidencia) {
      throw new Error(
        'Incidencia no encontrada.',
      );
    }

    if (datos.titulo !== undefined) {
      incidencia.titulo =
        datos.titulo.trim();
    }

    if (
      datos.descripcion !== undefined
    ) {
      incidencia.descripcion =
        datos.descripcion.trim();
    }

    if (
      datos.categoria !== undefined
    ) {
      incidencia.categoria =
        datos.categoria;

      // La prioridad se vuelve a calcular
      // si cambia la categoría.
      incidencia.prioridad =
        determinarPrioridad(
          datos.categoria,
        );
    }

    if (
      datos.ubicacion !== undefined
    ) {
      incidencia.ubicacion =
        datos.ubicacion?.trim() || null;
    }

    if (datos.latitud !== undefined) {
      incidencia.latitud =
        datos.latitud;
    }

    if (datos.longitud !== undefined) {
      incidencia.longitud =
        datos.longitud;
    }

    if (
      datos.observacionesAdmin !==
      undefined
    ) {
      incidencia.observacionesAdmin =
        datos.observacionesAdmin?.trim() ||
        null;
    }

    if (
      datos.adminActualizaId !==
      undefined
    ) {
      const administrador =
        await usuarioRepository.findOne({
          where: {
            id: datos.adminActualizaId,
          },
        });

      if (!administrador) {
        throw new Error(
          'El administrador no existe.',
        );
      }

      incidencia.adminActualiza =
        administrador;
    }

    return await incidenciaRepository.save(
      incidencia,
    );
  };

/**
 * Cambiar el estado de una incidencia.
 */
export const cambiarEstadoIncidencia =
  async (
    id: number,
    datos: CambiarEstadoIncidenciaDTO,
  ): Promise<Incidencia> => {
    const incidencia =
      await incidenciaRepository.findOne({
        where: {
          id,
        },
      });

    if (!incidencia) {
      throw new Error(
        'Incidencia no encontrada.',
      );
    }

    const administrador =
      await usuarioRepository.findOne({
        where: {
          id: datos.adminId,
        },
      });

    if (!administrador) {
      throw new Error(
        'El administrador no existe.',
      );
    }

    incidencia.estado =
      datos.estado;

    incidencia.adminActualiza =
      administrador;

    if (
      datos.observacionesAdmin !==
      undefined
    ) {
      incidencia.observacionesAdmin =
        datos.observacionesAdmin?.trim() ||
        null;
    }

    /*
     * Si la incidencia pasa a resuelta
     * o cerrada, se registra la fecha
     * de resolución.
     */
    if (
      datos.estado ===
        EstadoIncidencia.RESUELTA ||
      datos.estado ===
        EstadoIncidencia.CERRADA
    ) {
      incidencia.fechaResolucion =
        new Date();
    } else {
      incidencia.fechaResolucion =
        null;
    }

    return await incidenciaRepository.save(
      incidencia,
    );
  };

export const iniciarProcesoIncidencia = async (
  id: number,
  adminId: number,
): Promise<Incidencia> =>
  AppDataSource.transaction(async (manager) => {
    const incidenciaRepo = manager.getRepository(Incidencia);
    const usuarioRepo = manager.getRepository(Usuario);
    const historialRepo = manager.getRepository(IncidenciaHistorial);

    const incidencia = await incidenciaRepo
      .createQueryBuilder('incidencia')
      .setLock('pessimistic_write')
      .where('incidencia.id = :id', { id })
      .getOne();

    if (!incidencia) {
      throw new Error('Incidencia no encontrada.');
    }

    if (!puedeIniciarProcesoIncidencia(incidencia.estado)) {
      throw new Error(
        'Solo se puede iniciar el proceso de una incidencia pendiente.',
      );
    }

    const administrador = await usuarioRepo.findOne({
      where: { id: adminId },
    });
    if (!administrador) {
      throw new Error('El administrador no existe.');
    }

    const estadoAnterior = incidencia.estado;
    incidencia.estado = EstadoIncidencia.EN_PROCESO;
    incidencia.adminActualiza = administrador;
    incidencia.fechaActualizacion = new Date();
    const guardada = await incidenciaRepo.save(incidencia);

    await historialRepo.save(
      historialRepo.create({
        incidencia: guardada,
        incidenciaId: guardada.id,
        usuario: administrador,
        usuarioId: administrador.id,
        campoModificado: 'estado',
        valorAnterior: estadoAnterior,
        valorNuevo: guardada.estado,
      }),
    );

    const incidenciaConRelaciones = await incidenciaRepo.findOne({
      where: { id: guardada.id },
      relations: {
        usuarioReporta: true,
        adminActualiza: true,
        evidencias: true,
      },
    });
    if (!incidenciaConRelaciones) {
      throw new Error('Incidencia no encontrada.');
    }
    return incidenciaConRelaciones;
  });

const normalizarValorHistorial = (
  valor:
    | string
    | number
    | Date
    | null
    | undefined,
): string | null => {
  if (
    valor === undefined ||
    valor === null
  ) {
    return null;
  }

  if (valor instanceof Date) {
    return valor.toISOString();
  }

  return String(valor);
};

/**
 * Actualiza la clasificación administrativa sin iniciar la revisión
 * de conformidad.
 */
export const actualizarIncidenciaAdministrativa =
  async (
    id: number,
    datos: ActualizarIncidenciaAdministrativaDTO,
  ): Promise<Incidencia> => {
    return await AppDataSource.transaction(
      async (manager) => {
        const incidenciaRepo =
          manager.getRepository(
            Incidencia,
          );

        const usuarioRepo =
          manager.getRepository(
            Usuario,
          );

        const historialRepo =
          manager.getRepository(
            IncidenciaHistorial,
          );

        const incidencia =
          await incidenciaRepo
            .createQueryBuilder('incidencia')
            .setLock('pessimistic_write')
            .where(
              'incidencia.id = :id',
              { id },
            )
            .getOne();

        if (!incidencia) {
          throw new Error(
            'Incidencia no encontrada.',
          );
        }

        if (
          incidenciaBloqueaEscrituraAdministrativa(
            incidencia,
          )
        ) {
          throw new Error(
            'No se puede modificar una incidencia durante la revisión de conformidad o después de resolverla.',
          );
        }

        if (datos.estado !== undefined) {
          throw new Error(
            'El estado no se puede modificar desde la actualización administrativa.',
          );
        }

        const administrador =
          await usuarioRepo.findOne({
            where: {
              id: datos.adminId,
            },
          });

        if (!administrador) {
          throw new Error(
            'El administrador no existe.',
          );
        }

        /*
         * El administrador no puede marcar
         * directamente una incidencia como
         * RESUELTA o CERRADA.
         *
         * RESUELTA:
         * la establece el usuario cuando
         * acepta la solución.
         *
         * CERRADA:
         * la establece automáticamente
         * el sistema.
         */

        const valoresOriginales = {
          categoria:
            incidencia.categoria,

          prioridad:
            incidencia.prioridad,
        };

        if (
          datos.categoria !== undefined
        ) {
          incidencia.categoria =
            datos.categoria;

          if (
            datos.prioridad === undefined
          ) {
            incidencia.prioridad =
              determinarPrioridad(
                datos.categoria,
              );
          }
        }

        if (
          datos.prioridad !== undefined
        ) {
          incidencia.prioridad =
            datos.prioridad;
        }

        incidencia.adminActualiza =
          administrador;

        incidencia.fechaActualizacion =
          new Date();

        const incidenciaActualizada =
          await incidenciaRepo.save(
            incidencia,
          );

        const cambiosHistorial: IncidenciaHistorial[] =
          [];

        const agregarCambioHistorial = (
          campoModificado: string,
          valorAnterior:
            | string
            | number
            | Date
            | null
            | undefined,
          valorNuevo:
            | string
            | number
            | Date
            | null
            | undefined,
        ) => {
          const anterior =
            normalizarValorHistorial(
              valorAnterior,
            );

          const nuevo =
            normalizarValorHistorial(
              valorNuevo,
            );

          if (anterior === nuevo) {
            return;
          }

          cambiosHistorial.push(
            historialRepo.create({
              incidencia:
                incidenciaActualizada,

              incidenciaId:
                incidenciaActualizada.id,

              usuario:
                administrador,

              usuarioId:
                administrador.id,

              campoModificado,

              valorAnterior:
                anterior,

              valorNuevo:
                nuevo,
            }),
          );
        };

        for (const cambio of obtenerCambiosClasificacionIncidencia(
          valoresOriginales,
          {
            categoria: incidenciaActualizada.categoria,
            prioridad: incidenciaActualizada.prioridad,
          },
        )) {
          agregarCambioHistorial(
            cambio.campoModificado,
            cambio.valorAnterior,
            cambio.valorNuevo,
          );
        }

        if (
          cambiosHistorial.length > 0
        ) {
          await historialRepo.save(
            cambiosHistorial,
          );
        }

        const incidenciaConRelaciones =
          await incidenciaRepo.findOne({
            where: {
              id: incidenciaActualizada.id,
            },
            relations: {
              usuarioReporta: true,
              adminActualiza: true,
              evidencias: true,
            },
          });

        if (!incidenciaConRelaciones) {
          throw new Error(
            'Incidencia no encontrada.',
          );
        }

        return incidenciaConRelaciones;
      },
    );
  };

export const finalizarSeguimientoIncidencia =
  async (
    id: number,
    adminId: number,
  ): Promise<Incidencia> => {
    const incidenciaActualizada =
      await AppDataSource.transaction(
        async (manager) => {
          const incidenciaRepo =
            manager.getRepository(Incidencia);
          const usuarioRepo =
            manager.getRepository(Usuario);
          const historialRepo =
            manager.getRepository(
              IncidenciaHistorial,
            );

          const incidencia =
            await incidenciaRepo
              .createQueryBuilder('incidencia')
              .setLock('pessimistic_write')
              .where(
                'incidencia.id = :id',
                { id },
              )
              .getOne();

          if (!incidencia) {
            throw new Error(
              'Incidencia no encontrada.',
            );
          }

          if (
            incidenciaBloqueaEscrituraAdministrativa(
              incidencia,
            ) ||
            incidencia.estado ===
              EstadoIncidencia.EN_REVISION
          ) {
            throw new Error(
              'La incidencia no está disponible para finalizar el seguimiento.',
            );
          }

          const administrador =
            await usuarioRepo.findOne({
              where: { id: adminId },
            });

          if (!administrador) {
            throw new Error(
              'El administrador no existe.',
            );
          }

          const estadoAnterior =
            incidencia.estado;
          const conformidadAnterior =
            incidencia.conformidadUsuario;
          const fechaLimiteAnterior =
            incidencia.fechaLimiteRespuesta;
          const ahora = new Date();
          const fechaLimite = new Date(ahora);
          fechaLimite.setDate(
            fechaLimite.getDate() + 5,
          );

          incidencia.estado =
            EstadoIncidencia.EN_REVISION;
          incidencia.conformidadUsuario =
            'pendiente';
          incidencia.fechaResolucion = ahora;
          incidencia.fechaLimiteRespuesta =
            fechaLimite;
          incidencia.observacionesUsuario = null;
          incidencia.fechaRespuestaUsuario = null;
          incidencia.fechaCierreProgramado = null;
          incidencia.adminActualiza =
            administrador;
          incidencia.fechaActualizacion = ahora;

          const guardada =
            await incidenciaRepo.save(incidencia);

          const historial = [
            {
              campoModificado: 'estado',
              valorAnterior: estadoAnterior,
              valorNuevo: guardada.estado,
            },
            {
              campoModificado:
                'conformidad_usuario',
              valorAnterior: conformidadAnterior,
              valorNuevo:
                guardada.conformidadUsuario,
            },
            {
              campoModificado:
                'fecha_limite_respuesta',
              valorAnterior: fechaLimiteAnterior,
              valorNuevo:
                guardada.fechaLimiteRespuesta,
            },
          ]
            .filter(
              ({ valorAnterior, valorNuevo }) =>
                normalizarValorHistorial(
                  valorAnterior,
                ) !==
                normalizarValorHistorial(
                  valorNuevo,
                ),
            )
            .map(
              ({
                campoModificado,
                valorAnterior,
                valorNuevo,
              }) =>
                historialRepo.create({
                  incidencia: guardada,
                  incidenciaId: guardada.id,
                  usuario: administrador,
                  usuarioId: administrador.id,
                  campoModificado,
                  valorAnterior:
                    normalizarValorHistorial(
                      valorAnterior,
                    ),
                  valorNuevo:
                    normalizarValorHistorial(
                      valorNuevo,
                    ),
                }),
            );

          if (historial.length > 0) {
            await historialRepo.save(historial);
          }

          const incidenciaConRelaciones =
            await incidenciaRepo.findOne({
              where: { id: guardada.id },
              relations: {
                usuarioReporta: true,
                adminActualiza: true,
                evidencias: true,
              },
            });

          if (!incidenciaConRelaciones) {
            throw new Error(
              'Incidencia no encontrada.',
            );
          }

          return incidenciaConRelaciones;
        },
      );

    await notificacionIncidenciaService
      .notificarSeguimientoAlUsuario(
        incidenciaActualizada,
        true,
      );

    return incidenciaActualizada;
  };

/**
 * Eliminar una incidencia.
 */
export const eliminarIncidencia =
  async (
    id: number,
  ): Promise<void> => {
    const incidencia =
      await incidenciaRepository.findOne({
        where: {
          id,
        },
      });

    if (!incidencia) {
      throw new Error(
        'Incidencia no encontrada.',
      );
    }

    if (
      incidencia.estado ===
      EstadoIncidencia.CERRADA
    ) {
      throw new Error(
        'No se puede eliminar una incidencia cerrada.',
      );
    }

    await incidenciaRepository.remove(
      incidencia,
    );
  };
