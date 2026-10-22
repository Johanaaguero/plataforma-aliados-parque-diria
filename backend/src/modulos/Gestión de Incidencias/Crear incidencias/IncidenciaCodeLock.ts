const NOMBRE_BLOQUEO_CODIGO_INCIDENCIA =
  'parque_diria_incidencia_codigo';
const TIEMPO_ESPERA_BLOQUEO_SEGUNDOS = 15;

export interface ConexionBloqueoCodigo<M> {
  manager: M;
  connect(): Promise<unknown>;
  query<T = unknown>(sql: string, parametros?: unknown[]): Promise<T>;
  release(): Promise<unknown>;
}

export class BloqueoCodigoIncidenciaNoDisponible extends Error {
  constructor() {
    super('No fue posible reservar un código de incidencia. Inténtalo nuevamente.');
    this.name = 'BloqueoCodigoIncidenciaNoDisponible';
  }
}

export const ejecutarConBloqueoCodigoIncidencia = async <M, T>(
  crearConexion: () => ConexionBloqueoCodigo<M>,
  operacion: (manager: M) => Promise<T>,
): Promise<T> => {
  const conexion = crearConexion();
  let conectada = false;
  let bloqueoAdquirido = false;

  try {
    await conexion.connect();
    conectada = true;

    const resultado = await conexion.query<
      Array<{ bloqueo_adquirido: number | string | null }>
    >(
      'SELECT GET_LOCK(?, ?) AS bloqueo_adquirido',
      [
        NOMBRE_BLOQUEO_CODIGO_INCIDENCIA,
        TIEMPO_ESPERA_BLOQUEO_SEGUNDOS,
      ],
    );
    bloqueoAdquirido =
      Number(resultado[0]?.bloqueo_adquirido) === 1;

    if (!bloqueoAdquirido) {
      throw new BloqueoCodigoIncidenciaNoDisponible();
    }

    return await operacion(conexion.manager);
  } finally {
    try {
      if (conectada && bloqueoAdquirido) {
        await conexion.query(
          'SELECT RELEASE_LOCK(?) AS bloqueo_liberado',
          [NOMBRE_BLOQUEO_CODIGO_INCIDENCIA],
        );
      }
    } finally {
      if (conectada) {
        await conexion.release();
      }
    }
  }
};
