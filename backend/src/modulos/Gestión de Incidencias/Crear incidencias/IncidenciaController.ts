import { Request, Response } from 'express';

import {
  crearIncidencia,
  obtenerIncidencias,
  obtenerIncidenciaPorId,
  actualizarIncidenciaAdministrativa,
  actualizarVisibilidadIncidencia,
  cerrarIncidenciaPorUsuario,
  obtenerMisIncidencias,
  FiltrosIncidenciaDTO,
} from '../Crear incidencias/IncidenciaService';

import {
  CategoriaIncidencia,
  PrioridadIncidencia,
  EstadoIncidencia,
  Incidencia,
} from '../../../models/Incidencia';

import { notificacionIncidenciaService } from '../../Notificaciones/Crear notificaciones Incidencias/NotificacionIncidenciaService';
import { AppDataSource } from '../../../data-source';
import { ComentarioIncidencia } from '../../../models/ComentarioIncidencia';

const serializarComentario = (comentario: ComentarioIncidencia) => {
  const nombreAutor = comentario.autor
    ? `${comentario.autor.nombre} ${comentario.autor.apellidos}`.trim() || comentario.autor.nombreUsuario
    : 'Administrador';

  return {
    id: comentario.id,
    incidenciaId: comentario.incidenciaId,
    autorId: comentario.autorId,
    nombreAutor,
    texto: comentario.texto,
    fechaHora: comentario.fechaHora,
    esNotaPrivada: comentario.esNotaPrivada,
    esDatoSensible: comentario.esDatoSensible,
  };
};

export const agregarComentarioIncidencia = async (req: Request, res: Response): Promise<void> => {
  const incidenciaId = Number(req.params.id);
  const texto = typeof req.body?.texto === 'string' ? req.body.texto.trim() : '';
  if (!Number.isSafeInteger(incidenciaId) || incidenciaId <= 0 || !texto) { res.status(400).json({ mensaje: 'El comentario es obligatorio.' }); return; }
  const esNotaPrivada = req.body?.esNotaPrivada === true;
  const esDatoSensible = req.body?.esDatoSensible === true;
  const esAdministrador = req.usuario?.rol === 'administrador' || req.usuario?.rol === 'super_admin';
  if (esNotaPrivada && !esAdministrador) { res.status(403).json({ mensaje: 'Solo administración puede registrar notas privadas.' }); return; }
  try {
    const repositorio = AppDataSource.getRepository(ComentarioIncidencia);
    const creado = await repositorio.save({ incidenciaId, autorId: req.usuario?.id ?? null, texto, esNotaPrivada, esDatoSensible });
    const comentario = await repositorio.findOne({ where: { id: creado.id }, relations: { autor: true } });
    res.status(201).json({ comentario: serializarComentario(comentario ?? creado) });
  } catch { res.status(500).json({ mensaje: 'No se pudo registrar el comentario.' }); }
};

export const obtenerComentariosIncidencia = async (req: Request, res: Response): Promise<void> => {
  const incidenciaId = Number(req.params.id);
  const usuarioId = req.usuario?.id;
  if (!Number.isSafeInteger(incidenciaId) || incidenciaId <= 0 || !usuarioId) {
    res.status(400).json({ mensaje: 'Solicitud de historial inválida.' });
    return;
  }

  try {
    const incidencias = AppDataSource.getRepository(Incidencia);
    const incidencia = await incidencias.findOne({
      where: { id: incidenciaId },
      relations: { usuarioReporta: true },
    });
    if (!incidencia) {
      res.status(404).json({ mensaje: 'Incidencia no encontrada.' });
      return;
    }

    const esAdministrador = req.usuario?.rol === 'administrador' || req.usuario?.rol === 'super_admin';
    if (!esAdministrador && incidencia.usuarioReporta?.id !== usuarioId) {
      res.status(403).json({ mensaje: 'No tienes acceso al historial de esta incidencia.' });
      return;
    }

    const comentarios = await AppDataSource.getRepository(ComentarioIncidencia).find({
      where: esAdministrador
        ? { incidenciaId }
        : { incidenciaId, esNotaPrivada: false, esDatoSensible: false },
      relations: { autor: true },
      order: { fechaHora: 'ASC' },
    });
    res.status(200).json({ comentarios: comentarios.map(serializarComentario) });
  } catch {
    res.status(500).json({ mensaje: 'No se pudo obtener el historial de comentarios.' });
  }
};


