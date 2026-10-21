import { PrioridadIncidencia } from '../../../models/Incidencia';

export const esPrioridadIncidencia = (
  valor: unknown,
): valor is PrioridadIncidencia =>
  Object.values(PrioridadIncidencia).some((prioridad) => prioridad === valor);
