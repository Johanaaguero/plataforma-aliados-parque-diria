import {
  CategoriaIncidencia,
  PrioridadIncidencia,
} from '../../../models/Incidencia';

export interface CambioClasificacionIncidencia {
  campoModificado: 'categoria' | 'prioridad';
  valorAnterior: CategoriaIncidencia | PrioridadIncidencia;
  valorNuevo: CategoriaIncidencia | PrioridadIncidencia;
}

export const obtenerCambiosClasificacionIncidencia = (
  anterior: {
    categoria: CategoriaIncidencia;
    prioridad: PrioridadIncidencia;
  },
  nuevo: {
    categoria: CategoriaIncidencia;
    prioridad: PrioridadIncidencia;
  },
): CambioClasificacionIncidencia[] => {
  const cambios: CambioClasificacionIncidencia[] = [];
  if (anterior.categoria !== nuevo.categoria) {
    cambios.push({
      campoModificado: 'categoria',
      valorAnterior: anterior.categoria,
      valorNuevo: nuevo.categoria,
    });
  }
  if (anterior.prioridad !== nuevo.prioridad) {
    cambios.push({
      campoModificado: 'prioridad',
      valorAnterior: anterior.prioridad,
      valorNuevo: nuevo.prioridad,
    });
  }
  return cambios;
};
