import { useEffect, useState } from 'react';
import DatePicker from 'react-datepicker';
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
    <>
      <style>{`
        .calendario-liquid-glass.react-datepicker {
          font-family: inherit;
          border: 1px solid #d1fae5;
          border-radius: 18px;
          overflow: hidden;
          background: rgba(255, 255, 255, 0.98);
          box-shadow: 0 18px 45px rgba(5, 47, 37, 0.20);
          padding: 0;
        }

        .calendario-liquid-glass .react-datepicker__header {
          background: linear-gradient(120deg, #064e3b, #087443, #009444);
          border-bottom: 0;
          padding-top: 13px;
        }

        .calendario-liquid-glass .react-datepicker__current-month,
        .calendario-liquid-glass .react-datepicker__day-name {
          color: #ffffff;
          font-weight: 700;
        }

        .calendario-liquid-glass .react-datepicker__current-month {
          font-size: 15px;
          text-transform: capitalize;
          padding-bottom: 10px;
        }

        .calendario-liquid-glass .react-datepicker__day-names {
          margin-bottom: 3px;
        }

        .calendario-liquid-glass .react-datepicker__day-name {
          font-size: 11px;
          margin: 5px;
        }

        .calendario-liquid-glass .react-datepicker__month {
          margin: 10px;
        }

        .calendario-liquid-glass .react-datepicker__day {
          width: 2rem;
          line-height: 2rem;
          margin: 3px;
          border-radius: 10px;
          color: #18352a;
          font-size: 13px;
          transition: background-color 150ms, color 150ms;
        }

        .calendario-liquid-glass .react-datepicker__day:hover {
          background: #d1fae5;
          color: #065f46;
          border-radius: 10px;
        }

        .calendario-liquid-glass .react-datepicker__day--selected,
        .calendario-liquid-glass .react-datepicker__day--keyboard-selected {
          background: #087443;
          color: #ffffff;
          font-weight: 800;
          border-radius: 10px;
        }

        .calendario-liquid-glass .react-datepicker__day--selected:hover {
          background: #009444;
          color: #ffffff;
        }

        .calendario-liquid-glass .react-datepicker__day--today {
          border: 1px solid #009444;
          font-weight: 800;
        }

        .calendario-liquid-glass .react-datepicker__day--disabled {
          color: #cbd5e1;
          cursor: not-allowed;
        }

        .calendario-liquid-glass .react-datepicker__navigation {
          top: 13px;
        }

        .calendario-liquid-glass .react-datepicker__navigation-icon::before {
          border-color: #ffffff;
          border-width: 2px 2px 0 0;
        }

        .calendario-liquid-glass .react-datepicker__year-dropdown,
        .calendario-liquid-glass .react-datepicker__month-dropdown {
          background: #ffffff;
          border: 1px solid #d1fae5;
          border-radius: 10px;
          box-shadow: 0 8px 20px rgba(5, 47, 37, 0.15);
        }

        .calendario-liquid-glass .react-datepicker__year-option:hover,
        .calendario-liquid-glass .react-datepicker__month-option:hover {
          background: #d1fae5;
        }

        .calendario-liquid-glass .react-datepicker__year-option--selected_year,
        .calendario-liquid-glass .react-datepicker__month-option--selected {
          background: #087443;
          color: white;
        }

        .calendario-liquid-glass .react-datepicker__triangle {
          display: none;
        }

        .calendario-liquid-glass-popper {
          z-index: 99999 !important;
        }

        .calendario-liquid-glass-input {
          box-sizing: border-box;
          width: 100%;
          padding-right: 44px !important;
          cursor: text;
        }
      `}</style>

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
          strictParsing
          placeholderText="DD/MM/AAAA"
          showPopperArrow={false}
          showMonthDropdown
          showYearDropdown
          dropdownMode="select"
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
    </>
  );
}
