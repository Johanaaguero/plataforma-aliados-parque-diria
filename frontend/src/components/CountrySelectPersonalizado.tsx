import { useEffect, useRef, useState } from 'react';
import flags from 'react-phone-number-input/flags';
import type { Country } from 'react-phone-number-input';

interface Opcion {
  value: Country | undefined;
  label: string;
}

interface Props {
  value?: Country;
  onChange: (country: Country | undefined) => void;
  options: Opcion[];
  disabled?: boolean;
}

export default function CountrySelectPersonalizado({ value, onChange, options, disabled }: Props) {
  const [abierto, setAbierto] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const contenedorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickFuera(e: MouseEvent) {
      if (contenedorRef.current && !contenedorRef.current.contains(e.target as Node)) {
        setAbierto(false);
        setBusqueda('');
      }
    }
    document.addEventListener('mousedown', handleClickFuera);
    return () => document.removeEventListener('mousedown', handleClickFuera);
  }, []);

  const opcionesFiltradas = options.filter(
    (o) => o.value && o.label.toLowerCase().includes(busqueda.toLowerCase()),
  );

  const paisActual = options.find((o) => o.value === value);
  const BanderaActual = value ? flags[value] : undefined;

  return (
    <div className="relative" ref={contenedorRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setAbierto((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={abierto}
        className="flex items-center gap-1.5 rounded-lg px-1 py-0.5 outline-none hover:bg-[#095540]/5 focus-visible:ring-2 focus-visible:ring-[#009444]/40 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <span className="flex h-4 w-6 items-center justify-center overflow-hidden rounded-sm border border-black/10">
          {BanderaActual ? <BanderaActual title={paisActual?.label ?? ''} /> : <span className="text-xs">🌐</span>}
        </span>

        <svg
          className={`h-3 w-3 text-slate-500 motion-safe:transition-transform ${abierto ? 'rotate-180' : ''}`}
          viewBox="0 0 12 12"
          fill="none"
        >
          <path d="M2.5 4.5l3.5 3 3.5-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {abierto && (
        <div className="absolute left-0 top-full z-20 mt-2 w-72 overflow-hidden rounded-2xl border border-[#095540]/15 bg-white shadow-[0_20px_50px_rgba(0,0,0,0.18)]">
          <div className="border-b border-[#095540]/10 p-2">
            <input
              autoFocus
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar país..."
              className="w-full rounded-lg border border-[#095540]/15 px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus-visible:border-[#009444] focus-visible:ring-2 focus-visible:ring-[#009444]/25"
            />
          </div>

          <ul className="max-h-64 overflow-y-auto py-1" role="listbox">
            {opcionesFiltradas.length === 0 && (
              <li className="px-4 py-3 text-sm text-slate-400">Sin resultados</li>
            )}

            {opcionesFiltradas.map((opcion) => {
              const Bandera = opcion.value ? flags[opcion.value] : undefined;
              const seleccionado = opcion.value === value;

              return (
                <li key={opcion.value ?? 'zz'}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={seleccionado}
                    onClick={() => {
                      onChange(opcion.value);
                      setAbierto(false);
                      setBusqueda('');
                    }}
                    className={`flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm motion-safe:transition-colors ${
                      seleccionado ? 'bg-[#8DC63F]/15 font-semibold text-[#095540]' : 'text-slate-700 hover:bg-[#095540]/5'
                    }`}
                  >
                    <span className="flex h-4 w-6 shrink-0 items-center justify-center overflow-hidden rounded-sm border border-black/10">
                      {Bandera ? <Bandera title={opcion.label} /> : null}
                    </span>
                    <span className="flex-1 truncate">{opcion.label}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}