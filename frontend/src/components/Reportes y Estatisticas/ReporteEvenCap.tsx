import { useEffect, useRef, useState, type ReactNode } from 'react';
import AccionesReporteGuardado from './AccionesReporteGuardado';

type Periodo = 'hoy' | '7dias' | '30dias' | 'mes' | 'personalizado';
type TemporadaFiltro = '' | 'seca' | 'lluviosa';
type TipoActividadFiltro = '' | 'evento' | 'capacitacion';

interface ReporteGenerado {
  id: number;
  numeroReporte: string;
  fechaGeneracion: string;
}

interface ActividadPorMes {
  mes: string;
  cantidad: number;
}

interface DetalleActividad {
  id: number;
  nombre: string;
  fecha: string | null;
  hora: string | null;
  lugar: string | null;
  tipoActividad: 'evento' | 'capacitacion' | null;
  cupoMaximo: number | null;
  cuposDisponibles: number | null;
  cupoMinimo: number | null;
  edadMinima: number | null;
  edadMaxima: number | null;
  estado:
    | 'borrador'
    | 'publicado'
    | 'no_publicado'
    | 'desactivado'
    | null;
  temporada: 'seca' | 'lluviosa' | null;
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

interface EstadisticasEventos {
  informacionGeneral?: InformacionGeneralReporte;
  reporte: ReporteGenerado;
  periodo: {
    fechaInicio: string | null;
    fechaFin: string | null;
  };
  filtros: {
    temporada: TemporadaFiltro | null;
    tipoActividad: TipoActividadFiltro | null;
  };
  totalActividades: number;
  actividadesPorTipo: {
    evento: number;
    capacitacion: number;
  };
  actividadesPorEstado: {
    borrador: number;
    publicado: number;
    no_publicado: number;
    desactivado: number;
  };
  actividadesPorTemporada: {
    seca: number;
    lluviosa: number;
  };
  actividadesPorMes: ActividadPorMes[];
  mesConMasActividades: {
    mes: string;
    cantidad: number;
  } | null;
  detalleActividades: DetalleActividad[];
}

interface DatoGraficaMontana {
  nombre: string;
  cantidad: number;
}

function Icono({
  children,
  className = 'w-5 h-5',
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.8}
      stroke="currentColor"
      className={className}
    >
      {children}
    </svg>
  );
}

const iconoCalendario = (
  <Icono>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M6.75 3v2.25M17.25 3v2.25M3.75 9h16.5M5.25 5.25h13.5A1.5 1.5 0 0 1 20.25 6.75v12A1.5 1.5 0 0 1 18.75 20.25H5.25a1.5 1.5 0 0 1-1.5-1.5v-12a1.5 1.5 0 0 1 1.5-1.5Z"
    />
  </Icono>
);

const iconoEvento = (
  <Icono>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M6.75 3v2.25M17.25 3v2.25M3.75 9h16.5M5.25 5.25h13.5A1.5 1.5 0 0 1 20.25 6.75v12A1.5 1.5 0 0 1 18.75 20.25H5.25a1.5 1.5 0 0 1-1.5-1.5v-12a1.5 1.5 0 0 1 1.5-1.5Z"
    />
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M8 13h3M8 16h5M15.5 13h.01M15.5 16h.01"
    />
  </Icono>
);

const iconoCapacitacion = (
  <Icono>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M4.5 5.25A2.25 2.25 0 0 1 6.75 3h10.5A2.25 2.25 0 0 1 19.5 5.25v13.5A2.25 2.25 0 0 1 17.25 21H6.75A2.25 2.25 0 0 1 4.5 18.75V5.25Z"
    />
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M8 7.5h8M8 11h8M8 14.5h5"
    />
  </Icono>
);

const iconoFiltro = (
  <Icono>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M3.75 5.25h16.5M6.75 12h10.5M10 18.75h4"
    />
  </Icono>
);

const iconoBuscar = (
  <Icono>
    <circle cx="11" cy="11" r="6.5" />
    <path strokeLinecap="round" d="m16 16 4.25 4.25" />
  </Icono>
);

const iconoGrafica = (
  <Icono>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M4 19.5V10M10 19.5V5M16 19.5v-7M22 19.5V8"
    />
  </Icono>
);

const iconoMontana = (
  <Icono>
    <path d="m3 18 5-8 4 5 3-4 6 7" />
    <path d="M3 18h18" />
  </Icono>
);

const iconos = {
  calendario: <Icono><rect x="4" y="5" width="16" height="15" rx="2" /><path d="M8 3v4M16 3v4M4 10h16" /></Icono>,
  flechaIzquierda: <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>,
  flechaDerecha: <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 6 6 6-6 6" /></svg>,
};

