export interface ActorIncidencia {
  id: number;
  rol: string;
}

export interface DatosAccesoIncidencia {
  esPublica: boolean;
  usuarioReporta?: { id: number } | null;
}

export const puedeConsultarIncidencia = (
  incidencia: DatosAccesoIncidencia,
  actor: ActorIncidencia | null,
): boolean => {
  if (incidencia.esPublica) {
    return true;
  }

  if (!actor) {
    return false;
  }

  return (
    incidencia.usuarioReporta?.id === actor.id ||
    actor.rol === 'administrador' ||
    actor.rol === 'super_admin'
  );
};

export const puedeConsultarEvidencia = (
  incidencia: DatosAccesoIncidencia,
  actor: ActorIncidencia | null,
): boolean =>
  Boolean(
    actor &&
      (incidencia.usuarioReporta?.id === actor.id ||
        actor.rol === 'administrador' ||
        actor.rol === 'super_admin'),
  );

export interface RespuestaEvidenciaAutorizada {
  archivo: Buffer;
  headers: Record<string, string>;
}

export const prepararRespuestaEvidencia = (
  incidencia: DatosAccesoIncidencia,
  actor: ActorIncidencia | null,
  archivo: Buffer,
  tipoMime: string,
): RespuestaEvidenciaAutorizada | null => {
  if (!puedeConsultarEvidencia(incidencia, actor)) {
    return null;
  }

  const mimePermitidosInline = new Set([
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/avif',
    'video/mp4',
    'video/webm',
    'video/ogg',
  ]);
  const tipoMimeNormalizado = tipoMime.toLowerCase();
  const esSeguroInline = mimePermitidosInline.has(tipoMimeNormalizado);
  const headers: Record<string, string> = {
    'X-Content-Type-Options': 'nosniff',
    'Cache-Control': 'private, no-store',
    'Content-Type': esSeguroInline
      ? tipoMimeNormalizado
      : 'application/octet-stream',
  };

  if (!esSeguroInline) {
    headers['Content-Disposition'] =
      'attachment; filename="evidencia.bin"';
  }

  return { archivo, headers };
};

export const puedeListarIncidenciasOcultas = (
  actor: ActorIncidencia | null,
): boolean =>
  actor?.rol === 'administrador' ||
  actor?.rol === 'super_admin';
