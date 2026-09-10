import { useEffect, useState } from 'react';
import {
  aplicarTema,
  CLAVE_TEMA,
  guardarPreferenciaTema,
  leerPreferenciaTema,
  type PreferenciaTema,
} from './tema';

const OPCIONES = [
  { valor: 'auto', nombre: 'Automático', descripcion: 'Sigue la apariencia de tu dispositivo.' },
  { valor: 'light', nombre: 'Claro', descripcion: 'Luz y tonos naturales.' },
  { valor: 'dark', nombre: 'Oscuro', descripcion: 'Tonos profundos y alto contraste.' },
] as const;

interface TemaInterfazProps {
  enNavbar?: boolean;
}

export default function TemaInterfaz({ enNavbar = false }: TemaInterfazProps) {
  const [preferencia, setPreferencia] = useState<PreferenciaTema>(leerPreferenciaTema);

  useEffect(() => {
    const actualizar = () => { aplicarTema(preferencia); };
    actualizar();
    const sistema = typeof window.matchMedia === 'function'
      ? window.matchMedia('(prefers-color-scheme: dark)')
      : null;
    sistema?.addEventListener('change', actualizar);
    // También cubre el cambio de horario si el dispositivo no informa su preferencia.
    const intervalo = window.setInterval(actualizar, 60_000);
    const sincronizar = (evento: StorageEvent) => {
      if (evento.key === CLAVE_TEMA || evento.key === null) {
        setPreferencia(leerPreferenciaTema());
      }
    };
    window.addEventListener('storage', sincronizar);
    return () => {
      sistema?.removeEventListener('change', actualizar);
      window.clearInterval(intervalo);
      window.removeEventListener('storage', sincronizar);
    };
  }, [preferencia]);

  return (
    <details
      className={enNavbar
        ? 'sigtad-theme-control relative z-[60]'
        : 'sigtad-theme-control fixed bottom-4 right-4 z-[60] sm:bottom-6 sm:right-6'}
      onKeyDown={(evento) => {
        if (evento.key === 'Escape' && evento.currentTarget.open) {
          evento.preventDefault();
          evento.currentTarget.open = false;
          evento.currentTarget.querySelector('summary')?.focus();
        }
      }}
    >
      <summary className="sigtad-glass flex min-h-11 cursor-pointer list-none items-center justify-center gap-2 rounded-full border px-3 py-2.5 text-sm font-bold shadow-lg motion-safe:transition-transform motion-safe:duration-300 hover:scale-110" aria-label="Cambiar tema de apariencia">
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
          <path d="M12 3a9 9 0 1 0 9 9 7 7 0 0 1-9-9Z" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Tema
      </summary>
      <div className="sigtad-glass absolute right-0 top-full mt-2 w-64 max-w-[calc(100vw-2rem)] origin-top-right rounded-2xl border p-3 shadow-xl">
        <p className="sigtad-heading px-2 pb-2 pt-1 text-xs font-bold uppercase tracking-wider">Apariencia</p>
        <div role="group" aria-label="Seleccionar tema" className="space-y-1">
          {OPCIONES.map((opcion) => (
            <button
              key={opcion.valor}
              type="button"
              aria-pressed={preferencia === opcion.valor}
              onClick={(evento) => {
                guardarPreferenciaTema(opcion.valor);
                setPreferencia(opcion.valor);
                const control = evento.currentTarget.closest('details');
                if (control) {
                  control.open = false;
                  control.querySelector('summary')?.focus();
                }
              }}
              className="flex min-h-14 w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left"
            >
              <span>
                <span className="sigtad-heading block text-sm font-bold">{opcion.nombre}</span>
                <span className="sigtad-muted mt-0.5 block text-xs leading-5">{opcion.descripcion}</span>
              </span>
              {preferencia === opcion.valor && <span className="sigtad-heading text-lg" aria-hidden="true">✓</span>}
            </button>
          ))}
        </div>
      </div>
    </details>
  );
}