const DIAS_SEMANA = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
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
  // getDay(): 0 = domingo ... 6 = sábado. La semana debe iniciar en lunes.
  const offset = (primerDia.getDay() + 6) % 7;
  const inicio = new Date(anio, mes, 1 - offset);

  const dias: Array<{ fecha: Date; delMes: boolean }> = [];

  for (let i = 0; i < 42; i += 1) {
    const fecha = new Date(inicio);
    fecha.setDate(inicio.getDate() + i);
    dias.push({ fecha, delMes: fecha.getMonth() === mes });
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

  const [mesVisible, setMesVisible] = useState(inicial.getMonth());
  const [anioVisible, setAnioVisible] = useState(inicial.getFullYear());

  const dias = obtenerMatrizDias(anioVisible, mesVisible);

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
      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          onClick={irMesAnterior}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-emerald-600 transition hover:bg-emerald-500/10 dark:text-emerald-400 dark:hover:bg-emerald-500/10"
          aria-label="Mes anterior"
        >
          {iconos.flechaIzquierda}
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
          {iconos.flechaDerecha}
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-xs font-bold text-slate-400 dark:text-slate-500">
        {DIAS_SEMANA.map((dia) => (
          <div key={dia} className="py-1">
            {dia}
          </div>
        ))}
      </div>

      <div className="mt-1 grid grid-cols-7 gap-1">
        {dias.map(({ fecha, delMes }, indice) => {
          const iso = formatearISO(fecha);
          const seleccionado = valorSeleccionado === iso;
          const esHoy = esMismaFecha(fecha, hoy);

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
                ${!delMes ? 'text-slate-300 dark:text-slate-600' : 'text-slate-800 dark:text-slate-100'}
                ${seleccionado ? 'bg-emerald-600 text-white shadow-md hover:bg-emerald-600' : 'hover:bg-emerald-500/10'}
                ${esHoy && !seleccionado ? 'ring-2 ring-inset ring-emerald-500/60' : ''}
              `}
            >
              {fecha.getDate()}
            </button>
          );
        })}
      </div>

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
            setMesVisible(hoy.getMonth());
            setAnioVisible(hoy.getFullYear());
            onSeleccionar(formatearISO(hoy));
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
          flex w-full items-center justify-between gap-2 rounded-xl border bg-slate-50/50 px-4 py-3 text-left text-sm font-medium shadow-sm transition
          dark:bg-slate-800/60
          ${
            abierto
              ? 'border-emerald-500 ring-2 ring-emerald-500/20 dark:border-emerald-400'
              : 'border-slate-200 hover:bg-slate-100/80 dark:border-slate-700/80 dark:hover:bg-slate-800'
          }
          ${valor ? 'text-slate-800 dark:text-slate-100' : 'text-slate-400 dark:text-slate-500'}
        `}
      >
        {formatearVisible(valor)}
        <span className="text-emerald-600 dark:text-emerald-400">
          {iconos.calendario}
        </span>
      </button>

      {children}
    </div>
  );
}

function obtenerToken(): string | null {
  return (
    sessionStorage.getItem('token') ||
    localStorage.getItem('token') ||
    sessionStorage.getItem('accessToken') ||
    localStorage.getItem('accessToken')
  );
}

function formatearFecha(fecha: string | null): string {
  if (!fecha) return '—';

  const texto = String(fecha).trim();

  if (!texto) return '—';

  // Maneja fechas ISO completas:
  // 2026-09-20T00:00:00.000Z
  // 2026-09-20T00:00:00
  if (texto.includes('T')) {
    const parteFecha = texto.split('T')[0];
    const partes = parteFecha.split('-');

    if (partes.length === 3) {
      return `${partes[2]}/${partes[1]}/${partes[0]}`;
    }
  }

  // Maneja fechas simples:
  // 2026-09-20
  const partes = texto.split('-');

  if (partes.length === 3 && partes[0].length === 4) {
    return `${partes[2]}/${partes[1]}/${partes[0]}`;
  }

  const date = new Date(texto);

  if (Number.isNaN(date.getTime())) {
    return texto;
  }

  return date.toLocaleDateString('es-CR', {
    timeZone: 'UTC',
  });
}

function obtenerNombreMes(mes: string): string {
  const [año, numeroMes] = mes.split('-');

  const fecha = new Date(
    Number(año),
    Number(numeroMes) - 1,
    1,
  );

  return fecha.toLocaleDateString('es-CR', {
    month: 'long',
    year: 'numeric',
  });
}

function obtenerNombrePeriodo(periodo: Periodo): string {
  switch (periodo) {
    case 'hoy':
      return 'Hoy';
    case '7dias':
      return 'Últimos 7 días';
    case '30dias':
      return 'Últimos 30 días';
    case 'mes':
      return 'Este mes';
    case 'personalizado':
      return 'Período personalizado';
    default:
      return 'Todos';
  }
}

function calcularFechasPeriodo(
  periodo: Periodo,
): {
  fechaInicio?: string;
  fechaFin?: string;
} {
  const hoy = new Date();

  const formatear = (fecha: Date) =>
    `${fecha.getFullYear()}-${String(
      fecha.getMonth() + 1,
    ).padStart(2, '0')}-${String(
      fecha.getDate(),
    ).padStart(2, '0')}`;

  if (periodo === 'hoy') {
    const fecha = formatear(hoy);

    return {
      fechaInicio: fecha,
      fechaFin: fecha,
    };
  }

  if (periodo === '7dias') {
    const inicio = new Date(hoy);

    inicio.setDate(inicio.getDate() - 6);

    return {
      fechaInicio: formatear(inicio),
      fechaFin: formatear(hoy),
    };
  }

  if (periodo === '30dias') {
    const inicio = new Date(hoy);

    inicio.setDate(inicio.getDate() - 29);

    return {
      fechaInicio: formatear(inicio),
      fechaFin: formatear(hoy),
    };
  }

  if (periodo === 'mes') {
    const inicio = new Date(
      hoy.getFullYear(),
      hoy.getMonth(),
      1,
    );

    return {
      fechaInicio: formatear(inicio),
      fechaFin: formatear(hoy),
    };
  }

  return {};
}

/* Gráfica de montaña */
function GraficaMontana({
  datos,
  idGradiente,
  ariaLabel,
}: {
  datos: DatoGraficaMontana[];
  idGradiente: string;
  ariaLabel: string;
}) {
  const ancho = 640;
  const alto = 220;
  const paddingX = 20;
  const paddingTop = 34;
  const paddingBottom = 32;

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
    if (puntos.length === 0) return '';

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
        } ${
          alto - paddingBottom
        } L ${puntos[0].x} ${
          alto - paddingBottom
        } Z`
      : '';

  return (
    <div>
      <svg
        viewBox={`0 0 ${ancho} ${alto}`}
        className="w-full"
        role="img"
        aria-label={ariaLabel}
      >
        <defs>
          <linearGradient
            id={idGradiente}
            x1="0"
            y1="0"
            x2="0"
            y2="1"
          >
            <stop
              offset="0%"
              stopColor="#10b981"
              stopOpacity="0.4"
            />
            <stop
              offset="100%"
              stopColor="#10b981"
              stopOpacity="0.0"
            />
          </linearGradient>
        </defs>

        {[0.25, 0.5, 0.75].map((frac) => (
          <line
            key={frac}
            x1={paddingX}
            x2={ancho - paddingX}
            y1={paddingTop + frac * zonaAlto}
            y2={paddingTop + frac * zonaAlto}
            className="stroke-slate-200 dark:stroke-slate-800"
            strokeWidth="1"
          />
        ))}

        {puntos.length > 0 && (
          <>
            <path
              d={areaCurva}
              fill={`url(#${idGradiente})`}
            />

            <path
              d={lineaCurva}
              fill="none"
              className="stroke-emerald-600 dark:stroke-emerald-400"
              strokeWidth="2.5"
              strokeLinecap="round"
            />

            {puntos.map((p) => (
              <g key={p.dato.nombre}>
                <circle
                  cx={p.x}
                  cy={p.y}
                  r="4.5"
                  className="fill-white dark:fill-slate-900 stroke-emerald-600 dark:stroke-emerald-400"
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
          </>
        )}
      </svg>

      <div className="mt-1 flex justify-between px-1">
        {puntos.map((p) => (
          <span
            key={p.dato.nombre}
            className="max-w-[90px] truncate text-center text-[11px] font-semibold text-slate-500 dark:text-slate-400"
            title={p.dato.nombre}
          >
            {p.dato.nombre}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function ReporteEventos() {
  const [periodo, setPeriodo] =
    useState<Periodo>('30dias');

  const [temporada, setTemporada] =
    useState<TemporadaFiltro>('');

  const [tipoActividad, setTipoActividad] =
    useState<TipoActividadFiltro>('');

  const [menuPeriodoAbierto, setMenuPeriodoAbierto] =
    useState(false);

  const [menuTemporadaAbierto, setMenuTemporadaAbierto] =
    useState(false);

  const [
    menuTipoActividadAbierto,
    setMenuTipoActividadAbierto,
  ] = useState(false);

  const [fechaInicio, setFechaInicio] =
    useState('');

  const [fechaFin, setFechaFin] =
    useState('');

  const [campoFechaAbierto, setCampoFechaAbierto] =
    useState<'inicio' | 'fin' | null>(null);
  const contenedorFechasRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function manejarClicFuera(evento: MouseEvent) {
      if (
        contenedorFechasRef.current &&
        !contenedorFechasRef.current.contains(evento.target as Node)
      ) {
        setCampoFechaAbierto(null);
      }
    }
    document.addEventListener('mousedown', manejarClicFuera);
    return () => document.removeEventListener('mousedown', manejarClicFuera);
  }, []);

  const [cargando, setCargando] =
    useState(false);

  const [consultado, setConsultado] =
    useState(false);

  const [datos, setDatos] =
    useState<EstadisticasEventos | null>(null);

  const [error, setError] =
    useState<string | null>(null);

  useEffect(() => {
    if (periodo === 'personalizado') return;

    const fechas =
      calcularFechasPeriodo(periodo);

    setFechaInicio(
      fechas.fechaInicio ?? '',
    );

    setFechaFin(
      fechas.fechaFin ?? '',
    );
  }, [periodo]);

  function cerrarMenus() {
    setMenuPeriodoAbierto(false);
    setMenuTemporadaAbierto(false);
    setMenuTipoActividadAbierto(false);
  }

  async function consultar() {
    setError(null);

    if (
      periodo === 'personalizado' &&
      (!fechaInicio || !fechaFin)
    ) {
      setError(
        'Debe seleccionar una fecha inicial y una fecha final.',
      );

      return;
    }

    if (
      periodo === 'personalizado' &&
      fechaInicio > fechaFin
    ) {
      setError(
        'La fecha inicial no puede ser mayor que la fecha final.',
      );

      return;
    }

    try {
      setCargando(true);

      const token = obtenerToken();

      if (!token) {
        setError(
          'No se encontró la sesión del usuario.',
        );

        return;
      }

      const parametros =
        new URLSearchParams();

      if (fechaInicio) {
        parametros.set(
          'fechaInicio',
          fechaInicio,
        );
      }

      if (fechaFin) {
        parametros.set(
          'fechaFin',
          fechaFin,
        );
      }

      if (temporada) {
        parametros.set(
          'temporada',
          temporada,
        );
      }

      if (tipoActividad) {
        parametros.set(
          'tipoActividad',
          tipoActividad,
        );
      }

      const respuesta = await fetch(
        `http://localhost:3000/api/reportes/eventos/estadisticas/eventos?${parametros.toString()}`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type':
              'application/json',
          },
        },
      );

      const resultado =
        await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(
          resultado?.mensaje ||
            'No se pudo obtener el reporte.',
        );
      }

      setDatos(resultado);
      setConsultado(true);
    } catch (err) {
      console.error(err);

      setDatos(null);
      setConsultado(false);

      setError(
        err instanceof Error
          ? err.message
          : 'Ocurrió un error al consultar el reporte.',
      );
    } finally {
      setCargando(false);
    }
  }

  const maximoMes =
    datos?.actividadesPorMes.reduce(
      (max, item) =>
        Math.max(max, item.cantidad),
      0,
    ) ?? 0;

  /*
   * Si el backend no manda mesConMasActividades,
   * lo calculamos usando actividadesPorMes.
   */
  const mesConMasActividadesCalculado =
    datos?.actividadesPorMes &&
    datos.actividadesPorMes.length > 0
      ? datos.actividadesPorMes.reduce(
          (max, actual) =>
            actual.cantidad > max.cantidad
              ? actual
              : max,
        )
      : null;

  const mesConMasActividades =
    datos?.mesConMasActividades ??
    mesConMasActividadesCalculado;

  const opcionesPeriodo: [
    Periodo,
    string,
  ][] = [
    ['hoy', 'Hoy'],
    ['7dias', 'Últimos 7 días'],
    ['30dias', 'Últimos 30 días'],
    ['mes', 'Este mes'],
    ['personalizado', 'Personalizado'],
  ];

  const opcionesTemporada: [
    TemporadaFiltro,
    string,
  ][] = [
    ['', 'Todas las temporadas'],
    ['seca', 'Temporada seca'],
    ['lluviosa', 'Temporada lluviosa'],
  ];

  const opcionesTipoActividad: [
    TipoActividadFiltro,
    string,
  ][] = [
    ['', 'Todos los tipos'],
    ['evento', 'Eventos'],
    ['capacitacion', 'Capacitaciones'],
  ];

  return (
    <div className="space-y-6">
      {/* FILTROS */}
      <section className="relative z-30 overflow-visible rounded-3xl border border-emerald-100/70 bg-white/80 p-5 shadow-sm backdrop-blur-xl dark:border-emerald-900/50 dark:bg-slate-900/80 sm:p-6">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
            {iconoFiltro}
          </div>

          <div>
            <h2 className="text-lg font-bold text-slate-800 dark:text-white">
              Filtros del reporte
            </h2>

            <p className="text-sm text-slate-500 dark:text-slate-400">
              Seleccione el período y las
              características que desea consultar.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {/* PERÍODO */}
          <div className="relative">
            <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">
              Período
            </label>

            <button
              type="button"
              onClick={() => {
                const abrir =
                  !menuPeriodoAbierto;

                cerrarMenus();
                setMenuPeriodoAbierto(abrir);
              }}
              className="flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left text-sm font-medium text-slate-700 shadow-sm transition hover:border-emerald-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              <span>
                {obtenerNombrePeriodo(periodo)}
              </span>

              <svg
                className={`h-4 w-4 transition-transform ${
                  menuPeriodoAbierto
                    ? 'rotate-180'
                    : ''
                }`}
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path d="M5.5 7.5 10 12l4.5-4.5 1 1L10 14l-5.5-5.5 1-1Z" />
              </svg>
            </button>

            {menuPeriodoAbierto && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() =>
                    setMenuPeriodoAbierto(false)
                  }
                />

                <div className="absolute left-0 top-full z-50 mt-2 w-full overflow-hidden rounded-2xl border border-slate-200 bg-white p-1 shadow-xl dark:border-slate-700 dark:bg-slate-800">
                  {opcionesPeriodo.map(
                    ([valor, nombre]) => (
                      <button
                        key={valor}
                        type="button"
                        onClick={() => {
                          setPeriodo(valor);
                          setMenuPeriodoAbierto(
                            false,
                          );
                        }}
                        className={`w-full rounded-xl px-4 py-2.5 text-left text-sm transition ${
                          periodo === valor
                            ? 'bg-emerald-50 font-semibold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                            : 'text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-700'
                        }`}
                      >
                        {nombre}
                      </button>
                    ),
                  )}
                </div>
              </>
            )}
          </div>

          {/* TEMPORADA */}
          <div className="relative">
            <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">
              Temporada
            </label>

            <button
              type="button"
              onClick={() => {
                const abrir =
                  !menuTemporadaAbierto;

                cerrarMenus();
                setMenuTemporadaAbierto(abrir);
              }}
              className="flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left text-sm font-medium text-slate-700 shadow-sm transition hover:border-emerald-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              <span>
                {temporada === ''
                  ? 'Todas las temporadas'
                  : temporada === 'seca'
                    ? 'Temporada seca'
                    : 'Temporada lluviosa'}
              </span>

              <svg
                className={`h-4 w-4 transition-transform ${
                  menuTemporadaAbierto
                    ? 'rotate-180'
                    : ''
                }`}
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path d="M5.5 7.5 10 12l4.5-4.5 1 1L10 14l-5.5-5.5 1-1Z" />
              </svg>
            </button>

            {menuTemporadaAbierto && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() =>
                    setMenuTemporadaAbierto(false)
                  }
                />

                <div className="absolute left-0 top-full z-50 mt-2 w-full overflow-hidden rounded-2xl border border-slate-200 bg-white p-1 shadow-xl dark:border-slate-700 dark:bg-slate-800">
                  {opcionesTemporada.map(
                    ([valor, nombre]) => (
                      <button
                        key={valor || 'todas'}
                        type="button"
                        onClick={() => {
                          setTemporada(valor);
                          setMenuTemporadaAbierto(
                            false,
                          );
                        }}
                        className={`w-full rounded-xl px-4 py-2.5 text-left text-sm transition ${
                          temporada === valor
                            ? 'bg-emerald-50 font-semibold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                            : 'text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-700'
                        }`}
                      >
                        {nombre}
                      </button>
                    ),
                  )}
                </div>
              </>
            )}
          </div>

          {/* TIPO DE ACTIVIDAD */}
          <div className="relative">
            <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">
              Tipo de actividad
            </label>

            <button
              type="button"
              onClick={() => {
                const abrir =
                  !menuTipoActividadAbierto;

                cerrarMenus();
                setMenuTipoActividadAbierto(
                  abrir,
                );
              }}
              className="flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left text-sm font-medium text-slate-700 shadow-sm transition hover:border-emerald-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              <span>
                {tipoActividad === ''
                  ? 'Todos los tipos'
                  : tipoActividad === 'evento'
                    ? 'Eventos'
                    : 'Capacitaciones'}
              </span>

              <svg
                className={`h-4 w-4 transition-transform ${
                  menuTipoActividadAbierto
                    ? 'rotate-180'
                    : ''
                }`}
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path d="M5.5 7.5 10 12l4.5-4.5 1 1L10 14l-5.5-5.5 1-1Z" />
              </svg>
            </button>

            {menuTipoActividadAbierto && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() =>
                    setMenuTipoActividadAbierto(
                      false,
                    )
                  }
                />

                <div className="absolute left-0 top-full z-50 mt-2 w-full overflow-hidden rounded-2xl border border-slate-200 bg-white p-1 shadow-xl dark:border-slate-700 dark:bg-slate-800">
                  {opcionesTipoActividad.map(
                    ([valor, nombre]) => (
                      <button
                        key={valor || 'todos'}
                        type="button"
                        onClick={() => {
                          setTipoActividad(valor);
                          setMenuTipoActividadAbierto(
                            false,
                          );
                        }}
                        className={`w-full rounded-xl px-4 py-2.5 text-left text-sm transition ${
                          tipoActividad === valor
                            ? 'bg-emerald-50 font-semibold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                            : 'text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-700'
                        }`}
                      >
                        {nombre}
                      </button>
                    ),
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {/* FECHAS PERSONALIZADAS */}
        {periodo === 'personalizado' && (
          <div
            ref={contenedorFechasRef}
            className="mt-4 grid grid-cols-1 gap-4 rounded-2xl border border-emerald-100 bg-emerald-50/50 p-4 sm:grid-cols-2 dark:border-emerald-900/40 dark:bg-emerald-950/20"
          >
            <CampoFecha
              etiqueta="Fecha inicial"
              valor={fechaInicio}
              abierto={campoFechaAbierto === 'inicio'}
              onAbrir={() =>
                setCampoFechaAbierto((actual) => actual === 'inicio' ? null : 'inicio')
              }
            >
              {campoFechaAbierto === 'inicio' && (
                <Calendario
                  valorSeleccionado={fechaInicio}
                  onSeleccionar={setFechaInicio}
                  onCerrar={() => setCampoFechaAbierto(null)}
                />
              )}
            </CampoFecha>

            <CampoFecha
              etiqueta="Fecha final"
              valor={fechaFin}
              abierto={campoFechaAbierto === 'fin'}
              onAbrir={() =>
                setCampoFechaAbierto((actual) => actual === 'fin' ? null : 'fin')
              }
            >
              {campoFechaAbierto === 'fin' && (
                <Calendario
                  valorSeleccionado={fechaFin}
                  onSeleccionar={setFechaFin}
                  onCerrar={() => setCampoFechaAbierto(null)}
                />
              )}
            </CampoFecha>
          </div>
        )}

        {/* BOTÓN */}
        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-slate-500 dark:text-slate-400">
            {periodo === 'personalizado'
              ? fechaInicio && fechaFin
                ? `${formatearFecha(
                    fechaInicio,
                  )} - ${formatearFecha(
                    fechaFin,
                  )}`
                : 'Seleccione el rango de fechas'
              : obtenerNombrePeriodo(periodo)}
          </div>

          <button
            type="button"
            onClick={consultar}
            disabled={cargando}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-600/20 transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {cargando ? (
              <>
                <svg
                  className="h-5 w-5 animate-spin"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="9"
                    stroke="currentColor"
                    strokeWidth="3"
                  />

                  <path
                    className="opacity-90"
                    fill="currentColor"
                    d="M21 12a9 9 0 0 0-9-9v3a6 6 0 0 1 6 6h3Z"
                  />
                </svg>

                Consultando...
              </>
            ) : (
              <>
                {iconoBuscar}
                Consultar reporte
              </>
            )}
          </button>
        </div>

        {error && (
          <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
            {error}
          </div>
        )}
      </section>

      {/* SIN CONSULTAR */}
      {!consultado && !cargando && (
        <section className="rounded-3xl border border-dashed border-slate-300 bg-white/60 px-6 py-14 text-center dark:border-slate-700 dark:bg-slate-900/50">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
            {iconoGrafica}
          </div>

          <h3 className="text-lg font-bold text-slate-800 dark:text-white">
            Consulte el reporte
          </h3>

          <p className="mx-auto mt-2 max-w-md text-sm text-slate-500 dark:text-slate-400">
            Seleccione los filtros y presione
            "Consultar reporte" para visualizar las
            estadísticas de eventos y capacitaciones.
          </p>
        </section>
      )}

      {/* RESULTADOS */}
      {consultado && datos && (
        <div className="space-y-6">
          {/* ENCABEZADO */}
          <section className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm dark:border-slate-700 dark:bg-slate-900 sm:px-6">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400">
                  Período analizado
                </p>

                <p className="mt-0.5 text-lg font-bold text-slate-800 dark:text-white">
                  {periodo ===
                    'personalizado' &&
                  datos.periodo.fechaInicio &&
                  datos.periodo.fechaFin
                    ? `${formatearFecha(
                        datos.periodo.fechaInicio,
                      )} - ${formatearFecha(
                        datos.periodo.fechaFin,
                      )}`
                    : obtenerNombrePeriodo(
                        periodo,
                      )}
                </p>

                <p className="mt-1 text-xs font-semibold text-slate-600 dark:text-slate-300">
                  {datos.informacionGeneral?.nombre ??
                    'Reporte de eventos y capacitaciones'}
                </p>

                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Tipo:{' '}
                  {datos.informacionGeneral?.tipo ??
                    'eventos'}{' '}
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

              <p className="text-sm text-slate-500 dark:text-slate-400">
                {datos.totalActividades}{' '}
                actividad
                {datos.totalActividades === 1
                  ? ''
                  : 'es'}{' '}
                encontrada
                {datos.totalActividades === 1
                  ? ''
                  : 's'}
              </p>
              <AccionesReporteGuardado tipoReporte="eventos" nombreReporte={datos.informacionGeneral?.nombre ?? 'Reporte de eventos y capacitaciones'} contenido={datos as unknown as Record<string, unknown>} tieneDatos={datos.totalActividades > 0} />
            </div>
          </section>

          {/* TARJETAS PRINCIPALES */}
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                {iconoEvento}
              </div>

              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                Total de actividades
              </p>

              <p className="mt-1 text-3xl font-black text-slate-800 dark:text-white">
                {datos.totalActividades}
              </p>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                {iconoEvento}
              </div>

              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                Eventos
              </p>

              <p className="mt-1 text-3xl font-black text-slate-800 dark:text-white">
                {datos.actividadesPorTipo.evento}
              </p>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300">
                {iconoCapacitacion}
              </div>

              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                Capacitaciones
              </p>

              <p className="mt-1 text-3xl font-black text-slate-800 dark:text-white">
                {
                  datos.actividadesPorTipo
                    .capacitacion
                }
              </p>
            </div>

            {/* MES CON MÁS ACTIVIDADES */}
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                {iconoCalendario}
              </div>

              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                Mes con más actividades
              </p>

              <p className="mt-1 text-lg font-black capitalize text-slate-800 dark:text-white">
                {mesConMasActividades
                  ? obtenerNombreMes(
                      mesConMasActividades.mes,
                    )
                  : 'Sin datos'}
              </p>

              {mesConMasActividades && (
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {mesConMasActividades.cantidad}{' '}
                  actividades
                </p>
              )}
            </div>
          </section>

          {/* DISTRIBUCIONES */}
          <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900 sm:p-6">
              <div className="mb-5 flex items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
                  {iconoMontana}
                </span>

                <div>
                  <h3 className="text-lg font-bold text-slate-800 dark:text-white">
                    Actividades por tipo
                  </h3>

                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Distribución entre eventos y
                    capacitaciones.
                  </p>
                </div>
              </div>

              <GraficaMontana
                datos={[
                  {
                    nombre: 'Eventos',
                    cantidad:
                      datos.actividadesPorTipo
                        .evento,
                  },
                  {
                    nombre: 'Capacitaciones',
                    cantidad:
                      datos.actividadesPorTipo
                        .capacitacion,
                  },
                ]}
                idGradiente="degradadoMontanaTipo"
                ariaLabel="Gráfica de actividades por tipo"
              />
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900 sm:p-6">
              <div className="mb-5 flex items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
                  {iconoMontana}
                </span>

                <div>
                  <h3 className="text-lg font-bold text-slate-800 dark:text-white">
                    Actividades por temporada
                  </h3>

                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Distribución según la temporada.
                  </p>
                </div>
              </div>

              <GraficaMontana
                datos={[
                  {
                    nombre: 'Seca',
                    cantidad:
                      datos.actividadesPorTemporada
                        .seca,
                  },
                  {
                    nombre: 'Lluviosa',
                    cantidad:
                      datos.actividadesPorTemporada
                        .lluviosa,
                  },
                ]}
                idGradiente="degradadoMontanaTemporada"
                ariaLabel="Gráfica de actividades por temporada"
              />
            </div>
          </section>

          {/* ESTADOS */}
          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900 sm:p-6">
            <div className="mb-6">
              <h3 className="text-lg font-bold text-slate-800 dark:text-white">
                Actividades por estado
              </h3>

              <p className="text-sm text-slate-500 dark:text-slate-400">
                Estado actual de las actividades
                registradas.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              {[
                [
                  'Borrador',
                  datos.actividadesPorEstado
                    .borrador,
                ],
                [
                  'Publicado',
                  datos.actividadesPorEstado
                    .publicado,
                ],
                [
                  'No publicado',
                  datos.actividadesPorEstado
                    .no_publicado,
                ],
                [
                  'Desactivado',
                  datos.actividadesPorEstado
                    .desactivado,
                ],
              ].map(([nombre, cantidad]) => (
                <div
                  key={nombre}
                  className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/70"
                >
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                    {nombre}
                  </p>

                  <p className="mt-1 text-2xl font-black text-slate-800 dark:text-white">
                    {cantidad}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* ACTIVIDADES POR MES */}
          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900 sm:p-6">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                {iconoGrafica}
              </div>

              <div>
                <h3 className="text-lg font-bold text-slate-800 dark:text-white">
                  Actividades por mes
                </h3>

                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Cantidad de actividades programadas
                  por mes.
                </p>
              </div>
            </div>

            {datos.actividadesPorMes.length ===
            0 ? (
              <div className="py-10 text-center text-sm text-slate-500 dark:text-slate-400">
                No hay datos para mostrar.
              </div>
            ) : (
              <div className="space-y-4">
                {datos.actividadesPorMes.map(
                  (item) => (
                    <div key={item.mes}>
                      <div className="mb-2 flex items-center justify-between gap-4">
                        <span className="text-sm font-semibold capitalize text-slate-700 dark:text-slate-300">
                          {obtenerNombreMes(
                            item.mes,
                          )}
                        </span>

                        <span className="text-sm font-bold text-slate-800 dark:text-white">
                          {item.cantidad}
                        </span>
                      </div>

                      <div className="h-3 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                        <div
                          className="h-full rounded-full bg-emerald-500 transition-all"
                          style={{
                            width:
                              maximoMes > 0
                                ? `${
                                    (item.cantidad /
                                      maximoMes) *
                                    100
                                  }%`
                                : '0%',
                          }}
                        />
                      </div>
                    </div>
                  ),
                )}
              </div>
            )}
          </section>

          {/* DETALLE */}
          <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <div className="border-b border-slate-200 p-5 dark:border-slate-700 sm:p-6">
              <h3 className="text-lg font-bold text-slate-800 dark:text-white">
                Detalle de actividades
              </h3>

              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Actividades incluidas en este reporte.
              </p>
            </div>

            {datos.detalleActividades.length ===
            0 ? (
              <div className="px-6 py-12 text-center text-sm text-slate-500 dark:text-slate-400">
                No se encontraron actividades con
                los filtros seleccionados.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px] text-left text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-800/70">
                    <tr>
                      <th className="px-5 py-4 font-bold text-slate-600 dark:text-slate-300">
                        Actividad
                      </th>

                      <th className="px-5 py-4 font-bold text-slate-600 dark:text-slate-300">
                        Fecha
                      </th>

                      <th className="px-5 py-4 font-bold text-slate-600 dark:text-slate-300">
                        Tipo
                      </th>

                      <th className="px-5 py-4 font-bold text-slate-600 dark:text-slate-300">
                        Temporada
                      </th>

                      <th className="px-5 py-4 font-bold text-slate-600 dark:text-slate-300">
                        Estado
                      </th>

                      <th className="px-5 py-4 font-bold text-slate-600 dark:text-slate-300">
                        Cupos
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {datos.detalleActividades.map(
                      (actividad) => (
                        <tr
                          key={actividad.id}
                          className="transition hover:bg-slate-50 dark:hover:bg-slate-800/50"
                        >
                          <td className="px-5 py-4">
                            <p className="font-semibold text-slate-800 dark:text-white">
                              {actividad.nombre}
                            </p>

                            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                              {actividad.lugar ||
                                'Sin lugar'}
                            </p>
                          </td>

                          <td className="px-5 py-4 text-slate-600 dark:text-slate-300">
                            <div>
                              {formatearFecha(
                                actividad.fecha,
                              )}
                            </div>

                           
                          </td>

                          <td className="px-5 py-4">
                            <span className="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold capitalize text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                              {actividad.tipoActividad ||
                                '—'}
                            </span>
                          </td>

                          <td className="px-5 py-4 text-sm capitalize text-slate-600 dark:text-slate-300">
                            {actividad.temporada || '—'}
                          </td>

                          <td className="px-5 py-4">
                            <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                              {actividad.estado?.replace(
                                '_',
                                ' ',
                              ) || '—'}
                            </span>
                          </td>

                          <td className="px-5 py-4 text-slate-600 dark:text-slate-300">
                            {actividad.cuposDisponibles ??
                              '—'}

                            {actividad.cupoMaximo !==
                              null &&
                              actividad.cupoMaximo !==
                                undefined && (
                                <span className="text-slate-400">
                                  {' '}
                                  /{' '}
                                  {
                                    actividad.cupoMaximo
                                  }
                                </span>
                              )}
                          </td>
                        </tr>
                      ),
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
