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

const fechaDesdeValor = (valor: string): Date | null => {
  if (!valor) return null;

  const [anio, mes, dia] = valor.split('-').map(Number);
  return Number.isFinite(anio) && Number.isFinite(mes) && Number.isFinite(dia)
    ? new Date(anio, mes - 1, dia)
    : null;
};

const valorDesdeFecha = (fecha: Date): string => {
  const anio = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');
  return `${anio}-${mes}-${dia}`;
};

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
  return (
    <DatePicker
      id={id}
      selected={fechaDesdeValor(value)}
      onChange={(fecha: Date | null) => onChange(fecha ? valorDesdeFecha(fecha) : '')}
      minDate={fechaDesdeValor(min ?? '') ?? undefined}
      maxDate={fechaDesdeValor(max ?? '') ?? undefined}
      dateFormat="dd/MM/yyyy"
      placeholderText="Selecciona una fecha"
      showPopperArrow={false}
      disabled={disabled}
      className={className}
      wrapperClassName="block w-full"
      calendarClassName="calendario-liquid-glass"
      ariaInvalid={ariaInvalid ? 'true' : undefined}
      ariaDescribedBy={ariaDescribedBy}
      autoComplete="off"
    />
  );
}
