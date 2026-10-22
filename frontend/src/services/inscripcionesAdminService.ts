import { api } from './api';

export interface InscripcionAdministrativa {
  id: number;
  usuarioId: number;
  nombreUsuario: string;
  correo: string;
  nombreCompleto: string;
  // Campos capturados en el formulario de inscripción (FormularioReserva).
  // El backend debe incluirlos en la respuesta de /admin/inscripciones para
  // que dejen de mostrarse como "No disponible" en el panel.
  telefono: string | null;
  fechaNacimiento: string | null;
  tipoIdentificacion: 'cedula' | 'dimex' | 'pasaporte' | string | null;
  numeroIdentificacion: string | null;
  eventoCapacitacionId: number;
  nombreActividad: string;
  tipoActividad: 'evento' | 'capacitacion' | string;
  fechaActividad: string | null;
  fechaInscripcion: string | null;
  estado: 'pendiente' | 'aprobada' | 'rechazada' | 'cancelada' | string;
  origen: 'participante' | 'reserva';
  esPago?: boolean;
  precio?: number | null;
  comprobanteUrl?: string | null;
  motivoRechazo?: string | null;
  numeroTicket?: string | null;
  datosDevolucion?:
    | { tipo: 'sinpe_movil'; telefono: string }
    | { tipo: 'transferencia_bancaria'; iban: string; banco: string }
    | null;
  fechaCancelacion?: string | null;
  devolucionProcesadaEn?: string | null;
  referenciaDevolucion?: string | null;
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
  motivoRechazo?: string,
): Promise<{ id: number; estado: string }> => api.solicitar(
  `/admin/inscripciones/${reservaId}/${estado === 'aprobada' ? 'aprobar' : 'rechazar'}`,
  { method: 'PATCH', body: estado === 'rechazada' ? JSON.stringify({ motivoRechazo }) : undefined },
  {
    incluirContentType: estado === 'rechazada',
    mensajeError: `No se pudo ${estado === 'aprobada' ? 'aprobar' : 'rechazar'} la reserva.`,
  },
);

export const registrarDevolucionProcesada = async (
  reservaId: number,
  referencia: string,
): Promise<{
  id: number;
  devolucionProcesadaEn: string;
  referenciaDevolucion: string;
}> => api.solicitar(
  `/admin/inscripciones/${reservaId}/devolucion-procesada`,
  {
    method: 'PATCH',
    body: JSON.stringify({ referencia }),
  },
  {
    incluirAuth: true,
    incluirContentType: true,
    mensajeError: 'No se pudo registrar la devolución como procesada.',
  },
);
