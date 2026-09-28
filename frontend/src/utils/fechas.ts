export function formatearFechaHora(fecha: string | Date | null | undefined): string {
  if (!fecha) return 'Fecha no disponible';
  const valor = new Date(fecha);
  if (Number.isNaN(valor.getTime())) return 'Fecha no disponible';
  return new Intl.DateTimeFormat('es-CR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true }).format(valor);
}
