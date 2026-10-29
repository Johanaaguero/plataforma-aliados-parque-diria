import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';

import type { Notificacion } from '../../services/notificacionesService';

interface Props {
  notificaciones: Notificacion[];
  onClose: () => void;
}

export default function NotificacionToast({ notificaciones, onClose }: Props) {
  const navigate = useNavigate();
  const [expandida, setExpandida] = useState(false);

  useEffect(() => {
    if (notificaciones.length === 0) return;
    const temporizadorCierre = window.setTimeout(onClose, 5_000);
    return () => window.clearTimeout(temporizadorCierre);
  }, [notificaciones, onClose]);

  useEffect(() => {
    setExpandida(false);
  }, [notificaciones.length]);

  if (notificaciones.length === 0) return null;

  const abrirNotificaciones = () => {
    onClose();
    navigate('/notificaciones');
  };
  const visible = notificaciones[notificaciones.length - 1];
  const mostradas = expandida ? [...notificaciones].reverse() : [visible];

  return createPortal(
    <div className="fixed right-4 top-28 z-[120] w-[min(24rem,calc(100vw-2rem))] sm:right-6">
      {!expandida && notificaciones.length > 1 && (
        <>
          <div className="mx-3 h-2 rounded-t-xl border border-b-0 border-emerald-100 bg-white/80 shadow-sm" />
          <div className="mx-1.5 h-2 rounded-t-xl border border-b-0 border-emerald-100 bg-white/90 shadow-sm" />
        </>
      )}
      <div className="overflow-hidden rounded-2xl border border-emerald-100 bg-white shadow-[0_18px_50px_rgba(5,84,64,.22)] motion-safe:animate-[toast-entrada_.3s_ease-out]">
        <div className="flex items-center justify-between border-b border-emerald-100 px-4 py-2">
          <button
            type="button"
            onClick={() => setExpandida((actual) => !actual)}
            className="flex min-w-0 items-center gap-2 text-left text-xs font-semibold text-[#095540]"
            aria-expanded={expandida}
          >
            <span>
              {notificaciones.length} notificación
              {notificaciones.length === 1 ? '' : 'es'}
            </span>
            <span aria-hidden="true">{expandida ? '⌄' : '⌃'}</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar todas las notificaciones"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          >
            <span aria-hidden="true">×</span>
          </button>
        </div>
        <div className={expandida ? 'max-h-[min(60vh,28rem)] overflow-y-auto' : ''}>
          {mostradas.map((notificacion) => (
            <button
              key={notificacion.id}
              type="button"
              onClick={abrirNotificaciones}
              className="flex w-full items-start gap-3 p-4 text-left transition hover:bg-emerald-50/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#009444]"
              aria-label={`Abrir notificación: ${notificacion.titulo}`}
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#eaf5df] text-[#095540]">
                <svg
                  viewBox="0 0 24 24"
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  aria-hidden="true"
                >
                  <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
                  <path d="M10 21h4" />
                </svg>
              </span>
              <span className="min-w-0 pt-0.5">
                <span className="block text-sm font-bold text-[#095540]">
                  {notificacion.titulo}
                </span>
                <span className="mt-1 line-clamp-2 block text-sm leading-5 text-slate-600">
                  {notificacion.mensaje}
                </span>
              </span>
            </button>
          ))}
        </div>
        <div className="h-1 bg-[#eaf5df]">
          <div className="h-full origin-left animate-[toast-progreso_5s_linear_forwards] bg-[#8DC63F]" />
        </div>
      </div>
      <style>{`
        @keyframes toast-entrada {
          from { opacity: 0; transform: translate3d(1.5rem, -0.5rem, 0); }
          to { opacity: 1; transform: translate3d(0, 0, 0); }
        }
        @keyframes toast-progreso {
          from { transform: scaleX(1); }
          to { transform: scaleX(0); }
        }
      `}</style>
    </div>,
    document.body,
  );
}