const formatearFechaIncidencia = (
  fecha: Date | string | null | undefined,
): string | null => {
  if (!fecha) {
    return null;
  }

  if (typeof fecha === 'string') {
    const coincidencia = fecha.match(
      /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})/,
    );

    if (coincidencia) {
      const [, anio, mes, dia, hora, minuto, segundo] =
        coincidencia;

      return `${anio}-${mes}-${dia}T${hora}:${minuto}:${segundo}-06:00`;
    }

    return fecha;
  }

  return fecha.toISOString();
};

const serializarIncidencia = (incidencia: Incidencia) => {
  const { usuarioReporta, adminActualiza, ...resto } = incidencia;

  return {
    ...resto,

    usuarioReporta: usuarioReporta
      ? {
          id: usuarioReporta.id,
          nombre: usuarioReporta.nombre,
        }
      : null,

    adminActualiza: adminActualiza
      ? {
          id: adminActualiza.id,
          nombre: adminActualiza.nombre,
        }
      : null,

    tieneCorreoUsuario: Boolean(usuarioReporta?.correo),

    codigo: incidencia.codigo || '#INC-00000000',

    fechaRegistro: formatearFechaIncidencia(
      incidencia.fechaRegistro,
    ),

    fechaActualizacion: adminActualiza
      ? formatearFechaIncidencia(
          incidencia.fechaActualizacion,
        )
      : null,

    fechaResolucion: formatearFechaIncidencia(
      incidencia.fechaResolucion,
    ),
  };
};

export const registrarIncidencia = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const {
      titulo,
      descripcion,
      categoria,
      ubicacion,
      latitud,
      longitud,
      esAnonimo,
      nombreContacto,
      telefonoContacto,
    } = req.body;

    // ============================================================
    // DETERMINAR SI EL REPORTE ES ANÓNIMO
    // ============================================================

    const usuarioAutenticado = req.usuario?.id ?? null;

    const usuarioReporta =
      usuarioAutenticado !== null && esAnonimo !== true
        ? usuarioAutenticado
        : null;

    // ============================================================
    // VALIDAR TÍTULO
    // ============================================================

    if (
      titulo === undefined ||
      titulo === null ||
      typeof titulo !== 'string' ||
      titulo.trim() === ''
    ) {
      res.status(400).json({
        mensaje: 'El título es obligatorio.',
      });
      return;
    }

    if (titulo.trim().length > 150) {
      res.status(400).json({
        mensaje: 'El título no puede tener más de 150 caracteres.',
      });
      return;
    }

    // ============================================================
    // VALIDAR DESCRIPCIÓN
    // ============================================================

    if (
      descripcion === undefined ||
      descripcion === null ||
      typeof descripcion !== 'string' ||
      descripcion.trim() === ''
    ) {
      res.status(400).json({
        mensaje: 'La descripción es obligatoria.',
      });
      return;
    }

    // ============================================================
    // VALIDAR CATEGORÍA
    // ============================================================

    if (
      categoria === undefined ||
      categoria === null ||
      categoria === ''
    ) {
      res.status(400).json({
        mensaje: 'La categoría es obligatoria.',
      });
      return;
    }

    if (
      !Object.values(CategoriaIncidencia).includes(categoria)
    ) {
      res.status(400).json({
        mensaje: 'La categoría de la incidencia no es válida.',
      });
      return;
    }

    // ============================================================
    // VALIDAR UBICACIÓN
    // ============================================================

    if (
      ubicacion !== undefined &&
      ubicacion !== null &&
      typeof ubicacion !== 'string'
    ) {
      res.status(400).json({
        mensaje: 'La ubicación no es válida.',
      });
      return;
    }

    if (
      typeof ubicacion === 'string' &&
      ubicacion.trim().length > 255
    ) {
      res.status(400).json({
        mensaje:
          'La ubicación no puede tener más de 255 caracteres.',
      });
      return;
    }

    // ============================================================
    // VALIDAR LATITUD
    // ============================================================

    if (latitud !== undefined && latitud !== null) {
      const latitudNumero = Number(latitud);

      if (
        Number.isNaN(latitudNumero) ||
        latitudNumero < -90 ||
        latitudNumero > 90
      ) {
        res.status(400).json({
          mensaje: 'La latitud no es válida.',
        });
        return;
      }
    }

    // ============================================================
    // VALIDAR LONGITUD
    // ============================================================

    if (longitud !== undefined && longitud !== null) {
      const longitudNumero = Number(longitud);

      if (
        Number.isNaN(longitudNumero) ||
        longitudNumero < -180 ||
        longitudNumero > 180
      ) {
        res.status(400).json({
          mensaje: 'La longitud no es válida.',
        });
        return;
      }
    }

    // ============================================================
    // VALIDAR QUE LATITUD Y LONGITUD VENGAN JUNTAS
    // ============================================================

    if (
      (latitud !== undefined &&
        latitud !== null &&
        (longitud === undefined || longitud === null)) ||
      (longitud !== undefined &&
        longitud !== null &&
        (latitud === undefined || latitud === null))
    ) {
      res.status(400).json({
        mensaje:
          'La latitud y longitud deben enviarse juntas.',
      });
      return;
    }

    // ============================================================
    // CREAR INCIDENCIA
    // ============================================================

    const incidencia = await crearIncidencia({
      titulo: titulo.trim(),
      descripcion: descripcion.trim(),
      categoria,
      ubicacion:
        typeof ubicacion === 'string'
          ? ubicacion.trim()
          : null,
      latitud:
        latitud !== undefined && latitud !== null
          ? Number(latitud)
          : null,
      longitud:
        longitud !== undefined && longitud !== null
          ? Number(longitud)
          : null,
      usuarioReportaId: usuarioReporta,
      nombreContacto:
        usuarioReporta === null
          ? typeof nombreContacto === 'string'
            ? nombreContacto.trim() || null
            : null
          : null,
      telefonoContacto:
        usuarioReporta === null
          ? typeof telefonoContacto === 'string'
            ? telefonoContacto.trim() || null
            : null
          : null,
    });

    // ============================================================
    // RESPUESTA
    // ============================================================

    res.status(201).json({
      mensaje:
        usuarioReporta === null
          ? 'Incidencia registrada de forma anónima correctamente.'
          : 'Incidencia registrada correctamente.',
      incidencia: serializarIncidencia(incidencia),
    });
  } catch (error) {
    console.error(
      'Error al registrar incidencia:',
      error,
    );

    res.status(500).json({
      mensaje: 'No se pudo registrar la incidencia.',
    });
  }
};

