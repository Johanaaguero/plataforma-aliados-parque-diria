import { EstadoIncidencia } from '../../../models/Incidencia';

export const puedeIniciarProcesoIncidencia = (
  estadoActual: EstadoIncidencia,
): boolean => estadoActual === EstadoIncidencia.PENDIENTE;
