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
  codigo: string;
  titulo: string;
  descripcion: string;
  categoria: CategoriaIncidencia;
  prioridad: PrioridadIncidencia;
  estado: EstadoIncidencia;
  ubicacion: string | null;
  fechaRegistro: string;
  fechaActualizacion: string | null;
  usuarioReporta: { id: number; nombre: string } | null;
  nombreContacto?: string | null;
  telefonoContacto?: string | null;
  adminActualiza: { id: number; nombre: string } | null;
    observacionesAdmin: string | null;

  conformidadUsuario?:
    | 'pendiente'
    | 'satisfecho'
    | 'no_satisfecho'
    | 'sin_respuesta';

  observacionesUsuario?: string | null;

  fechaRespuestaUsuario?: string | null;

  fechaLimiteRespuesta?: string | null;

  fechaCierreProgramado?: string | null;

  esPublica?: boolean;

  evidencias: Evidencia[];
}

export interface FiltrosIncidencia {
  categoria?: CategoriaIncidencia;
  prioridad?: PrioridadIncidencia;
  estado?: EstadoIncidencia;
  fechaDesde?: string;
  fechaHasta?: string;
}

export interface ActualizarIncidenciaAdministrativa {
  estado?: EstadoIncidencia;
  categoria?: CategoriaIncidencia;
  prioridad?: PrioridadIncidencia;
  observacionesAdmin?: string | null;
}

export type AccionCierreIncidencia =
  | 'satisfecho'
  | 'no_satisfecho';

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

interface RespuestaActualizacion {
  mensaje: string;
  incidencia: Incidencia;
  incidenciaActualizada?: Incidencia;
}

interface RespuestaMisIncidencias {
  mensaje: string;
  incidencias: Incidencia[];
}

interface RespuestaCierreIncidencia {
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

// ============================================================
// ACTUALIZAR ADMINISTRATIVAMENTE
// ============================================================

export async function actualizarIncidenciaAdministrativa(
  id: number,
  datos: ActualizarIncidenciaAdministrativa,
): Promise<Incidencia> {
  const respuesta = await api.solicitar<RespuestaActualizacion>(
    `/incidencias/${id}/administracion`,
    {
      method: 'PATCH',
      body: JSON.stringify(datos),
    },
    {
      desempaquetarData: false,
      mensajeError: 'No se pudo actualizar la incidencia',
    },
  );

  return respuesta.incidenciaActualizada ?? respuesta.incidencia;
}

export async function actualizarVisibilidadIncidencia(
  id: number,
  esPublica: boolean,
): Promise<Incidencia> {
  return api.solicitar<Incidencia | { incidencia: Incidencia }>(
    `/incidencias/${id}/visibilidad`,
    { method: 'PATCH', body: JSON.stringify({ es_publica: esPublica }) },
    { incluirAuth: true, desempaquetarData: false, mensajeError: 'No se pudo actualizar la visibilidad pública.' },
  ).then((respuesta) => 'incidencia' in respuesta ? respuesta.incidencia : respuesta);
}

export async function obtenerMisIncidencias(): Promise<Incidencia[]> {
  const respuesta = await api.solicitar<RespuestaMisIncidencias>(
    '/incidencias/mis-incidencias',
    { method: 'GET' },
    {
      desempaquetarData: false,
      mensajeError: 'No se pudieron cargar tus incidencias.',
    },
  );

  return respuesta.incidencias;
}

export async function cerrarMiIncidencia(
  id: number,
  accion: AccionCierreIncidencia,
  observacionesUsuario?: string,
): Promise<Incidencia> {
  const respuesta = await api.solicitar<RespuestaCierreIncidencia>(
    `/incidencias/${id}/cerrar`,
    {
      method: 'PATCH',
      body: JSON.stringify({
        accion,
        observacionesUsuario,
      }),
    },
    {
      desempaquetarData: false,
      mensajeError:
        'No se pudo registrar la respuesta de la incidencia.',
    },
  );

  return respuesta.incidencia;
}