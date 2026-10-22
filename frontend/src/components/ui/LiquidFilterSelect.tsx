import { useEffect, useId, useRef, useState } from 'react';

export interface LiquidFilterOption {
  value: string;
  label: string;
}

interface LiquidFilterSelectProps {
  value: string;
  options: LiquidFilterOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  ariaLabel: string;
  id?: string;
  disabled?: boolean;
  className?: string;
}

/**
 * Selector de filtros sin el menú nativo del navegador. Conserva el valor y
 * callback que ya usan los módulos, pero presenta una lista Liquid Glass.
 */
export default function LiquidFilterSelect({
  value,
  options,
  onChange,
  placeholder = 'Todos',
  ariaLabel,
  id,
  disabled = false,
  className = '',
}: LiquidFilterSelectProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const listId = useId();
  const selected = options.find((option) => option.value === value);

  useEffect(() => {
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('mousedown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, []);

  const choose = (nextValue: string) => {
    onChange(nextValue);
    setOpen(false);
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        type="button"
        id={id}
        disabled={disabled}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((current) => !current)}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            setOpen(true);
          }
        }}
        className="flex h-12 w-full items-center justify-between rounded-2xl border border-slate-200 bg-white/80 px-4 text-left text-sm font-semibold text-slate-800 shadow-lg backdrop-blur-md transition-all duration-200 hover:border-emerald-400/60 hover:bg-white/90 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-800 dark:bg-slate-900/80 dark:text-white dark:shadow-xl dark:hover:border-emerald-400/50 dark:hover:bg-slate-900"
      >
        <span className="truncate">{selected?.label ?? placeholder}</span>
        <svg className={`ml-3 h-4 w-4 shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && !disabled && (
        <div id={listId} role="listbox" aria-label={ariaLabel} className="sigtad-menu-reveal absolute left-0 top-full z-[100] mt-2 max-h-60 w-full overflow-y-auto rounded-2xl border border-white/20 bg-white/90 p-1.5 shadow-2xl shadow-slate-900/25 backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/90 dark:shadow-black/40">
          <button
            type="button"
            role="option"
            aria-selected={!value}
            onClick={() => choose('')}
            className="flex w-full items-center justify-between rounded-xl px-4 py-2.5 text-left text-sm text-slate-700 transition-all hover:bg-emerald-500/15 hover:text-emerald-950 focus-visible:outline-none focus-visible:bg-emerald-500/20 dark:text-slate-200 dark:hover:bg-emerald-500/20 dark:hover:text-white"
          >
            <span>{placeholder}</span>
            {!value && <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,.9)]" aria-hidden="true" />}
          </button>
          {options.map((option) => {
            const isSelected = option.value === value;
            return (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => choose(option.value)}
                className="flex w-full items-center justify-between rounded-xl px-4 py-2.5 text-left text-sm text-slate-700 transition-all hover:bg-emerald-500/15 hover:text-emerald-950 focus-visible:outline-none focus-visible:bg-emerald-500/20 dark:text-slate-200 dark:hover:bg-emerald-500/20 dark:hover:text-white"
              >
                <span>{option.label}</span>
                {isSelected && <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,.9)]" aria-hidden="true" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
