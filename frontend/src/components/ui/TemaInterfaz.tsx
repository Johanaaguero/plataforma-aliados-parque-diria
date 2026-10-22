import { useEffect, useState } from 'react';

import {
  aplicarTema,
  CLAVE_TEMA,
  guardarPreferenciaTema,
  leerPreferenciaTema,
  type PreferenciaTema,
} from './tema';

const OPCIONES = [
  {
    valor: 'auto',
    nombre: 'Automático',
    descripcion: 'Sigue la apariencia de tu dispositivo.',
  },
  {
    valor: 'light',
    nombre: 'Claro',
    descripcion: 'Luz y tonos naturales.',
  },
  {
    valor: 'dark',
    nombre: 'Oscuro',
    descripcion: 'Tonos profundos y alto contraste.',
  },
] as const;

interface TemaInterfazProps {
  enNavbar?: boolean;
}

export default function TemaInterfaz({
  enNavbar = false,
}: TemaInterfazProps) {
  const [preferencia, setPreferencia] =
    useState<PreferenciaTema>(leerPreferenciaTema);

  const [temaOscuro, setTemaOscuro] = useState(false);

  useEffect(() => {
    const detectarTemaOscuro = () => {
      let oscuro = false;

      // Si el usuario seleccionó oscuro, mostramos luna
      if (preferencia === 'dark') {
        oscuro = true;
      }

      // Si el usuario seleccionó claro, mostramos sol
      else if (preferencia === 'light') {
        oscuro = false;
      }

      // Si está en automático, revisamos el tema del sistema
      else if (preferencia === 'auto') {
        oscuro =
          typeof window.matchMedia === 'function' &&
          window.matchMedia('(prefers-color-scheme: dark)').matches;
      }

      setTemaOscuro(oscuro);

      // Aplicamos el tema
      aplicarTema(preferencia);
    };

    detectarTemaOscuro();

    const sistema =
      typeof window.matchMedia === 'function'
        ? window.matchMedia('(prefers-color-scheme: dark)')
        : null;

    const manejarCambioSistema = () => {
      if (preferencia === 'auto') {
        detectarTemaOscuro();
      }
    };

    sistema?.addEventListener('change', manejarCambioSistema);

    const intervalo = window.setInterval(() => {
      detectarTemaOscuro();
    }, 60_000);

    const sincronizar = (evento: StorageEvent) => {
      if (evento.key === CLAVE_TEMA || evento.key === null) {
        const nuevaPreferencia = leerPreferenciaTema();

        setPreferencia(nuevaPreferencia);
      }
    };

    window.addEventListener('storage', sincronizar);

    return () => {
      sistema?.removeEventListener(
        'change',
        manejarCambioSistema
      );

      window.clearInterval(intervalo);

      window.removeEventListener(
        'storage',
        sincronizar
      );
    };
  }, [preferencia]);

  return (
    <details
      className={
        enNavbar
          ? 'sigtad-theme-control relative z-[60]'
          : 'sigtad-theme-control fixed bottom-4 right-4 z-[60] sm:bottom-6 sm:right-6'
      }
      onKeyDown={(evento) => {
        if (
          evento.key === 'Escape' &&
          evento.currentTarget.open
        ) {
          evento.preventDefault();

          evento.currentTarget.open = false;

          evento.currentTarget
            .querySelector('summary')
            ?.focus();
        }
      }}
    >
      <summary
        className={
          enNavbar
            ? 'flex h-10 w-10 cursor-pointer list-none items-center justify-center rounded-full border border-[#095540]/20 bg-white/80 text-[#095540] shadow-sm backdrop-blur-md transition-all duration-200 hover:scale-105 hover:bg-[#eef7e7] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8dc63f] [&::-webkit-details-marker]:hidden'
            : 'sigtad-glass flex min-h-11 cursor-pointer list-none items-center justify-center gap-2 rounded-full border px-3 py-2.5 text-sm font-bold shadow-lg transition-transform duration-300 hover:scale-110 [&::-webkit-details-marker]:hidden'
        }
        aria-label="Cambiar apariencia"
        title="Cambiar tema"
      >
        {temaOscuro ? (
          /* =========================
             LUNA - TEMA OSCURO
             ========================= */
          <svg
            className="h-5 w-5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            aria-hidden="true"
          >
            <path
              d="M21 12.8A8.5 8.5 0 1 1 11.2 3A6.7 6.7 0 0 0 21 12.8Z"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        ) : (
          /* =========================
             SOL - TEMA CLARO
             ========================= */
          <svg
            className="h-5 w-5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            aria-hidden="true"
          >
            <circle
              cx="12"
              cy="12"
              r="4"
            />

            <path
              d="
                M12 2V4
                M12 20V22
                M4.93 4.93L6.34 6.34
                M17.66 17.66L19.07 19.07
                M2 12H4
                M20 12H22
                M4.93 19.07L6.34 17.66
                M17.66 6.34L19.07 4.93
              "
              strokeLinecap="round"
            />
          </svg>
        )}

        {!enNavbar && (
          <span className="sigtad-heading">
            Tema
          </span>
        )}
      </summary>

      {/* =========================
          MENÚ DE TEMAS
          ========================= */}
      <div className="sigtad-glass sigtad-menu-reveal absolute right-0 top-full mt-2 w-64 max-w-[calc(100vw-2rem)] origin-top-right rounded-2xl border p-3 shadow-xl">
        <p className="sigtad-heading px-2 pb-2 pt-1 text-xs font-bold uppercase tracking-wider">
          Apariencia
        </p>

        <div
          role="group"
          aria-label="Seleccionar tema"
          className="space-y-1"
        >
          {OPCIONES.map((opcion) => (
            <button
              key={opcion.valor}
              type="button"
              aria-pressed={
                preferencia === opcion.valor
              }
              onClick={(evento) => {
                guardarPreferenciaTema(opcion.valor);

                setPreferencia(opcion.valor);

                const control =
                  evento.currentTarget.closest(
                    'details'
                  );

                if (control) {
                  control.open = false;

                  control
                    .querySelector('summary')
                    ?.focus();
                }
              }}
              className="flex min-h-14 w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-[#eef7e7]"
            >
              <span>
                <span className="sigtad-heading block text-sm font-bold">
                  {opcion.nombre}
                </span>

                <span className="sigtad-muted mt-0.5 block text-xs leading-5">
                  {opcion.descripcion}
                </span>
              </span>

              {preferencia === opcion.valor && (
                <span
                  className="sigtad-heading text-lg"
                  aria-hidden="true"
                >
                  ✓
                </span>
              )}
            </button>
          ))}
        </div>
      </div>
    </details>
  );
}
