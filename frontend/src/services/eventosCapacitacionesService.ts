export type TemporadaEvento = 'seca' | 'lluviosa';

export interface EventoCapacitacion {
  id: number;
  nombre: string | null;
  descripcion: string | null;
  fecha: string | null;
  hora: string | null;
  lugar: string | null;
  tipoActividad: 'evento' | 'capacitacion';
  cupoMinimo: number | null;
  cupoMaximo: number | null;
  edadMinima: number | null;
  edadMaxima: number | null;
  cuposDisponibles?: number | null;
  estado: 'borrador' | 'publicado' | 'no_publicado' | 'desactivado';
  temporada: TemporadaEvento | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface FiltrosEventos {
  buscar?: string;
  temporada?: TemporadaEvento;
  pagina?: number;
  tipoActividad?: EventoCapacitacion['tipoActividad'];
}

export interface CatalogoEventos {
  ok: true;
  data: EventoCapacitacion[];
  paginacion: {
    pagina: number;
    limite: number;
    total: number;
    totalPaginas: number;
  };
  conteos: { todos: number; eventos: number; capacitaciones: number };
}

async function consultarEventos<T>(ruta: string, signal?: AbortSignal): Promise<T> {
  const urlBase = (import.meta.env.VITE_API_URL?.trim() || 'http://localhost:3000')
    .replace(/\/+$/, '');
  let respuesta: Response;

  try {
    respuesta = await fetch(`${urlBase}/api/eventos${ruta}`, {
      headers: { Accept: 'application/json' },
      signal,
    });
  } catch (error) {
    if (signal?.aborted) throw error;
    throw new Error('No se pudo conectar con el servidor. Intente nuevamente.');
  }

  const resultado = await respuesta.json().catch(() => null);

  if (!respuesta.ok) {
    const mensaje = respuesta.status >= 500
      ? 'No se pudieron cargar las actividades. Intente nuevamente.'
      : typeof resultado?.message === 'string'
        ? resultado.message
        : 'No se pudo completar la consulta de actividades.';
    throw new Error(mensaje);
  }

  if (!resultado || resultado.ok !== true || resultado.data == null) {
    throw new Error('La respuesta de actividades no es válida. Intente nuevamente.');
  }

  return resultado as T;
}

export function obtenerEventos(
  filtros: FiltrosEventos = {},
  signal?: AbortSignal,
): Promise<CatalogoEventos> {
  const parametros = new URLSearchParams();
  if (filtros.buscar?.trim()) parametros.set('buscar', filtros.buscar.trim());
  if (filtros.temporada) parametros.set('temporada', filtros.temporada);
  if (filtros.tipoActividad) parametros.set('tipoActividad', filtros.tipoActividad);
  parametros.set('pagina', String(filtros.pagina ?? 1));

  return consultarEventos<CatalogoEventos>(`?${parametros}`, signal);
}

export async function obtenerDetalleEvento(
  id: number,
  signal?: AbortSignal,
): Promise<EventoCapacitacion> {
  const resultado = await consultarEventos<{ ok: true; data: EventoCapacitacion }>(
    `/${id}`,
    signal,
  );
  return resultado.data;
}

export function formatearCupos(evento: EventoCapacitacion): string {
  // La entidad actual solo registra capacidad: no hay inscripciones que restar.
  const cupos = evento.cuposDisponibles === undefined
    ? evento.cupoMaximo
    : evento.cuposDisponibles;
  if (cupos === null) return 'Cupos por confirmar';
  if (cupos === 0) return 'Sin cupos disponibles';
  return `${cupos} ${cupos === 1 ? 'cupo disponible' : 'cupos disponibles'}`;
}
