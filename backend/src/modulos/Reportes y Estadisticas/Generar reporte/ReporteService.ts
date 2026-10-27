import { AppDataSource } from '../../../data-source';
import { Reporte, TipoReporte } from '../../../models/Reporte';

const reporteRepository = AppDataSource.getRepository(Reporte);

export class ReporteService {

 async obtenerTodos(): Promise<Reporte[]> {
  return await reporteRepository.find({
    select: {
      id: true,
      numeroReporte: true,
      tipoReporte: true,
      fechaGeneracion: true,
      usuarioGeneroId: true,
      usuarioGenero: {
        id: true,
        nombreUsuario: true,
        nombre: true,
        apellidos: true,
      },
    },
    relations: {
      usuarioGenero: true,
    },
    order: {
      fechaGeneracion: 'DESC',
    },
  });
}

async obtenerPorId(id: number): Promise<Reporte | null> {
  return await reporteRepository.findOne({
    select: {
      id: true,
      numeroReporte: true,
      tipoReporte: true,
      fechaGeneracion: true,
      usuarioGeneroId: true,
      usuarioGenero: {
        id: true,
        nombreUsuario: true,
        nombre: true,
        apellidos: true,
      },
    },
    where: { id },
    relations: {
      usuarioGenero: true,
    },
  });
}

  /**
   * La exportación solo necesita los metadatos del reporte. No se cargan
   * usuarioGenero ni su rol eager: esa combinación añadía joins y aliases
   * duplicados en MySQL durante la exportación.
   */
  async obtenerParaExportar(id: number): Promise<Reporte | null> {
    return reporteRepository
      .createQueryBuilder('reporte')
      .select([
        'reporte.id',
        'reporte.numeroReporte',
        'reporte.tipoReporte',
        'reporte.fechaGeneracion',
        'reporte.usuarioGeneroId',
      ])
      .where('reporte.id = :id', { id })
      .getOne();
  }

  async crear(
    tipoReporte: TipoReporte,
    usuarioGeneroId: number,
    contenido?: Record<string, unknown>,
  ): Promise<Reporte> {

    const fecha = new Date();

    const fechaCodigo =
      `${fecha.getFullYear()}${String(fecha.getMonth() + 1).padStart(2, '0')}${String(fecha.getDate()).padStart(2, '0')}`;

    const ultimoReporte = await reporteRepository.findOne({
      where: {},
      order: {
        id: 'DESC',
      },
    });

    const siguienteNumero = (ultimoReporte?.id ?? 0) + 1;

    const numeroReporte =
      `REP-${fechaCodigo}-${String(siguienteNumero).padStart(6, '0')}`;

    const reporte = new Reporte({
      numeroReporte,
      tipoReporte,
      usuarioGeneroId,
      contenido: contenido ?? null,
    });

    return await reporteRepository.save(reporte);
  }

  async eliminar(id: number): Promise<boolean> {

    const reporte = await reporteRepository.findOne({
      where: { id },
    });

    if (!reporte) {
      return false;
    }

    await reporteRepository.remove(reporte);

    return true;
  }
}
