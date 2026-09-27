import { Request, Response } from 'express';

import { ReporteService } from '../../Reportes y Estadisticas/Generar reporte/ReporteService';
import { TipoReporte } from '../../../models/Reporte';

const reporteService = new ReporteService();

export class ReporteController {

  async obtenerTodos(req: Request, res: Response): Promise<void> {
    try {

      const reportes = await reporteService.obtenerTodos();

      res.status(200).json(reportes);

    } catch (error) {

      console.error('Error al obtener reportes:', error);

      res.status(500).json({
        mensaje: 'Error al obtener los reportes',
      });
    }
  }

  async obtenerPorId(req: Request, res: Response): Promise<void> {
    try {

      const id = Number(req.params.id);

      if (isNaN(id)) {
        res.status(400).json({
          mensaje: 'El ID del reporte no es válido',
        });
        return;
      }

      const reporte = await reporteService.obtenerPorId(id);

      if (!reporte) {
        res.status(404).json({
          mensaje: 'Reporte no encontrado',
        });
        return;
      }

      res.status(200).json(reporte);

    } catch (error) {

      console.error('Error al obtener reporte:', error);

      res.status(500).json({
        mensaje: 'Error al obtener el reporte',
      });
    }
  }

  async crear(req: Request, res: Response): Promise<void> {
    try {

      const { tipoReporte, usuarioGeneroId } = req.body;

      if (!tipoReporte) {
        res.status(400).json({
          mensaje: 'El tipo de reporte es obligatorio',
        });
        return;
      }

      if (!Object.values(TipoReporte).includes(tipoReporte)) {
        res.status(400).json({
          mensaje: 'El tipo de reporte no es válido',
        });
        return;
      }

      if (!usuarioGeneroId) {
        res.status(400).json({
          mensaje: 'El administrador que genera el reporte es obligatorio',
        });
        return;
      }

      const reporte = await reporteService.crear(
        tipoReporte,
        Number(usuarioGeneroId),
      );

      res.status(201).json({
        mensaje: 'Reporte creado correctamente',
        reporte,
      });

    } catch (error) {

      console.error('Error al crear reporte:', error);

      res.status(500).json({
        mensaje: 'Error al crear el reporte',
      });
    }
  }

  async eliminar(req: Request, res: Response): Promise<void> {
    try {

      const id = Number(req.params.id);

      if (isNaN(id)) {
        res.status(400).json({
          mensaje: 'El ID del reporte no es válido',
        });
        return;
      }

      const eliminado = await reporteService.eliminar(id);

      if (!eliminado) {
        res.status(404).json({
          mensaje: 'Reporte no encontrado',
        });
        return;
      }

      res.status(200).json({
        mensaje: 'Reporte eliminado correctamente',
      });

    } catch (error) {

      console.error('Error al eliminar reporte:', error);

      res.status(500).json({
        mensaje: 'Error al eliminar el reporte',
      });
    }
  }
}