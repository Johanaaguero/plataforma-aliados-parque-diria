import jwt from 'jsonwebtoken';
import { AppDataSource } from '../../../data-source';
import { SesionActiva } from '../../../models/SesionActiva';

// Inactividad máxima (sin llamadas a la API) antes de liberar la sesión.
export const MINUTOS_INACTIVIDAD = 30;

// Si el navegador no avisa en este tiempo, se considera que la pestaña se cerró.
// El navegador envía un latido cada ~25 s; se deja margen porque Chrome
// limita los temporizadores de pestañas en segundo plano a 1 por minuto.
export const SEGUNDOS_SIN_LATIDO = 150;

// Tiempo que se espera tras el aviso de "me estoy cerrando" para ver si
// la página nueva (un refresh) reanuda la sesión.
export const SEGUNDOS_GRACIA_CIERRE = 15;

interface TokenSesion {
  id: number;
  jti: string;
}

export interface ResultadoSesion {
  ok: boolean;
  status: number;
  code?: string;
  message?: string;
}

/**
 * Regla única para decidir si una sesión sigue ocupando la cuenta.
 * La usa el login para decidir si rechaza el ingreso o reemplaza la sesión.
 */
export const sesionVigente = (
  sesion: SesionActiva,
  ahora: Date = new Date(),
): boolean => {
  const ahoraMs = ahora.getTime();

  if (sesion.expiraEn.getTime() <= ahoraMs) return false;

  if (
    sesion.ultimaActividad.getTime() <=
    ahoraMs - MINUTOS_INACTIVIDAD * 60 * 1000
  ) {
    return false;
  }

  // La pestaña avisó que se cerraba y nadie reanudó la sesión a tiempo.
  if (
    sesion.cierrePendienteHasta &&
    sesion.cierrePendienteHasta.getTime() <= ahoraMs
  ) {
    return false;
  }

  // Sesiones creadas antes de este cambio no tienen latido: se usa la
  // última actividad. Una petición normal también prueba que sigue viva.
  const ultimaSenal = Math.max(
    sesion.ultimoLatido?.getTime() ?? 0,
    sesion.ultimaActividad.getTime(),
  );

  return ultimaSenal > ahoraMs - SEGUNDOS_SIN_LATIDO * 1000;
};

const leerToken = (token: string): TokenSesion | null => {
  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET as string,
    ) as unknown as Partial<TokenSesion>;

    if (!decoded.id || !decoded.jti) return null;

    return { id: decoded.id, jti: decoded.jti };
  } catch {
    return null;
  }
};

const sesionInvalida: ResultadoSesion = {
  ok: false,
  status: 401,
  code: 'SESSION_INVALIDATED',
  message: 'Esta sesión ya no está activa. Inicia sesión nuevamente.',
};

/**
 * El navegador avisa que la pestaña sigue abierta.
 * No cuenta como actividad del usuario: no modifica ultimaActividad,
 * así el cierre por inactividad de 30 minutos sigue funcionando igual.
 */
export const registrarLatido = async (
  token: string,
): Promise<ResultadoSesion> => {
  const decoded = leerToken(token);

  if (!decoded) {
    return {
      ok: false,
      status: 401,
      code: 'INVALID_TOKEN',
      message: 'No se pudo validar la sesión o el token es inválido',
    };
  }

  const repo = AppDataSource.getRepository(SesionActiva);
  const sesion = await repo.findOne({ where: { usuarioId: decoded.id } });

  if (!sesion || sesion.jti !== decoded.jti) return sesionInvalida;

  const ahora = new Date();

  if (sesion.expiraEn <= ahora) {
    await repo.delete({ id: sesion.id });

    return {
      ok: false,
      status: 401,
      code: 'TOKEN_EXPIRED',
      message: 'La sesión ha expirado. Inicia sesión nuevamente.',
    };
  }

  sesion.ultimoLatido = ahora;
  sesion.cierrePendienteHasta = null; // si venía de un refresh, se reanuda
  await repo.save(sesion);

  return { ok: true, status: 204 };
};

/**
 * La página avisa que se está descargando (cerrar pestaña o refrescar).
 * No cierra la sesión: abre una ventana de gracia. Si una página nueva
 * envía un latido dentro de ese plazo, la sesión continúa (refresh);
 * si no, queda libre para volver a iniciar sesión (cierre real).
 */
export const marcarCierrePendiente = async (
  token: string,
): Promise<ResultadoSesion> => {
  const decoded = leerToken(token);

  if (!decoded) return sesionInvalida;

  const repo = AppDataSource.getRepository(SesionActiva);
  const sesion = await repo.findOne({ where: { usuarioId: decoded.id } });

  if (!sesion || sesion.jti !== decoded.jti) return sesionInvalida;

  sesion.cierrePendienteHasta = new Date(
    Date.now() + SEGUNDOS_GRACIA_CIERRE * 1000,
  );
  await repo.save(sesion);

  return { ok: true, status: 204 };
};
