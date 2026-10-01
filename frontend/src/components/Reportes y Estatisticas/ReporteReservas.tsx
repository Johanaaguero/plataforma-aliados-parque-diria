import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import AccionesReporteGuardado from './AccionesReporteGuardado';
type Periodo = 'hoy' | '7dias' | '30dias' | 'mes' | 'personalizado';

type TemporadaFiltro = '' | 'seca' | 'lluviosa';

type TipoActividadFiltro = '' | 'evento' | 'capacitacion';

interface ReservasPorEstado {
  pendiente: number;
  aprobada: number;
  rechazada: number;
  cancelada: number;
}

interface ReservaPorMes {
  mes: string;
  cantidad: number;
}

interface ReservasPorTipo {
  evento: number;
  capacitacion: number;
}

interface ReservasPorTemporada {
  seca: number;
  lluviosa: number;
}

interface DetalleReserva {
  id: number;
  estado: string;
  fechaReserva: string;
  eventoId: number | null;
  eventoNombre: string;
  tipoActividad: string | null;
  temporada: string | null;
  fechaEvento: string | null;
}

interface InformacionGeneralReporte {
  nombre: string;
  tipo: string;
  periodo:
    | string
    | {
        fechaInicio: string | null;
        fechaFin: string | null;
      };
  filtros: Record<string, string | number | null>;
  fechaGeneracion: string | null;
  numeroReporte: string | null;
}

interface ReporteReservasResponse {
  informacionGeneral?: InformacionGeneralReporte;
  reporte: {
    id: number;
    numeroReporte: string;
    fechaGeneracion: string;
  };
  periodo: {
    fechaInicio: string | null;
    fechaFin: string | null;
  };
  filtros: {
    temporada: string | null;
    tipoActividad: string | null;
  };
  totalReservas: number;
  reservasPorEstado: ReservasPorEstado;
  reservasPorMes: ReservaPorMes[];
  mesConMasReservas: ReservaPorMes | null;
  reservasPorTipo: ReservasPorTipo;
  reservasPorTemporada: ReservasPorTemporada;
  detalleReservas: DetalleReserva[];
}

/* =========================================================
   ICONOGRAFÍA
========================================================= */

