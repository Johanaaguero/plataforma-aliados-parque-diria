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

export type EstadoReserva =
  | 'pendiente'
  | 'aprobada'
  | 'rechazada'
  | 'cancelada';

export interface ReservaResponse extends DatosReserva {
  id: number;
  usuarioId: number;
  eventoCapacitacionId: number;
  estado: EstadoReserva;
  createdAt: string;
  updatedAt: string;
  cuposDisponibles: number | null;
  comprobanteUrl?: string | null;
  metodoPago?: 'sinpe_movil' | 'transferencia_bancaria' | null;
  datosDevolucion?: {
    tipo: 'sinpe_movil' | 'transferencia_bancaria';
    telefono?: string;
    iban?: string;
    banco?: string;
  } | null;
  motivoRechazo?: string | null;
  esPago?: boolean;
  precio?: number | null;
  politicasCancelacion?: string | null;
  fechaExpiracionPreReserva?: string | null;
  numeroTicket?: string | null;
}

export interface ConsultaReservaResponse {
  existe: boolean;
  inscrito?: boolean;
  estado: EstadoReserva | null;
  reserva: ReservaResponse | null;
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
      mensajeError:
        'No se pudo enviar la solicitud de inscripción.',
    },
  );
}

export async function consultarReservaEvento(
  eventoId: number,
): Promise<ConsultaReservaResponse> {
  return api.solicitar<ConsultaReservaResponse>(
    `/eventos-capacitaciones/${eventoId}/reserva`,
    {
      method: 'GET',
    },
    {
      incluirAuth: true,
      desempaquetarData: true,
      mensajeError:
        'No se pudo consultar la solicitud de inscripción.',
    },
  );
}

export async function editarReserva(
  eventoId: number,
  datos: DatosReserva,
): Promise<ReservaResponse> {
  return api.solicitar<ReservaResponse>(
    `/eventos-capacitaciones/${eventoId}/reserva`,
    {
      method: 'PUT',
      body: JSON.stringify(datos),
    },
    {
      incluirAuth: true,
      incluirContentType: true,
      desempaquetarData: true,
      mensajeError: 'No se pudo actualizar la reserva.',
    },
  );
}

export async function subirComprobanteReserva(reservaId: number, comprobante: File): Promise<{ comprobanteUrl: string }> {
  const datos = new FormData();
  datos.append('comprobante', comprobante);
  return api.solicitar<{ comprobanteUrl: string }>(`/reservas/${reservaId}/comprobante`, { method: 'POST', body: datos }, {
    incluirAuth: true,
    incluirContentType: false,
    desempaquetarData: true,
    mensajeError: 'No se pudo subir el comprobante de pago.',
  });
}
