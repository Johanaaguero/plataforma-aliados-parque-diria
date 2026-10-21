import { notificarErrorAuth } from './api';

export type TipoNotificacion =
  | 'nuevo_evento'
  | 'nueva_capacitacion'
  | 'nuevo_emprendimiento'
  | 'nuevo_comunicado'
  | 'reserva_realizada'
  | 'nueva_reserva_admin'
  | 'reserva_aprobada'
  | 'reserva_rechazada'
  | 'nueva_incidencia'
  | 'seguimiento_incidencia'
  | 'incidencia_compartida';

export interface Notificacion {
  id: number;
  usuarioId: number;
  tipo: TipoNotificacion;
  titulo: string;
  mensaje: string;
  leida: boolean;
  estado: 'activa' | 'eliminada';
  referenciaId: number | null;
  referenciaTipo: string | null;
  /**
   * Código de la incidencia (columna `codigo`).
   * Solo viene en notificaciones de incidencias; en las demás es null.
   */
  referenciaCodigo?: string | null;
  createdAt: string;
}

export interface DetalleReserva {
  reserva: {
    id: number;
    estado: string;
    nombreCompleto: string;
    fechaNacimiento: string;
    tipoIdentificacion: string;
    numeroIdentificacion: string;
    correo: string;
    telefono: string;
    createdAt: string;
  };

  evento: {
    id: number;
    nombre: string | null;
    descripcion: string | null;
    tipoActividad: 'evento' | 'capacitacion';
    fecha: string | null;
    hora: string | null;
    lugar: string | null;
  } | null;
}

export interface DetalleNotificacion {
  notificacion: Notificacion;
  tipo: string | null;
  datos: unknown;
}

function baseUrl(): string {
  const url = import.meta.env.VITE_API_URL?.trim();

  if (!url) {
    throw new Error('No se encontró VITE_API_URL.');
  }

  return url.replace(/\/+$/, '');
}

function token(): string | null {
  return sessionStorage.getItem('token') ?? localStorage.getItem('token');
}

async function solicitar<T>(
  ruta: string,
  opciones: RequestInit = {},
  signal?: AbortSignal,
): Promise<T> {
  const t = token();

  const respuesta = await fetch(`${baseUrl()}/api/notificaciones${ruta}`, {
    ...opciones,
    signal,
    headers: {
      Accept: 'application/json',
      ...(t ? { Authorization: `Bearer ${t}` } : {}),
      ...opciones.headers,
    },
  });

  let cuerpo: any = null;

  try {
    cuerpo = await respuesta.json();
  } catch {
    // La respuesta puede no tener cuerpo.
  }

  if (!respuesta.ok) {
    const mensaje =
      cuerpo?.mensaje ??
      cuerpo?.message ??
      `Error del servidor. Código: ${respuesta.status}`;

    if (respuesta.status === 401) {
      notificarErrorAuth({
        code:
          typeof cuerpo?.code === 'string'
            ? cuerpo.code
            : 'UNAUTHORIZED',
        message:
          typeof mensaje === 'string'
            ? mensaje
            : 'Tu sesión no es válida. Inicia sesión nuevamente.',
        status: respuesta.status,
      });
    }

    throw new Error(
      mensaje,
    );
  }

  return cuerpo as T;
}

/** Obtener todas las notificaciones del usuario autenticado. */
export const obtenerMisNotificaciones = (signal?: AbortSignal) =>
  solicitar<Notificacion[]>('', {}, signal);

/** Obtener la cantidad de notificaciones que todavía no han sido leídas. */
export const contarNoLeidas = (signal?: AbortSignal) =>
  solicitar<{ cantidad: number }>('/no-leidas/count', {}, signal);

/** Obtener el detalle de una notificación. */
export const obtenerDetalleNotificacion = (id: number, signal?: AbortSignal) =>
  solicitar<DetalleNotificacion>(`/${id}/detalle`, {}, signal);

/** Marcar una notificación general como leída. */
export const marcarComoLeida = (id: number) =>
  solicitar<Notificacion>(`/${id}/leida`, { method: 'PATCH' });

/** Marcar todas las notificaciones como leídas. */
export const marcarTodasComoLeidas = () =>
  solicitar<{ mensaje: string }>('/marcar-todas-leidas', { method: 'PATCH' });

/** Eliminar una notificación. */
export const eliminarNotificacion = (id: number) =>
  solicitar<{ mensaje: string }>(`/${id}`, { method: 'DELETE' });

export const eliminarTodasLasNotificaciones = () =>
  solicitar<{ mensaje: string; cantidad: number }>('/eliminar-todas', {
    method: 'DELETE',
  });

/** Obtener las notificaciones relacionadas con incidencias. */
export const obtenerNotificacionesIncidencias = (signal?: AbortSignal) =>
  solicitar<{
    ok: boolean;
    notificaciones: Notificacion[];
  }>('/incidencias', {}, signal);

/** Marcar una notificación de incidencia como leída. */
export const marcarNotificacionIncidenciaComoLeida = (id: number) =>
  solicitar<{
    ok: boolean;
    mensaje: string;
    notificacion: Notificacion;
  }>(`/incidencias/${id}/leida`, { method: 'PATCH' });