function Icono({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

const iconos = {
  reporte: (
    <Icono>
      <path d="M4 19h16" />
      <path d="M7 19v-6M12 19v-10M17 19v-4" />
    </Icono>
  ),

  total: (
    <Icono>
      <rect x="3" y="4" width="18" height="17" rx="2" />
      <path d="M8 2v4M16 2v4M3 10h18" />
      <path d="M8 15h.01M12 15h.01M16 15h.01" />
    </Icono>
  ),

  calendario: (
    <Icono>
      <rect
        x="4"
        y="5"
        width="16"
        height="15"
        rx="2"
      />
      <path d="M8 3v4M16 3v4M4 10h16" />
    </Icono>
  ),

  montana: (
    <Icono>
      <path d="m3 18 5-8 4 5 3-4 6 7" />
      <path d="M3 18h18" />
    </Icono>
  ),

  tendencia: (
    <Icono>
      <path d="M4 17 10 11l4 4 6-8" />
      <path d="M14 7h6v6" />
    </Icono>
  ),

  temporada: (
    <Icono>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </Icono>
  ),

  bloqueado: (
    <Icono>
      <circle cx="12" cy="12" r="9" />
      <path d="m8 8 8 8M16 8l-8 8" />
    </Icono>
  ),

  chevronDown: (
    <svg
      className="h-4 w-4 text-slate-400"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M19 9l-7 7-7-7"
      />
    </svg>
  ),

  checkSmall: (
    <svg
      className="h-4 w-4 text-emerald-600 dark:text-emerald-400"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth="2.5"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M5 13l4 4L19 7"
      />
    </svg>
  ),
};

/* =========================================================
   OPCIONES DE FILTROS
========================================================= */

const OPCIONES_PERIODO: {
  value: Periodo;
  label: string;
}[] = [
  {
    value: 'hoy',
    label: 'Hoy',
  },
  {
    value: '7dias',
    label: 'Últimos 7 días',
  },
  {
    value: '30dias',
    label: 'Últimos 30 días',
  },
  {
    value: 'mes',
    label: 'Este mes',
  },
  {
    value: 'personalizado',
    label: 'Personalizado',
  },
];

const OPCIONES_TEMPORADA: {
  value: TemporadaFiltro;
  label: string;
}[] = [
  { value: '', label: 'Todas las temporadas' },
  { value: 'seca', label: 'Época seca' },
  { value: 'lluviosa', label: 'Época lluviosa' },
];

const OPCIONES_TIPO: {
  value: TipoActividadFiltro;
  label: string;
}[] = [
  { value: '', label: 'Todas' },
  { value: 'evento', label: 'Eventos' },
  { value: 'capacitacion', label: 'Capacitaciones' },
];

/* =========================================================
   CALENDARIO PERSONALIZADO
========================================================= */

const DIAS_SEMANA = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

const MESES = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
];

function formatearISO(fecha: Date): string {
  const anio = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');

  return `${anio}-${mes}-${dia}`;
}

function formatearVisible(fechaISO: string): string {
  if (!fechaISO) {
    return 'dd/mm/aaaa';
  }

  const [anio, mes, dia] = fechaISO.split('-');

  return `${dia}/${mes}/${anio}`;
}

function esMismaFecha(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function obtenerMatrizDias(
  anio: number,
  mes: number,
): Array<{ fecha: Date; delMes: boolean }> {
  const primerDia = new Date(anio, mes, 1);

  // La semana comienza en lunes.
  const offset = (primerDia.getDay() + 6) % 7;

  const inicio = new Date(
    anio,
    mes,
    1 - offset,
  );

  const dias: Array<{
    fecha: Date;
    delMes: boolean;
  }> = [];

  for (let i = 0; i < 42; i += 1) {
    const fecha = new Date(inicio);

    fecha.setDate(inicio.getDate() + i);

    dias.push({
      fecha,
      delMes: fecha.getMonth() === mes,
    });
  }

  return dias;
}

function Calendario({
  valorSeleccionado,
  onSeleccionar,
  onCerrar,
}: {
  valorSeleccionado: string;
  onSeleccionar: (fechaISO: string) => void;
  onCerrar: () => void;
}) {
  const hoy = new Date();

  const inicial = valorSeleccionado
    ? new Date(`${valorSeleccionado}T00:00:00`)
    : hoy;

  const [mesVisible, setMesVisible] = useState(
    inicial.getMonth(),
  );

  const [anioVisible, setAnioVisible] = useState(
    inicial.getFullYear(),
  );

  const dias = obtenerMatrizDias(
    anioVisible,
    mesVisible,
  );

  const irMesAnterior = () => {
    if (mesVisible === 0) {
      setMesVisible(11);
      setAnioVisible((anio) => anio - 1);
    } else {
      setMesVisible((mes) => mes - 1);
    }
  };

  const irMesSiguiente = () => {
    if (mesVisible === 11) {
      setMesVisible(0);
      setAnioVisible((anio) => anio + 1);
    } else {
      setMesVisible((mes) => mes + 1);
    }
  };

  return (
    <div className="absolute z-40 mt-2 w-72 rounded-2xl border border-slate-200 bg-white p-4 shadow-xl dark:border-slate-700/80 dark:bg-slate-800">

      {/* ENCABEZADO DEL CALENDARIO */}

      <div className="mb-3 flex items-center justify-between">

        <button
          type="button"
          onClick={irMesAnterior}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-emerald-600 transition hover:bg-emerald-500/10 dark:text-emerald-400 dark:hover:bg-emerald-500/10"
          aria-label="Mes anterior"
        >
          <svg
            viewBox="0 0 24 24"
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m15 18-6-6 6-6" />
          </svg>
        </button>

        <span className="text-sm font-bold capitalize text-slate-800 dark:text-slate-100">
          {MESES[mesVisible]} de {anioVisible}
        </span>

        <button
          type="button"
          onClick={irMesSiguiente}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-emerald-600 transition hover:bg-emerald-500/10 dark:text-emerald-400 dark:hover:bg-emerald-500/10"
          aria-label="Mes siguiente"
        >
          <svg
            viewBox="0 0 24 24"
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m9 6 6 6-6 6" />
          </svg>
        </button>

      </div>

      {/* DÍAS DE LA SEMANA */}

      <div className="grid grid-cols-7 gap-1 text-center text-xs font-bold text-slate-400 dark:text-slate-500">

        {DIAS_SEMANA.map((dia) => (
          <div
            key={dia}
            className="py-1"
          >
            {dia}
          </div>
        ))}

      </div>

      {/* DÍAS */}

      <div className="mt-1 grid grid-cols-7 gap-1">

        {dias.map(
          ({ fecha, delMes }, indice) => {
            const iso = formatearISO(fecha);

            const seleccionado =
              valorSeleccionado === iso;

            const esHoy = esMismaFecha(
              fecha,
              hoy,
            );

            return (
              <button
                key={indice}
                type="button"
                onClick={() => {
                  onSeleccionar(iso);
                  onCerrar();
                }}
                className={`
                  flex h-9 w-9 items-center justify-center rounded-lg text-sm font-semibold transition
                  ${
                    !delMes
                      ? 'text-slate-300 dark:text-slate-600'
                      : 'text-slate-800 dark:text-slate-100'
                  }
                  ${
                    seleccionado
                      ? 'bg-emerald-600 text-white shadow-md hover:bg-emerald-600'
                      : 'hover:bg-emerald-500/10'
                  }
                  ${
                    esHoy && !seleccionado
                      ? 'ring-2 ring-inset ring-emerald-500/60'
                      : ''
                  }
                `}
              >
                {fecha.getDate()}
              </button>
            );
          },
        )}

      </div>

      {/* PIE */}

      <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-sm font-bold dark:border-slate-700/80">

        <button
          type="button"
          onClick={() => {
            onSeleccionar('');
            onCerrar();
          }}
          className="text-slate-500 transition hover:text-rose-600 dark:text-slate-400"
        >
          Borrar
        </button>

        <button
          type="button"
          onClick={() => {
            setMesVisible(
              hoy.getMonth(),
            );

            setAnioVisible(
              hoy.getFullYear(),
            );

            onSeleccionar(
              formatearISO(hoy),
            );

            onCerrar();
          }}
          className="text-emerald-600 transition hover:underline dark:text-emerald-400"
        >
          Hoy
        </button>

      </div>

    </div>
  );
}

function CampoFecha({
  etiqueta,
  valor,
  abierto,
  onAbrir,
  children,
}: {
  etiqueta: string;
  valor: string;
  abierto: boolean;
  onAbrir: () => void;
  children: ReactNode;
}) {
  return (
    <div className="relative">

      <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
        {etiqueta}
      </label>

      <button
        type="button"
        onClick={onAbrir}
        className={`
          flex w-full items-center justify-between gap-2 rounded-xl border bg-white px-4 py-3 text-left text-sm font-medium shadow-sm transition
          dark:bg-slate-800/60
          ${
            abierto
              ? 'border-emerald-500 ring-2 ring-emerald-500/20 dark:border-emerald-400'
              : 'border-slate-200 hover:bg-slate-100/80 dark:border-slate-700/80 dark:hover:bg-slate-800'
          }
          ${
            valor
              ? 'text-slate-800 dark:text-slate-100'
              : 'text-slate-400 dark:text-slate-500'
          }
        `}
      >
        <span>
          {formatearVisible(valor)}
        </span>

        <span className="text-emerald-600 dark:text-emerald-400">
          {iconos.calendario}
        </span>
      </button>

      {children}

    </div>
  );
}
/* =========================================================
   GRÁFICA DE MONTAÑA
   RESERVAS POR MES
========================================================= */

function GraficaMontanaReservas({
  datos,
}: {
  datos: ReservaPorMes[];
}) {
  const ancho = 640;
  const alto = 220;
  const paddingX = 20;

  const paddingTop = 34;
  const paddingBottom = 32;

  if (datos.length === 0) {
    return (
      <div className="py-10 text-center text-sm text-slate-400 dark:text-slate-500">
        No hay reservas registradas durante este período.
      </div>
    );
  }

  const maximo = Math.max(
    ...datos.map((d) => d.cantidad),
    1,
  );

  const zonaAlto =
    alto - paddingTop - paddingBottom;

  const puntos = datos.map((d, i) => {
    const x =
      datos.length === 1
        ? ancho / 2
        : paddingX +
          (i * (ancho - paddingX * 2)) /
            (datos.length - 1);

    const y =
      paddingTop +
      zonaAlto -
      (d.cantidad / maximo) * zonaAlto;

    return {
      x,
      y,
      dato: d,
    };
  });

  const construirCurva = () => {
    if (puntos.length === 0) {
      return '';
    }

    if (puntos.length === 1) {
      return `M ${puntos[0].x} ${puntos[0].y}`;
    }

    let d = `M ${puntos[0].x} ${puntos[0].y}`;

    for (
      let i = 0;
      i < puntos.length - 1;
      i++
    ) {
      const actual = puntos[i];
      const siguiente = puntos[i + 1];

      const puntoMedioX =
        (actual.x + siguiente.x) / 2;

      d += ` Q ${actual.x} ${actual.y} ${puntoMedioX} ${
        (actual.y + siguiente.y) / 2
      }`;

      d += ` Q ${puntoMedioX} ${siguiente.y} ${siguiente.x} ${siguiente.y}`;
    }

    return d;
  };

  const lineaCurva = construirCurva();

  const areaCurva =
    puntos.length > 0
      ? `${lineaCurva} L ${
          puntos[puntos.length - 1].x
        } ${alto - paddingBottom} L ${
          puntos[0].x
        } ${alto - paddingBottom} Z`
      : '';

  const formatearMes = (mes: string) => {
    const partes = mes.split('-');

    if (partes.length !== 2) {
      return mes;
    }

    const anio = Number(partes[0]);
    const numeroMes = Number(partes[1]);

    if (!anio || !numeroMes) {
      return mes;
    }

    const fecha = new Date(
      anio,
      numeroMes - 1,
      1,
    );

    return fecha.toLocaleDateString('es-CR', {
      month: 'short',
    });
  };

  return (
    <div>
      <svg
        viewBox={`0 0 ${ancho} ${alto}`}
        className="w-full overflow-visible"
        role="img"
        aria-label="Gráfica de reservas por mes"
      >
        <defs>
          <linearGradient
            id="degradadoReservasMes"
            x1="0"
            y1="0"
            x2="0"
            y2="1"
          >
            <stop
              offset="0%"
              stopColor="#0ea5e9"
              stopOpacity="0.35"
            />
            <stop
              offset="100%"
              stopColor="#0ea5e9"
              stopOpacity="0"
            />
          </linearGradient>
        </defs>

        {[0.25, 0.5, 0.75].map(
          (frac) => (
            <line
              key={frac}
              x1={paddingX}
              x2={ancho - paddingX}
              y1={
                paddingTop +
                frac * zonaAlto
              }
              y2={
                paddingTop +
                frac * zonaAlto
              }
              className="stroke-slate-200 dark:stroke-slate-800"
              strokeWidth="1"
            />
          ),
        )}

        <path
          d={areaCurva}
          fill="url(#degradadoReservasMes)"
        />

        <path
          d={lineaCurva}
          fill="none"
          className="stroke-sky-500 dark:stroke-sky-400"
          strokeWidth="2.5"
          strokeLinecap="round"
        />

        {puntos.map((p) => (
          <g
            key={`${p.dato.mes}-${p.dato.cantidad}`}
          >
            <circle
              cx={p.x}
              cy={p.y}
              r="4.5"
              className="fill-white stroke-sky-500 dark:fill-slate-900 dark:stroke-sky-400"
              strokeWidth="2.5"
            />

            <text
              x={p.x}
              y={Math.max(p.y - 12, 14)}
              textAnchor="middle"
              className="fill-slate-800 text-[13px] font-bold dark:fill-slate-200"
            >
              {p.dato.cantidad}
            </text>
          </g>
        ))}
      </svg>

      <div className="mt-1 flex justify-between px-1">
        {puntos.map((p) => (
          <span
            key={p.dato.mes}
            className="max-w-[90px] truncate text-center text-[11px] font-semibold text-slate-500 dark:text-slate-400"
            title={p.dato.mes}
          >
            {formatearMes(p.dato.mes)}
          </span>
        ))}
      </div>
    </div>
  );
}

/* =========================================================
   GRÁFICA DE MONTAÑA
   ÉPOCA SECA VS LLUVIOSA
========================================================= */

function GraficaMontanaTemporada({
  datos,
}: {
  datos: ReservasPorTemporada;
}) {
  const puntosBase = [
    {
      nombre: 'Época seca',
      cantidad: datos.seca,
    },
    {
      nombre: 'Época lluviosa',
      cantidad: datos.lluviosa,
    },
  ];

  const ancho = 640;
  const alto = 220;
  const paddingX = 60;

  const paddingTop = 34;
  const paddingBottom = 32;

  const maximo = Math.max(
    ...puntosBase.map((d) => d.cantidad),
    1,
  );

  const zonaAlto =
    alto - paddingTop - paddingBottom;

  const puntos = puntosBase.map((d, i) => {
    const x =
      paddingX +
      (i * (ancho - paddingX * 2)) /
        (puntosBase.length - 1);

    const y =
      paddingTop +
      zonaAlto -
      (d.cantidad / maximo) * zonaAlto;

    return {
      x,
      y,
      dato: d,
    };
  });

  const lineaCurva = `
    M ${puntos[0].x} ${puntos[0].y}
    Q ${puntos[0].x}
      ${puntos[0].y}
      ${(puntos[0].x + puntos[1].x) / 2}
      ${(puntos[0].y + puntos[1].y) / 2}
    Q ${puntos[1].x}
      ${puntos[1].y}
      ${puntos[1].x}
      ${puntos[1].y}
  `;

  const areaCurva = `
    ${lineaCurva}
    L ${puntos[1].x} ${alto - paddingBottom}
    L ${puntos[0].x} ${alto - paddingBottom}
    Z
  `;

  return (
    <div>
      <svg
        viewBox={`0 0 ${ancho} ${alto}`}
        className="w-full overflow-visible"
        role="img"
        aria-label="Gráfica de reservas por temporada"
      >
        <defs>
          <linearGradient
            id="degradadoTemporada"
            x1="0"
            y1="0"
            x2="0"
            y2="1"
          >
            <stop
              offset="0%"
              stopColor="#10b981"
              stopOpacity="0.35"
            />
            <stop
              offset="100%"
              stopColor="#10b981"
              stopOpacity="0"
            />
          </linearGradient>
        </defs>

        {[0.25, 0.5, 0.75].map(
          (frac) => (
            <line
              key={frac}
              x1={paddingX}
              x2={ancho - paddingX}
              y1={
                paddingTop +
                frac * zonaAlto
              }
              y2={
                paddingTop +
                frac * zonaAlto
              }
              className="stroke-slate-200 dark:stroke-slate-800"
              strokeWidth="1"
            />
          ),
        )}

        <path
          d={areaCurva}
          fill="url(#degradadoTemporada)"
        />

        <path
          d={lineaCurva}
          fill="none"
          className="stroke-emerald-500 dark:stroke-emerald-400"
          strokeWidth="2.5"
          strokeLinecap="round"
        />

        {puntos.map((p) => (
          <g key={p.dato.nombre}>
            <circle
              cx={p.x}
              cy={p.y}
              r="4.5"
              className="fill-white stroke-emerald-500 dark:fill-slate-900 dark:stroke-emerald-400"
              strokeWidth="2.5"
            />

            <text
              x={p.x}
              y={Math.max(p.y - 12, 14)}
              textAnchor="middle"
              className="fill-slate-800 text-[13px] font-bold dark:fill-slate-200"
            >
              {p.dato.cantidad}
            </text>
          </g>
        ))}
      </svg>

      <div className="mt-1 flex justify-between px-8">
        {puntos.map((p) => (
          <span
            key={p.dato.nombre}
            className="text-center text-[11px] font-semibold text-slate-500 dark:text-slate-400"
          >
            {p.dato.nombre}
          </span>
        ))}
      </div>
    </div>
  );
}

/* =========================================================
   COMPONENTE PRINCIPAL
========================================================= */

export default function ReporteReservas() {
  const [periodo, setPeriodo] =
    useState<Periodo>('30dias');

  const [desplegableAbierto, setDesplegableAbierto] =
    useState<
      'periodo' | 'temporada' | 'tipo' | null
    >(null);

  const [fechaInicio, setFechaInicio] =
    useState('');

  const [fechaFin, setFechaFin] =
    useState('');

  const [temporada, setTemporada] =
    useState<TemporadaFiltro>('');

  const [tipoActividad, setTipoActividad] =
    useState<TipoActividadFiltro>('');

  const [cargando, setCargando] =
    useState(false);

  const [consultado, setConsultado] =
    useState(false);
    const [campoFechaAbierto, setCampoFechaAbierto] =
  useState<'inicio' | 'fin' | null>(null);

const contenedorFechasRef =
  useRef<HTMLDivElement>(null);

  const [datos, setDatos] =
    useState<ReporteReservasResponse | null>(
      null,
    );
    useEffect(() => {
  function manejarClicFuera(evento: MouseEvent) {
    if (
      contenedorFechasRef.current &&
      !contenedorFechasRef.current.contains(
        evento.target as Node,
      )
    ) {
      setCampoFechaAbierto(null);
    }
  }

  document.addEventListener(
    'mousedown',
    manejarClicFuera,
  );

  return () => {
    document.removeEventListener(
      'mousedown',
      manejarClicFuera,
    );
  };
}, []);

  const [error, setError] =
    useState('');

  /* =========================================================
     TEXTO PERÍODO
  ========================================================= */

  const obtenerTextoPeriodo = () => {
    return (
      OPCIONES_PERIODO.find(
        (o) => o.value === periodo,
      )?.label ?? ''
    );
  };

  /* =========================================================
     FECHAS
  ========================================================= */

  const obtenerFechaLocal = (
    fecha: Date,
  ) => {
    const anio = fecha.getFullYear();

    const mes = String(
      fecha.getMonth() + 1,
    ).padStart(2, '0');

    const dia = String(
      fecha.getDate(),
    ).padStart(2, '0');

    return `${anio}-${mes}-${dia}`;
  };

  const obtenerFechasPeriodo = () => {
    const hoy = new Date();

    if (periodo === 'hoy') {
      const fecha =
        obtenerFechaLocal(hoy);

      return {
        fechaInicio: fecha,
        fechaFin: fecha,
      };
    }

    if (periodo === '7dias') {
      const inicio = new Date(hoy);

      inicio.setDate(
        hoy.getDate() - 6,
      );

      return {
        fechaInicio:
          obtenerFechaLocal(inicio),
        fechaFin:
          obtenerFechaLocal(hoy),
      };
    }

    if (periodo === '30dias') {
      const inicio = new Date(hoy);

      inicio.setDate(
        hoy.getDate() - 29,
      );

      return {
        fechaInicio:
          obtenerFechaLocal(inicio),
        fechaFin:
          obtenerFechaLocal(hoy),
      };
    }

    if (periodo === 'mes') {
      const inicio = new Date(
        hoy.getFullYear(),
        hoy.getMonth(),
        1,
      );

      return {
        fechaInicio:
          obtenerFechaLocal(inicio),
        fechaFin:
          obtenerFechaLocal(hoy),
      };
    }

    return {
      fechaInicio,
      fechaFin,
    };
  };

  /* =========================================================
     CONSULTAR
  ========================================================= */

  const consultar = async () => {
    if (
      periodo === 'personalizado' &&
      (!fechaInicio || !fechaFin)
    ) {
      setError(
        'Debe seleccionar una fecha inicial y una fecha final.',
      );
      return;
    }

    setCargando(true);
    setConsultado(false);
    setError('');

    try {
      const params =
        new URLSearchParams();

      const fechas =
        obtenerFechasPeriodo();

      if (fechas.fechaInicio) {
        params.append(
          'fechaInicio',
          fechas.fechaInicio,
        );
      }

      if (fechas.fechaFin) {
        params.append(
          'fechaFin',
          fechas.fechaFin,
        );
      }

      if (temporada) {
        params.append(
          'temporada',
          temporada,
        );
      }

      if (tipoActividad) {
        params.append(
          'tipoActividad',
          tipoActividad,
        );
      }

      const token =
        sessionStorage.getItem('token') ??
        localStorage.getItem('token');

      if (!token) {
        throw new Error(
          'No se encontró el token de autenticación.',
        );
      }

      const respuesta = await fetch(
        `http://localhost:3000/api/reportes/reservas/estadisticas/reservas?${params.toString()}`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type':
              'application/json',
          },
        },
      );

      const texto =
        await respuesta.text();

      let resultado:
        | ReporteReservasResponse
        | {
            mensaje?: string;
            message?: string;
          };

      try {
        resultado = JSON.parse(texto);
      } catch {
        throw new Error(
          `El servidor no devolvió JSON (status ${respuesta.status}). Revisa la ruta del endpoint.`,
        );
      }

      if (!respuesta.ok) {
        const mensaje =
          'mensaje' in resultado
            ? resultado.mensaje
            : 'message' in resultado
              ? resultado.message
              : undefined;

        throw new Error(
          mensaje ||
            `Error ${respuesta.status}`,
        );
      }

      setDatos(
        resultado as ReporteReservasResponse,
      );

      setConsultado(true);
    } catch (err) {
      console.error(
        'Error al consultar reporte de reservas:',
        err,
      );

      setError(
        err instanceof Error
          ? err.message
          : 'No se pudo generar el reporte.',
      );
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="space-y-6 font-sans text-slate-800 dark:text-slate-100">

      {/* =====================================================
          ENCABEZADO
      ===================================================== */}

     

      {/* =====================================================
          FILTROS
      ===================================================== */}

      <section className="relative z-30 rounded-3xl border border-slate-200/80 bg-white/80 p-6 shadow-sm backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/80">

        <div className="mb-5 flex items-center gap-3">

          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
            {iconos.calendario}
          </span>

          <div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">
              Filtros del reporte
            </h3>

            <p className="text-sm text-slate-500 dark:text-slate-400">
              Seleccione el rango y los filtros
              que desea analizar.
            </p>
          </div>

        </div>

        <div className="grid gap-4 lg:grid-cols-4">

          {/* PERÍODO */}

          <div className="relative">

            <span className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Período
            </span>

            <button
              type="button"
              onClick={() =>
                setDesplegableAbierto(
                  desplegableAbierto === 'periodo'
                    ? null
                    : 'periodo',
                )
              }
              className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm font-medium text-slate-800 shadow-sm transition hover:bg-slate-100/80 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700/80 dark:bg-slate-800/60 dark:text-slate-100 dark:hover:bg-slate-800 dark:focus:border-emerald-400"
            >
              <span>
                {obtenerTextoPeriodo()}
              </span>

              <span
                className={`transition-transform duration-200 ${
                  desplegableAbierto === 'periodo'
                    ? 'rotate-180'
                    : ''
                }`}
              >
                {iconos.chevronDown}
              </span>
            </button>

            {desplegableAbierto === 'periodo' && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() =>
                    setDesplegableAbierto(null)
                  }
                />

                <div className="absolute left-0 top-full z-50 mt-2 w-full rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl dark:border-slate-700/80 dark:bg-slate-800">

                  {OPCIONES_PERIODO.map(
                    (opcion) => {
                      const seleccionado =
                        periodo ===
                        opcion.value;

                      return (
                        <button
                          key={opcion.value}
                          type="button"
                          onClick={() => {
                            setPeriodo(
                              opcion.value,
                            );

                            setDesplegableAbierto(
                              null,
                            );

                            setConsultado(
                              false,
                            );

                            setDatos(null);

                            setError('');
                          }}
                          className={`flex w-full items-center justify-between rounded-xl px-3.5 py-2.5 text-sm font-medium transition ${
                            seleccionado
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300'
                              : 'text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700/50'
                          }`}
                        >
                          <span>
                            {opcion.label}
                          </span>

                          {seleccionado &&
                            iconos.checkSmall}
                        </button>
                      );
                    },
                  )}

                </div>
              </>
            )}

          </div>

          {/* TEMPORADA */}

          <div className="relative">

            <span className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Temporada
            </span>

            <button
              type="button"
              onClick={() =>
                setDesplegableAbierto(
                  desplegableAbierto ===
                    'temporada'
                    ? null
                    : 'temporada',
                )
              }
              className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm font-medium text-slate-800 shadow-sm transition hover:bg-slate-100/80 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700/80 dark:bg-slate-800/60 dark:text-slate-100 dark:hover:bg-slate-800 dark:focus:border-emerald-400"
            >

              <span>
                {
                  OPCIONES_TEMPORADA.find(
                    (o) =>
                      o.value ===
                      temporada,
                  )?.label
                }
              </span>

              <span
                className={`transition-transform duration-200 ${
                  desplegableAbierto ===
                  'temporada'
                    ? 'rotate-180'
                    : ''
                }`}
              >
                {iconos.chevronDown}
              </span>

            </button>

            {desplegableAbierto ===
              'temporada' && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() =>
                    setDesplegableAbierto(null)
                  }
                />

                <div className="absolute left-0 top-full z-50 mt-2 w-full rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl dark:border-slate-700/80 dark:bg-slate-800">

                  {OPCIONES_TEMPORADA.map(
                    (opcion) => {
                      const seleccionado =
                        temporada ===
                        opcion.value;

                      return (
                        <button
                          key={
                            opcion.value ||
                            'todas'
                          }
                          type="button"
                          onClick={() => {
                            setTemporada(
                              opcion.value,
                            );

                            setDesplegableAbierto(
                              null,
                            );

                            setConsultado(
                              false,
                            );

                            setDatos(null);
                          }}
                          className={`flex w-full items-center justify-between rounded-xl px-3.5 py-2.5 text-sm font-medium transition ${
                            seleccionado
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300'
                              : 'text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700/50'
                          }`}
                        >
                          <span>
                            {opcion.label}
                          </span>

                          {seleccionado &&
                            iconos.checkSmall}
                        </button>
                      );
                    },
                  )}

                </div>
              </>
            )}

          </div>

          {/* TIPO DE ACTIVIDAD */}

          <div className="relative">

            <span className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Actividad
            </span>

            <button
              type="button"
              onClick={() =>
                setDesplegableAbierto(
                  desplegableAbierto === 'tipo'
                    ? null
                    : 'tipo',
                )
              }
              className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm font-medium text-slate-800 shadow-sm transition hover:bg-slate-100/80 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700/80 dark:bg-slate-800/60 dark:text-slate-100 dark:hover:bg-slate-800 dark:focus:border-emerald-400"
            >

              <span>
                {
                  OPCIONES_TIPO.find(
                    (o) =>
                      o.value ===
                      tipoActividad,
                  )?.label
                }
              </span>

              <span
                className={`transition-transform duration-200 ${
                  desplegableAbierto === 'tipo'
                    ? 'rotate-180'
                    : ''
                }`}
              >
                {iconos.chevronDown}
              </span>

            </button>

            {desplegableAbierto === 'tipo' && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() =>
                    setDesplegableAbierto(null)
                  }
                />

                <div className="absolute left-0 top-full z-50 mt-2 w-full rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl dark:border-slate-700/80 dark:bg-slate-800">

                  {OPCIONES_TIPO.map(
                    (opcion) => {
                      const seleccionado =
                        tipoActividad ===
                        opcion.value;

                      return (
                        <button
                          key={
                            opcion.value ||
                            'todas'
                          }
                          type="button"
                          onClick={() => {
                            setTipoActividad(
                              opcion.value,
                            );

                            setDesplegableAbierto(
                              null,
                            );

                            setConsultado(
                              false,
                            );

                            setDatos(null);
                          }}
                          className={`flex w-full items-center justify-between rounded-xl px-3.5 py-2.5 text-sm font-medium transition ${
                            seleccionado
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300'
                              : 'text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700/50'
                          }`}
                        >
                          <span>
                            {opcion.label}
                          </span>

                          {seleccionado &&
                            iconos.checkSmall}
                        </button>
                      );
                    },
                  )}

                </div>
              </>
            )}

          </div>

          {/* BOTÓN */}

          <div className="flex items-end">

            <button
              type="button"
              onClick={consultar}
              disabled={
                cargando ||
                (periodo ===
                  'personalizado' &&
                  (!fechaInicio ||
                    !fechaFin))
              }
              className="w-full rounded-xl bg-emerald-600 px-6 py-3 font-semibold text-white shadow-md transition hover:bg-emerald-700 hover:shadow-lg active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {cargando
                ? 'Consultando...'
                : 'Consultar reporte'}
            </button>

          </div>

        </div>







       {/* FECHAS PERSONALIZADAS */}

