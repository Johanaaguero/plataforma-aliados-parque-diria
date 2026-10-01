import { AppDataSource } from '../../../data-source';
import { Reporte, TipoReporte } from '../../../models/Reporte';

const reporteRepository = AppDataSource.getRepository(Reporte);

export class ReporteService {

  async obtenerTodos(): Promise<Reporte[]> {
    return await reporteRepository.find({
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
      where: { id },
      relations: {
        usuarioGenero: true,
      },
    });
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
