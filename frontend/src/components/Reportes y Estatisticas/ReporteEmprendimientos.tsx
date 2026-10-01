import {useEffect, useRef, useState, type ReactNode, } from 'react';
import AccionesReporteGuardado from './AccionesReporteGuardado';
type Periodo =
  | 'hoy'
  | '7dias'
  | '30dias'
  | 'mes'
  | 'personalizado';

interface CategoriaReporte {
  nombre: string;
  cantidad: number;
}

interface EmprendimientoConsultadoReporte {
  emprendimientoId: number;
  nombre: string;
  cantidadConsultas: number;
}

interface EmprendimientoReporte {
  id: number;
  nombre: string;
  estado: string;
  fechaCreacion: string;
  categoria: string;
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

interface EstadisticasEmprendimientos {
  informacionGeneral?: InformacionGeneralReporte;
  periodo: string;
  fechaInicio: string | null;
  fechaFin: string | null;

  total: number;
  publicados: number;
  noPublicados: number;
  desactivados: number;
  borradores: number;
  porcentajesPorEstado?: {
    publicados: number;
    noPublicados: number;
    desactivados: number;
    borradores: number;
  };

  categorias: CategoriaReporte[];
  totalConsultas: number;
  emprendimientosMasConsultados: EmprendimientoConsultadoReporte[];
  emprendimientos: EmprendimientoReporte[];
}

interface EmprendimientoFiltro {
  id: number;
  nombre: string;
  categoriaId: number | null;
  categoria: string | null;
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
      <path d="M4 20h16" />
      <path d="M6 20V9l6-5 6 5v11" />
      <path d="M9 20v-5h6v5M9 10h.01M15 10h.01" />
    </Icono>
  ),

  check: (
    <Icono>
      <circle cx="12" cy="12" r="9" />
      <path d="m8.5 12.5 2.3 2.3L16 10" />
    </Icono>
  ),

  borrador: (
    <Icono>
      <path d="M14 3v5h5" />
      <path d="M6 3h8l5 5v13H6z" />
      <path d="M9 13h6M9 17h6" />
    </Icono>
  ),

