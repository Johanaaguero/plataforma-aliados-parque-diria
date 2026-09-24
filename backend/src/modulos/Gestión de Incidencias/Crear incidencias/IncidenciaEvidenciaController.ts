import { Request, Response } from 'express';
import {crearEvidencia, obtenerEvidenciaPorId, } from './IncidenciaEvidenciaService';

import {
  TipoEvidenciaIncidencia,
} from '../../../models/IncidenciaEvidencia';

export const registrarEvidencia = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const incidenciaId = Number(req.params.id);

    if (
      Number.isNaN(incidenciaId) ||
      incidenciaId <= 0
    ) {
      res.status(400).json({
        mensaje: 'El ID de la incidencia no es válido.',
      });

      return;
    }

    const {
      archivo,
      tipoMime,
      nombreArchivo,
      tamanoBytes,
      tipo,
    } = req.body;

    // ============================================================
    // VALIDAR ARCHIVO
    // ============================================================

    if (
      archivo === undefined ||
      archivo === null ||
      typeof archivo !== 'string' ||
      archivo.trim() === ''
    ) {
      res.status(400).json({
        mensaje: 'El archivo es obligatorio.',
      });

      return;
    }

    // ============================================================
    // VALIDAR TIPO MIME
    // ============================================================

    if (
      tipoMime === undefined ||
      tipoMime === null ||
      typeof tipoMime !== 'string' ||
      tipoMime.trim() === ''
    ) {
      res.status(400).json({
        mensaje: 'El tipo MIME es obligatorio.',
      });

      return;
    }

    // ============================================================
    // VALIDAR TIPO DE EVIDENCIA
    // ============================================================

    if (
      !Object.values(TipoEvidenciaIncidencia).includes(
        tipo,
      )
    ) {
      res.status(400).json({
        mensaje:
          'El tipo de evidencia no es válido. Debe ser foto o video.',
      });

      return;
    }

    // ============================================================
    // VALIDAR NOMBRE
    // ============================================================

    if (
      nombreArchivo !== undefined &&
      nombreArchivo !== null &&
      typeof nombreArchivo !== 'string'
    ) {
      res.status(400).json({
        mensaje: 'El nombre del archivo no es válido.',
      });

      return;
    }

    // ============================================================
    // VALIDAR TAMAÑO
    // ============================================================

    if (
      tamanoBytes !== undefined &&
      tamanoBytes !== null
    ) {
      const tamano = Number(tamanoBytes);

      if (
        Number.isNaN(tamano) ||
        tamano < 0
      ) {
        res.status(400).json({
          mensaje: 'El tamaño del archivo no es válido.',
        });

        return;
      }
    }

    // ============================================================
    // CREAR EVIDENCIA
    // ============================================================

    const evidencia = await crearEvidencia(
      incidenciaId,
      {
        archivo,
        tipoMime: tipoMime.trim(),
        nombreArchivo:
          typeof nombreArchivo === 'string'
            ? nombreArchivo.trim()
            : null,
        tamanoBytes:
          tamanoBytes !== undefined &&
          tamanoBytes !== null
            ? Number(tamanoBytes)
            : null,
        tipo,
      },
    );

    // ============================================================
    // RESPUESTA
    // ============================================================

    res.status(201).json({
      mensaje: 'Evidencia registrada correctamente.',
      evidencia: {
        id: evidencia.id,
        incidenciaId: evidencia.incidenciaId,
        tipoMime: evidencia.tipoMime,
        nombreArchivo: evidencia.nombreArchivo,
        tamanoBytes: evidencia.tamanoBytes,
        tipo: evidencia.tipo,
        fechaCreacion: evidencia.fechaCreacion,
      },
    });
  } catch (error) {
    console.error(
      'Error al registrar evidencia:',
      error,
    );

    const mensaje =
      error instanceof Error
        ? error.message
        : 'No se pudo registrar la evidencia.';

    if (mensaje === 'La incidencia no existe.') {
      res.status(404).json({
        mensaje,
      });

      return;
    }

    res.status(500).json({
      mensaje: 'No se pudo registrar la evidencia.',
    });
  }
};

export const obtenerArchivoEvidencia = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const id = Number(req.params.id);

    if (Number.isNaN(id) || id <= 0) {
      res.status(400).json({
        mensaje: 'El ID de la evidencia no es válido.',
      });
      return;
    }

    const evidencia = await obtenerEvidenciaPorId(id);

    res.set('Content-Type', evidencia.tipoMime);
    res.send(evidencia.archivo);
  } catch (error) {
    console.error('Error al obtener el archivo de evidencia:', error);

    const mensaje =
      error instanceof Error
        ? error.message
        : 'No se pudo obtener el archivo.';

    if (mensaje === 'La evidencia no existe.') {
      res.status(404).json({ mensaje });
      return;
    }

    res.status(500).json({ mensaje: 'No se pudo obtener el archivo.' });
  }
};