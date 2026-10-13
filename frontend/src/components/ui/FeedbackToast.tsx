import { useEffect, useRef, useState } from 'react';

type TipoNotificacion = 'bienvenida' | 'registro' | 'despedida' | 'error';

interface Notificacion {
  tipo: TipoNotificacion;
  mensaje: string;
}

const ICONOS: Record<TipoNotificacion, string> = {
  bienvenida: 'user',
  registro: 'check',
  despedida: 'star',
  error: 'error',
};

export function mostrarFeedback(tipo: TipoNotificacion, mensaje: string) {
  window.dispatchEvent(
    new CustomEvent<Notificacion>('sigtad:feedback', {
      detail: { tipo, mensaje },
    }),
  );
}

export default function FeedbackToast() {
  const [notificacion, setNotificacion] = useState<Notificacion | null>(null);
  const [saliendo, setSaliendo] = useState(false);
  const temporizadorSalida = useRef<number | null>(null);
  const temporizadorOcultar = useRef<number | null>(null);

  useEffect(() => {
    const recibirNotificacion = (evento: Event) => {
      const detalle = (evento as CustomEvent<Notificacion>).detail;
      if (!detalle?.mensaje) return;

      if (temporizadorSalida.current) window.clearTimeout(temporizadorSalida.current);
      if (temporizadorOcultar.current) window.clearTimeout(temporizadorOcultar.current);
      setSaliendo(false);
      setNotificacion(detalle);
      temporizadorSalida.current = window.setTimeout(() => setSaliendo(true), 3400);
      temporizadorOcultar.current = window.setTimeout(() => setNotificacion(null), 3800);
    };

    window.addEventListener('sigtad:feedback', recibirNotificacion);
    return () => {
      window.removeEventListener('sigtad:feedback', recibirNotificacion);
      if (temporizadorSalida.current) window.clearTimeout(temporizadorSalida.current);
      if (temporizadorOcultar.current) window.clearTimeout(temporizadorOcultar.current);
    };
  }, []);

  if (!notificacion) return null;

  const cerrar = () => {
    if (temporizadorSalida.current) window.clearTimeout(temporizadorSalida.current);
    if (temporizadorOcultar.current) window.clearTimeout(temporizadorOcultar.current);
    setNotificacion(null);
  };

  const icono = ICONOS[notificacion.tipo];
  const encabezados: Record<TipoNotificacion, string> = {
    bienvenida: '¡Bienvenido de nuevo a Aliados Diriá!',
    registro: '¡Cuenta creada con éxito!',
    despedida: 'Sesión cerrada correctamente',
    error: 'No fue posible completar la acción',
  };

  return (
    <div
      className={`sigtad-feedback-toast fixed right-6 top-6 z-[10001] flex w-[calc(100%-3rem)] max-w-md items-center gap-3 overflow-hidden rounded-2xl border border-emerald-500/30 bg-white/90 px-5 py-4 text-slate-800 shadow-2xl backdrop-blur-md transition-all duration-300 dark:bg-emerald-950/90 dark:text-slate-100 ${notificacion.tipo === 'bienvenida' ? 'sigtad-feedback-toast-welcome' : ''} ${notificacion.tipo === 'despedida' ? 'sigtad-feedback-toast-farewell' : ''} ${saliendo ? 'sigtad-feedback-toast-out' : ''}`}
      role="status"
      aria-live="polite"
    >
      <span className="pointer-events-none absolute -right-10 -top-12 h-28 w-28 rounded-full bg-[#8dc63f]/20 blur-2xl" aria-hidden="true" />
      <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#8dc63f]/35 bg-[#8dc63f]/20 text-[#095540]">
        {icono === 'check' && <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden="true"><path d="m5 12 4 4L19 6" strokeLinecap="round" strokeLinejoin="round" /></svg>}
        {icono === 'user' && <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden="true"><circle cx="12" cy="8" r="3.5" /><path d="M5 20c.8-3.1 3.1-4.7 7-4.7s6.2 1.6 7 4.7" strokeLinecap="round" /></svg>}
        {icono === 'star' && <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true"><path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-2.9-5.6 2.9 1.1-6.2L3 9.6l6.2-.9L12 3Z" /></svg>}
        {icono === 'error' && <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true"><path d="M12 8v4m0 4h.01M10.3 3.9 2.8 17a2 2 0 0 0 1.7 3h15a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" strokeLinecap="round" /></svg>}
      </span>
      <div className="relative min-w-0 flex-1">
        <p className="text-sm font-bold leading-5">{encabezados[notificacion.tipo]}</p>
        <p className="mt-0.5 text-xs leading-5 text-slate-600 dark:text-slate-300">{notificacion.mensaje}</p>
      </div>
      <button type="button" onClick={cerrar} className="relative flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-slate-500 transition hover:bg-emerald-500/10 hover:text-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 dark:text-slate-300 dark:hover:text-white" aria-label="Cerrar notificación">
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" strokeLinecap="round" /></svg>
      </button>
    </div>
  );
}
