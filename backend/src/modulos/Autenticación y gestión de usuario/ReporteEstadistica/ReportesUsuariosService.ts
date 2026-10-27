import { AppDataSource } from '../../../data-source';

import { Usuario } from '../../../models/Usuario';

import {
  Reporte,
  TipoReporte,
} from '../../../models/Reporte';

function eliminarDuplicadosPorId<T extends { id: unknown }>(
  registros: T[],
): T[] {
  const ids = new Set<string>();

  return registros.filter((registro) => {
    const id = String(registro.id);

    if (ids.has(id)) {
      return false;
    }

    ids.add(id);
    return true;
  });
}

export class ReportesUsuariosService {
  private usuarioRepository =
    AppDataSource.getRepository(Usuario);

  private reporteRepository =
    AppDataSource.getRepository(Reporte);

  async obtenerEstadisticasUsuarios(
    periodo: string,
    fechaInicio?: string,
    fechaFin?: string,
    usuarioGeneroId?: number,
  ) {
    const query =
      this.usuarioRepository
        .createQueryBuilder('usuario')
        .leftJoinAndSelect(
          'usuario.rol',
          'rol',
        );

    /*
     * FILTRO POR FECHA
     */

    if (periodo === 'hoy') {
      query.andWhere(
        'DATE(usuario.created_at) = CURDATE()',
      );
    }

    if (periodo === '7dias') {
      query.andWhere(
        'usuario.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)',
      );
    }

    if (periodo === '30dias') {
      query.andWhere(
        'usuario.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)',
      );
    }

    if (periodo === 'mes') {
      query.andWhere(
        'YEAR(usuario.created_at) = YEAR(CURDATE())',
      );

      query.andWhere(
        'MONTH(usuario.created_at) = MONTH(CURDATE())',
      );
    }

    if (
      periodo === 'personalizado' &&
      fechaInicio &&
      fechaFin
    ) {
      query.andWhere(
        'DATE(usuario.created_at) BETWEEN :fechaInicio AND :fechaFin',
        {
          fechaInicio,
          fechaFin,
        },
      );
    }

    /*
     * OBTENER USUARIOS
     */

    const usuarios =
      eliminarDuplicadosPorId(
        await query.getMany(),
      );

    /*
     * ESTADÍSTICAS GENERALES
     */

    const total = usuarios.length;

    const administradores =
      usuarios.filter(
        (usuario) =>
          usuario.rol?.nombre ===
          'administrador',
      ).length;

    const asociados =
      usuarios.filter(
        (usuario) =>
          usuario.rol?.nombre ===
          'asociado',
      ).length;

    const visitantes =
      usuarios.filter(
        (usuario) =>
          usuario.rol?.nombre ===
          'visitante',
      ).length;

    const superAdmins =
      usuarios.filter(
        (usuario) =>
          usuario.rol?.nombre ===
          'super_admin',
      ).length;

    /*
     * REGISTROS POR MES
     */

    const registrosPorMesMap =
      new Map<string, number>();

    usuarios.forEach((usuario) => {
      const fecha =
        usuario.createdAt;

      const claveMes =
        `${fecha.getFullYear()}-${String(
          fecha.getMonth() + 1,
        ).padStart(2, '0')}`;

      const cantidad =
        registrosPorMesMap.get(
          claveMes,
        ) ?? 0;

      registrosPorMesMap.set(
        claveMes,
        cantidad + 1,
      );
    });

    const registrosPorMes =
      Array.from(
        registrosPorMesMap.entries(),
      )
        .map(([mes, cantidad]) => ({
          mes,
          cantidad,
        }))
        .sort((a, b) =>
          a.mes.localeCompare(b.mes),
        );

    /*
     * MES CON MÁS REGISTROS
     */

    const mesConMasRegistros =
      registrosPorMes.length > 0
        ? registrosPorMes.reduce(
            (mayor, actual) =>
              actual.cantidad >
              mayor.cantidad
                ? actual
                : mayor,
          )
        : null;

    /*
     * GUARDAR REPORTE GENERADO
     */

    
    // GUARDAR REPORTE GENERADO
    let reporteGenerado: Reporte | null = null;

    if (usuarioGeneroId) {
      const reportes =
        await this.reporteRepository.find({
          order: {
            id: 'DESC',
          },
          take: 1,
        });

      const ultimoReporte = reportes[0];

      const siguienteNumero =
        (ultimoReporte?.id ?? 0) + 1;

      const numeroReporte =
        `REP-${String(
          siguienteNumero,
        ).padStart(6, '0')}`;

      const reporte =
        this.reporteRepository.create({
          numeroReporte,
          tipoReporte: TipoReporte.USUARIOS,
          usuarioGenero: {
            id: usuarioGeneroId,
          } as Usuario,
        });

      await this.reporteRepository.save(reporte);

      reporteGenerado = reporte;
    }


    /*
     * RESPUESTA
     */

    return {
      informacionGeneral: {
        nombre: 'Reporte de usuarios',
        tipo: TipoReporte.USUARIOS,
        periodo,
        filtros: {
          fechaInicio:
            fechaInicio ?? null,
          fechaFin:
            fechaFin ?? null,
        },
        fechaGeneracion:
          reporteGenerado?.fechaGeneracion ??
          null,
        numeroReporte:
          reporteGenerado?.numeroReporte ??
          null,
      },

      periodo,

      fechaInicio:
        fechaInicio ?? null,

      fechaFin:
        fechaFin ?? null,

      total,

      administradores,

      asociados,

      visitantes,

      superAdmins,

      registrosPorMes,

      mesConMasRegistros,

      usuarios: usuarios.map(
        (usuario) => ({
          id: usuario.id,
          nombreUsuario:
            usuario.nombreUsuario,
          nombre:
            usuario.nombre,
          apellidos:
            usuario.apellidos,
          correo:
            usuario.correo,
          rol:
            usuario.rol?.nombre ??
            'Sin rol',
          fechaRegistro:
            usuario.createdAt,
        }),
      ),
    };
  }
}
