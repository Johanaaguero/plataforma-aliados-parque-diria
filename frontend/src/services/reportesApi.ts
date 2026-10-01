const API_ORIGIN = (import.meta.env.VITE_API_URL ?? 'http://localhost:3000')
  .replace(/\/$/, '')
  .replace(/\/api$/, '');

export const rutaApiReportes = (ruta = ''): string =>
  `${API_ORIGIN}/api/reportes${ruta}`;

/** Evita intentar parsear como JSON una página HTML de error del servidor. */
export const leerJsonSeguro = async <T>(respuesta: Response): Promise<T> => {
  const tipoContenido = respuesta.headers.get('content-type') ?? '';
  if (tipoContenido.includes('text/html') || !tipoContenido.includes('application/json')) {
    await respuesta.text();
    throw new Error('Error de comunicación con el servidor. Verifique la ruta del API.');
  }
  const cuerpo = await respuesta.json() as T & { mensaje?: string; message?: string };
  if (!respuesta.ok) {
    throw new Error(cuerpo.mensaje ?? cuerpo.message ?? 'No fue posible procesar la solicitud.');
  }
  return cuerpo;
};

export interface GuardarReporteInput {
  tipoReporte: string;
  usuarioGeneroId: number;
  contenido: Record<string, unknown>;
}

export interface ReporteGuardado {
  id: number;
  numeroReporte: string;
}

export const guardarReporte = async (datosReporte: GuardarReporteInput): Promise<ReporteGuardado> => {
  const token = sessionStorage.getItem('token') ?? localStorage.getItem('token');
  const respuesta = await fetch(rutaApiReportes(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(datosReporte),
  });
  const resultado = await leerJsonSeguro<{ reporte: ReporteGuardado }>(respuesta);
  return resultado.reporte;
};