  bloqueado: (
    <Icono>
      <circle cx="12" cy="12" r="9" />
      <path d="m8 8 8 8M16 8l-8 8" />
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

  medalla: (
    <Icono>
      <circle cx="12" cy="9" r="5" />
      <path d="m8 13.5-1.5 6L12 17l5.5 2.5-1.5-6" />
    </Icono>
  ),

  calendario: (
    <Icono>
      <rect x="4" y="5" width="16" height="15" rx="2" />
      <path d="M8 3v4M16 3v4M4 10h16" />
    </Icono>
  ),

  chevronDown: (
    <svg
      className="h-4 w-4 text-slate-400 dark:text-slate-400"
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

  flechaIzquierda: (
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
  ),

  flechaDerecha: (
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
  { value: '7dias', label: 'Últimos 7 días' },
  { value: '30dias', label: 'Últimos 30 días' },
  { value: 'mes', label: 'Este mes' },
  { value: 'personalizado', label: 'Personalizado' },
];

/* =========================================================
 * Calendario
 * ========================================================= */

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
): Array<{
  fecha: Date;
  delMes: boolean;
}> {
  const primerDia = new Date(anio, mes, 1);

  const offset =
    (primerDia.getDay() + 6) % 7;

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

    fecha.setDate(
      inicio.getDate() + i,
    );

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

  const [mesVisible, setMesVisible] =
    useState(inicial.getMonth());

  const [anioVisible, setAnioVisible] =
    useState(inicial.getFullYear());

  const dias = obtenerMatrizDias(
    anioVisible,
    mesVisible,
  );

  const irMesAnterior = () => {
    if (mesVisible === 0) {
      setMesVisible(11);
      setAnioVisible(
        (anio) => anio - 1,
      );
    } else {
      setMesVisible(
        (mes) => mes - 1,
      );
    }
  };

  const irMesSiguiente = () => {
    if (mesVisible === 11) {
      setMesVisible(0);
      setAnioVisible(
        (anio) => anio + 1,
      );
    } else {
      setMesVisible(
        (mes) => mes + 1,
      );
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
          {MESES[mesVisible]} de{' '}
          {anioVisible}
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
          <div
            key={dia}
            className="py-1"
          >
            {dia}
          </div>
        ))}
      </div>

      <div className="mt-1 grid grid-cols-7 gap-1">
        {dias.map(
          (
            {
              fecha,
              delMes,
            },
            indice,
          ) => {
            const iso =
              formatearISO(fecha);

            const seleccionado =
              valorSeleccionado ===
              iso;

            const esHoy =
              esMismaFecha(
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
                    esHoy &&
                    !seleccionado
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
          flex w-full items-center justify-between gap-2 rounded-xl border bg-slate-50/50 px-4 py-3 text-left text-sm font-medium shadow-sm transition
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
        {formatearVisible(valor)}

        <span className="text-emerald-600 dark:text-emerald-400">
          {iconos.calendario}
        </span>
      </button>

      {children}
    </div>
  );
}

/* =========================================================
 * Gráfica de montaña
 * ========================================================= */

function GraficaMontana({
  datos,
}: {
  datos: CategoriaReporte[];
}) {
  const ancho = 640;
  const alto = 240;
  const paddingX = 24;
  const paddingTop = 42;
  const paddingBottom = 32;

  const maximo = Math.max(
    ...datos.map(
      (d) => d.cantidad,
    ),
    1,
  );

  const zonaAlto =
    alto -
    paddingTop -
    paddingBottom;

  const puntos = datos.map(
    (d, i) => {
      const x =
        datos.length === 1
          ? ancho / 2
          : paddingX +
            (i *
              (ancho -
                paddingX * 2)) /
              (datos.length - 1);

      const y =
        paddingTop +
        zonaAlto -
        (d.cantidad /
          maximo) *
          zonaAlto;

      return {
        x,
        y,
        dato: d,
      };
    },
  );

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
      const actual =
        puntos[i];

      const siguiente =
        puntos[i + 1];

      const puntoMedioX =
        (actual.x +
          siguiente.x) /
        2;

      d += ` Q ${actual.x} ${actual.y} ${puntoMedioX} ${
        (actual.y +
          siguiente.y) /
        2
      }`;

      d += ` Q ${puntoMedioX} ${siguiente.y} ${siguiente.x} ${siguiente.y}`;
    }

    return d;
  };

  const lineaCurva =
    construirCurva();

  const areaCurva =
    puntos.length > 0
      ? `${lineaCurva} L ${
          puntos[
            puntos.length - 1
          ].x
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
        aria-label="Gráfica de categorías más registradas"
      >
        <defs>
          <linearGradient
            id="degradadoMontana"
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

        {[0.25, 0.5, 0.75].map(
          (frac) => (
            <line
              key={frac}
              x1={paddingX}
              x2={
                ancho -
                paddingX
              }
              y1={
                paddingTop +
                frac *
                  zonaAlto
              }
              y2={
                paddingTop +
                frac *
                  zonaAlto
              }
              className="stroke-slate-200 dark:stroke-slate-800"
              strokeWidth="1"
            />
          ),
        )}

        {puntos.length > 0 && (
          <>
            <path
              d={areaCurva}
              fill="url(#degradadoMontana)"
            />

            <path
              d={lineaCurva}
              fill="none"
              className="stroke-emerald-600 dark:stroke-emerald-400"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
          </>
        )}

        {puntos.map((p) => (
          <g
            key={p.dato.nombre}
          >
            <text
              x={p.x}
              y={Math.max(
                18,
                p.y - 16,
              )}
              textAnchor="middle"
              dominantBaseline="middle"
              className="fill-slate-800 text-[13px] font-bold dark:fill-slate-200"
            >
              {p.dato.cantidad}
            </text>

            <circle
              cx={p.x}
              cy={p.y}
              r="4.5"
              className="fill-white dark:fill-slate-900 stroke-emerald-600 dark:stroke-emerald-400"
              strokeWidth="2.5"
            />
          </g>
        ))}
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

function GraficaBarrasConsultas({
  datos,
}: {
  datos: EmprendimientoConsultadoReporte[];
}) {
  const maximo = Math.max(
    ...datos.map(
      (emprendimiento) =>
        emprendimiento.cantidadConsultas,
    ),
    1,
  );

  return (
    <div className="space-y-4">
      {datos.map((emprendimiento, indice) => {
        const porcentajeBarra =
          (emprendimiento.cantidadConsultas /
            maximo) *
          100;

        return (
          <div
            key={emprendimiento.emprendimientoId}
            className="space-y-2"
          >
            <div className="flex items-center justify-between gap-3 text-sm">
              <div className="flex min-w-0 items-center gap-2">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-xs font-extrabold text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300">
                  {indice + 1}
                </span>

                <span
                  className="truncate font-bold text-slate-700 dark:text-slate-200"
                  title={emprendimiento.nombre}
                >
                  {emprendimiento.nombre}
                </span>
              </div>

              <span className="shrink-0 font-extrabold text-emerald-600 dark:text-emerald-400">
                {
                  emprendimiento.cantidadConsultas
                }
              </span>
            </div>

            <div className="h-3 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
              <div
                className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                style={{
                  width: `${porcentajeBarra}%`,
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* =========================================================
 * Componente Principal
 * ========================================================= */

export default function ReporteEmprendimientos() {
  const [periodo, setPeriodo] =
    useState<Periodo>('30dias');

  const [menuAbierto, setMenuAbierto] =
    useState(false);

  const [fechaInicio, setFechaInicio] =
    useState('');

  const [fechaFin, setFechaFin] =
    useState('');

  const [
    campoFechaAbierto,
    setCampoFechaAbierto,
  ] = useState<
    'inicio' | 'fin' | null
  >(null);

  const [cargando, setCargando] =
    useState(false);

  const [consultado, setConsultado] =
    useState(false);

  const [datos, setDatos] =
    useState<EstadisticasEmprendimientos | null>(
      null,
    );

  const [error, setError] =
    useState('');

  /* =========================================================
   * NUEVOS FILTROS
   * ========================================================= */

  const [
    emprendimientoId,
    setEmprendimientoId,
  ] = useState('');

  const [
    categoriaId,
    setCategoriaId,
  ] = useState('');

  const [
    emprendimientosFiltro,
    setEmprendimientosFiltro,
  ] = useState<
    EmprendimientoFiltro[]
  >([]);

  const [
    categoriasFiltro,
    setCategoriasFiltro,
  ] = useState<
    {
      id: number;
      nombre: string;
    }[]
  >([]);

  const [
    cargandoFiltros,
    setCargandoFiltros,
  ] = useState(true);

  const contenedorFechasRef =
    useRef<HTMLDivElement>(null);

  /* =========================================================
   * CERRAR CALENDARIO AL HACER CLIC FUERA
   * ========================================================= */

  useEffect(() => {
    function manejarClicFuera(
      evento: MouseEvent,
    ) {
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

    return () =>
      document.removeEventListener(
        'mousedown',
        manejarClicFuera,
      );
  }, []);

  /* =========================================================
   * CARGAR EMPRENDIMIENTOS Y CATEGORÍAS
   * ========================================================= */

  useEffect(() => {
    const cargarFiltros = async () => {
      try {
        setCargandoFiltros(true);

        const token =
          sessionStorage.getItem(
            'token',
          ) ??
          localStorage.getItem(
            'token',
          );

        const respuesta =
          await fetch(
            'http://localhost:3000/api/emprendimientos',
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
          await respuesta.json();

        /*
         * El endpoint de emprendimientos
         * para administrador devuelve:
         *
         * id
         * nombre
         * categoria
         * categoriaId
         */

        const lista =
          Array.isArray(resultado)
            ? resultado
            : [];

        const emprendimientos =
          lista.map(
            (emprendimiento: any) => ({
              id: Number(
                emprendimiento.id,
              ),
              nombre:
                String(
                  emprendimiento.nombre ??
                    '',
                ),
              categoriaId:
                emprendimiento.categoriaId !==
                null &&
                emprendimiento.categoriaId !==
                  undefined
                  ? Number(
                      emprendimiento.categoriaId,
                    )
                  : null,
              categoria:
                emprendimiento.categoria ??
                null,
            }),
          );

        setEmprendimientosFiltro(
          emprendimientos,
        );

        /*
         * Construimos las categorías
         * a partir de los emprendimientos.
         *
         * Así no dependemos de otra URL.
         */

        const mapaCategorias =
          new Map<
            number,
            string
          >();

        emprendimientos.forEach(
          (emprendimiento) => {
            if (
              emprendimiento.categoriaId &&
              emprendimiento.categoria
            ) {
              mapaCategorias.set(
                emprendimiento.categoriaId,
                emprendimiento.categoria,
              );
            }
          },
        );

        const categorias =
          Array.from(
            mapaCategorias.entries(),
          )
            .map(
              ([
                id,
                nombre,
              ]) => ({
                id,
                nombre,
              }),
            )
            .sort((a, b) =>
              a.nombre.localeCompare(
                b.nombre,
                'es',
              ),
            );

        setCategoriasFiltro(
          categorias,
        );
      } catch (error) {
        console.error(
          'Error al cargar filtros:',
          error,
        );
      } finally {
        setCargandoFiltros(false);
      }
    };

    cargarFiltros();
  }, []);

  /* =========================================================
   * CONSULTAR REPORTE
   * ========================================================= */

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

      /* NUEVO: FILTRO POR EMPRENDIMIENTO */

      if (emprendimientoId) {
        params.append(
          'emprendimientoId',
          emprendimientoId,
        );
      }

      /* NUEVO: FILTRO POR CATEGORÍA */

      if (categoriaId) {
        params.append(
          'categoriaId',
          categoriaId,
        );
      }

      const token =
        sessionStorage.getItem(
          'token',
        ) ??
        localStorage.getItem(
          'token',
        );

      const respuesta =
        await fetch(
          `http://localhost:3000/api/reportes/estadisticas/emprendimientos?${params.toString()}`,
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
        (await respuesta.json()) as EstadisticasEmprendimientos;

      setDatos(resultado);
      setConsultado(true);
    } catch (err) {
      console.error(
        'Error al consultar reporte:',
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

  /* =========================================================
   * FUNCIONES AUXILIARES
   * ========================================================= */

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

  const obtenerTextoPeriodo =
    () => {
      return (
        OPCIONES_PERIODO.find(
          (o) =>
            o.value === periodo,
        )?.label ?? ''
      );
    };

  const obtenerTextoEstado = (
    estado: string,
  ) => {
    switch (estado) {
      case 'publicado':
        return 'Publicado';

      case 'no_publicado':
        return 'No publicado';

      case 'desactivado':
        return 'Desactivado';

      case 'borrador':
        return 'Borrador';

      default:
        return estado;
    }
  };

  const obtenerEstilosEstado = (
    estado: string,
  ) => {
    switch (estado) {
      case 'publicado':
        return 'bg-emerald-500/10 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300 border border-emerald-500/20';

      case 'borrador':
        return 'bg-amber-500/10 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300 border border-amber-500/20';

      case 'desactivado':
        return 'bg-rose-500/10 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300 border border-rose-500/20';

      default:
        return 'bg-slate-500/10 text-slate-700 dark:bg-slate-500/20 dark:text-slate-300 border border-slate-500/20';
    }
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

  const categoriaPrincipal =
    datos?.categorias?.[0];

  return (
    <div className="space-y-6 font-sans text-slate-800 dark:text-slate-100">

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
              Seleccione los criterios para analizar los emprendimientos.
            </p>
          </div>

        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">

          {/* =================================================
              PERÍODO
              ================================================= */}

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

                            setError(
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

          {/* =================================================
              EMPRENDIMIENTO
              ================================================= */}

          <div>

            <label
              htmlFor="filtro-emprendimiento"
              className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400"
            >
              Emprendimiento
            </label>

            <select
              id="filtro-emprendimiento"
              value={
                emprendimientoId
              }
              onChange={(e) => {
                setEmprendimientoId(
                  e.target.value,
                );

                setConsultado(
                  false,
                );

                setDatos(null);
                setError('');
              }}
              disabled={
                cargandoFiltros
              }
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm font-medium text-slate-800 shadow-sm transition focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700/80 dark:bg-slate-800/60 dark:text-slate-100"
            >

              <option value="">
                Todos los emprendimientos
              </option>

              {emprendimientosFiltro.map(
                (
                  emprendimiento,
                ) => (
                  <option
                    key={
                      emprendimiento.id
                    }
                    value={
                      emprendimiento.id
                    }
                  >
                    {
                      emprendimiento.nombre
                    }
                  </option>
                ),
              )}

            </select>

          </div>

          {/* =================================================
              CATEGORÍA
              ================================================= */}

          <div>

            <label
              htmlFor="filtro-categoria"
              className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400"
            >
              Categoría
            </label>

            <select
              id="filtro-categoria"
              value={
                categoriaId
              }
              onChange={(e) => {
                setCategoriaId(
                  e.target.value,
                );

                setConsultado(
                  false,
                );

                setDatos(null);
                setError('');
              }}
              disabled={
                cargandoFiltros
              }
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm font-medium text-slate-800 shadow-sm transition focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700/80 dark:bg-slate-800/60 dark:text-slate-100"
            >

              <option value="">
                Todas las categorías
              </option>

              {categoriasFiltro.map(
                (categoria) => (
                  <option
                    key={
                      categoria.id
                    }
                    value={
                      categoria.id
                    }
                  >
                    {
                      categoria.nombre
                    }
                  </option>
                ),
              )}

            </select>

          </div>

          {/* =================================================
              FECHAS PERSONALIZADAS
              ================================================= */}

          {periodo ===
            'personalizado' && (
            <div
              ref={
                contenedorFechasRef
              }
              className="contents"
            >
              <div>
                <CampoFecha
                  etiqueta="Fecha inicial"
                  valor={
                    fechaInicio
                  }
                  abierto={
                    campoFechaAbierto ===
                    'inicio'
                  }
                  onAbrir={() =>
                    setCampoFechaAbierto(
                      (actual) =>
                        actual ===
                        'inicio'
                          ? null
                          : 'inicio',
                    )
                  }
                >
                  {campoFechaAbierto ===
                    'inicio' && (
                    <Calendario
                      valorSeleccionado={
                        fechaInicio
                      }
                      onSeleccionar={
                        setFechaInicio
                      }
                      onCerrar={() =>
                        setCampoFechaAbierto(
                          null,
                        )
                      }
                    />
                  )}
                </CampoFecha>
              </div>

              <div>
                <CampoFecha
                  etiqueta="Fecha final"
                  valor={
                    fechaFin
                  }
                  abierto={
                    campoFechaAbierto ===
                    'fin'
                  }
                  onAbrir={() =>
                    setCampoFechaAbierto(
                      (actual) =>
                        actual ===
                        'fin'
                          ? null
                          : 'fin',
                    )
                  }
                >
                  {campoFechaAbierto ===
                    'fin' && (
                    <Calendario
                      valorSeleccionado={
                        fechaFin
                      }
                      onSeleccionar={
                        setFechaFin
                      }
                      onCerrar={() =>
                        setCampoFechaAbierto(
                          null,
                        )
                      }
                    />
                  )}
                </CampoFecha>
              </div>
            </div>
          )}

          {/* =================================================
              BOTÓN CONSULTAR
              ================================================= */}

          <div className="flex items-end">

            <button
              type="button"
              onClick={
                consultar
              }
              disabled={
                cargando ||
                cargandoFiltros ||
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
          MENSAJE INICIAL
          ===================================================== */}

      {!consultado &&
        !cargando &&
        !error && (
          <section className="rounded-3xl border border-slate-200/80 bg-white/50 p-12 text-center shadow-sm backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/40">

            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
              {iconos.montana}
            </div>

            <h3 className="mt-4 text-lg font-bold text-slate-800 dark:text-slate-100">
              Seleccione los filtros
            </h3>

            <p className="mx-auto mt-2 max-w-md text-sm text-slate-500 dark:text-slate-400">
              Consulte las estadísticas de emprendimientos filtrando por período, emprendimiento y categoría.
            </p>

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
            {/* RESUMEN DEL PERÍODO */}

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
                    'Reporte de emprendimientos'}
                </p>

                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Tipo:{' '}
                  {datos.informacionGeneral?.tipo ??
                    'emprendimientos'}{' '}
                  · Filtros:{' '}
                  {emprendimientoId
                    ? `emprendimiento ${emprendimientoId}`
                    : 'todos los emprendimientos'}
                  {' / '}
                  {categoriaId
                    ? `categoria ${categoriaId}`
                    : 'todas las categorias'}
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
                {datos.total}{' '}
                emprendimientos encontrados
              </div>

              <AccionesReporteGuardado tipoReporte="emprendimientos" nombreReporte={datos.informacionGeneral?.nombre ?? 'Reporte de emprendimientos'} contenido={datos as unknown as Record<string, unknown>} tieneDatos />

            </div>

            {/* TARJETAS DE MÉTRICAS */}

            <div className="grid grid-cols-1 gap-4 min-[560px]:grid-cols-2 xl:grid-cols-5">

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
                  Emprendimientos registrados
                </p>

              </article>

              <article className="relative overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/80">

                <div className="flex items-center justify-between gap-4">

                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
                    {iconos.check}
                  </span>

                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    Publicados
                  </span>

                </div>

                <p className="mt-5 text-3xl font-extrabold tracking-tight text-slate-800 dark:text-slate-100">
                  {datos.publicados}
                </p>

                <p className="mt-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                  {porcentaje(
                    datos.publicados,
                  )}
                  % del total
                </p>

              </article>

              <article className="relative overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/80">

                <div className="flex items-center justify-between gap-4">

                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400">
                    {iconos.borrador}
                  </span>

                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    Borradores
                  </span>

                </div>

                <p className="mt-5 text-3xl font-extrabold tracking-tight text-slate-800 dark:text-slate-100">
                  {datos.borradores}
                </p>

                <p className="mt-1 text-xs font-medium text-amber-600 dark:text-amber-400">
                  {porcentaje(
                    datos.borradores,
                  )}
                  % del total
                </p>

              </article>

              <article className="relative overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/80">

                <div className="flex items-center justify-between gap-4">

                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-rose-500/10 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400">
                    {iconos.bloqueado}
                  </span>

                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    Desactivados
                  </span>

                </div>

                <p className="mt-5 text-3xl font-extrabold tracking-tight text-slate-800 dark:text-slate-100">
                  {datos.desactivados}
                </p>

                <p className="mt-1 text-xs font-medium text-rose-600 dark:text-rose-400">
                  {porcentaje(
                    datos.desactivados,
                  )}
                  % del total
                </p>

              </article>

              <article className="relative overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/80">

                <div className="flex items-center justify-between gap-4">

                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-sky-500/10 text-sky-600 dark:bg-sky-500/20 dark:text-sky-400">
                    {iconos.tendencia}
                  </span>

                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    Consultas
                  </span>

                </div>

                <p className="mt-5 text-3xl font-extrabold tracking-tight text-slate-800 dark:text-slate-100">
                  {datos.totalConsultas}
                </p>

                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Consultas registradas
                </p>

              </article>

            </div>

            {/* GRÁFICOS */}

            <div className="grid gap-4 xl:grid-cols-2">

              {/* CATEGORÍAS */}

              <section className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/80">

                <div className="flex items-start justify-between gap-4">

                  <div>
                    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">
                      Categorías más registradas
                    </h3>

                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                      Distribución de emprendimientos por categoría.
                    </p>
                  </div>

                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
                    {iconos.montana}
                  </span>

                </div>

                <div className="mt-6">

                  {datos.categorias
                    .length === 0 ? (
                    <div className="py-10 text-center text-sm text-slate-400">
                      No hay categorías registradas durante este período.
                    </div>
                  ) : (
                    <GraficaMontana
                      datos={datos.categorias.slice(
                        0,
                        6,
                      )}
                    />
                  )}

                </div>

              </section>

              {/* ESTADOS */}

              <section className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/80">

                <div className="flex items-start justify-between gap-4">

                  <div>
                    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">
                      Estado de los emprendimientos
                    </h3>

                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                      Distribución según el estado actual.
                    </p>
                  </div>

                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-500/10 text-sky-600 dark:bg-sky-500/20 dark:text-sky-400">
                    {iconos.tendencia}
                  </span>

                </div>

                <div className="mt-7 space-y-5">

                  <div>
                    <div className="mb-2 flex justify-between text-sm font-semibold">

                      <span className="text-slate-700 dark:text-slate-300">
                        Publicados
                      </span>

                      <span className="text-emerald-600 dark:text-emerald-400">
                        {datos.publicados}{' '}
                        (
                        {porcentaje(
                          datos.publicados,
                        )}
                        %)
                      </span>

                    </div>

                    <div className="h-2.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">

                      <div
                        className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                        style={{
                          width: `${porcentaje(
                            datos.publicados,
                          )}%`,
                        }}
                      />

                    </div>
                  </div>

                  <div>
                    <div className="mb-2 flex justify-between text-sm font-semibold">

                      <span className="text-slate-700 dark:text-slate-300">
                        Borradores
                      </span>

                      <span className="text-amber-600 dark:text-amber-400">
                        {datos.borradores}{' '}
                        (
                        {porcentaje(
                          datos.borradores,
                        )}
                        %)
                      </span>

                    </div>

                    <div className="h-2.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">

                      <div
                        className="h-full rounded-full bg-amber-500 transition-all duration-500"
                        style={{
                          width: `${porcentaje(
                            datos.borradores,
                          )}%`,
                        }}
                      />

                    </div>
                  </div>

                  <div>
                    <div className="mb-2 flex justify-between text-sm font-semibold">

                      <span className="text-slate-700 dark:text-slate-300">
                        No publicados
                      </span>

                      <span className="text-slate-600 dark:text-slate-400">
                        {datos.noPublicados}{' '}
                        (
                        {porcentaje(
                          datos.noPublicados,
                        )}
                        %)
                      </span>

                    </div>

                    <div className="h-2.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">

                      <div
                        className="h-full rounded-full bg-slate-400 transition-all duration-500 dark:bg-slate-500"
                        style={{
                          width: `${porcentaje(
                            datos.noPublicados,
                          )}%`,
                        }}
                      />

                    </div>
                  </div>

                  <div>
                    <div className="mb-2 flex justify-between text-sm font-semibold">

                      <span className="text-slate-700 dark:text-slate-300">
                        Desactivados
                      </span>

                      <span className="text-rose-600 dark:text-rose-400">
                        {datos.desactivados}{' '}
                        (
                        {porcentaje(
                          datos.desactivados,
                        )}
                        %)
                      </span>

                    </div>

                    <div className="h-2.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">

                      <div
                        className="h-full rounded-full bg-rose-500 transition-all duration-500"
                        style={{
                          width: `${porcentaje(
                            datos.desactivados,
                          )}%`,
                        }}
                      />

                    </div>
                  </div>

                </div>

              </section>

            </div>

            {/* =================================================
                CATEGORÍA PRINCIPAL
                ================================================= */}

            <section className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/80">

              <div className="flex items-start justify-between gap-4">

                <div>
                  <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">
                    Emprendimientos más consultados
                  </h3>

                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    Ranking de consultas registradas para los filtros seleccionados.
                  </p>
                </div>

                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
                  {iconos.medalla}
                </span>

              </div>

              <div className="mt-6">

                {datos.totalConsultas === 0 ||
                datos.emprendimientosMasConsultados
                  .length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 px-4 py-10 text-center text-sm font-medium text-slate-500 dark:border-slate-700 dark:bg-slate-800/40 dark:text-slate-400">
                    No hay consultas registradas para los filtros seleccionados.
                  </div>
                ) : (
                  <GraficaBarrasConsultas
                    datos={
                      datos.emprendimientosMasConsultados
                    }
                  />
                )}

              </div>

            </section>

            {categoriaPrincipal && (
              <section className="relative overflow-hidden rounded-3xl border border-emerald-500/20 bg-gradient-to-r from-emerald-600 to-teal-700 p-6 text-white shadow-lg dark:from-emerald-900/90 dark:to-slate-900">

                <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-white/10 blur-2xl" />

                <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">

                  <div>

                    <p className="text-xs font-bold uppercase tracking-wider text-emerald-100/80">
                      Categoría con mayor cantidad de registros
                    </p>

                    <h3 className="mt-2 text-2xl font-extrabold">
                      {
                        categoriaPrincipal.nombre
                      }
                    </h3>

                    <p className="mt-1 text-sm text-emerald-100/90">
                      {
                        categoriaPrincipal.cantidad
                      }{' '}
                      emprendimientos registrados durante el período seleccionado.
                    </p>

                  </div>

                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/15 backdrop-blur-md">
                    {iconos.medalla}
                  </div>

                </div>

              </section>
            )}

            {/* =================================================
                TABLA
                ================================================= */}

            <section className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/80">

              <div className="border-b border-slate-100 p-6 dark:border-slate-800">

                <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">

                  <div>

                    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">
                      Emprendimientos registrados
                    </h3>

                    <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
                      Listado de registros encontrados durante el período.
                    </p>

                  </div>

                  <span className="w-fit rounded-full bg-emerald-500/10 px-3.5 py-1.5 text-xs font-bold text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
                    {
                      datos
                        .emprendimientos
                        .length
                    }{' '}
                    registros
                  </span>

                </div>

              </div>

              <div className="overflow-x-auto">

                <table className="w-full min-w-[700px] text-left text-sm">

                  <thead className="bg-slate-50/80 text-xs font-bold uppercase tracking-wider text-slate-500 dark:bg-slate-800/50 dark:text-slate-400">

                    <tr>
                      <th className="px-6 py-4">
                        Emprendimiento
                      </th>

                      <th className="px-6 py-4">
                        Categoría
                      </th>

                      <th className="px-6 py-4">
                        Estado
                      </th>

                      <th className="px-6 py-4">
                        Fecha de registro
                      </th>
                    </tr>

                  </thead>

                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">

                    {datos.emprendimientos
                      .length === 0 ? (
                      <tr>
                        <td
                          colSpan={4}
                          className="px-6 py-12 text-center text-slate-400 dark:text-slate-500"
                        >
                          No hay emprendimientos registrados durante el período seleccionado.
                        </td>
                      </tr>
                    ) : (
                      datos.emprendimientos.map(
                        (
                          emprendimiento,
                        ) => (
                          <tr
                            key={
                              emprendimiento.id
                            }
                            className="transition hover:bg-slate-50/80 dark:hover:bg-slate-800/40"
                          >

                            <td className="px-6 py-4">

                              <p className="font-bold text-slate-800 dark:text-slate-100">
                                {
                                  emprendimiento.nombre
                                }
                              </p>

                            </td>

                            <td className="px-6 py-4">

                              <span className="inline-flex items-center rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                                {
                                  emprendimiento.categoria
                                }
                              </span>

                            </td>

                            <td className="px-6 py-4">

                              <span
                                className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${obtenerEstilosEstado(
                                  emprendimiento.estado,
                                )}`}
                              >
                                {obtenerTextoEstado(
                                  emprendimiento.estado,
                                )}
                              </span>

                            </td>

                            <td className="px-6 py-4 font-medium text-slate-500 dark:text-slate-400">
                              {formatearFecha(
                                emprendimiento.fechaCreacion,
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