/**
 * Compartir una incidencia por los canales elegidos por el admin.
 *
 * Body:
 * {
 *   destinatarios: 'usuarios' | 'asociados' | 'todos',
 *   canales: {
 *     notificacion: boolean,
 *     correo: boolean
 *   }
 * }
 */
export const compartirIncidencia = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({
        mensaje: 'El ID de la incidencia no es válido.',
      });
      return;
    }

    const { destinatarios, canales } = req.body;

    if (
      destinatarios !== 'usuarios' &&
      destinatarios !== 'asociados' &&
      destinatarios !== 'todos'
    ) {
      res.status(400).json({
        mensaje:
          'Los destinatarios deben ser usuarios, asociados o todos.',
      });
      return;
    }

    const notificacion =
      canales?.notificacion === true;

    const correo = canales?.correo === true;

    if (!notificacion && !correo) {
      res.status(400).json({
        mensaje:
          'Debes seleccionar al menos un canal para compartir.',
      });
      return;
    }

    const incidencia =
      await obtenerIncidenciaPorId(id);

    const { cantidad, correoEnviado } =
      await notificacionIncidenciaService.compartirIncidencia(
        incidencia,
        destinatarios,
        {
          notificacion,
          correo,
        },
      );

    res.status(200).json({
      mensaje:
        'Incidencia compartida correctamente.',
      cantidadNotificaciones: cantidad,
      correoEnviado,
      incidencia: serializarIncidencia(incidencia),
    });
  } catch (error) {
    console.error(
      'Error al compartir incidencia:',
      error,
    );

    const mensaje =
      error instanceof Error
        ? error.message
        : 'No se pudo compartir la incidencia.';

    if (
      mensaje === 'Incidencia no encontrada.'
    ) {
      res.status(404).json({ mensaje });
      return;
    }

    if (
      mensaje === 'La incidencia ya fue compartida.'
    ) {
      res.status(409).json({ mensaje });
      return;
    }

    res.status(500).json({
      mensaje:
        'No se pudo compartir la incidencia.',
    });
  }
};

