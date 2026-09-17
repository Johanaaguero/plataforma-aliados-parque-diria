import { api } from './api';

export interface InscripcionAdministrativa {
  id: number;
  usuarioId: number;
  nombreUsuario: string;
  correo: string;
  nombreCompleto: string;
  eventoCapacitacionId: number;
  nombreActividad: string;
  tipoActividad: 'evento' | 'capacitacion' | string;
  fechaActividad: string | null;
  fechaInscripcion: string | null;
  estado: 'pendiente' | 'aprobada' | 'rechazada' | 'cancelada' | string;
  origen: 'participante' | 'reserva';
}

export const obtenerInscripcionesAdministrativas = async (): Promise<InscripcionAdministrativa[]> => {
  return api.solicitar<InscripcionAdministrativa[]>(
    '/admin/inscripciones',
    { method: 'GET' },
    {
      mensajeError: 'No se pudieron cargar las inscripciones.',
    },
  );
};

export const actualizarEstadoReserva = async (
  reservaId: number,
  estado: 'aprobada' | 'rechazada',
): Promise<{ id: number; estado: string }> => api.solicitar(
  `/admin/inscripciones/${reservaId}/${estado === 'aprobada' ? 'aprobar' : 'rechazar'}`,
  { method: 'PATCH' },
  {
    mensajeError: `No se pudo ${estado === 'aprobada' ? 'aprobar' : 'rechazar'} la reserva.`,
  },
);
