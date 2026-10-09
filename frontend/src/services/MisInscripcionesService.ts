import { api } from './api';

export interface InscripcionResponse {
  id: number;
  usuarioId: number;
  eventoCapacitacionId: number;
  createdAt: string;
  cuposDisponibles: number | null;
}

export async function inscribirseEnEvento(
  eventoId: number,
): Promise<InscripcionResponse> {
  return api.solicitar<InscripcionResponse>(
    `/eventos-capacitaciones/${eventoId}/inscripcion`,
    {
      method: 'POST',
    },
    {
      incluirAuth: true,
      incluirContentType: true,
      desempaquetarData: true,
      mensajeError: 'No se pudo realizar la inscripción.',
    },
  );
}

// Estado de la inscripción del usuario respecto a la actividad.
// Ajusta estos valores si el backend usa otros nombres.
export type EstadoInscripcion = 'confirmada' | 'pendiente' | 'aprobada' | 'rechazada' | 'cancelada' | string;

export interface MiInscripcion {
  id: number;
  eventoCapacitacionId: number;
  nombreActividad: string;
  tipoActividad: 'evento' | 'capacitacion' | string;
  // Campos de detalle: opcionales porque puede que el backend aún no los envíe.
  descripcion?: string | null;
  ubicacion?: string | null;
  horaInicio?: string | null;
  horaFin?: string | null;
  cuposDisponibles?: number | null;
  estado?: EstadoInscripcion;
  fechaCancelacion?: string | null;
  fechaActividad: string | null;
  fechaInscripcion: string | null;
  origen?: 'participante' | 'reserva';
  esPago?: boolean;
  precio?: number;
  politicasCancelacion?: string | null;
}

// NOTA: ruta asumida. Cambia '/inscripciones/mias' por la ruta real del backend
// cuando esté disponible; el resto del código no depende de este valor.
const RUTA_MIS_INSCRIPCIONES = '/inscripciones/mias';

export const obtenerMisInscripciones = async (): Promise<MiInscripcion[]> => {
  return api.solicitar<MiInscripcion[]>(
    RUTA_MIS_INSCRIPCIONES,
    { method: 'GET' },
    {
      incluirAuth: true,
      mensajeError: 'No se pudieron cargar tus inscripciones.',
    },
  );
};

export interface CancelacionInscripcionResponse {
  id: number;
  estado: EstadoInscripcion;
  fechaCancelacion: string;
  cuposDisponibles: number | null;
}

export async function cancelarInscripcion(inscripcionId: number): Promise<CancelacionInscripcionResponse> {
  return api.solicitar<CancelacionInscripcionResponse>(
    `/inscripciones/${inscripcionId}/cancelar`,
    { method: 'PATCH' },
    {
      incluirAuth: true,
      mensajeError: 'No se pudo cancelar la inscripción.',
    },
  );
}

export async function cancelarReserva(reservaId: number): Promise<CancelacionInscripcionResponse> {
  return api.solicitar<CancelacionInscripcionResponse>(
    `/reservas/${reservaId}/cancelar`,
    { method: 'PATCH' },
    {
      incluirAuth: true,
      mensajeError: 'No se pudo cancelar la reserva.',
    },
  );
}
