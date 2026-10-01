import { useEffect, useState } from 'react';

import { guardarReporte } from '../../services/reportesApi';
import BotonesExportarReporte from './BotonesExportarReporte';

type TipoReporte = 'usuarios' | 'reservas' | 'emprendimientos' | 'eventos' | 'incidencias';

interface AccionesReporteGuardadoProps {
  tipoReporte: TipoReporte;
  nombreReporte: string;
  contenido: Record<string, unknown>;
  tieneDatos: boolean;
}

const obtenerUsuarioId = (): number | null => {
  const token = sessionStorage.getItem('token') ?? localStorage.getItem('token');
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]?.replace(/-/g, '+').replace(/_/g, '/') ?? '')) as { id?: number; usuarioId?: number; userId?: number };
    return payload.id ?? payload.usuarioId ?? payload.userId ?? null;
  } catch {
    return null;
  }
};

/** Barra reutilizable para guardar la instantánea actual y habilitar su exportación. */
export default function AccionesReporteGuardado({ tipoReporte, nombreReporte, contenido, tieneDatos }: AccionesReporteGuardadoProps) {
  const [guardando, setGuardando] = useState(false);
  const [reporteId, setReporteId] = useState<number | null>(null);
  const [guardado, setGuardado] = useState(false);

  useEffect(() => {
    setReporteId(null);
    setGuardado(false);
  }, [contenido]);

  const guardar = async (): Promise<void> => {
    if (!tieneDatos) {
      window.alert('Debe consultar un reporte con datos válidos antes de guardar.');
      return;
    }
    const usuarioGeneroId = obtenerUsuarioId();
    if (!usuarioGeneroId) {
      window.alert('No se pudo identificar al administrador que genera el reporte.');
      return;
    }
    setGuardando(true);
    try {
      const reporte = await guardarReporte({ tipoReporte, usuarioGeneroId, contenido: { nombre: nombreReporte, ...contenido } });
      setReporteId(reporte.id);
      setGuardado(true);
    } catch (error) {
      console.error(`Error al guardar reporte de ${tipoReporte}:`, error);
      window.alert(error instanceof Error ? error.message : 'No se pudo guardar el reporte.');
      setGuardado(false);
    } finally {
      setGuardando(false);
    }
  };

  return <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
    <button type="button" onClick={guardar} disabled={guardando || guardado} className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 hover:shadow-md active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-600 disabled:opacity-100 dark:bg-emerald-600 dark:hover:bg-emerald-500 dark:disabled:bg-slate-700 dark:disabled:text-slate-300">
      {guardando ? 'Guardando...' : guardado ? 'Reporte guardado ✓' : 'Guardar reporte'}
    </button>
    <BotonesExportarReporte reporteId={reporteId} nombreReporte={nombreReporte} tieneDatos={tieneDatos} />
  </div>;
}
