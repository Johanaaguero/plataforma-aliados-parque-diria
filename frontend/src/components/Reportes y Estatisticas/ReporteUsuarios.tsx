import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';

type Periodo =
  | 'hoy'
  | '7dias'
  | '30dias'
  | 'mes'
  | 'personalizado';

interface RegistroPorMes {
  mes: string;
  cantidad: number;
}

interface UsuarioReporte {
  id: number;
  nombreUsuario: string;
  nombre: string;
  apellidos: string;
  correo: string;
  rol: string;
  fechaRegistro: string;
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

interface EstadisticasUsuarios {
  informacionGeneral?: InformacionGeneralReporte;
  periodo: string;
  fechaInicio: string | null;
  fechaFin: string | null;
  total: number;
  administradores: number;
  asociados: number;
  visitantes: number;
  superAdmins: number;
  registrosPorMes: RegistroPorMes[];
  mesConMasRegistros: RegistroPorMes | null;
  usuarios: UsuarioReporte[];
}

/* =========================================================
 * Iconografía
 * ========================================================= */

function Icono({ children }: { children: ReactNode }) {
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
      <circle cx="9" cy="8" r="3" />
      <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" />
      <path d="M16 5.5a3 3 0 0 1 0 5.8" />
      <path d="M18 14c1.7.8 3 2.4 3 4.5" />
    </Icono>
  ),

  administrador: (
    <Icono>
      <path d="M12 3 5 6v5c0 4.5 2.9 7.8 7 10 4.1-2.2 7-5.5 7-10V6l-7-3Z" />
      <path d="m9 12 2 2 4-4" />
    </Icono>
  ),

  asociado: (
    <Icono>
      <circle cx="9" cy="8" r="3" />
      <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" />
      <path d="M16 11h5M18.5 8.5v5" />
    </Icono>
  ),

  visitante: (
    <Icono>
      <circle cx="12" cy="8" r="3" />
      <path d="M5 20c0-3.9 3.1-7 7-7s7 3.1 7 7" />
    </Icono>
  ),

  tendencia: (
    <Icono>
      <path d="M4 17 10 11l4 4 6-8" />
      <path d="M14 7h6v6" />
    </Icono>
  ),

