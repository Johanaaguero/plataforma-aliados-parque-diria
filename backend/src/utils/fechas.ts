/**
 * MySQL DATE representa un día de calendario, no un instante. Se conserva como
 * YYYY-MM-DD para impedir que el navegador lo desplace al aplicarle una zona
 * horaria. Las columnas DATETIME/TIMESTAMP se exponen siempre en UTC.
 */
export const serializarFechaCalendario = (
  valor: string | Date | null | undefined,
): string | null => {
  if (valor === null || valor === undefined) {
    return null;
  }

  if (typeof valor === 'string') {
    const coincidencia = /^(\d{4}-\d{2}-\d{2})/.exec(valor);
    return coincidencia?.[1] ?? valor;
  }

  return valor.toISOString().slice(0, 10);
};

export const serializarFechaUtc = (
  valor: string | Date | null | undefined,
): string | null => {
  if (valor === null || valor === undefined) {
    return null;
  }

  if (valor instanceof Date) {
    return valor.toISOString();
  }

  const fechaUtc = /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}(?:\.\d+)?$/.test(valor)
    ? new Date(`${valor.replace(' ', 'T')}Z`)
    : new Date(valor);

  return fechaUtc.toISOString();
};
