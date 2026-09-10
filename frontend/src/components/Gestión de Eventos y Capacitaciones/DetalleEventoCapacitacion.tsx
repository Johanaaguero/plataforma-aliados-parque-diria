import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import {
  formatearCupos,
  obtenerDetalleEvento,
  type EventoCapacitacion,
} from '../../services/eventosCapacitacionesService';
import PortadaEventoCapacitacion from './Portadaeventocapacitacion';

interface DetalleEventoCapacitacionProps {
  eventoId: number;
  urlBaseApi: string;
  eventoAdministrativo?: EventoCapacitacion;
  onClose: () => void;
}

export default function DetalleEventoCapacitacion({
  eventoId,
  urlBaseApi,
  eventoAdministrativo,
  onClose,
}: DetalleEventoCapacitacionProps) {
  const [evento, setEvento] = useState<EventoCapacitacion | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [intento, setIntento] = useState(0);
  const dialogoRef = useRef<HTMLDivElement>(null);
  const cerrarRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const elementoAnterior = document.activeElement;
    const overflowAnterior = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    cerrarRef.current?.focus();

    return () => {
      document.body.style.overflow = overflowAnterior;
      if (elementoAnterior instanceof HTMLElement && elementoAnterior.isConnected) {
        elementoAnterior.focus();
      }
    };
  }, []);

  useEffect(() => {
    const solicitud = new AbortController();
    setError(null);
    setEvento(null);
    setCargando(true);

    async function cargarDetalle() {
      try {
        // Los borradores ya cargados por administración conservan su vista privada.
        const detalle = eventoAdministrativo ?? await obtenerDetalleEvento(eventoId, solicitud.signal);
        if (!solicitud.signal.aborted) setEvento(detalle);
      } catch (error) {
        if (!solicitud.signal.aborted) {
          setError(error instanceof Error ? error.message : 'No se pudo cargar el detalle.');
        }
      } finally {
        if (!solicitud.signal.aborted) setCargando(false);
      }
    }

    void cargarDetalle();
    return () => solicitud.abort();
  }, [eventoId, eventoAdministrativo, intento]);

  function manejarTeclado(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Escape') {
      event.preventDefault();
      onClose();
      return;
    }
    if (event.key !== 'Tab') return;

    const elementos = dialogoRef.current?.querySelectorAll<HTMLElement>(
      'button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), [tabindex="0"]',
    );
    if (!elementos?.length) return;
    const primero = elementos[0];
    const ultimo = elementos[elementos.length - 1];
    if (event.shiftKey && document.activeElement === primero) {
      event.preventDefault();
      ultimo.focus();
    } else if (!event.shiftKey && document.activeElement === ultimo) {
      event.preventDefault();
      primero.focus();
    }
  }

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-[#052f25]/70 p-4 backdrop-blur-sm"
      onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}
      onKeyDown={manejarTeclado}
    >
      <div
        ref={dialogoRef}
        className="max-h-[90dvh] w-full max-w-3xl overflow-y-auto rounded-3xl border border-[#095540]/10 bg-white p-5 shadow-2xl sm:p-8"
        role="dialog"
        aria-modal="true"
        aria-labelledby="titulo-detalle-evento"
        aria-busy={cargando}
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#009444]">Detalle de la actividad</p>
            <h2 id="titulo-detalle-evento" className="mt-1 break-words font-brand text-2xl font-bold text-[#095540] sm:text-3xl">
              {evento?.nombre ?? 'Evento o capacitación'}
            </h2>
          </div>
          <button
            ref={cerrarRef}
            type="button"
            onClick={onClose}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full p-2 text-2xl text-[#095540] hover:bg-[#8DC63F]/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#009444]"
            aria-label="Cerrar detalles"
          >×</button>
        </div>

        {cargando && <p role="status" className="py-12 text-center text-sm text-slate-500">Cargando detalle de la actividad...</p>}

        {error && (
          <div className="rounded-2xl border border-red-200 bg-white p-6 text-center">
            <p role="alert" className="text-sm text-red-700">{error}</p>
            <button type="button" onClick={() => setIntento((actual) => actual + 1)} className="mt-5 rounded-xl bg-[#095540] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#009444] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#009444] focus-visible:ring-offset-2">
              Reintentar
            </button>
          </div>
        )}

        {!cargando && evento && (
          <>
            <div className="mb-5 flex flex-wrap gap-2">
              <span className={`rounded-full px-3 py-1.5 text-xs font-bold ${evento.tipoActividad === 'evento' ? 'bg-[#8DC63F]/20 text-[#095540]' : 'bg-[#00AEEF]/10 text-[#087AA8]'}`}>
                {evento.tipoActividad === 'evento' ? 'Evento' : 'Capacitación'}
              </span>
              <span className="rounded-full border border-[#8DC63F]/30 bg-[#8DC63F]/15 px-3 py-1.5 text-xs font-bold text-[#095540]">
                {formatearCupos(evento)}
              </span>
            </div>
            <PortadaEventoCapacitacion eventoId={evento.id} urlBaseApi={urlBaseApi} />
            <p className="mt-6 whitespace-pre-wrap break-words text-sm leading-6 text-slate-600">
              {evento.descripcion || 'Sin descripción disponible.'}
            </p>
            <dl className="mt-6 grid gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-xs font-bold uppercase tracking-wider text-slate-400">Fecha</dt>
                <dd className="mt-1 text-sm text-slate-700">{evento.fecha ? new Date(`${evento.fecha}T00:00:00`).toLocaleDateString('es-CR', { day: '2-digit', month: 'long', year: 'numeric' }) : 'Fecha pendiente'}</dd>
              </div>
              <div>
                <dt className="text-xs font-bold uppercase tracking-wider text-slate-400">Hora</dt>
                <dd className="mt-1 text-sm text-slate-700">{evento.hora ? new Date(`2000-01-01T${evento.hora}`).toLocaleTimeString('es-CR', { hour: '2-digit', minute: '2-digit', hour12: true }) : 'Hora pendiente'}</dd>
              </div>
              <div className="min-w-0">
                <dt className="text-xs font-bold uppercase tracking-wider text-slate-400">Lugar</dt>
                <dd className="mt-1 break-words text-sm text-slate-700">{evento.lugar || 'Lugar pendiente'}</dd>
              </div>
              <div>
                <dt className="text-xs font-bold uppercase tracking-wider text-slate-400">Temporada</dt>
                <dd className="mt-1 text-sm text-slate-700">{evento.temporada === 'seca' ? 'Seca' : evento.temporada === 'lluviosa' ? 'Lluviosa' : 'Por confirmar'}</dd>
              </div>
            </dl>
          </>
        )}
      </div>
    </div>
  );
}
