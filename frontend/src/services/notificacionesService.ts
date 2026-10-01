export interface Notificacion {
  id: number;
  usuarioId: number;
  tipo: string;
  titulo: string;
  mensaje: string;
  leida: boolean;
  referenciaId: number | null;
  referenciaTipo: string | null;
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
  if (!url) throw new Error('No se encontró VITE_API_URL.');
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
    /* sin cuerpo */
  }

  if (!respuesta.ok) {
    throw new Error(cuerpo?.mensaje ?? `Error del servidor. Código: ${respuesta.status}`);
  }

  return cuerpo as T;
}

export const obtenerMisNotificaciones = (signal?: AbortSignal) =>
  solicitar<Notificacion[]>('', {}, signal);

export const contarNoLeidas = (signal?: AbortSignal) =>
  solicitar<{ cantidad: number }>('/no-leidas/count', {}, signal);

export const obtenerDetalleNotificacion = (id: number, signal?: AbortSignal) =>
  solicitar<DetalleNotificacion>(`/${id}/detalle`, {}, signal);

export const marcarComoLeida = (id: number) =>
  solicitar<Notificacion>(`/${id}/leida`, { method: 'PATCH' });

export const marcarTodasComoLeidas = () =>
  solicitar<{ mensaje: string }>('/marcar-todas-leidas', { method: 'PATCH' });

export const eliminarNotificacion = (id: number) =>
  solicitar<{ mensaje: string }>(`/${id}`, { method: 'DELETE' });