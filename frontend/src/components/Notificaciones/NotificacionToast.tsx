import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';

import type { Notificacion } from '../../services/notificacionesService';

interface Props {
  notificacion: Notificacion | null;
  onClose: () => void;
}

export default function NotificacionToast({ notificacion, onClose }: Props) {
  const navigate = useNavigate();
  const [saliendo, setSaliendo] = useState(false);

  useEffect(() => {
    if (!notificacion) return;

    setSaliendo(false);
    const temporizadorSalida = window.setTimeout(() => {
      setSaliendo(true);
    }, 5_000);
    const temporizadorCierre = window.setTimeout(onClose, 5_250);

    return () => {
      window.clearTimeout(temporizadorSalida);
      window.clearTimeout(temporizadorCierre);
    };
  }, [notificacion?.id, onClose]);

  if (!notificacion) return null;

  const abrirNotificaciones = () => {
    onClose();
    navigate('/notificaciones');
  };

  const cerrarManualmente = () => {
    setSaliendo(true);
    window.setTimeout(onClose, 250);
  };

  return createPortal(
    <div className="fixed right-4 top-28 z-[120] w-[min(24rem,calc(100vw-2rem))] sm:right-6">
      <div
        role="status"
        className={`overflow-hidden rounded-2xl border border-emerald-100 bg-white shadow-[0_18px_50px_rgba(5,84,64,.22)] transition-all duration-300 ease-out ${
          saliendo
            ? 'translate-x-6 opacity-0'
            : 'translate-x-0 opacity-100 motion-safe:animate-[toast-entrada_.3s_ease-out]'
        }`}
      >
        <div className="flex items-start gap-3 p-4">
          <button
            type="button"
            onClick={abrirNotificaciones}
            className="flex min-w-0 flex-1 gap-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#009444] focus-visible:ring-offset-2"
            aria-label={`Abrir notificación: ${notificacion.titulo}`}
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#eaf5df] text-[#095540]">
              <svg
                viewBox="0 0 24 24"
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
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

          <button
            type="button"
            onClick={cerrarManualmente}
            aria-label="Cerrar notificación"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          >
            <span aria-hidden="true">×</span>
          </button>
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
