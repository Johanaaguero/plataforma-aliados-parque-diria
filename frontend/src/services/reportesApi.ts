import { api } from './api';

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
  const resultado = await api.solicitar<{ reporte: ReporteGuardado }>(
    '/reportes',
    {
      method: 'POST',
      body: JSON.stringify(datosReporte),
    },
    {
      desempaquetarData: false,
      mensajeError: 'No se pudo guardar el reporte.',
    },
  );
  return resultado.reporte;
};

export const exportarReporte = (
  reporteId: number,
  formato: 'pdf' | 'excel',
): Promise<Blob> =>
  api.solicitarBlob(
    `/reportes/${reporteId}/exportar?formato=${formato}`,
    {},
    'No se pudo exportar el reporte.',
  );

export const descargarArchivo = (archivo: Blob, nombre: string): void => {
  const url = URL.createObjectURL(archivo);
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = nombre;
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
};
