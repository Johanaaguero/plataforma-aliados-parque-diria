import type { QueryRunner } from 'typeorm';
import { AppDataSource } from '../../../data-source';

interface ResultadoBloqueo {
  adquirido: number | null;
}

interface ResultadoLiberacion {
  liberado: number | null;
}

export async function conBloqueoNotificacionEvento<T>(
  eventoId: number,
  operacion: () => Promise<T>,
  crearQueryRunner: () => QueryRunner = () =>
    AppDataSource.createQueryRunner(),
): Promise<T> {
  const queryRunner = crearQueryRunner();
  const nombreBloqueo = `notificacion_evento:${eventoId}`;
  let bloqueoAdquirido = false;

  await queryRunner.connect();

  try {
    const resultado = (await queryRunner.query(
      'SELECT GET_LOCK(?, 15) AS adquirido',
      [nombreBloqueo],
    )) as ResultadoBloqueo[];

    if (Number(resultado[0]?.adquirido) !== 1) {
      throw new Error(
        'No se pudo asegurar la publicación de notificaciones del evento.',
      );
    }

    bloqueoAdquirido = true;
    return await operacion();
  } finally {
    try {
      if (bloqueoAdquirido) {
        const resultado = (await queryRunner.query(
          'SELECT RELEASE_LOCK(?) AS liberado',
          [nombreBloqueo],
        )) as ResultadoLiberacion[];

        if (Number(resultado[0]?.liberado) !== 1) {
          throw new Error(
            'No se pudo liberar el bloqueo de notificaciones del evento.',
          );
        }
      }
    } finally {
      await queryRunner.release();
    }
  }
}
