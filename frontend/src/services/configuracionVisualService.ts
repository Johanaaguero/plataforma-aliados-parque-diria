import { api } from './api';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export interface ConfiguracionVisual {
  id: number;
  epoca: 'seca' | 'lluviosa';
  heroImagenes: string[] | null;
  heroLeyendas: string[] | null;
  heroTitulo: string | null;
  heroEslogan: string | null;
  sobreImagen: string | null;
  galeriaImagenes: string[] | null;
  updatedAt: string;
}

export const urlVisual = (url: string): string => url.startsWith('http') ? url : `${API_URL}${url}`;

export const obtenerConfiguracionVisual = () => api.solicitar<ConfiguracionVisual>(
  '/configuracion-visual', { method: 'GET' }, { incluirAuth: false, mensajeError: 'No se pudo cargar la configuración visual.' },
);

export const actualizarConfiguracionVisual = (datos: FormData) => api.solicitar<ConfiguracionVisual>(
  '/configuracion-visual', { method: 'PATCH', body: datos }, { incluirContentType: false, mensajeError: 'No se pudo guardar la configuración visual.' },
);
