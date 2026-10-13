import { useEffect, useRef, useState } from 'react';

interface DespedidaLogout {
  nombre: string | null;
}

const DURACION_DESPEDIDA_MS = 1800;

export function mostrarDespedidaLogout(nombre: string | null) {
  window.dispatchEvent(
    new CustomEvent<DespedidaLogout>('sigtad:logout-welcome', {
      detail: { nombre },
    }),
  );
}

export default function LogoutWelcomeOverlay() {
  const [despedida, setDespedida] = useState<DespedidaLogout | null>(null);
  const temporizador = useRef<number | null>(null);

  useEffect(() => {
    const mostrar = (evento: Event) => {
      const detalle = (evento as CustomEvent<DespedidaLogout>).detail;

      if (temporizador.current) window.clearTimeout(temporizador.current);

      setDespedida({ nombre: detalle?.nombre ?? null });
      temporizador.current = window.setTimeout(
        () => setDespedida(null),
        DURACION_DESPEDIDA_MS,
      );
    };

    window.addEventListener('sigtad:logout-welcome', mostrar);

    return () => {
      window.removeEventListener('sigtad:logout-welcome', mostrar);
      if (temporizador.current) window.clearTimeout(temporizador.current);
    };
  }, []);

  if (!despedida) return null;

  const nombre = despedida.nombre?.trim();

  return (
    <div
      className="sigtad-login-welcome sigtad-logout-welcome fixed inset-0 z-[9999] flex min-h-dvh w-screen items-center justify-center overflow-hidden bg-emerald-950/95 p-6 text-white backdrop-blur-xl dark:bg-slate-950/95"
      role="status"
      aria-live="polite"
    >
      <span className="pointer-events-none absolute -left-24 top-1/4 h-80 w-80 rounded-full bg-lime-300/20 blur-3xl" />
      <span className="pointer-events-none absolute -right-24 bottom-1/4 h-96 w-96 rounded-full bg-emerald-400/15 blur-3xl" />

      <div className="relative flex max-w-lg flex-col items-center rounded-3xl border border-white/25 bg-white/10 px-8 py-10 text-center shadow-2xl shadow-black/30 backdrop-blur-2xl sm:px-12">
        <span className="flex h-16 w-16 items-center justify-center rounded-full border border-emerald-300/30 bg-emerald-500/20 text-emerald-300 shadow-[0_0_32px_rgba(190,242,100,0.24)]">
          <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path d="m17 16 4-4m0 0-4-4m4 4H7m6 4v1a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V7a3 3 0 0 1 3-3h4a3 3 0 0 1 3 3v1" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
          </svg>
        </span>
        <h2 className="mt-6 text-2xl font-semibold tracking-tight sm:text-3xl">
          ¡Hasta luego{nombre ? `, ${nombre}` : ''}!
        </h2>
        <p className="mt-3 text-sm leading-6 text-emerald-50/80 sm:text-base">
          Gracias por formar parte de Aliados del Parque Nacional Diriá.
        </p>
      </div>
    </div>
  );
}
