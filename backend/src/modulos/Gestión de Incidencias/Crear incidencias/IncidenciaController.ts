import { Request, Response } from 'express';

import {
  crearIncidencia,
  obtenerIncidencias,
} from '../Crear incidencias/IncidenciaService';

import {
  CategoriaIncidencia,
} from '../../../models/Incidencia';

/**
 * Registrar una incidencia.
 *
 * Puede registrar:
 * - Un usuario autenticado.
 * - Una persona sin iniciar sesión.
 *
 * Si el usuario está autenticado puede decidir
 * si desea reportar de forma anónima.
 *
 * Si no está autenticado, el reporte siempre será anónimo.
 */
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
    } = req.body;

    // ============================================================
    // DETERMINAR SI EL REPORTE ES ANÓNIMO
    // ============================================================

    const usuarioAutenticado = req.usuario?.id ?? null;

    /*
     * Si no hay usuario autenticado:
     *    → siempre será anónimo.
     *
     * Si hay usuario autenticado:
     *    → puede elegir esAnonimo = true.
     *
     * Si esAnonimo = false:
     *    → se guarda el ID del usuario.
     */
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

    if (!Object.values(CategoriaIncidencia).includes(categoria)) {
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
        mensaje: 'La ubicación no puede tener más de 255 caracteres.',
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
        mensaje: 'La latitud y longitud deben enviarse juntas.',
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

usuarioReportaId: usuarioReporta,    });

    // ============================================================
    // RESPUESTA
    // ============================================================

    res.status(201).json({
      mensaje:
        usuarioReporta === null
          ? 'Incidencia registrada de forma anónima correctamente.'
          : 'Incidencia registrada correctamente.',

      incidencia,
    });
  } catch (error) {
    console.error('Error al registrar incidencia:', error);

    res.status(500).json({
      mensaje: 'No se pudo registrar la incidencia.',
    });
  }
};

/**
 * Obtener todas las incidencias.
 *
 * Esta operación es pública.
 * Cualquier persona puede consultar las incidencias,
 * tenga o no una cuenta.
 */
export const listarIncidencias = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const incidencias = await obtenerIncidencias();

    res.status(200).json({
      mensaje: 'Incidencias obtenidas correctamente.',
      incidencias,
    });
  } catch (error) {
    console.error('Error al obtener incidencias:', error);

    res.status(500).json({
      mensaje: 'No se pudieron obtener las incidencias.',
    });
  }
};