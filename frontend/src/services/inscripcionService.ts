import { api } from './api';

export interface InscripcionResponse {
  id: number;
  usuarioId: number;
  eventoCapacitacionId: number;
  createdAt: string;
  cuposDisponibles: number | null;
}

export interface DatosReserva {
  nombreCompleto: string;
  fechaNacimiento: string;
  tipoIdentificacion: 'cedula' | 'dimex' | 'pasaporte';
  numeroIdentificacion: string;
  correo: string;
  telefono: string;
}

export interface ReservaResponse extends DatosReserva {
  id: number;
  usuarioId: number;
  eventoCapacitacionId: number;
  estado: 'pendiente' | 'aprobada' | 'rechazada' | 'cancelada';
  createdAt: string;
  updatedAt: string;
  cuposDisponibles: number;
}

export type EstadoReserva = 'pendiente' | 'aprobada' | 'rechazada' | 'cancelada';

export interface ConsultaReservaResponse {
  existe: boolean;
  estado: EstadoReserva | null;
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

export async function crearReserva(
  eventoId: number,
  datos: DatosReserva,
): Promise<ReservaResponse> {
  return api.solicitar<ReservaResponse>(
    `/eventos-capacitaciones/${eventoId}/reserva`,
    {
      method: 'POST',
      body: JSON.stringify(datos),
    },
    {
      incluirAuth: true,
      incluirContentType: true,
      desempaquetarData: true,
      mensajeError: 'No se pudo enviar la solicitud de inscripción.',
    },
  );
}

export async function consultarReservaEvento(
  eventoId: number,
): Promise<ConsultaReservaResponse> {
  return api.solicitar<ConsultaReservaResponse>(
    `/eventos-capacitaciones/${eventoId}/reserva`,
    { method: 'GET' },
    {
      incluirAuth: true,
      mensajeError: 'No se pudo consultar la solicitud de inscripción.',
    },
  );
}