/**
 * Obtener todas las incidencias.
 */
export const listarIncidencias = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const {
      categoria,
      prioridad,
      estado,
      fechaDesde,
      fechaHasta,
      buscar,
    } = req.query;

    const filtros: FiltrosIncidenciaDTO = {};

    if (typeof buscar === 'string' && buscar.trim()) {
      filtros.buscar = buscar.trim();
    }

    if (
      categoria !== undefined &&
      categoria !== ''
    ) {
      if (
        !Object.values(CategoriaIncidencia).includes(
          categoria as CategoriaIncidencia,
        )
      ) {
        res.status(400).json({
          mensaje:
            'La categoría de filtro no es válida.',
        });
        return;
      }

      filtros.categoria =
        categoria as CategoriaIncidencia;
    }

    if (
      prioridad !== undefined &&
      prioridad !== ''
    ) {
      if (
        !Object.values(PrioridadIncidencia).includes(
          prioridad as PrioridadIncidencia,
        )
      ) {
        res.status(400).json({
          mensaje:
            'La prioridad de filtro no es válida.',
        });
        return;
      }

      filtros.prioridad =
        prioridad as PrioridadIncidencia;
    }

    if (
      estado !== undefined &&
      estado !== ''
    ) {
      if (
        !Object.values(EstadoIncidencia).includes(
          estado as EstadoIncidencia,
        )
      ) {
        res.status(400).json({
          mensaje:
            'El estado de filtro no es válido.',
        });
        return;
      }

      filtros.estado =
        estado as EstadoIncidencia;
    }

    if (
      fechaDesde !== undefined &&
      fechaDesde !== ''
    ) {
      const desde = new Date(
        fechaDesde as string,
      );

      if (Number.isNaN(desde.getTime())) {
        res.status(400).json({
          mensaje:
            'La fecha "desde" no es válida.',
        });
        return;
      }

      filtros.fechaDesde = desde;
    }

    if (
      fechaHasta !== undefined &&
      fechaHasta !== ''
    ) {
      const hasta = new Date(
        fechaHasta as string,
      );

      if (Number.isNaN(hasta.getTime())) {
        res.status(400).json({
          mensaje:
            'La fecha "hasta" no es válida.',
        });
        return;
      }

      hasta.setHours(
        23,
        59,
        59,
        999,
      );

      filtros.fechaHasta = hasta;
    }

    if (
      filtros.fechaDesde &&
      filtros.fechaHasta &&
      filtros.fechaDesde >
        filtros.fechaHasta
    ) {
      res.status(400).json({
        mensaje:
          'La fecha "desde" no puede ser posterior a la fecha "hasta".',
      });
      return;
    }

    const incidencias =
      await obtenerIncidencias(filtros);

    res.status(200).json({
      mensaje:
        'Incidencias obtenidas correctamente.',
      incidencias:
        incidencias.map(
          serializarIncidencia,
        ),
    });
  } catch (error) {
    console.error(
      'Error al obtener incidencias:',
      error,
    );

    res.status(500).json({
      mensaje:
        'No se pudieron obtener las incidencias.',
    });
  }
};

export const obtenerDetalleIncidencia =
  async (
    req: Request,
    res: Response,
  ): Promise<void> => {
    try {
      const id = Number(req.params.id);

      if (
        Number.isNaN(id) ||
        id <= 0
      ) {
        res.status(400).json({
          mensaje:
            'El ID de la incidencia no es válido.',
        });
        return;
      }

      const incidencia =
        await obtenerIncidenciaPorId(id);

      res.status(200).json({
        mensaje:
          'Incidencia obtenida correctamente.',
        incidencia:
          serializarIncidencia(
            incidencia,
          ),
      });
    } catch (error) {
      console.error(
        'Error al obtener el detalle de la incidencia:',
        error,
      );

      const mensaje =
        error instanceof Error
          ? error.message
          : 'No se pudo obtener la incidencia.';

      if (
        mensaje ===
        'Incidencia no encontrada.'
      ) {
        res.status(404).json({
          mensaje,
        });
        return;
      }

      res.status(500).json({
        mensaje:
          'No se pudo obtener la incidencia.',
      });
    }
  };

