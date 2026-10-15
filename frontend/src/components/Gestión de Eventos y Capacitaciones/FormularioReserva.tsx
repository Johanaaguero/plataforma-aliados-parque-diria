import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent as TeclaReact,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import PhoneInput, { isValidPhoneNumber } from 'react-phone-number-input';
import 'react-phone-number-input/style.css';
import es from 'react-phone-number-input/locale/es.json';
import type { EventoCapacitacion } from '../../services/eventosCapacitacionesService';
import {
  crearReserva,
  editarReserva,
  subirComprobanteReserva,
  type DatosReserva,
} from '../../services/inscripcionService';
import CountrySelectPersonalizado from '../CountrySelectPersonalizado';

interface FormularioReservaProps {
  evento: EventoCapacitacion;
  onClose: () => void;
  onSuccess: (cuposDisponibles: number | null) => void;
  reservaInicial?: DatosReserva;
}

type CampoReserva = keyof DatosReserva;
type ErroresReserva = Partial<Record<CampoReserva, string>>;

const camposIniciales: DatosReserva = {
  nombreCompleto: '',
  fechaNacimiento: '',
  tipoIdentificacion: 'cedula',
  numeroIdentificacion: '',
  correo: '',
  telefono: '',
};

const MESES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];

const AYUDA_IDENTIFICACION: Record<
  DatosReserva['tipoIdentificacion'],
  { placeholder: string; ayuda: string }
> = {
  cedula: { placeholder: '123456789', ayuda: '9 dígitos, sin guiones ni espacios.' },
  dimex: { placeholder: '12345678901', ayuda: '11 o 12 dígitos, sin guiones.' },
  pasaporte: { placeholder: 'A1234567', ayuda: '6 a 20 letras o números.' },
};

/* ---------- Estilos compartidos ---------- */

const CAMPO_BASE =
  'w-full rounded-xl border border-[#095540]/20 bg-white px-3.5 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-[#009444]/60 focus:border-[#009444] focus:ring-4 focus:ring-[#009444]/15 disabled:cursor-not-allowed disabled:bg-slate-100 dark:bg-slate-900 dark:text-slate-100';

const CAMPO_ERROR =
  'border-red-400 bg-red-50/40 hover:border-red-400 focus:border-red-500 focus:ring-red-500/15';

const BOTON_SECUNDARIO =
  'rounded-lg border border-sky-500/30 px-3 py-1.5 text-xs font-bold text-sky-800 transition hover:bg-sky-500/10 disabled:opacity-50 dark:text-sky-200';

const BOTON_PELIGRO =
  'rounded-lg border border-rose-500/30 px-3 py-1.5 text-xs font-bold text-rose-700 transition hover:bg-rose-500/10 disabled:opacity-50 dark:text-rose-200';

function claseCampo(conError: boolean) {
  return `${CAMPO_BASE} ${conError ? CAMPO_ERROR : ''}`;
}

/* ---------- Utilidades de fecha / validación ---------- */

function fechaLocalValida(valor: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(valor)) return null;

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

function calcularEdad(fechaNacimiento: Date): number {
  const hoy = new Date();
  let edad = hoy.getFullYear() - fechaNacimiento.getFullYear();

  if (
    hoy.getMonth() < fechaNacimiento.getMonth() ||
    (hoy.getMonth() === fechaNacimiento.getMonth() &&
      hoy.getDate() < fechaNacimiento.getDate())
  ) {
    edad -= 1;
  }

  return edad;
}

function validarIdentificacion(
  tipo: DatosReserva['tipoIdentificacion'],
  numero: string,
): boolean {
  if (tipo === 'cedula') return /^\d{9}$/.test(numero);
  if (tipo === 'dimex') return /^\d{11,12}$/.test(numero);
  return /^[A-Za-z0-9]{6,20}$/.test(numero);
}

interface PartesFecha {
  dia: string;
  mes: string;
  anio: string;
}

function separarFecha(valor: string): PartesFecha {
  const coincide = /^(\d{4})-(\d{2})-(\d{2})$/.exec(valor);
  if (!coincide) return { dia: '', mes: '', anio: '' };

  return {
    anio: coincide[1],
    mes: String(Number(coincide[2])),
    dia: String(Number(coincide[3])),
  };
}

function unirFecha({ dia, mes, anio }: PartesFecha): string {
  if (!dia || !mes || anio.length !== 4) return '';
  return `${anio}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`;
}

/* ---------- Componentes auxiliares ---------- */

function Seccion({
  titulo,
  descripcion,
  children,
}: {
  titulo: string;
  descripcion?: string;
  children: ReactNode;
}) {
  return (
    <section className="relative z-0 rounded-2xl border border-[#095540]/10 bg-white/80 p-4 shadow-sm focus-within:z-30 [&:has([aria-expanded=true])]:z-30 dark:border-white/10 dark:bg-slate-900/50 sm:p-5">
      <div className="mb-4 flex items-center gap-3">
        <span
          className="h-6 w-1.5 rounded-full bg-gradient-to-b from-[#8DC63F] to-[#009444]"
          aria-hidden="true"
        />
        <div>
          <h3 className="font-brand text-base font-bold text-[#095540] dark:text-emerald-200">
            {titulo}
          </h3>
          {descripcion && (
            <p className="text-xs text-slate-500">{descripcion}</p>
          )}
        </div>
      </div>
      {children}
    </section>
  );
}

