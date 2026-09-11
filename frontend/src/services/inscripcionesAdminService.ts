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