export const actualizarIncidenciaAdmin =
  async (
    req: Request,
    res: Response,
  ): Promise<void> => {
    try {
      const id = Number(req.params.id);

      if (
        Number.isNaN(id) ||
        id <= 0
      ) {
        res.status(400).json({
          mensaje:
            'El ID de la incidencia no es valido.',
        });
        return;
      }

      const adminId =
        req.usuario?.id;

      if (
        adminId === undefined ||
        adminId === null
      ) {
        res.status(401).json({
          mensaje:
            'Usuario autenticado no encontrado.',
        });
        return;
      }

      const {
        categoria,
        estado,
        observacionesAdmin,
        prioridad,
      } = req.body;

      if (
        categoria === undefined &&
        estado === undefined &&
        observacionesAdmin === undefined &&
        prioridad === undefined
      ) {
        res.status(400).json({
          mensaje:
            'Debe indicar al menos un cambio para la incidencia.',
        });
        return;
      }

      if (
        categoria !== undefined &&
        !Object.values(
          CategoriaIncidencia,
        ).includes(categoria)
      ) {
        res.status(400).json({
          mensaje:
            'La categoria de la incidencia no es valida.',
        });
        return;
      }

      if (
        estado !== undefined &&
        !Object.values(
          EstadoIncidencia,
        ).includes(estado)
      ) {
        res.status(400).json({
          mensaje:
            'El estado de la incidencia no es valido.',
        });
        return;
      }

      if (
        prioridad !== undefined &&
        !Object.values(
          PrioridadIncidencia,
        ).includes(prioridad)
      ) {
        res.status(400).json({
          mensaje:
            'La prioridad de la incidencia no es valida.',
        });
        return;
      }

      if (
        observacionesAdmin !== undefined &&
        observacionesAdmin !== null &&
        typeof observacionesAdmin !==
          'string'
      ) {
        res.status(400).json({
          mensaje:
            'Las observaciones no son validas.',
        });
        return;
      }

      const datosActualizacion = {
        adminId,
      } as {
        categoria?: CategoriaIncidencia;
        prioridad?: PrioridadIncidencia;
        estado?: EstadoIncidencia;
        observacionesAdmin?:
          | string
          | null;
        adminId: number;
      };

      if (categoria !== undefined) {
        datosActualizacion.categoria =
          categoria;
      }

      if (prioridad !== undefined) {
        datosActualizacion.prioridad =
          prioridad;
      }

      if (estado !== undefined) {
        datosActualizacion.estado =
          estado;
      }

      if (
        observacionesAdmin !==
        undefined
      ) {
        datosActualizacion.observacionesAdmin =
          observacionesAdmin;
      }

      const incidencia =
        await actualizarIncidenciaAdministrativa(
          id,
          datosActualizacion,
        );

      const incidenciaActualizada =
        serializarIncidencia(
          incidencia,
        );

      res.status(200).json({
        mensaje:
          'Incidencia actualizada correctamente.',
        incidencia:
          incidenciaActualizada,
        incidenciaActualizada,
      });
    } catch (error) {
      console.error(
        'Error al actualizar incidencia:',
        error,
      );

      const mensaje =
        error instanceof Error
          ? error.message
          : 'No se pudo actualizar la incidencia.';

      if (
        mensaje ===
        'Incidencia no encontrada.'
      ) {
        res.status(404).json({
          mensaje,
        });
        return;
      }

      if (
        mensaje ===
        'El administrador no existe.'
      ) {
        res.status(401).json({
          mensaje,
        });
        return;
      }

      res.status(500).json({
        mensaje:
          'No se pudo actualizar la incidencia.',
      });
    }
  };

