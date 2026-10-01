import { useEffect, useState, type ComponentType } from 'react';
import DetalleReservaNotificacion from './DetalleReservaNotificacion';
import {
  obtenerDetalleNotificacion,
  type DetalleNotificacion as Detalle,
  type DetalleReserva,
} from '../../../services/notificacionesService';

// Registro: referenciaTipo -> plantilla. Para un nuevo tipo, agrega una línea.
const PLANTILLAS: Record<string, ComponentType<{ datos: any }>> = {
  reserva: DetalleReservaNotificacion as ComponentType<{ datos: DetalleReserva }>,
  // evento: DetalleEventoNotificacion,
  // pago: DetallePagoNotificacion,
};

interface Props {
  notificacionId: number;
  onClose: () => void;
}

export default function DetalleNotificacion({ notificacionId, onClose }: Props) {
  const [detalle, setDetalle] = useState<Detalle | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controlador = new AbortController();
    setCargando(true);
    setError(null);

    obtenerDetalleNotificacion(notificacionId, controlador.signal)
      .then(setDetalle)
      .catch((e) => {
        if (controlador.signal.aborted) return;
        setError(e instanceof Error ? e.message : 'No se pudo cargar el detalle.');
      })
      .finally(() => {
        if (!controlador.signal.aborted) setCargando(false);
      });

    return () => controlador.abort();
  }, [notificacionId]);

  useEffect(() => {
    const cerrar = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', cerrar);
    return () => document.removeEventListener('keydown', cerrar);
  }, [onClose]);

  const Plantilla = detalle?.tipo ? PLANTILLAS[detalle.tipo] : undefined;

  return (
    <div
      className="fixed inset-0 z-[9998] flex items-center justify-center bg-slate-950/65 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="titulo-detalle-notificacion"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-slate-100 bg-white p-6 shadow-2xl sm:p-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <h2
            id="titulo-detalle-notificacion"
            className="text-xl font-bold tracking-tight text-[#095540]"
          >
            {detalle?.notificacion.titulo ?? 'Detalle de la notificación'}
          </h2>

          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {cargando && (
          <div className="space-y-3" role="status" aria-label="Cargando detalle">
            <div className="h-5 w-1/3 animate-pulse rounded bg-slate-200" />
            <div className="h-32 animate-pulse rounded-2xl bg-slate-100" />
            <div className="h-32 animate-pulse rounded-2xl bg-slate-100" />
          </div>
        )}

        {!cargando && error && (
          <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700" role="alert">
            {error}
          </p>
        )}

        {!cargando && !error && detalle && (
          <div className="space-y-4">
            <p className="text-sm leading-6 text-slate-600">{detalle.notificacion.mensaje}</p>

            {Plantilla && detalle.datos ? (
              <Plantilla datos={detalle.datos} />
            ) : (
              <p className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-500">
                Esta notificación no tiene información adicional.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}