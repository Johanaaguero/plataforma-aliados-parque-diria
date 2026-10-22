import { Request, Response } from 'express';

import { ReportesReservasService } from './ReportesReservasService';

import {
  TipoActividad,
  Temporada,
} from '../../../../models/EventosCapacitaciones';

export class ReportesReservasController {
  private service =
    new ReportesReservasService();

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
        temporada,
        tipoActividad,
      } = req.query;

      /*
       * Validar temporada.
       */
      let temporadaValida:
        | Temporada
        | undefined;

      if (temporada) {
        if (
          temporada !== Temporada.SECA &&
          temporada !== Temporada.LLUVIOSA
        ) {
          return res.status(400).json({
            mensaje:
              'La temporada debe ser seca o lluviosa.',
          });
        }

        temporadaValida =
          temporada as Temporada;
      }

      /*
       * Validar tipo de actividad.
       */
      let tipoActividadValido:
        | TipoActividad
        | undefined;

      if (tipoActividad) {
        if (
          tipoActividad !==
            TipoActividad.EVENTO &&
          tipoActividad !==
            TipoActividad.CAPACITACION
        ) {
          return res.status(400).json({
            mensaje:
              'El tipo de actividad debe ser evento o capacitacion.',
          });
        }

        tipoActividadValido =
          tipoActividad as TipoActividad;
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

     const filtros: {
  fechaInicio?: string;
  fechaFin?: string;
  temporada?: Temporada;
  tipoActividad?: TipoActividad;
} = {};

if (typeof fechaInicio === 'string') {
  filtros.fechaInicio = fechaInicio;
}

if (typeof fechaFin === 'string') {
  filtros.fechaFin = fechaFin;
}

if (temporadaValida !== undefined) {
  filtros.temporada = temporadaValida;
}

if (tipoActividadValido !== undefined) {
  filtros.tipoActividad =
    tipoActividadValido;
}

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
        'Error obteniendo reporte de reservas:',
        error,
      );

      return res.status(500).json({
        mensaje:
          'Error al obtener el reporte de reservas.',
      });
    }
  }
}