export const actualizarVisibilidadPublica =
  async (
    req: Request,
    res: Response,
  ): Promise<void> => {
    try {
      const id = Number(
        req.params.id,
      );

      const esPublica =
        req.body?.es_publica;

      if (
        !Number.isInteger(id) ||
        id <= 0
      ) {
        res.status(400).json({
          mensaje:
            'El ID de la incidencia no es válido.',
        });
        return;
      }

      if (
        typeof esPublica !== 'boolean'
      ) {
        res.status(400).json({
          mensaje:
            'es_publica debe ser booleano.',
        });
        return;
      }

      const incidencia =
        await actualizarVisibilidadIncidencia(
          id,
          esPublica,
        );

      res.status(200).json({
        mensaje:
          'Visibilidad pública actualizada correctamente.',
        incidencia:
          serializarIncidencia(
            incidencia,
          ),
      });
    } catch (error) {
      const mensaje =
        error instanceof Error
          ? error.message
          : 'No se pudo actualizar la visibilidad pública.';

      res
        .status(
          mensaje ===
            'Incidencia no encontrada.'
            ? 404
            : 500,
        )
        .json({ mensaje });
    }
  };

export const listarMisIncidencias =
  async (
    req: Request,
    res: Response,
  ): Promise<void> => {
    try {
      const usuarioId =
        req.usuario?.id;

      if (!usuarioId) {
        res.status(401).json({
          mensaje:
            'Usuario autenticado no encontrado.',
        });
        return;
      }

      const incidencias =
        await obtenerMisIncidencias(
          usuarioId,
        );

      res.status(200).json({
        mensaje:
          'Incidencias del usuario obtenidas correctamente.',
        incidencias:
          incidencias.map(
            serializarIncidencia,
          ),
      });
    } catch (error) {
      console.error(
        'Error al obtener las incidencias del usuario:',
        error,
      );

      res.status(500).json({
        mensaje:
          'No se pudieron obtener tus incidencias.',
      });
    }
  };

export const cerrarMiIncidencia =
  async (
    req: Request,
    res: Response,
  ): Promise<void> => {
    try {
      const id = Number(
        req.params.id,
      );

      const usuarioId =
        req.usuario?.id;

      const accion =
        req.body?.accion;

      const observacionesUsuario =
        req.body?.observacionesUsuario;

      if (
        !Number.isInteger(id) ||
        id <= 0
      ) {
        res.status(400).json({
          mensaje:
            'El ID de la incidencia no es válido.',
        });
        return;
      }

      if (!usuarioId) {
        res.status(401).json({
          mensaje:
            'Usuario autenticado no encontrado.',
        });
        return;
      }

      if (
        accion !== 'satisfecho' &&
        accion !== 'no_satisfecho'
      ) {
        res.status(400).json({
          mensaje:
            'La respuesta del usuario no es válida.',
        });
        return;
      }

      if (
        accion === 'no_satisfecho' &&
        (!observacionesUsuario ||
          typeof observacionesUsuario !==
            'string' ||
          !observacionesUsuario.trim())
      ) {
        res.status(400).json({
          mensaje:
            'Debes indicar las observaciones cuando no estás satisfecho.',
        });
        return;
      }

      const incidenciaActualizada =
        await cerrarIncidenciaPorUsuario(
          id,
          usuarioId,
          accion,
          observacionesUsuario,
        );

      res.status(200).json({
        mensaje:
          accion === 'satisfecho'
            ? 'La resolución fue aceptada. La incidencia permanecerá como RESUELTA durante 7 días.'
            : 'La incidencia fue devuelta al administrador con tus observaciones.',

        incidencia:
          serializarIncidencia(
            incidenciaActualizada,
          ),
      });
    } catch (error) {
      const mensaje =
        error instanceof Error
          ? error.message
          : 'No se pudo registrar la respuesta de la incidencia.';

      if (
        mensaje ===
        'Incidencia no encontrada.'
      ) {
        res.status(404).json({
          mensaje,
        });
        return;
      }

      if (
        mensaje ===
        'La incidencia no está disponible para respuesta.'
      ) {
        res.status(409).json({
          mensaje,
        });
        return;
      }

      if (
        mensaje ===
        'La incidencia ya tiene una respuesta registrada.'
      ) {
        res.status(409).json({
          mensaje,
        });
        return;
      }

      if (
        mensaje ===
        'Debes indicar las observaciones cuando no estás satisfecho.'
      ) {
        res.status(400).json({
          mensaje,
        });
        return;
      }

      console.error(
        'Error al registrar la respuesta de la incidencia:',
        error,
      );

      res.status(500).json({
        mensaje:
          'No se pudo registrar la respuesta de la incidencia.',
      });
    }
  };
