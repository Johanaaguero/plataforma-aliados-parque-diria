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
  comprobante?: File,
): Promise<ReservaResponse> {
  const cuerpo = comprobante ? new FormData() : JSON.stringify(datos);
  if (cuerpo instanceof FormData && comprobante) {
    Object.entries(datos).forEach(([campo, valor]) => cuerpo.append(campo, valor));
    cuerpo.append('comprobante', comprobante);
  }
  return api.solicitar<ReservaResponse>(
    `/eventos-capacitaciones/${eventoId}/reserva`,
    {
      method: 'POST',
      body: cuerpo,
    },
    {
      incluirAuth: true,
      incluirContentType: !comprobante,
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

export async function subirComprobanteReserva(
  reservaId: number,
  comprobante: File,
): Promise<{ ok: boolean }> {
  if (!Number.isSafeInteger(reservaId) || reservaId <= 0) {
    throw new Error('La reserva no es válida.');
  }

  const datos = new FormData();
  datos.append('comprobante', comprobante);

  return api.solicitar<{ ok: boolean }>(
    `/reservas/${reservaId}/comprobante`,
    {
      method: 'POST',
      body: datos,
    },
    {
      incluirAuth: true,
      incluirContentType: false,
      desempaquetarData: false,
      mensajeError: 'No se pudo subir el comprobante de pago.',
    },
  );
}

export async function obtenerComprobanteReserva(
  reservaId: number,
): Promise<Blob> {
  if (!Number.isSafeInteger(reservaId) || reservaId <= 0) {
    throw new Error('La reserva no es válida.');
  }

  return api.solicitarBlob(
    `/reservas/${reservaId}/comprobante`,
    { method: 'GET' },
    'No se pudo obtener el comprobante de pago.',
  );
}
