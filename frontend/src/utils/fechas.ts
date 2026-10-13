export function formatearFechaHora(fecha: string | Date | null | undefined): string {
  if (!fecha) return 'Fecha no disponible';
  const valor = new Date(fecha);
  if (Number.isNaN(valor.getTime())) return 'Fecha no disponible';
  return new Intl.DateTimeFormat('es-CR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true }).format(valor);
}

/**
 * Las fechas de actividades se almacenan sin hora. Interpretarlas con
 * `new Date('YYYY-MM-DD')` las desplaza un día en zonas horarias al oeste de
 * UTC, por lo que todas las vistas públicas usan esta misma conversión local.
 */
export function formatearFechaActividad(
  fecha: string | Date | null | undefined,
): string {
  if (!fecha) return 'Fecha pendiente';

  const texto = String(fecha).slice(0, 10);
  const partes = texto.split('-').map(Number);
  const valor =
    partes.length === 3 && partes.every((parte) => Number.isFinite(parte))
      ? new Date(partes[0], partes[1] - 1, partes[2])
      : new Date(fecha);

  if (Number.isNaN(valor.getTime())) return 'Fecha pendiente';

  return new Intl.DateTimeFormat('es-CR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(valor);
}
