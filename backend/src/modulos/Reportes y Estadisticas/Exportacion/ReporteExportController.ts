import { Request, Response } from 'express';

import { ReporteService } from '../Generar reporte/ReporteService';
import { FormatoExportacion, ReporteExportService } from '../Generar reporte/ReporteExportService';
import { ReporteLecturaService } from '../Generar reporte/ReporteLecturaService';

const reporteService = new ReporteService();
const reporteLecturaService = new ReporteLecturaService();
const reporteExportService = new ReporteExportService();

export class ReporteExportController {
  async exportar(req: Request, res: Response): Promise<void> {
    try {
      const id = Number(req.params.id);
      const formato = req.query.formato;
      if (!Number.isInteger(id) || id <= 0) {
        res.status(400).json({ mensaje: 'El ID del reporte no es válido' });
        return;
      }
      if (formato !== 'pdf' && formato !== 'excel') {
        res.status(400).json({ mensaje: 'El formato debe ser pdf o excel' });
        return;
      }
      const reporte = await reporteService.obtenerPorId(id);
      if (!reporte) {
        res.status(404).json({ mensaje: 'Reporte no encontrado' });
        return;
      }
      const instantanea = await reporteLecturaService.obtenerInstantanea(id);
      const archivo = await reporteExportService.exportar(reporte, instantanea?.contenido ?? null, formato as FormatoExportacion);
      const nombre = `Reporte_${reporte.numeroReporte}_${reporte.fechaGeneracion.toISOString().slice(0, 10)}.${archivo.extension}`;
      res.setHeader('Content-Type', archivo.contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${nombre}"`);
      res.status(200).send(archivo.buffer);
    } catch (error) {
      const mensaje = error instanceof Error ? error.message : 'No fue posible exportar el reporte';
      console.error('Error al exportar reporte:', error);
      res.status(422).json({ mensaje });
    }
  }
}
