import { LessThanOrEqual } from 'typeorm';

import { AppDataSource } from '../../../data-source';

import { Incidencia, EstadoIncidencia } from '../../../models/Incidencia';
import { IncidenciaHistorial } from '../../../models/IncidenciaHistorial';

const INTERVALO_LIMPIEZA_MS = 60 * 60 * 1000; // 1 hora

export async function procesarCierresAutomaticos(): Promise<number> {
  return await AppDataSource.transaction(async (manager) => {
    const incidenciaRepo = manager.getRepository(Incidencia);
    const historialRepo = manager.getRepository(IncidenciaHistorial);

    const ahora = new Date();
    let incidenciasCerradas = 0;

    // ============================================================
    // 1. CERRAR INCIDENCIAS SIN RESPUESTA DESPUÉS DE 5 DÍAS
    // ============================================================

    const incidenciasSinRespuesta = await incidenciaRepo.find({
      where: {
        estado: EstadoIncidencia.EN_REVISION,
        conformidadUsuario: 'pendiente',
        fechaLimiteRespuesta: LessThanOrEqual(ahora),
      },
    });

    

    for (const incidencia of incidenciasSinRespuesta) {
      const estadoAnterior = incidencia.estado;
      const conformidadAnterior = incidencia.conformidadUsuario;

      incidencia.conformidadUsuario = 'sin_respuesta';
      incidencia.estado = EstadoIncidencia.CERRADA;
      incidencia.fechaActualizacion = ahora;

      const incidenciaActualizada =
        await incidenciaRepo.save(incidencia);

      await historialRepo.save([
        historialRepo.create({
          incidencia: incidenciaActualizada,
          incidenciaId: incidenciaActualizada.id,
          usuario: null,
          usuarioId: null,
          campoModificado: 'conformidad_usuario',
          valorAnterior: conformidadAnterior,
          valorNuevo: incidenciaActualizada.conformidadUsuario,
        }),

        historialRepo.create({
          incidencia: incidenciaActualizada,
          incidenciaId: incidenciaActualizada.id,
          usuario: null,
          usuarioId: null,
          campoModificado: 'estado',
          valorAnterior: estadoAnterior,
          valorNuevo: incidenciaActualizada.estado,
        }),
      ]);

      incidenciasCerradas++;
    }

    // ============================================================
    // 2. CERRAR INCIDENCIAS RESUELTAS DESPUÉS DE 7 DÍAS
    // ============================================================

    const incidenciasResueltas = await incidenciaRepo.find({
      where: {
        estado: EstadoIncidencia.RESUELTA,
        conformidadUsuario: 'satisfecho',
        fechaCierreProgramado: LessThanOrEqual(ahora),
      },
    });

    for (const incidencia of incidenciasResueltas) {
      const estadoAnterior = incidencia.estado;

      incidencia.estado = EstadoIncidencia.CERRADA;
      incidencia.fechaActualizacion = ahora;

      const incidenciaActualizada =
        await incidenciaRepo.save(incidencia);

      await historialRepo.save(
        historialRepo.create({
          incidencia: incidenciaActualizada,
          incidenciaId: incidenciaActualizada.id,
          usuario: null,
          usuarioId: null,
          campoModificado: 'estado',
          valorAnterior: estadoAnterior,
          valorNuevo: incidenciaActualizada.estado,
        }),
      );

      incidenciasCerradas++;
    }

    return incidenciasCerradas;
  });
}

export function iniciarLimpiezaIncidencias(): void {
  const ejecutarLimpieza = () => {
    void procesarCierresAutomaticos()
      .then((cantidad) => {
        if (cantidad > 0) {
          console.log(
            `Cierre automático de incidencias completado: ${cantidad} incidencia(s) cerrada(s).`,
          );
        }
      })
      .catch((error) => {
        console.error(
          'No se pudo completar el cierre automático de incidencias:',
          error,
        );
      });
  };

  ejecutarLimpieza();

  const intervalo = setInterval(
    ejecutarLimpieza,
    INTERVALO_LIMPIEZA_MS,
  );

  intervalo.unref();

  console.log(
    `Limpieza automática de incidencias iniciada (cada ${
      INTERVALO_LIMPIEZA_MS / 1000 / 60
    } minutos).`,
  );
}