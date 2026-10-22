import { Request, Response } from 'express';

import { ReportesIncidenciasService } from './ReportesIncidenciasService';

import {
  CategoriaIncidencia,
  PrioridadIncidencia,
  EstadoIncidencia,
} from '../../../models/Incidencia';

export class ReportesIncidenciasController {
  private service =
    new ReportesIncidenciasService();

  async obtenerEstadisticas(
    req: Request,
    res: Response,
  ) {
    try {
      /*
       * El middleware verificarTokenOpcional
       * coloca el usuario autenticado en req.usuario.
       */
      if (!req.usuario) {
        return res.status(401).json({
          mensaje:
            'Debe iniciar sesión para consultar reportes.',
        });
      }

      const {
        fechaInicio,
        fechaFin,
        categoria,
        prioridad,
        estado,
      } = req.query;

      /*
       * Validar categoría.
       */
      let categoriaValida:
        | CategoriaIncidencia
        | undefined;

      if (categoria) {
        if (
          !Object.values(
            CategoriaIncidencia,
          ).includes(
            categoria as CategoriaIncidencia,
          )
        ) {
          return res.status(400).json({
            mensaje:
              'La categoría de incidencia no es válida.',
          });
        }

        categoriaValida =
          categoria as CategoriaIncidencia;
      }

      /*
       * Validar prioridad.
       */
      let prioridadValida:
        | PrioridadIncidencia
        | undefined;

      if (prioridad) {
        if (
          !Object.values(
            PrioridadIncidencia,
          ).includes(
            prioridad as PrioridadIncidencia,
          )
        ) {
          return res.status(400).json({
            mensaje:
              'La prioridad de incidencia no es válida.',
          });
        }

        prioridadValida =
          prioridad as PrioridadIncidencia;
      }

      /*
       * Validar estado.
       */
      let estadoValido:
        | EstadoIncidencia
        | undefined;

      if (estado) {
        if (
          !Object.values(
            EstadoIncidencia,
          ).includes(
            estado as EstadoIncidencia,
          )
        ) {
          return res.status(400).json({
            mensaje:
              'El estado de incidencia no es válido.',
          });
        }

        estadoValido =
          estado as EstadoIncidencia;
      }

      /*
       * Validar fechas.
       */
      if (fechaInicio && fechaFin) {
        const inicio = new Date(
          `${fechaInicio}T00:00:00`,
        );

        const fin = new Date(
          `${fechaFin}T23:59:59`,
        );

        if (
          isNaN(inicio.getTime()) ||
          isNaN(fin.getTime())
        ) {
          return res.status(400).json({
            mensaje:
              'Las fechas proporcionadas no son válidas.',
          });
        }

        if (inicio > fin) {
          return res.status(400).json({
            mensaje:
              'La fecha inicial no puede ser mayor que la fecha final.',
          });
        }
      }

      /*
       * Construir filtros.
       */
      const filtros: {
        fechaInicio?: string;
        fechaFin?: string;
        categoria?: CategoriaIncidencia;
        prioridad?: PrioridadIncidencia;
        estado?: EstadoIncidencia;
      } = {};

      if (
        typeof fechaInicio === 'string'
      ) {
        filtros.fechaInicio =
          fechaInicio;
      }

      if (
        typeof fechaFin === 'string'
      ) {
        filtros.fechaFin =
          fechaFin;
      }

      if (
        categoriaValida !== undefined
      ) {
        filtros.categoria =
          categoriaValida;
      }

      if (
        prioridadValida !== undefined
      ) {
        filtros.prioridad =
          prioridadValida;
      }

      if (
        estadoValido !== undefined
      ) {
        filtros.estado =
          estadoValido;
      }

      /*
       * Obtener estadísticas.
       */
      const resultado =
        await this.service.obtenerEstadisticas(
          filtros,
          req.usuario.id,
        );

      return res.status(200).json(
        resultado,
      );
    } catch (error) {
      console.error(
        'Error obteniendo reporte de incidencias:',
        error,
      );

      return res.status(500).json({
        mensaje:
          'Error al obtener el reporte de incidencias.',
      });
    }
  }
}