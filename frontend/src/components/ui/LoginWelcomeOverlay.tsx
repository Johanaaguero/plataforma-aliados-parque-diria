import { useEffect, useRef, useState } from 'react';

import logo from '../../assets/logo.png';

interface BienvenidaLogin {
  nombre: string | null;
}

export function mostrarBienvenidaLogin(nombre: string | null) {
  window.dispatchEvent(
    new CustomEvent<BienvenidaLogin>('sigtad:login-welcome', {
      detail: { nombre },
    }),
  );
}

export default function LoginWelcomeOverlay() {
  const [bienvenida, setBienvenida] = useState<BienvenidaLogin | null>(null);
  const temporizador = useRef<number | null>(null);

  useEffect(() => {
    const mostrar = (evento: Event) => {
      const detalle = (evento as CustomEvent<BienvenidaLogin>).detail;

      if (temporizador.current) window.clearTimeout(temporizador.current);
      setBienvenida({ nombre: detalle?.nombre ?? null });
      temporizador.current = window.setTimeout(() => setBienvenida(null), 1800);
    };

    window.addEventListener('sigtad:login-welcome', mostrar);

    return () => {
      window.removeEventListener('sigtad:login-welcome', mostrar);
      if (temporizador.current) window.clearTimeout(temporizador.current);
    };
  }, []);

  if (!bienvenida) return null;

  const nombre = bienvenida.nombre?.trim() || 'a Aliados Diriá';

  return (
    <div
      className="sigtad-login-welcome fixed inset-0 z-[9998] flex min-h-dvh items-center justify-center overflow-hidden bg-emerald-950/92 p-6 text-white backdrop-blur-xl"
      role="status"
      aria-live="polite"
    >
      <span className="pointer-events-none absolute -left-24 top-1/4 h-80 w-80 rounded-full bg-lime-300/20 blur-3xl" />
      <span className="pointer-events-none absolute -right-24 bottom-1/4 h-96 w-96 rounded-full bg-emerald-400/15 blur-3xl" />

      <div className="relative flex max-w-lg flex-col items-center rounded-3xl border border-white/25 bg-white/10 px-8 py-10 text-center shadow-2xl shadow-black/30 backdrop-blur-2xl sm:px-12">
        <span className="flex h-24 w-24 items-center justify-center rounded-3xl border border-white/25 bg-white/90 p-2.5 shadow-[0_0_32px_rgba(190,242,100,0.24)] transition-transform duration-700 ease-out">
          <img
            src={logo}
            alt="Aliados del Parque Nacional Diriá"
            className="h-full w-full object-contain"
          />
        </span>
        <p className="mt-6 text-xs font-bold uppercase tracking-[0.22em] text-lime-200">
          Parque Nacional Diriá
        </p>
        <h2 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">
          ¡Bienvenido de nuevo, {nombre}!
        </h2>
        <p className="mt-3 text-sm leading-6 text-emerald-50/80 sm:text-base">
          Tu espacio en Aliados Diriá está listo.
        </p>
      </div>
    </div>
  );
}
