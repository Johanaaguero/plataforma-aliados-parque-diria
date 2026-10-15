import { useEffect, useState } from 'react';

import { guardarReporte } from '../../services/reportesApi';
import { mostrarFeedback } from '../ui/FeedbackToast';
import BotonesExportarReporte from './BotonesExportarReporte';

type TipoReporte = 'usuarios' | 'reservas' | 'emprendimientos' | 'eventos' | 'incidencias';

interface AccionesReporteGuardadoProps {
  tipoReporte: TipoReporte;
  nombreReporte: string;
  contenido: Record<string, unknown>;
  tieneDatos?: boolean; // ya no bloquea el guardado; se conserva por compatibilidad
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
export default function AccionesReporteGuardado({ tipoReporte, nombreReporte, contenido }: AccionesReporteGuardadoProps) {
  const [guardando, setGuardando] = useState(false);
  const [reporteId, setReporteId] = useState<number | null>(null);
  const [guardado, setGuardado] = useState(false);
  const [mensajeError, setMensajeError] = useState<string | null>(null);

  useEffect(() => {
    setReporteId(null);
    setGuardado(false);
    setMensajeError(null);
  }, [contenido]);

  const guardar = async (): Promise<void> => {
    setMensajeError(null);

    const usuarioGeneroId = obtenerUsuarioId();
    if (!usuarioGeneroId) {
      const mensaje = 'No se pudo identificar al administrador que genera el reporte.';
      setMensajeError(mensaje);
      mostrarFeedback('error', mensaje);
      return;
    }
    setGuardando(true);
    try {
      const reporte = await guardarReporte({ tipoReporte, usuarioGeneroId, contenido: { nombre: nombreReporte, ...contenido } });
      setReporteId(reporte.id);
      setGuardado(true);
    } catch (error) {
      console.error(`Error al guardar reporte de ${tipoReporte}:`, error);
      const mensaje = error instanceof Error ? error.message : 'No se pudo guardar el reporte.';
      setMensajeError(mensaje);
      mostrarFeedback('error', mensaje);
      setGuardado(false);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
        <button type="button" onClick={guardar} disabled={guardando || guardado} className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 hover:shadow-md active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-600 disabled:opacity-100 dark:bg-emerald-600 dark:hover:bg-emerald-500 dark:disabled:bg-slate-700 dark:disabled:text-slate-300">
          {guardando ? 'Guardando...' : guardado ? 'Reporte guardado ✓' : 'Guardar reporte'}
        </button>
        <BotonesExportarReporte reporteId={reporteId} nombreReporte={nombreReporte} tieneDatos />
      </div>

      {mensajeError && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900 dark:border-amber-300/20 dark:bg-amber-400/10 dark:text-amber-100"
        >
          <span aria-hidden="true">⚠</span>
          <span>{mensajeError}</span>
        </div>
      )}
    </div>
  );
}