function Campo({
  id,
  etiqueta,
  error,
  ayuda,
  className = '',
  children,
}: {
  id: string;
  etiqueta: string;
  error?: string;
  ayuda?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={className}>
      <label
        htmlFor={id}
        className="mb-1.5 block text-sm font-semibold text-[#095540] dark:text-emerald-100"
      >
        {etiqueta}
      </label>

      {children}

      {error ? (
        <p
          id={`${id}-error`}
          className="mt-1.5 flex items-start gap-1.5 text-xs font-semibold text-red-700"
          role="alert"
        >
          <svg
            className="mt-px h-3.5 w-3.5 shrink-0"
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-8-4a.9.9 0 0 0-.9.9v3.7a.9.9 0 1 0 1.8 0V6.9A.9.9 0 0 0 10 6Zm0 8.4a1.1 1.1 0 1 0 0-2.2 1.1 1.1 0 0 0 0 2.2Z"
              clipRule="evenodd"
            />
          </svg>
          {error}
        </p>
      ) : ayuda ? (
        <p id={`${id}-ayuda`} className="mt-1.5 text-xs text-slate-500">
          {ayuda}
        </p>
      ) : null}
    </div>
  );
}

/* ---------- Desplegable personalizado ---------- */

interface OpcionDesplegable {
  valor: string;
  etiqueta: string;
  detalle?: string;
}