  medalla: (
    <Icono>
      <circle cx="12" cy="9" r="5" />
      <path d="m8 13.5-1.5 6L12 17l5.5 2.5-1.5-6" />
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

  correo: (
    <Icono>
      <rect
        x="3"
        y="5"
        width="18"
        height="14"
        rx="2"
      />
      <path d="m3 7 9 6 9-6" />
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
 * Opciones de período
 * ========================================================= */

const OPCIONES_PERIODO: {
  value: Periodo;
  label: string;
}[] = [
  { value: 'hoy', label: 'Hoy' },
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

const DIAS_SEMANA = [
  'L',
  'M',
  'X',
  'J',
  'V',
  'S',
  'D',
];

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

function formatearISO(fecha: Date) {
  const anio = fecha.getFullYear();
  const mes = String(
    fecha.getMonth() + 1,
  ).padStart(2, '0');
  const dia = String(
    fecha.getDate(),
  ).padStart(2, '0');

  return `${anio}-${mes}-${dia}`;
}

function formatearVisible(fecha: string) {
  if (!fecha) {
    return '';
  }

  const [anio, mes, dia] =
    fecha.split('-');

  return `${dia}/${mes}/${anio}`;
}

function esMismaFecha(
  fecha1: Date,
  fecha2: Date,
) {
  return (
    fecha1.getFullYear() ===
      fecha2.getFullYear() &&
    fecha1.getMonth() ===
      fecha2.getMonth() &&
    fecha1.getDate() ===
      fecha2.getDate()
  );
}

function obtenerMatrizDias(
  fecha: Date,
) {
  const anio =
    fecha.getFullYear();

  const mes =
    fecha.getMonth();

  const primerDia = new Date(
    anio,
    mes,
    1,
  );

  const ultimoDia = new Date(
    anio,
    mes + 1,
    0,
  );

  let inicio =
    primerDia.getDay();

  inicio =
    inicio === 0
      ? 6
      : inicio - 1;

  const dias: (
    | Date
    | null
  )[] = [];

  for (let i = 0; i < inicio; i++) {
    dias.push(null);
  }

  for (
    let dia = 1;
    dia <= ultimoDia.getDate();
    dia++
  ) {
    dias.push(
      new Date(
        anio,
        mes,
        dia,
      ),
    );
  }

  return dias;
}

function Calendario({
  fecha,
  onSeleccionar,
  onCerrar,
}: {
  fecha: string;
  onSeleccionar: (
    fecha: string,
  ) => void;
  onCerrar: () => void;
}) {
  const fechaSeleccionada =
    fecha
      ? new Date(
          `${fecha}T00:00:00`,
        )
      : null;

  const [mesActual, setMesActual] =
    useState(
      fechaSeleccionada ??
        new Date(),
    );

  const hoy = new Date();

  const dias =
    obtenerMatrizDias(
      mesActual,
    );

  const cambiarMes = (
    cantidad: number,
  ) => {
    setMesActual(
      new Date(
        mesActual.getFullYear(),
        mesActual.getMonth() +
          cantidad,
        1,
      ),
    );
  };

  const seleccionarHoy = () => {
    const fechaHoy =
      formatearISO(hoy);

    onSeleccionar(fechaHoy);
    onCerrar();
  };

  const borrar = () => {
    onSeleccionar('');
    onCerrar();
  };

  return (
    <div className="absolute left-0 top-full z-[100] mt-2 w-72 rounded-2xl border border-slate-200 bg-white p-4 shadow-xl dark:border-slate-700 dark:bg-slate-800">

      {/* ENCABEZADO */}

      <div className="mb-4 flex items-center justify-between">

        <button
          type="button"
          onClick={() =>
            cambiarMes(-1)
          }
          className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-emerald-600 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-emerald-400"
        >
          ‹
        </button>

        <p className="text-sm font-bold text-slate-800 dark:text-slate-100">
          {
            MESES[
              mesActual.getMonth()
            ]
          }{' '}
          {mesActual.getFullYear()}
        </p>

        <button
          type="button"
          onClick={() =>
            cambiarMes(1)
          }
          className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-emerald-600 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-emerald-400"
        >
          ›
        </button>

      </div>

      {/* DÍAS DE LA SEMANA */}

      <div className="mb-2 grid grid-cols-7 gap-1">
        {DIAS_SEMANA.map(
          (dia) => (
            <div
              key={dia}
              className="text-center text-[10px] font-bold text-slate-400 dark:text-slate-500"
            >
              {dia}
            </div>
          ),
        )}
      </div>

      {/* DÍAS */}

      <div className="grid grid-cols-7 gap-1">

        {dias.map(
          (dia, indice) => {

            if (!dia) {
              return (
                <div
                  key={`vacio-${indice}`}
                  className="h-8"
                />
              );
            }

            const seleccionado =
              fechaSeleccionada &&
              esMismaFecha(
                dia,
                fechaSeleccionada,
              );

            const esHoy =
              esMismaFecha(
                dia,
                hoy,
              );

            return (
              <button
                key={dia.toISOString()}
                type="button"
                onClick={() => {
                  onSeleccionar(
                    formatearISO(
                      dia,
                    ),
                  );
                  onCerrar();
                }}
                className={`flex h-8 items-center justify-center rounded-lg text-xs font-semibold transition ${
                  seleccionado
                    ? 'bg-emerald-600 text-white shadow-sm dark:bg-emerald-500'
                    : esHoy
                      ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-300'
                      : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700'
                }`}
              >
                {dia.getDate()}
              </button>
            );
          },
        )}

      </div>

      {/* ACCIONES */}

      <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 dark:border-slate-700">

        <button
          type="button"
          onClick={borrar}
          className="rounded-lg px-3 py-2 text-xs font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-200"
        >
          Borrar
        </button>

        <button
          type="button"
          onClick={seleccionarHoy}
          className="rounded-lg bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700 transition hover:bg-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-300 dark:hover:bg-emerald-500/20"
        >
          Hoy
        </button>

      </div>

    </div>
  );
}

function CampoFecha({
  id,
  label,
  valor,
  abierto,
  onAbrir,
  onSeleccionar,
  onCerrar,
}: {
  id: string;
  label: string;
  valor: string;
  abierto: boolean;
  onAbrir: () => void;
  onSeleccionar: (
    fecha: string,
  ) => void;
  onCerrar: () => void;
}) {
  return (
    <div className="relative">

      <label
        htmlFor={id}
        className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400"
      >
        {label}
      </label>

      <button
        id={id}
        type="button"
        onClick={onAbrir}
        className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-left text-sm font-medium text-slate-800 shadow-sm transition hover:bg-slate-100/80 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700/80 dark:bg-slate-800/60 dark:text-slate-100 dark:hover:bg-slate-800 dark:focus:border-emerald-400 dark:focus:bg-slate-800"
      >

        <span
          className={
            valor
              ? 'text-slate-800 dark:text-slate-100'
              : 'text-slate-400 dark:text-slate-500'
          }
        >
          {valor
            ? formatearVisible(
                valor,
              )
            : 'dd/mm/aaaa'}
        </span>

        <span className="text-emerald-600 dark:text-emerald-400">
          {iconos.calendario}
        </span>

      </button>

      {abierto && (
        <Calendario
          fecha={valor}
          onSeleccionar={
            onSeleccionar
          }
          onCerrar={onCerrar}
        />
      )}

    </div>
  );
}
/* =========================================================
 * Gráfica de registros por mes
 * ========================================================= */
function GraficaRegistrosMes({
  datos,
}: {
  datos: RegistroPorMes[];
}) {
  const ancho = 640;
  const alto = 240;

  // Más espacio arriba para los números
  const paddingX = 30;
  const paddingTop = 42;
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
          (i *
            (ancho - paddingX * 2)) /
            (datos.length - 1);

    const y =
      paddingTop +
      zonaAlto -
      (d.cantidad / maximo) *
        zonaAlto;

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
        className="w-full overflow-visible"
        role="img"
        aria-label="Gráfica de usuarios registrados por mes"
      >
        <defs>
          <linearGradient
            id="degradadoUsuarios"
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
              stopOpacity="0"
            />
          </linearGradient>
        </defs>

        {/* Líneas horizontales */}
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

        {puntos.length > 0 && (
          <>
            {/* Área debajo de la curva */}
            <path
              d={areaCurva}
              fill="url(#degradadoUsuarios)"
            />

            {/* Línea de la gráfica */}
            <path
              d={lineaCurva}
              fill="none"
              className="stroke-emerald-600 dark:stroke-emerald-400"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
          </>
        )}

        {/* Puntos y números */}
        {puntos.map((p) => (
          <g key={p.dato.mes}>
            <circle
              cx={p.x}
              cy={p.y}
              r="4.5"
              className="fill-white stroke-emerald-600 dark:fill-slate-900 dark:stroke-emerald-400"
              strokeWidth="2.5"
            />

            <text
              x={p.x}
              // Nunca permite que el número quede fuera de la parte superior
              y={Math.max(p.y - 12, 18)}
              textAnchor="middle"
              className="fill-slate-800 text-[13px] font-bold dark:fill-slate-200"
            >
              {p.dato.cantidad}
            </text>
          </g>
        ))}
      </svg>

      {/* Meses */}
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
 * Formatear mes
 * ========================================================= */

function formatearMes(mes: string) {
  const [anio, numeroMes] =
    mes.split('-');

  const fecha = new Date(
    Number(anio),
    Number(numeroMes) - 1,
    1,
  );

  return fecha.toLocaleDateString(
    'es-CR',
    {
      month: 'short',
      year: 'numeric',
    },
  );
}

/* =========================================================
 * Componente Principal
 * ========================================================= */

export default function ReporteUsuarios() {
  const [periodo, setPeriodo] =
    useState<Periodo>('30dias');

  const [menuAbierto, setMenuAbierto] =
    useState(false);

    const [
  campoFechaAbierto,
  setCampoFechaAbierto,
] = useState<
  'inicio' | 'fin' | null
>(null);

const contenedorFechasRef =
  useRef<HTMLDivElement>(null);
  const [fechaInicio, setFechaInicio] =
    useState('');

  const [fechaFin, setFechaFin] =
    useState('');

  const [cargando, setCargando] =
    useState(false);

  const [consultado, setConsultado] =
    useState(false);

  const [datos, setDatos] =
    useState<EstadisticasUsuarios | null>(
      null,
    );

  const [error, setError] =
    useState('');

    useEffect(() => {
  const manejarClickFuera = (
    evento: MouseEvent,
  ) => {
    if (
      contenedorFechasRef.current &&
      !contenedorFechasRef.current.contains(
        evento.target as Node,
      )
    ) {
      setCampoFechaAbierto(null);
    }
  };

  document.addEventListener(
    'mousedown',
    manejarClickFuera,
  );

  return () => {
    document.removeEventListener(
      'mousedown',
      manejarClickFuera,
    );
  };
}, []);
  /* =======================================================
   * Estado para guardar reporte
   * ======================================================= */

  const [guardando, setGuardando] =
    useState(false);

  const [mensajeGuardado, setMensajeGuardado] =
    useState('');

  /* =======================================================
   * Obtener ID del usuario desde el JWT
   * ======================================================= */

  const obtenerUsuarioGeneroId = (): number | null => {
    const token =
      sessionStorage.getItem('token') ??
      localStorage.getItem('token');

    if (!token) {
      return null;
    }

    try {
      const partes = token.split('.');

      if (partes.length !== 3) {
        return null;
      }

      const payload = JSON.parse(
        atob(
          partes[1]
            .replace(/-/g, '+')
            .replace(/_/g, '/'),
        ),
      );

      const id =
        payload.usuarioId ??
        payload.userId ??
        payload.id ??
        payload.sub;

      const numeroId = Number(id);

      return Number.isInteger(numeroId)
        ? numeroId
        : null;
    } catch (error) {
      console.error(
        'No se pudo obtener el usuario del token:',
        error,
      );

      return null;
    }
  };

  /* =======================================================
   * Consultar reporte
   * ======================================================= */

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
    setMensajeGuardado('');

    try {
      const params =
        new URLSearchParams();

      params.append(
        'periodo',
        periodo,
      );

      if (
        periodo === 'personalizado'
      ) {
        params.append(
          'fechaInicio',
          fechaInicio,
        );

        params.append(
          'fechaFin',
          fechaFin,
        );
      }

      const token =
        sessionStorage.getItem(
          'token',
        ) ??
        localStorage.getItem(
          'token',
        );

      const respuesta = await fetch(
        `http://localhost:3000/api/reportes/usuarios?${params.toString()}`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type':
              'application/json',
          },
        },
      );

      if (!respuesta.ok) {
        const textoError =
          await respuesta.text();

        throw new Error(
          `Error ${respuesta.status}: ${
            textoError ||
            respuesta.statusText
          }`,
        );
      }

      const resultado =
        (await respuesta.json()) as EstadisticasUsuarios;

      setDatos(resultado);
      setConsultado(true);
    } catch (err) {
      console.error(
        'Error al consultar reporte de usuarios:',
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

  /* =======================================================
   * Funciones auxiliares
   * ======================================================= */

  const obtenerTextoPeriodo =
    () => {
      return (
        OPCIONES_PERIODO.find(
          (o) =>
            o.value === periodo,
        )?.label ?? ''
      );
    };

  const porcentaje = (
    cantidad: number,
  ) => {
    if (
      !datos ||
      datos.total === 0
    ) {
      return 0;
    }

    return Math.round(
      (cantidad / datos.total) *
        100,
    );
  };

  const obtenerTextoRol = (
    rol: string,
  ) => {
    switch (rol) {
      case 'administrador':
        return 'Administrador';

      case 'asociado':
        return 'Asociado';

      case 'visitante':
        return 'Visitante';

      case 'super_admin':
        return 'Super administrador';

      default:
        return rol;
    }
  };

  const obtenerEstilosRol = (
    rol: string,
  ) => {
    switch (rol) {
      case 'administrador':
        return 'bg-emerald-500/10 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300 border border-emerald-500/20';

      case 'asociado':
        return 'bg-sky-500/10 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300 border border-sky-500/20';

      case 'visitante':
        return 'bg-violet-500/10 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300 border border-violet-500/20';

      case 'super_admin':
        return 'bg-amber-500/10 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300 border border-amber-500/20';

      default:
        return 'bg-slate-500/10 text-slate-700 dark:bg-slate-500/20 dark:text-slate-300 border border-slate-500/20';
    }
  };

  const formatearFecha = (
    fecha: string,
  ) =>
    new Date(
      fecha,
    ).toLocaleDateString(
      'es-CR',
      {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      },
    );

  /* =======================================================
   * Guardar reporte consultado
   * ======================================================= */

  const guardarReporte = async () => {
    if (!datos) {
      return;
    }

    setGuardando(true);
    setMensajeGuardado('');
    setError('');

    try {
      const usuarioGeneroId =
        obtenerUsuarioGeneroId();

      if (!usuarioGeneroId) {
        throw new Error(
          'No se pudo identificar al administrador que genera el reporte.',
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

      /* =================================================
       * Se guarda una copia exacta de los datos consultados.
       * Esto permite que el reporte histórico no cambie
       * aunque los datos de la base de datos cambien después.
       * ================================================= */

      const contenido = {
        periodo,
        periodoTexto:
          obtenerTextoPeriodo(),

        fechaInicio:
          datos.fechaInicio,

        fechaFin:
          datos.fechaFin,

        total:
          datos.total,

        administradores:
          datos.administradores,

        asociados:
          datos.asociados,

        visitantes:
          datos.visitantes,

        superAdmins:
          datos.superAdmins,

        registrosPorMes:
          datos.registrosPorMes,

        mesConMasRegistros:
          datos.mesConMasRegistros,

        usuarios:
          datos.usuarios,
      };

      const respuesta = await fetch(
        'http://localhost:3000/api/reportes',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type':
              'application/json',
          },
          body: JSON.stringify({
            tipoReporte: 'usuarios',
            usuarioGeneroId,
            contenido,
          }),
        },
      );

      const resultado =
        await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(
          resultado?.mensaje ??
            'No se pudo guardar el reporte.',
        );
      }

      setMensajeGuardado(
        `Reporte ${
          resultado.reporte?.numeroReporte ?? ''
        } guardado correctamente.`,
      );
    } catch (err) {
      console.error(
        'Error al guardar reporte de usuarios:',
        err,
      );

      setError(
        err instanceof Error
          ? err.message
          : 'No se pudo guardar el reporte.',
      );
    } finally {
      setGuardando(false);
    }
  };

  const mesPrincipal =
    datos?.mesConMasRegistros;

  return (
    <div className="space-y-6 font-sans text-slate-800 dark:text-slate-100">

      {/* =================================================
       * FILTROS
       * ================================================= */}

      <section className="relative z-30 rounded-3xl border border-slate-200/80 bg-white/80 p-6 shadow-sm backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/80">

        <div className="mb-5 flex items-center gap-3">

          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
            {iconos.calendario}
          </span>

          <div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">
              Período del reporte
            </h3>

            <p className="text-sm text-slate-500 dark:text-slate-400">
              Seleccione el rango de fechas
              a analizar.
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
                setMenuAbierto(
                  !menuAbierto,
                )
              }
              className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm font-medium text-slate-800 shadow-sm transition hover:bg-slate-100/80 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700/80 dark:bg-slate-800/60 dark:text-slate-100 dark:hover:bg-slate-800 dark:focus:border-emerald-400"
            >
              <span>
                {obtenerTextoPeriodo()}
              </span>

              <span
                className={`transition-transform duration-200 ${
                  menuAbierto
                    ? 'rotate-180'
                    : ''
                }`}
              >
                {iconos.chevronDown}
              </span>
            </button>

            {menuAbierto && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() =>
                    setMenuAbierto(
                      false,
                    )
                  }
                />

                <div className="absolute left-0 top-full z-50 mt-2 w-full rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl dark:border-slate-700/80 dark:bg-slate-800">

                  {OPCIONES_PERIODO.map(
                    (opcion) => {
                      const estaSeleccionado =
                        periodo ===
                        opcion.value;

                      return (
                        <button
                          key={
                            opcion.value
                          }
                          type="button"
                          onClick={() => {
                            setPeriodo(
                              opcion.value,
                            );

                            setMenuAbierto(
                              false,
                            );

                            setConsultado(
                              false,
                            );

                            setDatos(
                              null,
                            );

                            setError('');

                            setMensajeGuardado(
                              '',
                            );
                          }}
                          className={`flex w-full items-center justify-between rounded-xl px-3.5 py-2.5 text-sm font-medium transition ${
                            estaSeleccionado
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300'
                              : 'text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700/50'
                          }`}
                        >
                          <span>
                            {
                              opcion.label
                            }
                          </span>

                          {estaSeleccionado &&
                            iconos.checkSmall}
                        </button>
                      );
                    },
                  )}

                </div>
              </>
            )}

          </div>





{/* FECHAS PERSONALIZADAS */}

{periodo === 'personalizado' && (
  <>
    {/* FECHA INICIAL */}

    <CampoFecha
      id="fechaInicioUsuarios"
      label="Fecha inicial"
      valor={fechaInicio}
      abierto={
        campoFechaAbierto === 'inicio'
      }
      onAbrir={() =>
        setCampoFechaAbierto('inicio')
      }
      onSeleccionar={(fecha) => {
        setFechaInicio(fecha);
        setCampoFechaAbierto(null);
      }}
      onCerrar={() =>
        setCampoFechaAbierto(null)
      }
    />

    {/* FECHA FINAL */}

    <CampoFecha
      id="fechaFinUsuarios"
      label="Fecha final"
      valor={fechaFin}
      abierto={
        campoFechaAbierto === 'fin'
      }
      onAbrir={() =>
        setCampoFechaAbierto('fin')
      }
      onSeleccionar={(fecha) => {
        setFechaFin(fecha);
        setCampoFechaAbierto(null);
      }}
      onCerrar={() =>
        setCampoFechaAbierto(null)
      }
    />
  </>
)}






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
              className="w-full rounded-xl bg-emerald-600 px-6 py-3 font-semibold text-white shadow-md transition hover:bg-emerald-700 hover:shadow-lg active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 dark:bg-emerald-600 dark:hover:bg-emerald-500"
            >
              {cargando
                ? 'Consultando...'
                : 'Consultar reporte'}
            </button>

          </div>

        </div>
      </section>

      {/* =================================================
       * ERROR
       * ================================================= */}

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

      {/* =================================================
       * MENSAJE INICIAL
       * ================================================= */}

      {!consultado &&
        !cargando &&
        !error && (
          <section className="rounded-3xl border border-slate-200/80 bg-white/50 p-12 text-center shadow-sm backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/40">

            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
              {iconos.total}
            </div>

            <h3 className="mt-4 text-lg font-bold text-slate-800 dark:text-slate-100">
              Seleccione un período
            </h3>

            <p className="mx-auto mt-2 max-w-md text-sm text-slate-500 dark:text-slate-400">
              Consulte las estadísticas
              de usuarios filtrando por
              el rango de fechas deseado.
            </p>

          </section>
        )}

      {/* =================================================
       * CARGANDO
       * ================================================= */}

      {cargando && (
        <section className="rounded-3xl border border-slate-200/80 bg-white/50 p-12 text-center shadow-sm backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/40">

          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-emerald-500/20 border-t-emerald-600 dark:border-emerald-400/20 dark:border-t-emerald-400" />

          <p className="mt-4 text-sm font-medium text-slate-600 dark:text-slate-400">
            Generando reporte...
          </p>

        </section>
      )}

      {/* =================================================
       * RESULTADOS
       * ================================================= */}

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
                    'Reporte de usuarios'}
                </p>

                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Tipo:{' '}
                  {datos.informacionGeneral?.tipo ??
                    'usuarios'}{' '}
                  · Filtros:{' '}
                  {periodo === 'personalizado'
                    ? `${fechaInicio} / ${fechaFin}`
                    : obtenerTextoPeriodo()}
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

              <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">

                <div className="text-sm font-medium text-slate-500 dark:text-slate-400">
                  {datos.total}{' '}
                  usuarios encontrados
                </div>

                <button
                  type="button"
                  onClick={guardarReporte}
                  disabled={guardando}
                  className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 hover:shadow-md active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 dark:bg-emerald-600 dark:hover:bg-emerald-500"
                >
                  {guardando
                    ? 'Guardando...'
                    : 'Guardar reporte'}
                </button>

              </div>

            </div>

            {/* =================================================
             * MENSAJE DE REPORTE GUARDADO
             * ================================================= */}

            {mensajeGuardado && (
              <div
                className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4 text-emerald-800 shadow-sm dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-200"
                role="status"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
                  {iconos.checkSmall}
                </span>

                <p className="text-sm font-semibold">
                  {mensajeGuardado}
                </p>
              </div>
            )}

            {/* =================================================
             * TARJETAS
             * ================================================= */}

            <div className="grid grid-cols-1 gap-4 min-[560px]:grid-cols-2 lg:grid-cols-4">

              {/* TOTAL */}

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
                  {datos.total}
                </p>

                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Usuarios registrados
                </p>

              </article>

              {/* ADMINISTRADORES */}

              <article className="relative overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/80">

                <div className="flex items-center justify-between gap-4">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
                    {iconos.administrador}
                  </span>

                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    Administradores
                  </span>
                </div>

                <p className="mt-5 text-3xl font-extrabold tracking-tight text-slate-800 dark:text-slate-100">
                  {datos.administradores}
                </p>

                <p className="mt-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                  {porcentaje(
                    datos.administradores,
                  )}
                  % del total
                </p>

              </article>

              {/* ASOCIADOS */}

              <article className="relative overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/80">

                <div className="flex items-center justify-between gap-4">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-sky-500/10 text-sky-600 dark:bg-sky-500/20 dark:text-sky-400">
                    {iconos.asociado}
                  </span>

                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    Asociados
                  </span>
                </div>

                <p className="mt-5 text-3xl font-extrabold tracking-tight text-slate-800 dark:text-slate-100">
                  {datos.asociados}
                </p>

                <p className="mt-1 text-xs font-medium text-sky-600 dark:text-sky-400">
                  {porcentaje(
                    datos.asociados,
                  )}
                  % del total
                </p>

              </article>

              {/* VISITANTES */}

              <article className="relative overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/80">

                <div className="flex items-center justify-between gap-4">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-500/10 text-violet-600 dark:bg-violet-500/20 dark:text-violet-400">
                    {iconos.visitante}
                  </span>

                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    Visitantes
                  </span>
                </div>

                <p className="mt-5 text-3xl font-extrabold tracking-tight text-slate-800 dark:text-slate-100">
                  {datos.visitantes}
                </p>

                <p className="mt-1 text-xs font-medium text-violet-600 dark:text-violet-400">
                  {porcentaje(
                    datos.visitantes,
                  )}
                  % del total
                </p>

              </article>

            </div>

            {/* =================================================
             * GRÁFICOS
             * ================================================= */}

            <div className="grid gap-4 xl:grid-cols-2">

              {/* REGISTROS POR MES */}

              <section className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/80">

                <div className="flex items-start justify-between gap-4">

                  <div>
                    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">
                      Registros por mes
                    </h3>

                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                      Cantidad de usuarios
                      registrados durante
                      el período.
                    </p>
                  </div>

                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
                    {iconos.tendencia}
                  </span>

                </div>

                <div className="mt-6">

                  {datos.registrosPorMes.length ===
                  0 ? (
                    <div className="py-10 text-center text-sm text-slate-400">
                      No hay registros
                      durante este
                      período.
                    </div>
                  ) : (
                    <GraficaRegistrosMes
                      datos={
                        datos.registrosPorMes
                      }
                    />
                  )}

                </div>

              </section>

              {/* DISTRIBUCIÓN POR ROL */}

              <section className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/80">

                <div className="flex items-start justify-between gap-4">

                  <div>
                    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">
                      Distribución por rol
                    </h3>

                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                      Distribución de
                      usuarios según
                      su rol.
                    </p>
                  </div>

                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-500/10 text-sky-600 dark:bg-sky-500/20 dark:text-sky-400">
                    {iconos.total}
                  </span>

                </div>

                <div className="mt-7 space-y-5">

                  {/* ADMINISTRADORES */}

                  <div>
                    <div className="mb-2 flex justify-between text-sm font-semibold">

                      <span className="text-slate-700 dark:text-slate-300">
                        Administradores
                      </span>

                      <span className="text-emerald-600 dark:text-emerald-400">
                        {
                          datos.administradores
                        }{' '}
                        (
                        {porcentaje(
                          datos.administradores,
                        )}
                        %)
                      </span>

                    </div>

                    <div className="h-2.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                      <div
                        className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                        style={{
                          width: `${porcentaje(
                            datos.administradores,
                          )}%`,
                        }}
                      />
                    </div>
                  </div>

                  {/* ASOCIADOS */}

                  <div>
                    <div className="mb-2 flex justify-between text-sm font-semibold">

                      <span className="text-slate-700 dark:text-slate-300">
                        Asociados
                      </span>

                      <span className="text-sky-600 dark:text-sky-400">
                        {
                          datos.asociados
                        }{' '}
                        (
                        {porcentaje(
                          datos.asociados,
                        )}
                        %)
                      </span>

                    </div>

                    <div className="h-2.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                      <div
                        className="h-full rounded-full bg-sky-500 transition-all duration-500"
                        style={{
                          width: `${porcentaje(
                            datos.asociados,
                          )}%`,
                        }}
                      />
                    </div>
                  </div>

                  {/* VISITANTES */}

                  <div>
                    <div className="mb-2 flex justify-between text-sm font-semibold">

                      <span className="text-slate-700 dark:text-slate-300">
                        Visitantes
                      </span>

                      <span className="text-violet-600 dark:text-violet-400">
                        {
                          datos.visitantes
                        }{' '}
                        (
                        {porcentaje(
                          datos.visitantes,
                        )}
                        %)
                      </span>

                    </div>

                    <div className="h-2.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                      <div
                        className="h-full rounded-full bg-violet-500 transition-all duration-500"
                        style={{
                          width: `${porcentaje(
                            datos.visitantes,
                          )}%`,
                        }}
                      />
                    </div>
                  </div>

                  {/* SUPER ADMIN */}

                  {datos.superAdmins >
                    0 && (
                    <div>
                      <div className="mb-2 flex justify-between text-sm font-semibold">

                        <span className="text-slate-700 dark:text-slate-300">
                          Super administradores
                        </span>

                        <span className="text-amber-600 dark:text-amber-400">
                          {
                            datos.superAdmins
                          }{' '}
                          (
                          {porcentaje(
                            datos.superAdmins,
                          )}
                          %)
                        </span>

                      </div>

                      <div className="h-2.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                        <div
                          className="h-full rounded-full bg-amber-500 transition-all duration-500"
                          style={{
                            width: `${porcentaje(
                              datos.superAdmins,
                            )}%`,
                          }}
                        />
                      </div>
                    </div>
                  )}

                </div>

              </section>

            </div>

            {/* =================================================
             * MES CON MÁS REGISTROS
             * ================================================= */}

            {mesPrincipal && (
              <section className="relative overflow-hidden rounded-3xl border border-emerald-500/20 bg-gradient-to-r from-emerald-600 to-teal-700 p-6 text-white shadow-lg dark:from-emerald-900/90 dark:to-slate-900">

                <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-white/10 blur-2xl" />

                <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">

                  <div>

                    <p className="text-xs font-bold uppercase tracking-wider text-emerald-100/80">
                      Mes con mayor cantidad
                      de registros
                    </p>

                    <h3 className="mt-2 text-2xl font-extrabold">
                      {formatearMes(
                        mesPrincipal.mes,
                      )}
                    </h3>

                    <p className="mt-1 text-sm text-emerald-100/90">
                      {
                        mesPrincipal.cantidad
                      }{' '}
                      usuarios registrados
                      durante ese mes.
                    </p>

                  </div>

                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/15 backdrop-blur-md">
                    {iconos.medalla}
                  </div>

                </div>
              </section>
            )}

            {/* =================================================
             * TABLA DE USUARIOS
             * ================================================= */}

            <section className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/80">

              <div className="border-b border-slate-100 p-6 dark:border-slate-800">

                <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">

                  <div>

                    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">
                      Usuarios registrados
                    </h3>

                    <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
                      Listado de usuarios
                      encontrados durante
                      el período.
                    </p>

                  </div>

                  <span className="w-fit rounded-full bg-emerald-500/10 px-3.5 py-1.5 text-xs font-bold text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
                    {
                      datos.usuarios
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
                        Usuario
                      </th>

                      <th className="px-6 py-4">
                        Nombre
                      </th>

                      <th className="px-6 py-4">
                        Correo
                      </th>

                      <th className="px-6 py-4">
                        Rol
                      </th>

                      <th className="px-6 py-4">
                        Fecha de registro
                      </th>

                    </tr>

                  </thead>

                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">

                    {datos.usuarios
                      .length ===
                    0 ? (
                      <tr>
                        <td
                          colSpan={5}
                          className="px-6 py-12 text-center text-slate-400 dark:text-slate-500"
                        >
                          No hay usuarios
                          registrados
                          durante el
                          período
                          seleccionado.
                        </td>
                      </tr>
                    ) : (
                      datos.usuarios.map(
                        (usuario) => (
                          <tr
                            key={
                              usuario.id
                            }
                            className="transition hover:bg-slate-50/80 dark:hover:bg-slate-800/40"
                          >

                            <td className="px-6 py-4">

                              <p className="font-bold text-slate-800 dark:text-slate-100">
                                {
                                  usuario.nombreUsuario
                                }
                              </p>

                            </td>

                            <td className="px-6 py-4">

                              <p className="font-medium text-slate-700 dark:text-slate-300">
                                {
                                  usuario.nombre
                                }{' '}
                                {
                                  usuario.apellidos
                                }
                              </p>

                            </td>

                            <td className="px-6 py-4">

                              <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">

                                <span className="text-emerald-600 dark:text-emerald-400">
                                  {
                                    iconos.correo
                                  }
                                </span>

                                <span>
                                  {
                                    usuario.correo
                                  }
                                </span>

                              </div>

                            </td>

                            <td className="px-6 py-4">

                              <span
                                className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${obtenerEstilosRol(
                                  usuario.rol,
                                )}`}
                              >
                                {obtenerTextoRol(
                                  usuario.rol,
                                )}
                              </span>

                            </td>

                            <td className="px-6 py-4 font-medium text-slate-500 dark:text-slate-400">
                              {formatearFecha(
                                usuario.fechaRegistro,
                              )}
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
