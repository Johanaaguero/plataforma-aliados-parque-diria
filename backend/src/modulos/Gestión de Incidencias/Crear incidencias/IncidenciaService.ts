import { AppDataSource } from '../../../data-source';

import {
  Incidencia,
  CategoriaIncidencia,
  PrioridadIncidencia,
  EstadoIncidencia,
} from '../../../models/Incidencia';

import { Usuario } from '../../../models/Usuario';
import { Between, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';
const incidenciaRepository = AppDataSource.getRepository(Incidencia);
const usuarioRepository = AppDataSource.getRepository(Usuario);

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

  ubicacion?: string | null;
  latitud?: number | null;
  longitud?: number | null;

  /**
   * ID del usuario que reporta.
   * Si es null o undefined, el reporte es anónimo.
   */
  usuarioReportaId?: number | null;
}

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
  categoria?: CategoriaIncidencia;
  prioridad?: PrioridadIncidencia;
  estado?: EstadoIncidencia;
  fechaDesde?: Date;
  fechaHasta?: Date;
}

/**
 * Crear una nueva incidencia.
 */
export const crearIncidencia = async (
  datos: CrearIncidenciaDTO,
): Promise<Incidencia> => {
  const prioridad = determinarPrioridad(datos.categoria);

  let usuarioReporta: Usuario | null = null;

  if (datos.usuarioReportaId !== undefined && datos.usuarioReportaId !== null) {
    usuarioReporta = await usuarioRepository.findOne({
      where: {
        id: datos.usuarioReportaId,
      },
    });

    if (!usuarioReporta) {
      throw new Error('El usuario que reporta no existe.');
    }
  }
  

  const incidencia = incidenciaRepository.create({
    titulo: datos.titulo.trim(),
    descripcion: datos.descripcion.trim(),
    categoria: datos.categoria,
    prioridad,
    estado: EstadoIncidencia.PENDIENTE,
    usuarioReporta,
    ubicacion: datos.ubicacion?.trim() || null,
    latitud: datos.latitud ?? null,
    longitud: datos.longitud ?? null,
    observacionesAdmin: null,
    fechaResolucion: null,
  });

  return await incidenciaRepository.save(incidencia);
};

/**
 * Obtener todas las incidencias.
 */
export const obtenerIncidencias = async (
  filtros?: FiltrosIncidenciaDTO,
): Promise<Incidencia[]> => {
  const where: Record<string, unknown> = {};

  if (filtros?.categoria) where.categoria = filtros.categoria;
  if (filtros?.prioridad) where.prioridad = filtros.prioridad;
  if (filtros?.estado) where.estado = filtros.estado;

  if (filtros?.fechaDesde && filtros?.fechaHasta) {
    where.fechaRegistro = Between(filtros.fechaDesde, filtros.fechaHasta);
  } else if (filtros?.fechaDesde) {
    where.fechaRegistro = MoreThanOrEqual(filtros.fechaDesde);
  } else if (filtros?.fechaHasta) {
    where.fechaRegistro = LessThanOrEqual(filtros.fechaHasta);
  }

  return await incidenciaRepository.find({
    where,
    relations: {
      usuarioReporta: true,
      adminActualiza: true,
      evidencias: true,
    },
    order: { fechaRegistro: 'DESC' },
  });
};

/**
 * Obtener una incidencia por ID.
 */
export const obtenerIncidenciaPorId = async (
  id: number,
): Promise<Incidencia> => {
  const incidencia = await incidenciaRepository.findOne({
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
    throw new Error('Incidencia no encontrada.');
  }

  return incidencia;
};

/**
 * Actualizar los datos de una incidencia.
 */
export const actualizarIncidencia = async (
  id: number,
  datos: ActualizarIncidenciaDTO,
): Promise<Incidencia> => {
  const incidencia = await incidenciaRepository.findOne({
    where: {
      id,
    },
  });

  if (!incidencia) {
    throw new Error('Incidencia no encontrada.');
  }

  if (datos.titulo !== undefined) {
    incidencia.titulo = datos.titulo.trim();
  }

  if (datos.descripcion !== undefined) {
    incidencia.descripcion = datos.descripcion.trim();
  }

  if (datos.categoria !== undefined) {
    incidencia.categoria = datos.categoria;

    // La prioridad se vuelve a calcular
    // si cambia la categoría.
    incidencia.prioridad = determinarPrioridad(datos.categoria);
  }

  if (datos.ubicacion !== undefined) {
    incidencia.ubicacion = datos.ubicacion?.trim() || null;
  }

  if (datos.latitud !== undefined) {
    incidencia.latitud = datos.latitud;
  }

  if (datos.longitud !== undefined) {
    incidencia.longitud = datos.longitud;
  }

  return await incidenciaRepository.save(incidencia);
};

/**
 * Cambiar el estado de una incidencia.
 */
export const cambiarEstadoIncidencia = async (
  id: number,
  datos: CambiarEstadoIncidenciaDTO,
): Promise<Incidencia> => {
  const incidencia = await incidenciaRepository.findOne({
    where: {
      id,
    },
  });

  if (!incidencia) {
    throw new Error('Incidencia no encontrada.');
  }

  const administrador = await usuarioRepository.findOne({
    where: {
      id: datos.adminId,
    },
  });

  if (!administrador) {
    throw new Error('El administrador no existe.');
  }

  incidencia.estado = datos.estado;
  incidencia.adminActualiza = administrador;

  if (datos.observacionesAdmin !== undefined) {
    incidencia.observacionesAdmin =
      datos.observacionesAdmin?.trim() || null;
  }

  /**
   * Si la incidencia pasa a resuelta o cerrada,
   * se registra la fecha de resolución.
   */
  if (
    datos.estado === EstadoIncidencia.RESUELTA ||
    datos.estado === EstadoIncidencia.CERRADA
  ) {
    incidencia.fechaResolucion = new Date();
  } else {
    incidencia.fechaResolucion = null;
  }

  return await incidenciaRepository.save(incidencia);
};

/**
 * Eliminar una incidencia.
 */
export const eliminarIncidencia = async (
  id: number,
): Promise<void> => {
  const incidencia = await incidenciaRepository.findOne({
    where: {
      id,
    },
  });

  if (!incidencia) {
    throw new Error('Incidencia no encontrada.');
  }

  await incidenciaRepository.remove(incidencia);
};