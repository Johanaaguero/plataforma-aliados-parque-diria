export type TipoActorHistorial =
  | 'reportante'
  | 'administrador'
  | 'cierre_automatico'
  | 'sistema';

const etiquetasCampo: Record<string, string> = {
  conformidad_usuario: 'Decisión de conformidad',
  observaciones_usuario: 'Observaciones del reportante',
  fecha_limite_respuesta: 'Fecha límite de respuesta',
  estado: 'Estado',
  categoria: 'Categoría',
  prioridad: 'Prioridad',
};

const etiquetasValor: Record<string, string> = {
  pendiente: 'Pendiente',
  satisfecho: 'Satisfecho',
  no_satisfecho: 'No satisfecho',
  sin_respuesta: 'Sin respuesta',
  resuelta: 'Resuelta',
  cerrada: 'Cerrada',
  en_revision: 'En revisión',
  en_proceso: 'En proceso',
  rechazada: 'Rechazada',
  baja: 'Baja',
  media: 'Media',
  alta: 'Alta',
  critica: 'Crítica',
  seguridad: 'Seguridad',
  incendio: 'Incendio',
  flora_fauna: 'Flora y fauna',
  ambiental: 'Ambiental',
  infraestructura: 'Infraestructura',
  senderos: 'Senderos',
  servicios: 'Servicios',
  otro: 'Otro',
};

export const etiquetarCampoHistorial = (campo: string): string =>
  etiquetasCampo[campo] ??
  campo.replace(/_/g, ' ').replace(/^./, (letra: string) => letra.toUpperCase());

export const etiquetarValorHistorial = (
  valor: string | null,
): string => {
  if (valor === null) return '—';
  return etiquetasValor[valor] ?? valor;
};

export const identificarActorHistorial = (
  campoModificado: string,
  valorNuevo: string | null,
  usuarioId: number | null,
): TipoActorHistorial => {
  if (usuarioId === null) {
    return campoModificado === 'estado' && valorNuevo === 'cerrada'
      ? 'cierre_automatico'
      : 'sistema';
  }

  return campoModificado === 'conformidad_usuario' ||
    campoModificado === 'observaciones_usuario'
    ? 'reportante'
    : 'administrador';
};
