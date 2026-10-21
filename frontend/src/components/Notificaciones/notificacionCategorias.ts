export type CategoriaNotificacion =
  | 'incidencias'
  | 'eventos'
  | 'reservas'
  | 'emprendimientos'
  | 'comunicados';

export type FiltroNotificacion =
  | 'todas'
  | 'no_leidas'
  | CategoriaNotificacion;

export function categoriaNotificacion(
  tipo: string,
): CategoriaNotificacion | null {
  if (
    tipo === 'nueva_incidencia' ||
    tipo === 'seguimiento_incidencia' ||
    tipo === 'incidencia_compartida'
  ) return 'incidencias';

  if (tipo === 'nuevo_evento' || tipo === 'nueva_capacitacion') return 'eventos';

  if (
    tipo === 'reserva_realizada' ||
    tipo === 'nueva_reserva_admin' ||
    tipo === 'reserva_aprobada' ||
    tipo === 'reserva_rechazada'
  ) return 'reservas';

  if (tipo === 'nuevo_emprendimiento') return 'emprendimientos';
  if (tipo === 'nuevo_comunicado') return 'comunicados';
  return null;
}