{periodo === 'personalizado' && (
  <div
    ref={contenedorFechasRef}
    className="mt-5 grid gap-4 rounded-2xl border border-emerald-100 bg-emerald-50/40 p-5 dark:border-emerald-900/30 dark:bg-emerald-950/10 md:grid-cols-2"
  >

    <CampoFecha
      etiqueta="Fecha inicial"
      valor={fechaInicio}
      abierto={
        campoFechaAbierto === 'inicio'
      }
      onAbrir={() =>
        setCampoFechaAbierto(
          (actual) =>
            actual === 'inicio'
              ? null
              : 'inicio',
        )
      }
    >
      {campoFechaAbierto === 'inicio' && (
        <Calendario
          valorSeleccionado={fechaInicio}
          onSeleccionar={setFechaInicio}
          onCerrar={() =>
            setCampoFechaAbierto(null)
          }
        />
      )}
    </CampoFecha>

    <CampoFecha
      etiqueta="Fecha final"
      valor={fechaFin}
      abierto={
        campoFechaAbierto === 'fin'
      }
      onAbrir={() =>
        setCampoFechaAbierto(
          (actual) =>
            actual === 'fin'
              ? null
              : 'fin',
        )
      }
    >
      {campoFechaAbierto === 'fin' && (
        <Calendario
          valorSeleccionado={fechaFin}
          onSeleccionar={setFechaFin}
          onCerrar={() =>
            setCampoFechaAbierto(null)
          }
        />
      )}
    </CampoFecha>

  </div>
)}







      </section>

      {/* =====================================================
          MENSAJE INICIAL
      ===================================================== */}

      {!consultado && !cargando && !error && (
        <section className="rounded-3xl border border-emerald-100 bg-emerald-50/60 p-10 text-center shadow-sm dark:border-emerald-900/40 dark:bg-emerald-950/20">

          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400">
            {iconos.calendario}
          </div>

          <h3 className="mt-4 text-lg font-bold text-slate-800 dark:text-slate-100">
            Seleccione un período
          </h3>

          <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-500 dark:text-slate-400">
            Consulte las estadísticas de reservas
            filtrando por el período, temporada y
            tipo de actividad deseado.
          </p>

        </section>
      )}

      {/* =====================================================
          ERROR
      ===================================================== */}

      {error && (
        <section
          className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50/80 p-5 text-rose-800 shadow-sm dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-200"
          role="alert"
        >

          <span className="mt-0.5 text-rose-600 dark:text-rose-400">
            {iconos.bloqueado}
          </span>

          <div>

            <p className="font-bold">
              No se pudo generar el reporte
            </p>

            <p className="mt-1 text-sm text-rose-700 dark:text-rose-300">
              {error}
            </p>

          </div>

        </section>
      )}

      {/* =====================================================
          CARGANDO
      ===================================================== */}

      {cargando && (
        <section className="rounded-3xl border border-slate-200/80 bg-white/50 p-12 text-center shadow-sm backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/40">

          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-emerald-500/20 border-t-emerald-600 dark:border-emerald-400/20 dark:border-t-emerald-400" />

          <p className="mt-4 text-sm font-medium text-slate-600 dark:text-slate-400">
            Generando reporte...
          </p>

        </section>
      )}

      {/* =====================================================
          RESULTADOS
      ===================================================== */}

      {consultado &&
        !cargando &&
        datos && (
          <>

            {/* RESUMEN */}

            <div className="flex flex-col justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white/60 px-5 py-4 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/60 sm:flex-row sm:items-center">

              <div>

                <p className="text-xs font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400">
                  Período analizado
                </p>

                <p className="mt-0.5 font-bold text-slate-800 dark:text-slate-100">
                  {obtenerTextoPeriodo()}
                </p>

                <p className="mt-1 text-xs font-semibold text-slate-600 dark:text-slate-300">
                  {datos.informacionGeneral?.nombre ??
                    'Reporte de reservas'}
                </p>

                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Tipo:{' '}
                  {datos.informacionGeneral?.tipo ??
                    'reservas'}{' '}
                  · Filtros:{' '}
                  {temporada || 'todas las temporadas'}
                  {' / '}
                  {tipoActividad ||
                    'todos los tipos'}
                </p>

                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Fecha de generaciÃ³n:{' '}
                  {datos.informacionGeneral
                    ?.fechaGeneracion
                    ? new Date(
                        datos.informacionGeneral.fechaGeneracion,
                      ).toLocaleString('es-CR')
                    : 'No aplica'}
                </p>

              </div>

              <div className="text-sm font-medium text-slate-500 dark:text-slate-400">
                {datos.totalReservas}{' '}
                reservas encontradas
              </div>

              <AccionesReporteGuardado tipoReporte="reservas" nombreReporte={datos.informacionGeneral?.nombre ?? 'Reporte de reservas'} contenido={datos as unknown as Record<string, unknown>} tieneDatos={datos.totalReservas > 0} />

            </div>

            {/* MÉTRICAS */}

            <div className="grid grid-cols-1 gap-4 min-[560px]:grid-cols-2 lg:grid-cols-3">

              <article className="relative overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/80">

                <div className="flex items-center justify-between gap-4">

                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                    {iconos.total}
                  </span>

                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    Total
                  </span>

                </div>

                <p className="mt-5 text-3xl font-extrabold tracking-tight text-slate-800 dark:text-slate-100">
                  {datos.totalReservas}
                </p>

                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Reservas registradas
                </p>

              </article>

              <article className="relative overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/80">

                <div className="flex items-center justify-between gap-4">

                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-sky-500/10 text-sky-600 dark:bg-sky-500/20 dark:text-sky-400">
                    {iconos.montana}
                  </span>

                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    Mes destacado
                  </span>

                </div>

                <p className="mt-5 text-xl font-extrabold tracking-tight text-slate-800 dark:text-slate-100">
                  {datos.mesConMasReservas
                    ? datos.mesConMasReservas
                        .mes
                    : 'Sin datos'}
                </p>

                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {datos.mesConMasReservas
                    ? `${datos.mesConMasReservas.cantidad} reservas`
                    : 'No hay reservas'}
                </p>

              </article>

              <article className="relative overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/80">

                <div className="flex items-center justify-between gap-4">

                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
                    {iconos.temporada}
                  </span>

                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    Temporada
                  </span>

                </div>

                <p className="mt-5 text-xl font-extrabold tracking-tight text-slate-800 dark:text-slate-100">
                  {datos.reservasPorTemporada.seca >=
                  datos.reservasPorTemporada
                    .lluviosa
                    ? 'Época seca'
                    : 'Época lluviosa'}
                </p>

                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Mayor cantidad de reservas
                </p>

              </article>

            </div>

            {/* =================================================
                GRÁFICAS
            ================================================= */}

            <div className="grid gap-4 xl:grid-cols-2">

              {/* RESERVAS POR MES */}

              <section className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/80">

                <div className="flex items-start justify-between gap-4">

                  <div>

                    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">
                      Reservas por mes
                    </h3>

                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                      Cantidad de reservas
                      registradas durante el
                      período.
                    </p>

                  </div>

                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-500/10 text-sky-600 dark:bg-sky-500/20 dark:text-sky-400">
                    {iconos.montana}
                  </span>

                </div>

                <div className="mt-6">

                  <GraficaMontanaReservas
                    datos={
                      datos.reservasPorMes
                    }
                  />

                </div>

              </section>

              {/* TEMPORADAS */}

              <section className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/80">

                <div className="flex items-start justify-between gap-4">

                  <div>

                    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">
                      Reservas por temporada
                    </h3>

                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                      Comparación entre época
                      seca y época lluviosa.
                    </p>

                  </div>

                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
                    {iconos.temporada}
                  </span>

                </div>

                <div className="mt-6">

                  <GraficaMontanaTemporada
                    datos={
                      datos.reservasPorTemporada
                    }
                  />

                </div>

              </section>

            </div>

            {/* =================================================
                TIPO DE ACTIVIDAD
            ================================================= */}

            <section className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/80">

              <div className="flex items-start justify-between gap-4">

                <div>

                  <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">
                    Reservas por tipo de actividad
                  </h3>

                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    Comparación entre eventos y
                    capacitaciones.
                  </p>

                </div>

                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-500/10 text-violet-600 dark:bg-violet-500/20 dark:text-violet-400">
                  {iconos.tendencia}
                </span>

              </div>

              <div className="mt-7 space-y-5">

                <div>

                  <div className="mb-2 flex justify-between text-sm font-semibold">

                    <span className="text-slate-700 dark:text-slate-300">
                      Eventos
                    </span>

                    <span className="text-violet-600 dark:text-violet-400">
                      {
                        datos
                          .reservasPorTipo
                          .evento
                      }
                    </span>

                  </div>

                  <div className="h-2.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">

                    <div
                      className="h-full rounded-full bg-violet-500 transition-all duration-500"
                      style={{
                        width: `${
                          (datos
                            .reservasPorTipo
                            .evento /
                            Math.max(
                              datos
                                .reservasPorTipo
                                .evento,
                              datos
                                .reservasPorTipo
                                .capacitacion,
                              1,
                            )) *
                          100
                        }%`,
                      }}
                    />

                  </div>

                </div>

                <div>

                  <div className="mb-2 flex justify-between text-sm font-semibold">

                    <span className="text-slate-700 dark:text-slate-300">
                      Capacitaciones
                    </span>

                    <span className="text-orange-600 dark:text-orange-400">
                      {
                        datos
                          .reservasPorTipo
                          .capacitacion
                      }
                    </span>

                  </div>

                  <div className="h-2.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">

                    <div
                      className="h-full rounded-full bg-orange-500 transition-all duration-500"
                      style={{
                        width: `${
                          (datos
                            .reservasPorTipo
                            .capacitacion /
                            Math.max(
                              datos
                                .reservasPorTipo
                                .evento,
                              datos
                                .reservasPorTipo
                                .capacitacion,
                              1,
                            )) *
                          100
                        }%`,
                      }}
                    />

                  </div>

                </div>

              </div>

            </section>

            {/* =================================================
                ESTADOS
            ================================================= */}

            <section className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/80">

              <div className="flex items-start justify-between gap-4">

                <div>

                  <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">
                    Estado de las reservas
                  </h3>

                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    Distribución según el estado
                    actual.
                  </p>

                </div>

                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-500/10 text-slate-600 dark:bg-slate-500/20 dark:text-slate-400">
                  {iconos.tendencia}
                </span>

              </div>

              <div className="mt-7 space-y-5">

                {[
                  {
                    nombre: 'Pendientes',
                    cantidad:
                      datos
                        .reservasPorEstado
                        .pendiente,
                    color:
                      'bg-amber-500',
                    texto:
                      'text-amber-600 dark:text-amber-400',
                  },
                  {
                    nombre: 'Aprobadas',
                    cantidad:
                      datos
                        .reservasPorEstado
                        .aprobada,
                    color:
                      'bg-emerald-500',
                    texto:
                      'text-emerald-600 dark:text-emerald-400',
                  },
                  {
                    nombre: 'Rechazadas',
                    cantidad:
                      datos
                        .reservasPorEstado
                        .rechazada,
                    color:
                      'bg-rose-500',
                    texto:
                      'text-rose-600 dark:text-rose-400',
                  },
                  {
                    nombre: 'Canceladas',
                    cantidad:
                      datos
                        .reservasPorEstado
                        .cancelada,
                    color:
                      'bg-slate-400',
                    texto:
                      'text-slate-600 dark:text-slate-400',
                  },
                ].map((estado) => {

                  const maximo =
                    Math.max(
                      datos
                        .reservasPorEstado
                        .pendiente,
                      datos
                        .reservasPorEstado
                        .aprobada,
                      datos
                        .reservasPorEstado
                        .rechazada,
                      datos
                        .reservasPorEstado
                        .cancelada,
                      1,
                    );

                  const porcentaje =
                    (estado.cantidad /
                      maximo) *
                    100;

                  return (
                    <div
                      key={estado.nombre}
                    >

                      <div className="mb-2 flex justify-between text-sm font-semibold">

                        <span className="text-slate-700 dark:text-slate-300">
                          {estado.nombre}
                        </span>

                        <span
                          className={
                            estado.texto
                          }
                        >
                          {estado.cantidad}
                        </span>

                      </div>

                      <div className="h-2.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">

                        <div
                          className={`h-full rounded-full ${estado.color} transition-all duration-500`}
                          style={{
                            width: `${porcentaje}%`,
                          }}
                        />

                      </div>

                    </div>
                  );
                })}

              </div>

            </section>

            {/* =================================================
                DETALLE
            ================================================= */}

            <section className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/80">

              <div className="border-b border-slate-100 p-6 dark:border-slate-800">

                <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">

                  <div>

                    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">
                      Reservas registradas
                    </h3>

                    <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
                      Detalle de las reservas
                      encontradas durante el
                      período.
                    </p>

                  </div>

                  <span className="w-fit rounded-full bg-emerald-500/10 px-3.5 py-1.5 text-xs font-bold text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
                    {
                      datos
                        .detalleReservas
                        .length
                    }{' '}
                    registros
                  </span>

                </div>

              </div>

              <div className="overflow-x-auto">

                <table className="w-full min-w-[900px] text-left text-sm">

                  <thead className="bg-slate-50/80 text-xs font-bold uppercase tracking-wider text-slate-500 dark:bg-slate-800/50 dark:text-slate-400">

                    <tr>

                      <th className="px-6 py-4">
                        Fecha reserva
                      </th>

                      <th className="px-6 py-4">
                        Actividad
                      </th>

                      <th className="px-6 py-4">
                        Tipo
                      </th>

                      <th className="px-6 py-4">
                        Temporada
                      </th>

                      <th className="px-6 py-4">
                        Estado
                      </th>

                    </tr>

                  </thead>

                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">

                    {datos
                      .detalleReservas
                      .length === 0 ? (

                      <tr>

                        <td
                          colSpan={5}
                          className="px-6 py-12 text-center text-slate-400 dark:text-slate-500"
                        >
                          No hay reservas
                          registradas durante el
                          período seleccionado.
                        </td>

                      </tr>

                    ) : (

                      datos.detalleReservas.map(
                        (reserva) => (

                          <tr
                            key={reserva.id}
                            className="transition hover:bg-slate-50/80 dark:hover:bg-slate-800/40"
                          >

                            <td className="px-6 py-4 font-medium text-slate-500 dark:text-slate-400">
                              {reserva.fechaReserva
                                ? new Date(
                                    reserva.fechaReserva,
                                  ).toLocaleDateString(
                                    'es-CR',
                                  )
                                : '—'}
                            </td>

                            <td className="px-6 py-4 font-bold text-slate-800 dark:text-slate-100">
                              {reserva.eventoNombre ||
                                'Sin nombre'}
                            </td>

                            <td className="px-6 py-4 text-slate-500 dark:text-slate-400">
                              {reserva.tipoActividad ||
                                '—'}
                            </td>

                            <td className="px-6 py-4 text-slate-500 dark:text-slate-400">
                              {reserva.temporada ||
                                '—'}
                            </td>

                            <td className="px-6 py-4">

                              <span
                                className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                                  reserva.estado ===
                                  'aprobada'
                                    ? 'border border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                                    : reserva.estado ===
                                        'pendiente'
                                      ? 'border border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300'
                                      : reserva.estado ===
                                          'rechazada'
                                        ? 'border border-rose-500/20 bg-rose-500/10 text-rose-700 dark:text-rose-300'
                                        : 'border border-slate-500/20 bg-slate-500/10 text-slate-700 dark:text-slate-300'
                                }`}
                              >
                                {reserva.estado}
                              </span>

                            </td>

                          </tr>

                        ),
                      )
                    )}

                  </tbody>

                </table>

              </div>

            </section>

          </>
        )}

    </div>
  );
}
