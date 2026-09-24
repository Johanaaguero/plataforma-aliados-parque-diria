import { api } from './api';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export function urlArchivoEvidencia(evidenciaId: number): string {
  return `${API_URL}/api/incidencias/evidencias/${evidenciaId}/archivo`;
}
// ============================================================
// TIPOS DE VALOR (categoría, prioridad, estado)
// ============================================================

export type CategoriaIncidencia =
  | 'seguridad'
  | 'incendio'
  | 'flora_fauna'
  | 'ambiental'
  | 'infraestructura'
  | 'senderos'
  | 'servicios'
  | 'otro';

export type PrioridadIncidencia = 'baja' | 'media' | 'alta' | 'critica';

export type EstadoIncidencia =
  | 'pendiente'
  | 'en_revision'
  | 'en_proceso'
  | 'resuelta'
  | 'rechazada'
  | 'cerrada';

// ============================================================
// INCIDENCIA
// ============================================================

export interface Incidencia {
  id: number;
  titulo: string;
  descripcion: string;
  categoria: CategoriaIncidencia;
  prioridad: PrioridadIncidencia;
  estado: EstadoIncidencia;
  ubicacion: string | null;
  fechaRegistro: string;
  usuarioReporta: { id: number; nombre: string } | null;
  adminActualiza: { id: number; nombre: string } | null;
  observacionesAdmin: string | null;
  evidencias: Evidencia[];
}

export interface FiltrosIncidencia {
  categoria?: CategoriaIncidencia;
  prioridad?: PrioridadIncidencia;
  estado?: EstadoIncidencia;
  fechaDesde?: string;
  fechaHasta?: string;
}
export interface Evidencia {
  id: number;
  tipoMime: string;
  nombreArchivo: string | null;
  tamanoBytes: number | null;
  tipo: 'foto' | 'video';
}

// Etiquetas legibles para mostrar en la interfaz.

export const ETIQUETAS_ESTADO: Record<EstadoIncidencia, string> = {
  pendiente: 'Pendiente',
  en_revision: 'En revisión',
  en_proceso: 'En proceso',
  resuelta: 'Resuelta',
  rechazada: 'Rechazada',
  cerrada: 'Cerrada',
};

// ============================================================
// RESPUESTAS DEL BACKEND
// ============================================================

interface RespuestaLista {
  mensaje: string;
  incidencias: Incidencia[];
}

interface RespuestaDetalle {
  mensaje: string;
  incidencia: Incidencia;
}

// ============================================================
// LISTAR (con filtros opcionales)
// ============================================================

export async function listarIncidencias(
  filtros?: FiltrosIncidencia,
): Promise<Incidencia[]> {
  const params = new URLSearchParams();

  if (filtros?.categoria) params.append('categoria', filtros.categoria);
  if (filtros?.prioridad) params.append('prioridad', filtros.prioridad);
  if (filtros?.estado) params.append('estado', filtros.estado);
  if (filtros?.fechaDesde) params.append('fechaDesde', filtros.fechaDesde);
  if (filtros?.fechaHasta) params.append('fechaHasta', filtros.fechaHasta);

  const query = params.toString();
  const ruta = `/incidencias${query ? `?${query}` : ''}`;

  const respuesta = await api.solicitar<RespuestaLista>(
    ruta,
    { method: 'GET' },
    {
      incluirAuth: false,
      desempaquetarData: false,
      mensajeError: 'No se pudieron cargar las incidencias',
    },
  );

  return respuesta.incidencias;
}

// ============================================================
// OBTENER DETALLE
// ============================================================

export async function obtenerDetalleIncidencia(
  id: number,
): Promise<Incidencia> {
  const respuesta = await api.solicitar<RespuestaDetalle>(
    `/incidencias/${id}`,
    { method: 'GET' },
    {
      incluirAuth: false,
      desempaquetarData: false,
      mensajeError: 'No se pudo cargar el detalle de la incidencia',
    },
  );

  return respuesta.incidencia;
}