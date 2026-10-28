
import { useEffect, useState } from 'react';
import DatePicker from 'react-datepicker';
import { es } from 'date-fns/locale';
import 'react-datepicker/dist/react-datepicker.css';

interface DatePickerCampoProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  className: string;
  disabled?: boolean;
  min?: string;
  max?: string;
  ariaInvalid?: boolean;
  ariaDescribedBy?: string;
}

function fechaDesdeValor(valor: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(valor)) {
    return null;
  }

  const [anio, mes, dia] = valor.split('-').map(Number);
  const fecha = new Date(anio, mes - 1, dia);

  if (
    fecha.getFullYear() !== anio ||
    fecha.getMonth() !== mes - 1 ||
    fecha.getDate() !== dia
  ) {
    return null;
  }

  return fecha;
}

function valorDesdeFecha(fecha: Date): string {
  const anio = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');

  return `${anio}-${mes}-${dia}`;
}

export default function DatePickerCampo({
  id,
  value,
  onChange,
  className,
  disabled = false,
  min,
  max,
  ariaInvalid,
  ariaDescribedBy,
}: DatePickerCampoProps) {
  const [fechaSeleccionada, setFechaSeleccionada] =
    useState<Date | null>(() => fechaDesdeValor(value));

  useEffect(() => {
    setFechaSeleccionada(fechaDesdeValor(value));
  }, [value]);

  const fechaMinima = fechaDesdeValor(min ?? '');
  const fechaMaxima = fechaDesdeValor(max ?? '');

  return (
    <div className="relative mt-1 w-full">
      <DatePicker
        id={id}
        selected={fechaSeleccionada}
        onChange={(fecha: Date | null) => {
          setFechaSeleccionada(fecha);
          onChange(fecha ? valorDesdeFecha(fecha) : '');
        }}
        minDate={fechaMinima ?? undefined}
        maxDate={fechaMaxima ?? undefined}
        dateFormat="dd/MM/yyyy"
        locale={es}
        calendarStartDay={1}
        formatWeekDay={(nombre: string) => nombre.slice(0, 3)}
        strictParsing
        placeholderText="DD/MM/AAAA"
        showPopperArrow={false}
        disabled={disabled}
        className={`${className} calendario-liquid-glass-input`}
        wrapperClassName="block w-full"
        calendarClassName="calendario-liquid-glass"
        popperClassName="calendario-liquid-glass-popper"
        popperPlacement="bottom-start"
        ariaInvalid={ariaInvalid ? 'true' : undefined}
        ariaDescribedBy={ariaDescribedBy}
        autoComplete="off"
      />

      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          const input = document.getElementById(id ?? '');

          if (input instanceof HTMLInputElement) {
            input.focus();
            input.click();
          }
        }}
        aria-label="Abrir calendario"
        className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-[#009444] transition hover:bg-emerald-50 disabled:opacity-50"
      >
        <svg
          className="h-5 w-5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.8}
          aria-hidden="true"
        >
          <rect x="3" y="5" width="18" height="16" rx="2.5" />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M16 3v4M8 3v4M3 10h18"
          />
        </svg>
      </button>
    </div>
  );
}