function Desplegable({
  id,
  valor,
  opciones,
  onChange,
  disabled,
}: {
  id: string;
  valor: string;
  opciones: OpcionDesplegable[];
  onChange: (valor: string) => void;
  disabled?: boolean;
}) {
  const [abierto, setAbierto] = useState(false);
  const contenedorRef = useRef<HTMLDivElement>(null);
  const botonRef = useRef<HTMLButtonElement>(null);
  const opcionesRef = useRef<(HTMLButtonElement | null)[]>([]);

  const indiceActivo = Math.max(
    0,
    opciones.findIndex((opcion) => opcion.valor === valor),
  );
  const seleccionada = opciones[indiceActivo];

  useEffect(() => {
    if (!abierto) return;

    opcionesRef.current[indiceActivo]?.focus();

    function alHacerClic(event: MouseEvent) {
      if (!contenedorRef.current?.contains(event.target as Node)) {
        setAbierto(false);
      }
    }

    document.addEventListener('mousedown', alHacerClic);
    return () => document.removeEventListener('mousedown', alHacerClic);
    // Solo debe ejecutarse al abrir/cerrar
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abierto]);

  function elegir(nuevoValor: string) {
    onChange(nuevoValor);
    setAbierto(false);
    botonRef.current?.focus();
  }

  function manejarTeclas(event: TeclaReact<HTMLDivElement>) {
    const actual = opcionesRef.current.findIndex(
      (el) => el === document.activeElement,
    );
    let destino = -1;

    switch (event.key) {
      case 'ArrowDown':
        destino = Math.min(actual + 1, opciones.length - 1);
        break;
      case 'ArrowUp':
        destino = Math.max(actual - 1, 0);
        break;
      case 'Home':
        destino = 0;
        break;
      case 'End':
        destino = opciones.length - 1;
        break;
      case 'Escape':
        // Evita que el Escape cierre también todo el formulario
        event.stopPropagation();
        setAbierto(false);
        botonRef.current?.focus();
        return;
      case 'Tab':
        setAbierto(false);
        return;
      default:
        return;
    }

    event.preventDefault();
    opcionesRef.current[destino]?.focus();
  }

  return (
    <div ref={contenedorRef} className="relative">
      <button
        ref={botonRef}
        id={id}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={abierto}
        onClick={() => setAbierto((actual) => !actual)}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown') {
            event.preventDefault();
            setAbierto(true);
          }
          if (event.key === 'Escape' && abierto) {
            event.stopPropagation();
            setAbierto(false);
          }
        }}
        className={`${claseCampo(false)} flex items-center justify-between gap-2 text-left ${
          abierto ? 'border-[#009444] ring-4 ring-[#009444]/15' : ''
        }`}
      >
        <span className="truncate">{seleccionada?.etiqueta}</span>
        <svg
          className={`h-4 w-4 shrink-0 text-[#095540]/60 transition-transform duration-200 ${
            abierto ? 'rotate-180' : ''
          }`}
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.8}
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="m5 7.5 5 5 5-5" />
        </svg>
      </button>

      {abierto && (
        <div
          role="listbox"
          aria-labelledby={id}
          onKeyDown={manejarTeclas}
          className="absolute inset-x-0 top-full z-20 mt-2 flex flex-col gap-1 rounded-2xl border border-[#095540]/20 !bg-white p-2 shadow-2xl shadow-[#052f25]/30 ring-1 ring-black/5 backdrop-blur-none dark:border-white/15 dark:!bg-slate-900"
        >
          {opciones.map((opcion, indice) => {
            const activa = opcion.valor === valor;

            return (
              <button
                key={opcion.valor}
                ref={(el) => {
                  opcionesRef.current[indice] = el;
                }}
                type="button"
                role="option"
                aria-selected={activa}
                tabIndex={activa ? 0 : -1}
                onClick={() => elegir(opcion.valor)}
                className={`flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#009444] ${
                  activa
                    ? 'bg-[#009444] text-white'
                    : 'text-[#095540] hover:bg-[#8DC63F]/20 dark:text-emerald-100'
                }`}
              >
                <span className="min-w-0">
                  <span className="block text-sm font-semibold">
                    {opcion.etiqueta}
                  </span>
                  {opcion.detalle && (
                    <span
                      className={`block text-xs ${
                        activa ? 'text-white/80' : 'text-slate-500'
                      }`}
                    >
                      {opcion.detalle}
                    </span>
                  )}
                </span>

                {activa && (
                  <svg
                    className="h-4 w-4 shrink-0"
                    viewBox="0 0 20 20"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2.2}
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="m4.5 10.5 3.5 3.5 7.5-8"
                    />
                  </svg>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

const OPCIONES_IDENTIFICACION: OpcionDesplegable[] = [
  { valor: 'cedula', etiqueta: 'Cédula de identidad', detalle: 'Nacionales, 9 dígitos' },
  { valor: 'dimex', etiqueta: 'DIMEX', detalle: 'Residentes extranjeros' },
  { valor: 'pasaporte', etiqueta: 'Pasaporte', detalle: 'Otros países' },
];

/* ---------- Componente principal ---------- */

export default function FormularioReserva({
  evento,
  onClose,
  onSuccess,
  reservaInicial,
}: FormularioReservaProps) {
  const uid = useId();
  const id = (nombre: string) => `${uid}-${nombre}`;

  const [formulario, setFormulario] = useState<DatosReserva>(() => ({
    ...camposIniciales,
    ...reservaInicial,
  }));

  // Partes de la fecha: se guardan por separado para poder escribir
  // el día/mes/año sin perder lo digitado mientras la fecha está incompleta.
  const [partesFecha, setPartesFecha] = useState<PartesFecha>(() =>
    separarFecha(reservaInicial?.fechaNacimiento ?? ''),
  );

  const [errores, setErrores] = useState<ErroresReserva>({});
  const [enviando, setEnviando] = useState(false);
  const [mensajeError, setMensajeError] = useState<string | null>(null);
  const [enviado, setEnviado] = useState(false);
  const [comprobante, setComprobante] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [arrastrando, setArrastrando] = useState(false);
  const [mesAbierto, setMesAbierto] = useState(false);

  const primerCampoRef = useRef<HTMLInputElement>(null);
  const comprobanteRef = useRef<HTMLInputElement>(null);
  const diaRef = useRef<HTMLInputElement>(null);
  const mesRef = useRef<HTMLButtonElement>(null);
  const opcionesMesRef = useRef<(HTMLButtonElement | null)[]>([]);
  const selectorFechaRef = useRef<HTMLDivElement>(null);
  const anioRef = useRef<HTMLInputElement>(null);
  const cuerpoRef = useRef<HTMLDivElement>(null);

  const anioActual = new Date().getFullYear();

  const edadCalculada = useMemo(() => {
    const fecha = fechaLocalValida(formulario.fechaNacimiento);
    if (!fecha || fecha > new Date() || fecha.getFullYear() < 1900) return null;
    return calcularEdad(fecha);
  }, [formulario.fechaNacimiento]);

  /* Foco inicial */
  useEffect(() => {
    primerCampoRef.current?.focus();
  }, []);

  /* Bloquear el scroll de fondo mientras el modal está abierto */
  useEffect(() => {
    const anterior = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = anterior;
    };
  }, []);

  /* Cerrar con Escape */
  useEffect(() => {
    function alPresionar(event: KeyboardEvent) {
      if (event.key === 'Escape' && !enviando) onClose();
    }
    window.addEventListener('keydown', alPresionar);
    return () => window.removeEventListener('keydown', alPresionar);
  }, [enviando, onClose]);

  /* Selector de mes: enfocar la opción activa al abrir y cerrar al hacer clic fuera */
  useEffect(() => {
    if (!mesAbierto) return;

    const indiceActivo = partesFecha.mes ? Number(partesFecha.mes) - 1 : 0;
    opcionesMesRef.current[indiceActivo]?.focus();

    function alHacerClic(event: MouseEvent) {
      if (!selectorFechaRef.current?.contains(event.target as Node)) {
        setMesAbierto(false);
      }
    }

    document.addEventListener('mousedown', alHacerClic);
    return () => document.removeEventListener('mousedown', alHacerClic);
    // Solo debe ejecutarse al abrir/cerrar
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mesAbierto]);

  /* Liberar la URL de la vista previa */
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  /* ---------- Comprobante ---------- */

  function seleccionarComprobante(archivo: File | null) {
    setComprobante(archivo);
    setPreviewUrl(
      archivo?.type.startsWith('image/') ? URL.createObjectURL(archivo) : null,
    );
    setMensajeError(null);
  }

  function quitarComprobante() {
    setComprobante(null);
    setPreviewUrl(null);
    if (comprobanteRef.current) comprobanteRef.current.value = '';
  }

  /* ---------- Campos ---------- */

  function actualizarCampo(campo: CampoReserva, valor: string) {
    setFormulario((actual) => ({ ...actual, [campo]: valor }));

    setErrores((actuales) => {
      if (!actuales[campo]) return actuales;
      const siguientes = { ...actuales };
      delete siguientes[campo];
      return siguientes;
    });

    setMensajeError(null);
  }

  function actualizarFecha(cambio: Partial<PartesFecha>) {
    const siguientes = { ...partesFecha, ...cambio };
    setPartesFecha(siguientes);
    actualizarCampo('fechaNacimiento', unirFecha(siguientes));
  }

  function alCambiarDia(valor: string) {
    const limpio = valor.replace(/\D/g, '').slice(0, 2);
    actualizarFecha({ dia: limpio });

    // Avanza al mes cuando el día ya no admite más dígitos
    if (limpio.length === 2 || (limpio.length === 1 && Number(limpio) > 3)) {
      mesRef.current?.focus();
      setMesAbierto(true);
    }
  }

  function seleccionarMes(valor: string) {
    actualizarFecha({ mes: valor });
    setMesAbierto(false);
    anioRef.current?.focus();
  }

  function manejarTeclasMes(event: TeclaReact<HTMLDivElement>) {
    const opciones = opcionesMesRef.current;
    const actual = opciones.findIndex((el) => el === document.activeElement);
    let destino = -1;

    switch (event.key) {
      case 'ArrowRight':
        destino = Math.min(actual + 1, 11);
        break;
      case 'ArrowLeft':
        destino = Math.max(actual - 1, 0);
        break;
      case 'ArrowDown':
        destino = Math.min(actual + 3, 11);
        break;
      case 'ArrowUp':
        destino = Math.max(actual - 3, 0);
        break;
      case 'Home':
        destino = 0;
        break;
      case 'End':
        destino = 11;
        break;
      case 'Escape':
        // Evita que el Escape cierre también todo el formulario
        event.stopPropagation();
        setMesAbierto(false);
        mesRef.current?.focus();
        return;
      case 'Tab':
        setMesAbierto(false);
        return;
      default:
        return;
    }

    event.preventDefault();
    opciones[destino]?.focus();
  }

  function alCambiarAnio(valor: string) {
    actualizarFecha({ anio: valor.replace(/\D/g, '').slice(0, 4) });
  }

  /* ---------- Validación ---------- */

  function validar(): ErroresReserva {
    const siguientes: ErroresReserva = {};

    if (!formulario.nombreCompleto.trim()) {
      siguientes.nombreCompleto = 'Completa este campo.';
    }

    // Fecha de nacimiento
    const hayAlgunaParte = partesFecha.dia || partesFecha.mes || partesFecha.anio;
    const fechaNacimiento = fechaLocalValida(formulario.fechaNacimiento);

    if (!hayAlgunaParte) {
      siguientes.fechaNacimiento = 'Completa tu fecha de nacimiento.';
    } else if (!fechaNacimiento) {
      siguientes.fechaNacimiento =
        'Ingresa una fecha válida (día, mes y año de 4 dígitos).';
    } else if (fechaNacimiento > new Date()) {
      siguientes.fechaNacimiento = 'La fecha no puede estar en el futuro.';
    } else if (fechaNacimiento.getFullYear() < 1900) {
      siguientes.fechaNacimiento = 'Revisa el año de nacimiento.';
    } else {
      const edad = calcularEdad(fechaNacimiento);

      if (
        evento.edadMinima !== null &&
        evento.edadMinima !== undefined &&
        edad < evento.edadMinima
      ) {
        siguientes.fechaNacimiento = `La edad mínima para esta actividad es ${evento.edadMinima} años.`;
      } else if (
        evento.edadMaxima !== null &&
        evento.edadMaxima !== undefined &&
        edad > evento.edadMaxima
      ) {
        siguientes.fechaNacimiento = `La edad máxima para esta actividad es ${evento.edadMaxima} años.`;
      }
    }

    // Identificación
    if (!formulario.numeroIdentificacion.trim()) {
      siguientes.numeroIdentificacion = 'Completa este campo.';
    } else if (
      !validarIdentificacion(
        formulario.tipoIdentificacion,
        formulario.numeroIdentificacion.trim(),
      )
    ) {
      siguientes.numeroIdentificacion =
        'El número no coincide con el tipo seleccionado.';
    }

    // Correo
    if (!formulario.correo.trim()) {
      siguientes.correo = 'Completa este campo.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formulario.correo.trim())) {
      siguientes.correo = 'Ingresa un correo válido.';
    }

    // Teléfono
    if (!formulario.telefono || !isValidPhoneNumber(formulario.telefono)) {
      siguientes.telefono = 'Ingresa un teléfono internacional válido.';
    }

    return siguientes;
  }

  async function manejarEnvio(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const siguientes = validar();
    setErrores(siguientes);

    if (Object.keys(siguientes).length > 0) {
      // Lleva al usuario al primer campo con error
      requestAnimationFrame(() => {
        cuerpoRef.current
          ?.querySelector('[role="alert"]')
          ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
      return;
    }

    if (evento.esPago && !reservaInicial && !comprobante) {
      setMensajeError(
        'Adjunta el comprobante de pago para completar la pre-reserva.',
      );
      cuerpoRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setEnviando(true);
    setMensajeError(null);

    try {
      const resultado = reservaInicial
        ? await editarReserva(evento.id, formulario)
        : await crearReserva(evento.id, formulario);

      if (evento.esPago && !reservaInicial && comprobante) {
        await subirComprobanteReserva(resultado.id, comprobante);
      }

      setEnviado(true);
      onSuccess(resultado.cuposDisponibles);
    } catch (error) {
      setMensajeError(
        error instanceof Error
          ? error.message
          : reservaInicial
            ? 'No se pudo actualizar la reserva.'
            : 'No se pudo enviar la solicitud.',
      );
      cuerpoRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setEnviando(false);
    }
  }

  /* ---------- Datos derivados para la UI ---------- */

  const tieneRangoEdad =
    (evento.edadMinima !== null && evento.edadMinima !== undefined) ||
    (evento.edadMaxima !== null && evento.edadMaxima !== undefined);

  const textoRangoEdad = (() => {
    const min = evento.edadMinima;
    const max = evento.edadMaxima;
    const hayMin = min !== null && min !== undefined;
    const hayMax = max !== null && max !== undefined;

    if (hayMin && hayMax) return `${min} a ${max} años`;
    if (hayMin) return `Desde ${min} años`;
    if (hayMax) return `Hasta ${max} años`;
    return '';
  })();

  const identificacion = AYUDA_IDENTIFICACION[formulario.tipoIdentificacion];
  const errorFecha = errores.fechaNacimiento;

  const textoBoton = enviando
    ? reservaInicial
      ? 'Guardando cambios...'
      : 'Enviando solicitud...'
    : reservaInicial
      ? 'Guardar cambios'
      : 'Enviar solicitud';

  // Se monta en <body> con createPortal para quedar por encima del navbar
  // y fijo en la pantalla, sin importar en qué contenedor se use el componente.
  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-end justify-center overscroll-contain bg-[#052f25]/75 backdrop-blur-sm sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="titulo-formulario-reserva"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !enviando) onClose();
      }}
    >
      {/* Estilos del selector de teléfono */}
      <style>{`
        .reserva-telefono.PhoneInput {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0 0.75rem;
          border: 1px solid rgb(9 85 64 / 0.2);
        }
        .reserva-telefono .PhoneInputInput {
          flex: 1;
          min-width: 0;
          border: 0;
          background: transparent;
          padding: 0.75rem 0;
          font-size: 0.875rem;
          outline: none;
          color: inherit;
        }
        .reserva-telefono .PhoneInputInput::placeholder { color: #94a3b8; }
        .reserva-telefono:focus-within {
          border-color: #009444;
          box-shadow: 0 0 0 4px rgb(0 148 68 / 0.15);
        }
      `}</style>

      <form
        className="relative flex max-h-[96dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl border border-white/20 bg-[#f4f8f2] shadow-2xl dark:border-white/10 dark:bg-slate-950 sm:max-h-[calc(100dvh-3rem)] sm:rounded-3xl"
        noValidate
        onSubmit={manejarEnvio}
        aria-busy={enviando}
      >
        {/* ---------- Encabezado ---------- */}
        <header className="relative shrink-0 overflow-hidden border-b border-[#095540]/10 bg-gradient-to-br from-[#eef6e8] via-[#f6faf3] to-white px-5 pb-5 pt-5 dark:border-white/10 dark:from-slate-900 dark:via-slate-900 dark:to-slate-950 sm:px-7 sm:pt-6">
          <div
            className="pointer-events-none absolute -right-12 -top-14 h-44 w-44 rounded-full bg-[#8DC63F]/20 blur-3xl"
            aria-hidden="true"
          />

          <div className="relative flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs font-semibold text-[#009444]">
                {reservaInicial ? 'Editar reserva' : 'Solicitud de inscripción'}
              </p>

              <h2
                id="titulo-formulario-reserva"
                className="mt-1 font-brand text-2xl font-bold leading-tight text-[#095540] dark:text-emerald-100"
              >
                {reservaInicial ? 'Edita tus datos' : 'Completa tus datos'}
              </h2>

              <p className="mt-1.5 truncate text-sm text-slate-600 dark:text-slate-300">
                {evento.nombre ?? 'Actividad seleccionada'}
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              disabled={enviando}
              aria-label="Cerrar formulario"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xl text-[#095540]/70 transition hover:bg-[#095540]/10 hover:text-[#095540] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#009444] disabled:opacity-50 dark:text-emerald-100"
            >
              ×
            </button>
          </div>

          {(evento.esPago || tieneRangoEdad) && !enviado && (
            <div className="relative mt-4 flex flex-wrap gap-2">
              {evento.esPago && (
                <span className="rounded-full border border-[#095540]/10 bg-white px-3 py-1 text-xs font-semibold text-[#095540] dark:border-white/10 dark:bg-slate-800 dark:text-emerald-100">
                  ₡{(evento.precio ?? 0).toLocaleString('es-CR')}
                </span>
              )}
              {tieneRangoEdad && (
                <span className="rounded-full border border-[#095540]/10 bg-white px-3 py-1 text-xs font-semibold text-[#095540] dark:border-white/10 dark:bg-slate-800 dark:text-emerald-100">
                  {textoRangoEdad}
                </span>
              )}
            </div>
          )}
        </header>

        {enviado ? (
          /* ---------- Estado de éxito ---------- */
          <div className="flex flex-1 flex-col items-center gap-5 overflow-y-auto px-6 py-10 text-center">
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-[#8DC63F]/20 text-[#009444]">
              <svg
                className="h-8 w-8"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2.4}
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="m5 13 4 4L19 7"
                />
              </svg>
            </span>

            <div role="status">
              <p className="font-brand text-xl font-bold text-[#095540] dark:text-emerald-200">
                {reservaInicial ? 'Reserva actualizada' : 'Solicitud enviada'}
              </p>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                {reservaInicial
                  ? 'Tus datos se guardaron correctamente.'
                  : 'Tu solicitud de inscripción quedó en estado Pendiente. Te avisaremos cuando sea revisada.'}
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-full max-w-xs rounded-xl bg-[#095540] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#009444] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#009444] focus-visible:ring-offset-2"
            >
              Cerrar
            </button>
          </div>
        ) : (
          <>
            {/* ---------- Cuerpo con scroll ---------- */}
            <div
              ref={cuerpoRef}
              className="custom-scrollbar flex-1 space-y-4 overflow-y-auto px-4 py-5 sm:px-7"
            >
              {mensajeError && (
                <p
                  className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700"
                  role="alert"
                >
                  {mensajeError}
                </p>
              )}

              {/* Datos personales */}
              <Seccion
                titulo="Datos personales"
                descripcion="Tal como aparecen en tu documento."
              >
                <div className="grid gap-4">
                  <Campo
                    id={id('nombre')}
                    etiqueta="Nombre completo"
                    error={errores.nombreCompleto}
                  >
                    <input
                      id={id('nombre')}
                      ref={primerCampoRef}
                      className={claseCampo(Boolean(errores.nombreCompleto))}
                      value={formulario.nombreCompleto}
                      onChange={(event) =>
                        actualizarCampo('nombreCompleto', event.target.value)
                      }
                      disabled={enviando}
                      autoComplete="name"
                      aria-invalid={Boolean(errores.nombreCompleto)}
                      aria-describedby={
                        errores.nombreCompleto ? `${id('nombre')}-error` : undefined
                      }
                    />
                  </Campo>

                  {/* Fecha de nacimiento: día / mes / año */}
                  <fieldset
                    aria-describedby={`${id('fecha')}-detalle`}
                    disabled={enviando}
                    className="min-w-0"
                  >
                    <legend className="mb-1.5 text-sm font-semibold text-[#095540] dark:text-emerald-100">
                      Fecha de nacimiento
                    </legend>

                    <div
                      ref={selectorFechaRef}
                      className="relative grid grid-cols-[1fr_2fr_1.3fr] gap-2.5"
                    >
                      <input
                        ref={diaRef}
                        type="text"
                        inputMode="numeric"
                        autoComplete="bday-day"
                        placeholder="Día"
                        aria-label="Día de nacimiento"
                        maxLength={2}
                        value={partesFecha.dia}
                        onChange={(event) => alCambiarDia(event.target.value)}
                        onBlur={() => {
                          // 5 → 05 al salir del campo
                          if (partesFecha.dia.length === 1) {
                            actualizarFecha({ dia: partesFecha.dia });
                          }
                        }}
                        aria-invalid={Boolean(errorFecha)}
                        className={`${claseCampo(Boolean(errorFecha))} text-center`}
                      />

                      <button
                        ref={mesRef}
                        type="button"
                        aria-haspopup="listbox"
                        aria-expanded={mesAbierto}
                        aria-label={`Mes de nacimiento${
                          partesFecha.mes
                            ? `: ${MESES[Number(partesFecha.mes) - 1]}`
                            : ''
                        }`}
                        onClick={() => setMesAbierto((abierto) => !abierto)}
                        onKeyDown={(event) => {
                          if (event.key === 'ArrowDown') {
                            event.preventDefault();
                            setMesAbierto(true);
                          }
                          if (event.key === 'Escape' && mesAbierto) {
                            event.stopPropagation();
                            setMesAbierto(false);
                          }
                        }}
                        aria-invalid={Boolean(errorFecha)}
                        className={`${claseCampo(Boolean(errorFecha))} flex items-center justify-between gap-2 text-left ${
                          mesAbierto ? 'border-[#009444] ring-4 ring-[#009444]/15' : ''
                        }`}
                      >
                        <span
                          className={`truncate ${
                            partesFecha.mes ? '' : 'text-slate-400'
                          }`}
                        >
                          {partesFecha.mes
                            ? MESES[Number(partesFecha.mes) - 1]
                            : 'Mes'}
                        </span>
                        <svg
                          className={`h-4 w-4 shrink-0 text-[#095540]/60 transition-transform duration-200 ${
                            mesAbierto ? 'rotate-180' : ''
                          }`}
                          viewBox="0 0 20 20"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth={1.8}
                          aria-hidden="true"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="m5 7.5 5 5 5-5"
                          />
                        </svg>
                      </button>

                      <input
                        ref={anioRef}
                        type="text"
                        inputMode="numeric"
                        autoComplete="bday-year"
                        placeholder="Año"
                        aria-label="Año de nacimiento"
                        maxLength={4}
                        value={partesFecha.anio}
                        onChange={(event) => alCambiarAnio(event.target.value)}
                        onKeyDown={(event) => {
                          if (
                            event.key === 'Backspace' &&
                            partesFecha.anio === ''
                          ) {
                            mesRef.current?.focus();
                          }
                        }}
                        aria-invalid={Boolean(errorFecha)}
                        className={`${claseCampo(Boolean(errorFecha))} text-center`}
                      />

                      {mesAbierto && (
                        <div
                          role="listbox"
                          aria-label="Mes de nacimiento"
                          onKeyDown={manejarTeclasMes}
                          className="absolute inset-x-0 top-full z-20 mt-2 grid grid-cols-3 gap-1 rounded-2xl border border-[#095540]/20 !bg-white p-2 shadow-2xl shadow-[#052f25]/30 ring-1 ring-black/5 backdrop-blur-none dark:border-white/15 dark:!bg-slate-900"
                        >
                          {MESES.map((nombre, indice) => {
                            const valor = String(indice + 1);
                            const activo = partesFecha.mes === valor;

                            return (
                              <button
                                key={nombre}
                                ref={(el) => {
                                  opcionesMesRef.current[indice] = el;
                                }}
                                type="button"
                                role="option"
                                aria-selected={activo}
                                tabIndex={activo ? 0 : -1}
                                onClick={() => seleccionarMes(valor)}
                                className={`rounded-xl px-2 py-2.5 text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#009444] ${
                                  activo
                                    ? 'bg-[#009444] font-bold text-white'
                                    : 'font-medium text-[#095540] hover:bg-[#8DC63F]/20 dark:text-emerald-100'
                                }`}
                              >
                                {nombre}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    <div id={`${id('fecha')}-detalle`} className="mt-1.5 min-h-[1.25rem]">
                      {errorFecha ? (
                        <p
                          className="flex items-start gap-1.5 text-xs font-semibold text-red-700"
                          role="alert"
                        >
                          <svg
                            className="mt-px h-3.5 w-3.5 shrink-0"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                            aria-hidden="true"
                          >
                            <path
                              fillRule="evenodd"
                              d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-8-4a.9.9 0 0 0-.9.9v3.7a.9.9 0 1 0 1.8 0V6.9A.9.9 0 0 0 10 6Zm0 8.4a1.1 1.1 0 1 0 0-2.2 1.1 1.1 0 0 0 0 2.2Z"
                              clipRule="evenodd"
                            />
                          </svg>
                          {errorFecha}
                        </p>
                      ) : edadCalculada !== null ? (
                        <p className="text-xs font-semibold text-[#009444]">
                          Edad: {edadCalculada}{' '}
                          {edadCalculada === 1 ? 'año' : 'años'}
                        </p>
                      ) : (
                        <p className="text-xs text-slate-500">
                          Escribe el día, elige el mes y escribe el año (por ejemplo, 1995).
                        </p>
                      )}
                    </div>
                  </fieldset>
                </div>
              </Seccion>

              {/* Identificación */}
              <Seccion titulo="Identificación">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Campo id={id('tipo-id')} etiqueta="Tipo de identificación">
                    <Desplegable
                      id={id('tipo-id')}
                      valor={formulario.tipoIdentificacion}
                      opciones={OPCIONES_IDENTIFICACION}
                      disabled={enviando}
                      onChange={(nuevo) => {
                        actualizarCampo('tipoIdentificacion', nuevo);
                        // El formato cambia, así que se limpia el error anterior
                        setErrores((actuales) => {
                          if (!actuales.numeroIdentificacion) return actuales;
                          const siguientes = { ...actuales };
                          delete siguientes.numeroIdentificacion;
                          return siguientes;
                        });
                      }}
                    />
                  </Campo>

                  <Campo
                    id={id('num-id')}
                    etiqueta="Número de identificación"
                    error={errores.numeroIdentificacion}
                    ayuda={identificacion.ayuda}
                  >
                    <input
                      id={id('num-id')}
                      className={claseCampo(Boolean(errores.numeroIdentificacion))}
                      value={formulario.numeroIdentificacion}
                      onChange={(event) =>
                        actualizarCampo('numeroIdentificacion', event.target.value)
                      }
                      placeholder={identificacion.placeholder}
                      inputMode={
                        formulario.tipoIdentificacion === 'pasaporte'
                          ? 'text'
                          : 'numeric'
                      }
                      disabled={enviando}
                      autoComplete="off"
                      aria-invalid={Boolean(errores.numeroIdentificacion)}
                      aria-describedby={
                        errores.numeroIdentificacion
                          ? `${id('num-id')}-error`
                          : `${id('num-id')}-ayuda`
                      }
                    />
                  </Campo>
                </div>
              </Seccion>

              {/* Contacto */}
              <Seccion
                titulo="Contacto"
                descripcion="Usaremos estos datos para confirmar tu inscripción."
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <Campo
                    id={id('correo')}
                    etiqueta="Correo electrónico"
                    error={errores.correo}
                  >
                    <input
                      id={id('correo')}
                      type="email"
                      className={claseCampo(Boolean(errores.correo))}
                      value={formulario.correo}
                      onChange={(event) =>
                        actualizarCampo('correo', event.target.value)
                      }
                      placeholder="nombre@correo.com"
                      disabled={enviando}
                      autoComplete="email"
                      aria-invalid={Boolean(errores.correo)}
                      aria-describedby={
                        errores.correo ? `${id('correo')}-error` : undefined
                      }
                    />
                  </Campo>

                  <Campo
                    id={id('telefono')}
                    etiqueta="Teléfono"
                    error={errores.telefono}
                  >
                    <PhoneInput
                      id={id('telefono')}
                      international
                      defaultCountry="CR"
                      labels={es}
                      countrySelectComponent={CountrySelectPersonalizado}
                      value={formulario.telefono || undefined}
                      onChange={(valor) =>
                        actualizarCampo('telefono', valor ?? '')
                      }
                      disabled={enviando}
                      aria-invalid={Boolean(errores.telefono)}
                      className={`reserva-telefono ${claseCampo(Boolean(errores.telefono))}`}
                      placeholder="8888 7777"
                    />
                  </Campo>
                </div>
              </Seccion>

              {/* Pago */}
              {evento.esPago && !reservaInicial && (
                <Seccion
                  titulo="Pago de la actividad"
                  descripcion="Adjunta el comprobante para que lo revise la administración."
                >
                  <div className="rounded-xl border border-sky-200 bg-sky-50/80 p-4 dark:border-sky-400/20 dark:bg-sky-950/30">
                    <p className="text-sm font-bold text-sky-900 dark:text-sky-100">
                      Total a pagar: ₡{(evento.precio ?? 0).toLocaleString('es-CR')}
                    </p>
                    <p className="mt-1 text-xs text-sky-800 dark:text-sky-200">
                      Realiza el pago mediante{' '}
                      {evento.tipoPago === 'sinpe_movil'
                        ? 'SINPE Móvil'
                        : 'transferencia bancaria'}
                      .
                    </p>
                  </div>

                  <div className="mt-4">
                    <span className="mb-1.5 block text-sm font-semibold text-[#095540] dark:text-emerald-100">
                      Comprobante de pago <span aria-hidden="true">*</span>
                    </span>

                    <input
                      ref={comprobanteRef}
                      id={id('comprobante')}
                      type="file"
                      required
                      accept="image/jpeg,image/png,image/webp,application/pdf"
                      className="sr-only"
                      disabled={enviando}
                      onChange={(event) =>
                        seleccionarComprobante(event.target.files?.[0] ?? null)
                      }
                    />

                    {!comprobante && (
                      <label
                        htmlFor={id('comprobante')}
                        onDragOver={(event) => {
                          event.preventDefault();
                          setArrastrando(true);
                        }}
                        onDragLeave={() => setArrastrando(false)}
                        onDrop={(event) => {
                          event.preventDefault();
                          setArrastrando(false);
                          const archivo = event.dataTransfer.files?.[0];
                          if (archivo) seleccionarComprobante(archivo);
                        }}
                        className={`flex cursor-pointer flex-col items-center gap-1.5 rounded-xl border-2 border-dashed px-4 py-6 text-center transition focus-within:ring-4 focus-within:ring-[#009444]/15 ${
                          arrastrando
                            ? 'border-[#009444] bg-[#8DC63F]/15'
                            : 'border-[#095540]/25 bg-white hover:border-[#009444] hover:bg-[#8DC63F]/5 dark:bg-slate-900'
                        }`}
                      >
                        <svg
                          className="h-8 w-8 text-[#009444]"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={1.6}
                          aria-hidden="true"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M12 16V4m0 0L8 8m4-4 4 4M4.5 16.5v1.75A2.25 2.25 0 0 0 6.75 20.5h10.5a2.25 2.25 0 0 0 2.25-2.25V16.5"
                          />
                        </svg>
                        <span className="text-sm font-semibold text-[#095540] dark:text-emerald-100">
                          Toca para subir o arrastra el archivo aquí
                        </span>
                        <span className="text-xs text-slate-500">
                          Imagen (JPG, PNG, WebP) o PDF
                        </span>
                      </label>
                    )}

                    {comprobante && previewUrl && (
                      <div className="rounded-xl border border-emerald-500/30 bg-white/70 p-3 dark:bg-slate-950/20">
                        <img
                          src={previewUrl}
                          alt="Vista previa del comprobante de pago"
                          className="mx-auto max-h-48 rounded-lg border border-emerald-500/30 object-contain"
                        />

                        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                          <span className="min-w-0 truncate text-xs font-medium text-slate-600 dark:text-slate-300">
                            {comprobante.name}
                          </span>

                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => comprobanteRef.current?.click()}
                              disabled={enviando}
                              className={BOTON_SECUNDARIO}
                            >
                              Cambiar imagen
                            </button>
                            <button
                              type="button"
                              onClick={quitarComprobante}
                              disabled={enviando}
                              className={BOTON_PELIGRO}
                            >
                              Quitar
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {comprobante?.type === 'application/pdf' && (
                      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-500/25 bg-white/70 p-3 dark:bg-slate-950/20">
                        <div className="flex min-w-0 items-center gap-2 text-rose-700 dark:text-rose-200">
                          <svg
                            className="h-8 w-8 shrink-0"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={1.8}
                            aria-hidden="true"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M14.25 2.75H6.5A1.75 1.75 0 0 0 4.75 4.5v15A1.75 1.75 0 0 0 6.5 21.25h11A1.75 1.75 0 0 0 19.25 19.5V7.75l-5-5Z"
                            />
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M14 2.75v5h5M8 16.5h8M8 13.5h5"
                            />
                          </svg>
                          <span className="truncate text-xs font-bold">
                            {comprobante.name}
                          </span>
                        </div>

                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => comprobanteRef.current?.click()}
                            disabled={enviando}
                            className={BOTON_SECUNDARIO}
                          >
                            Cambiar archivo
                          </button>
                          <button
                            type="button"
                            onClick={quitarComprobante}
                            disabled={enviando}
                            className={BOTON_PELIGRO}
                          >
                            Quitar
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </Seccion>
              )}
            </div>

            {/* ---------- Pie fijo con acciones ---------- */}
            <footer className="shrink-0 border-t border-[#095540]/10 bg-white/90 px-4 py-4 backdrop-blur dark:border-white/10 dark:bg-slate-900/90 sm:px-7">
              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={enviando}
                  className="rounded-xl border border-[#095540]/20 px-5 py-3 text-sm font-bold text-[#095540] transition hover:bg-[#095540]/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#009444] disabled:opacity-50 dark:text-emerald-100"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={enviando}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#095540] px-6 py-3 text-sm font-bold text-white shadow-lg shadow-[#095540]/20 transition hover:bg-[#009444] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#009444] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {enviando && (
                    <svg
                      className="h-4 w-4 animate-spin"
                      viewBox="0 0 24 24"
                      fill="none"
                      aria-hidden="true"
                    >
                      <circle
                        cx="12"
                        cy="12"
                        r="9"
                        stroke="currentColor"
                        strokeWidth="3"
                        className="opacity-25"
                      />
                      <path
                        d="M21 12a9 9 0 0 0-9-9"
                        stroke="currentColor"
                        strokeWidth="3"
                        strokeLinecap="round"
                      />
                    </svg>
                  )}
                  {textoBoton}
                </button>
              </div>
            </footer>
          </>
        )}
      </form>
    </div>,
    document.body,
  );
}