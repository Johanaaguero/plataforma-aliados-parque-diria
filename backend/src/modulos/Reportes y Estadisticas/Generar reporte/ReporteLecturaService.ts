import { AppDataSource } from '../../../data-source';
import { Reporte } from '../../../models/Reporte';

export interface InstantaneaReporteLectura {
  contenido: Record<string, unknown> | null;
  usuarioCreador: string | null;
}

/** Consulta de solo lectura para los metadatos y datos de exportación. */
export class ReporteLecturaService {
  private readonly reporteRepository = AppDataSource.getRepository(Reporte);

  async obtenerInstantanea(id: number): Promise<InstantaneaReporteLectura | null> {
    const fila = await this.reporteRepository
      .createQueryBuilder('reporte')
      .leftJoin('reporte.usuarioGenero', 'usuario')
      .select('reporte.contenido', 'contenido')
      .addSelect('usuario.nombre_usuario', 'usuarioCreador')
      .where('reporte.id = :id', { id })
      .getRawOne<{ contenido: Record<string, unknown> | string | null; usuarioCreador: string | null }>();

    if (!fila) return null;
    return {
      contenido: typeof fila.contenido === 'string'
        ? JSON.parse(fila.contenido) as Record<string, unknown>
        : fila.contenido,
      usuarioCreador: fila.usuarioCreador,
    };
  }
}
