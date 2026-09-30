import { useEffect, useRef, useState, type ReactNode } from 'react';

type Periodo =
  | 'hoy'
  | '7dias'
  | '30dias'
  | 'mes'
  | 'personalizado';

type CategoriaIncidencia =
  | ''
  | 'seguridad'
  | 'incendio'
  | 'flora_fauna'
  | 'ambiental'
  | 'infraestructura'
  | 'senderos'
  | 'servicios'
  | 'otro';

type PrioridadIncidencia =
  | ''
  | 'baja'
  | 'media'
  | 'alta'
  | 'critica';

type EstadoIncidencia =
  | ''
  | 'pendiente'
  | 'en_revision'
  | 'en_proceso'
  | 'resuelta'
  | 'rechazada'
  | 'cerrada';

interface ItemReporte {
  nombre: string;
  cantidad: number;
}

interface IncidenciaReporte {
  id: number;
  titulo: string;
  descripcion: string;
  categoria: string;
  prioridad: string;
  estado: string;
  ubicacion: string | null;
  latitud: number | null;
  longitud: number | null;
  observacionesAdmin: string | null;
  fechaResolucion: string | null;
  fechaRegistro: string;
  fechaActualizacion: string;
}

interface IncidenciaPorMes {
  mes: string;
  cantidad: number;
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

interface EstadisticasIncidencias {
  informacionGeneral?: InformacionGeneralReporte;
  periodo: string;
  fechaInicio: string | null;
  fechaFin: string | null;

  totalIncidencias: number;

  incidenciasPorCategoria: unknown;
  incidenciasPorPrioridad: unknown;
  incidenciasPorEstado: unknown;

  incidenciasPorMes: IncidenciaPorMes[];

  mesConMasIncidencias: {
    mes: string;
    cantidad: number;
  } | null;

  detalleIncidencias: IncidenciaReporte[];

  reporte?: {
    id: number;
    numeroReporte: string;
  };
}

/* =========================================================
   NORMALIZACIÓN
   ========================================================= */

function normalizarLista(valor: unknown): ItemReporte[] {
  if (Array.isArray(valor)) {
    return valor
      .map((item) => {
        if (!item || typeof item !== 'object') {
          return null;
        }

        const objeto = item as Record<string, unknown>;

        const nombre = String(
          objeto.nombre ??
            objeto.categoria ??
            objeto.prioridad ??
            objeto.estado ??
            '',
        );

        const cantidad = Number(
          objeto.cantidad ??
            objeto.total ??
            objeto.count ??
            0,
        );

        if (!nombre) {
          return null;
        }

        return {
          nombre,
          cantidad: Number.isFinite(cantidad)
            ? cantidad
            : 0,
        };
      })
      .filter(
        (
          item,
        ): item is ItemReporte =>
          item !== null,
      );
  }

  if (
    valor &&
    typeof valor === 'object'
  ) {
    return Object.entries(
      valor as Record<string, unknown>,
    ).map(
      ([nombre, cantidad]) => ({
        nombre,
        cantidad:
          Number(cantidad) || 0,
      }),
    );
  }

  return [];
}

/* =========================================================
   ICONOGRAFÍA
   ========================================================= */

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

const iconoIncidencia = (
  <Icono>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 9v4m0 4h.01M10.29 3.86 1.82 18a1.5 1.5 0 0 0 1.3 2.25h17.76a1.5 1.5 0 0 0 1.3-2.25L13.71 3.86a1.5 1.5 0 0 0-2.42 0Z"
    />
  </Icono>
);

const iconoResuelta = (
  <Icono>
    <circle
      cx="12"
      cy="12"
      r="8.25"
    />
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="m8.5 12.5 2.3 2.3L16 10"
    />
  </Icono>
);

const iconoPendiente = (
  <Icono>
    <circle
      cx="12"
      cy="12"
      r="8.25"
    />
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 7.5v5l3 1.75"
    />
  </Icono>
);

const iconoCritica = (
  <Icono>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 3 2.5 20h19z"
    />
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 9v4M12 17h.01"
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
    <circle
      cx="11"
      cy="11"
      r="6.5"
    />
    <path
      strokeLinecap="round"
      d="m16 16 4.25 4.25"
    />
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

const iconoUbicacion = (
  <Icono>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"
    />
    <circle
      cx="12"
      cy="10"
      r="2.5"
    />
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

/* =========================================================
   OPCIONES
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

const OPCIONES_CATEGORIA: {
  value: CategoriaIncidencia;
  label: string;
}[] = [
  {
    value: '',
    label: 'Todas las categorías',
  },
  {
    value: 'seguridad',
    label: 'Seguridad',
  },
  {
    value: 'incendio',
    label: 'Incendio',
  },
  {
    value: 'flora_fauna',
    label: 'Flora y fauna',
  },
  {
    value: 'ambiental',
    label: 'Ambiental',
  },
  {
    value: 'infraestructura',
    label: 'Infraestructura',
  },
  {
    value: 'senderos',
    label: 'Senderos',
  },
  {
    value: 'servicios',
    label: 'Servicios',
  },
  {
    value: 'otro',
    label: 'Otro',
  },
];

const OPCIONES_PRIORIDAD: {
  value: PrioridadIncidencia;
  label: string;
}[] = [
  {
    value: '',
    label: 'Todas las prioridades',
  },
  {
    value: 'baja',
    label: 'Baja',
  },
  {
    value: 'media',
    label: 'Media',
  },
  {
    value: 'alta',
    label: 'Alta',
  },
  {
    value: 'critica',
    label: 'Crítica',
  },
];

const OPCIONES_ESTADO: {
  value: EstadoIncidencia;
  label: string;
}[] = [
  {
    value: '',
    label: 'Todos los estados',
  },
  {
    value: 'pendiente',
    label: 'Pendiente',
  },
  {
    value: 'en_revision',
    label: 'En revisión',
  },
  {
    value: 'en_proceso',
    label: 'En proceso',
  },
  {
    value: 'resuelta',
    label: 'Resuelta',
  },
  {
    value: 'rechazada',
    label: 'Rechazada',
  },
  {
    value: 'cerrada',
    label: 'Cerrada',
  },
];

const ESTADOS_BASE: {
  clave: string;
  etiqueta: string;
}[] = [
  {
    clave: 'pendiente',
    etiqueta: 'Pendiente',
  },
  {
    clave: 'en_revision',
    etiqueta: 'En revisión',
  },
  {
    clave: 'en_proceso',
    etiqueta: 'En proceso',
  },
  {
    clave: 'resuelta',
    etiqueta: 'Resuelta',
  },
  {
    clave: 'rechazada',
    etiqueta: 'Rechazada',
  },
  {
    clave: 'cerrada',
    etiqueta: 'Cerrada',
  },
];

/* =========================================================
   GRÁFICA DE BARRAS HORIZONTALES - CATEGORÍAS

   Esta reemplaza la gráfica de montaña.
   Tiene el estilo de la imagen:
   nombre a la izquierda,
   cantidad + porcentaje a la derecha
   y barra horizontal debajo.
   ========================================================= */

function GraficaCategorias({
  datos,
}: {
  datos: ItemReporte[];
}) {
  const datosOrdenados = [...datos].sort(
    (a, b) =>
      b.cantidad - a.cantidad,
  );

  const total = datosOrdenados.reduce(
    (suma, item) =>
      suma + item.cantidad,
    0,
  );

  const colores = [
    {
      barra:
        'bg-emerald-500',
      texto:
        'text-emerald-600 dark:text-emerald-400',
    },
    {
      barra:
        'bg-amber-500',
      texto:
        'text-amber-500 dark:text-amber-400',
    },
    {
      barra:
        'bg-slate-500',
      texto:
        'text-slate-600 dark:text-slate-400',
    },
    {
      barra:
        'bg-rose-500',
      texto:
        'text-rose-500 dark:text-rose-400',
    },
    {
      barra:
        'bg-sky-500',
      texto:
        'text-sky-600 dark:text-sky-400',
    },
    {
      barra:
        'bg-violet-500',
      texto:
        'text-violet-600 dark:text-violet-400',
    },
    {
      barra:
        'bg-orange-500',
      texto:
        'text-orange-600 dark:text-orange-400',
    },
    {
      barra:
        'bg-teal-500',
      texto:
        'text-teal-600 dark:text-teal-400',
    },
  ];

  const obtenerNombreCategoria = (
    nombre: string,
  ) => {
    const opcion =
      OPCIONES_CATEGORIA.find(
        (item) =>
          item.value === nombre,
      );

    if (opcion) {
      return opcion.label;
    }

    return nombre
      .replaceAll('_', ' ')
      .replace(
        /\b\w/g,
        (letra) =>
          letra.toUpperCase(),
      );
  };

  if (datosOrdenados.length === 0) {
    return (
      <div className="py-10 text-center text-sm text-slate-500 dark:text-slate-400">
        No hay categorías registradas durante este período.
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {datosOrdenados.map(
        (item, index) => {
          const porcentaje =
            total > 0
              ? (item.cantidad /
                  total) *
                100
              : 0;

          const color =
            colores[
              index %
                colores.length
            ];

          return (
            <div
              key={item.nombre}
            >
              <div className="mb-2 flex items-center justify-between gap-3">
                <span className="min-w-0 truncate text-sm font-bold text-slate-700 dark:text-slate-300">
                  {obtenerNombreCategoria(
                    item.nombre,
                  )}
                </span>

                <span
                  className={`shrink-0 text-sm font-bold ${color.texto}`}
                >
                  {item.cantidad}{' '}
                  ({Math.round(
                    porcentaje,
                  )}
                  %)
                </span>
              </div>

              <div className="h-3 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${color.barra}`}
                  style={{
                    width: `${porcentaje}%`,
                  }}
                />
              </div>
            </div>
          );
        },
      )}
    </div>
  );
}

/* =========================================================
   GRÁFICA DE MONTAÑA
   ========================================================= */

function GraficaMontana({
  datos,
  idGradiente,
  ariaLabel,
}: {
  datos: ItemReporte[];
  idGradiente: string;
  ariaLabel: string;
}) {
  const ancho = 640;
  const alto = 220;
  const paddingX = 20;
  const paddingTop = 34;
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
              (datos.length -
                1);

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
    },
  );

  const construirCurva =
    () => {
      if (
        puntos.length === 0
      ) {
        return '';
      }

      if (
        puntos.length === 1
      ) {
        return `M ${puntos[0].x} ${puntos[0].y}`;
      }

      let d = `M ${puntos[0].x} ${puntos[0].y}`;

      for (
        let i = 0;
        i <
        puntos.length - 1;
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

        d += ` Q ${actual.x} ${actual.y} ${puntoMedioX} ${(actual.y + siguiente.y) / 2}`;

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
        } L ${
          puntos[0].x
        } ${
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
              stopOpacity="0"
            />
          </linearGradient>
        </defs>

        {[0.25, 0.5, 0.75].map(
          (frac) => (
            <line
              key={frac}
              x1={paddingX}
              x2={
                ancho - paddingX
              }
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

            {puntos.map(
              (p) => (
                <g
                  key={
                    p.dato.nombre
                  }
                >
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r="4.5"
                    className="fill-white stroke-emerald-600 dark:fill-slate-900 dark:stroke-emerald-400"
                    strokeWidth="2.5"
                  />

                  <text
                    x={p.x}
                    y={Math.max(
                      p.y - 12,
                      14,
                    )}
                    textAnchor="middle"
                    className="fill-slate-800 text-[13px] font-bold dark:fill-slate-200"
                  >
                    {
                      p.dato
                        .cantidad
                    }
                  </text>
                </g>
              ),
            )}
          </>
        )}
      </svg>

      <div className="mt-1 flex justify-between px-1">
        {puntos.map(
          (p) => (
            <span
              key={
                p.dato.nombre
              }
              className="max-w-[90px] truncate text-center text-[11px] font-semibold text-slate-500 dark:text-slate-400"
              title={
                p.dato.nombre
              }
            >
              {
                p.dato
                  .nombre
              }
            </span>
          ),
        )}
      </div>
    </div>
  );
}

/* =========================================================
   COMPONENTE PRINCIPAL
   ========================================================= */

export default function ReportesIncidencias() {
  const [periodo, setPeriodo] =
    useState<Periodo>(
      '30dias',
    );

  const [categoria, setCategoria] =
    useState<CategoriaIncidencia>(
      '',
    );

  const [prioridad, setPrioridad] =
    useState<PrioridadIncidencia>(
      '',
    );

  const [estado, setEstado] =
    useState<EstadoIncidencia>(
      '',
    );

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

  const [
    menuPeriodoAbierto,
    setMenuPeriodoAbierto,
  ] = useState(false);

  const [
    menuCategoriaAbierto,
    setMenuCategoriaAbierto,
  ] = useState(false);

  const [
    menuPrioridadAbierto,
    setMenuPrioridadAbierto,
  ] = useState(false);

  const [
    menuEstadoAbierto,
    setMenuEstadoAbierto,
  ] = useState(false);

  const [cargando, setCargando] =
    useState(false);

  const [consultado, setConsultado] =
    useState(false);

  const [datos, setDatos] =
    useState<EstadisticasIncidencias | null>(
      null,
    );

  const [error, setError] =
    useState('');

  function cerrarMenus() {
    setMenuPeriodoAbierto(false);
    setMenuCategoriaAbierto(false);
    setMenuPrioridadAbierto(false);
    setMenuEstadoAbierto(false);
  }

  const obtenerRangoPeriodo = (
    periodoSeleccionado: Periodo,
  ) => {
    const hoy = new Date();

    const formatearParaBackend =
      (fecha: Date) =>
        `${fecha.getFullYear()}-${String(
          fecha.getMonth() + 1,
        ).padStart(
          2,
          '0',
        )}-${String(
          fecha.getDate(),
        ).padStart(2, '0')}`;

    if (
      periodoSeleccionado ===
      'personalizado'
    ) {
      return {
        inicio: fechaInicio,
        fin: fechaFin,
      };
    }

    if (
      periodoSeleccionado ===
      'hoy'
    ) {
      const fecha =
        formatearParaBackend(
          hoy,
        );

      return {
        inicio: fecha,
        fin: fecha,
      };
    }

    if (
      periodoSeleccionado ===
      '7dias'
    ) {
      const inicio =
        new Date(hoy);

      inicio.setDate(
        hoy.getDate() - 6,
      );

      return {
        inicio:
          formatearParaBackend(
            inicio,
          ),
        fin:
          formatearParaBackend(
            hoy,
          ),
      };
    }

    if (
      periodoSeleccionado ===
      '30dias'
    ) {
      const inicio =
        new Date(hoy);

      inicio.setDate(
        hoy.getDate() - 29,
      );

      return {
        inicio:
          formatearParaBackend(
            inicio,
          ),
        fin:
          formatearParaBackend(
            hoy,
          ),
      };
    }

    if (
      periodoSeleccionado ===
      'mes'
    ) {
      const inicio =
        new Date(
          hoy.getFullYear(),
          hoy.getMonth(),
          1,
        );

      return {
        inicio:
          formatearParaBackend(
            inicio,
          ),
        fin:
          formatearParaBackend(
            hoy,
          ),
      };
    }

    return {
      inicio: '',
      fin: '',
    };
  };

  async function consultar() {
    setError('');

    if (
      periodo ===
        'personalizado' &&
      (!fechaInicio ||
        !fechaFin)
    ) {
      setError(
        'Debe seleccionar una fecha inicial y una fecha final.',
      );
      return;
    }

    if (
      periodo ===
        'personalizado' &&
      fechaInicio > fechaFin
    ) {
      setError(
        'La fecha inicial no puede ser mayor que la fecha final.',
      );
      return;
    }

    try {
      setCargando(true);
      setConsultado(false);

      const rango =
        obtenerRangoPeriodo(
          periodo,
        );

      const params =
        new URLSearchParams();

      if (rango.inicio) {
        params.set(
          'fechaInicio',
          rango.inicio,
        );
      }

      if (rango.fin) {
        params.set(
          'fechaFin',
          rango.fin,
        );
      }

      if (categoria) {
        params.set(
          'categoria',
          categoria,
        );
      }

      if (prioridad) {
        params.set(
          'prioridad',
          prioridad,
        );
      }

      if (estado) {
        params.set(
          'estado',
          estado,
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
          `http://localhost:3000/api/reportes/estadisticas/incidencias?${params.toString()}`,
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
        (await respuesta.json()) as EstadisticasIncidencias;

      setDatos(resultado);
      setConsultado(true);
    } catch (err) {
      console.error(
        'Error al consultar reporte de incidencias:',
        err,
      );

      setDatos(null);
      setConsultado(false);

      setError(
        err instanceof Error
          ? err.message
          : 'No se pudo generar el reporte.',
      );
    } finally {
      setCargando(false);
    }
  }

  const formatearFecha = (
    fecha: string | null,
  ) => {
    if (!fecha) {
      return '—';
    }

    const fechaObjeto =
      new Date(fecha);

    if (
      Number.isNaN(
        fechaObjeto.getTime(),
      )
    ) {
      return '—';
    }

    return fechaObjeto.toLocaleDateString(
      'es-CR',
      {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      },
    );
  };

  const obtenerNombrePeriodo = (
    valor: Periodo,
  ) =>
    OPCIONES_PERIODO.find(
      (opcion) =>
        opcion.value === valor,
    )?.label ?? 'Todos';

  const obtenerTextoCategoria = (
    valor: string,
  ) =>
    OPCIONES_CATEGORIA.find(
      (opcion) =>
        opcion.value === valor,
    )?.label ?? valor;

  const obtenerTextoPrioridad = (
    valor: string,
  ) =>
    OPCIONES_PRIORIDAD.find(
      (opcion) =>
        opcion.value === valor,
    )?.label ?? valor;

  const obtenerTextoEstado = (
    valor: string,
  ) =>
    OPCIONES_ESTADO.find(
      (opcion) =>
        opcion.value === valor,
    )?.label ?? valor;

  const obtenerEstilosPrioridad = (
    prioridadValor: string,
  ) => {
    switch (
      prioridadValor
    ) {
      case 'critica':
        return 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300';

      case 'alta':
        return 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300';

      case 'media':
        return 'bg-sky-50 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300';

      default:
        return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
    }
  };

  const incidenciasPorCategoria =
    normalizarLista(
      datos?.incidenciasPorCategoria,
    );

  const incidenciasPorPrioridad =
    normalizarLista(
      datos?.incidenciasPorPrioridad,
    );

  const incidenciasPorEstado =
    normalizarLista(
      datos?.incidenciasPorEstado,
    );

  const detalleIncidencias =
    Array.isArray(
      datos?.detalleIncidencias,
    )
      ? datos.detalleIncidencias
      : [];

  const incidenciasResueltas =
    incidenciasPorEstado.find(
      (item) =>
        item.nombre ===
        'resuelta',
    )?.cantidad ?? 0;

  const incidenciasPendientes =
    incidenciasPorEstado.find(
      (item) =>
        item.nombre ===
        'pendiente',
    )?.cantidad ?? 0;

  const incidenciasCriticas =
    incidenciasPorPrioridad.find(
      (item) =>
        item.nombre ===
        'critica',
    )?.cantidad ?? 0;

  const maximoMes =
    datos?.incidenciasPorMes.reduce(
      (max, item) =>
        Math.max(
          max,
          item.cantidad,
        ),
      0,
    ) ?? 0;

  return (
    <div className="space-y-6">

      {/* =====================================================
          FILTROS
          ===================================================== */}

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
              Seleccione el período y los criterios que desea consultar.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">

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
                setMenuPeriodoAbierto(
                  abrir,
                );
              }}
              className="flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left text-sm font-medium text-slate-700 shadow-sm transition hover:border-emerald-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              <span>
                {obtenerNombrePeriodo(
                  periodo,
                )}
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
                    setMenuPeriodoAbierto(
                      false,
                    )
                  }
                />

                <div className="absolute left-0 top-full z-50 mt-2 w-full overflow-hidden rounded-2xl border border-slate-200 bg-white p-1 shadow-xl dark:border-slate-700 dark:bg-slate-800">
                  {OPCIONES_PERIODO.map(
                    ({
                      value,
                      label,
                    }) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => {
                          setPeriodo(
                            value,
                          );
                          setMenuPeriodoAbierto(
                            false,
                          );
                        }}
                        className={`w-full rounded-xl px-4 py-2.5 text-left text-sm transition ${
                          periodo ===
                          value
                            ? 'bg-emerald-50 font-semibold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                            : 'text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-700'
                        }`}
                      >
                        {label}
                      </button>
                    ),
                  )}
                </div>
              </>
            )}
          </div>

          {/* CATEGORÍA */}

          <div className="relative">
            <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">
              Categoría
            </label>

            <button
              type="button"
              onClick={() => {
                const abrir =
                  !menuCategoriaAbierto;

                cerrarMenus();
                setMenuCategoriaAbierto(
                  abrir,
                );
              }}
              className="flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left text-sm font-medium text-slate-700 shadow-sm transition hover:border-emerald-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              <span className="truncate">
                {obtenerTextoCategoria(
                  categoria,
                )}
              </span>

              <svg
                className={`h-4 w-4 shrink-0 transition-transform ${
                  menuCategoriaAbierto
                    ? 'rotate-180'
                    : ''
                }`}
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path d="M5.5 7.5 10 12l4.5-4.5 1 1L10 14l-5.5-5.5 1-1Z" />
              </svg>
            </button>

            {menuCategoriaAbierto && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() =>
                    setMenuCategoriaAbierto(
                      false,
                    )
                  }
                />

                <div className="absolute left-0 top-full z-50 mt-2 max-h-72 w-full overflow-y-auto rounded-2xl border border-slate-200 bg-white p-1 shadow-xl dark:border-slate-700 dark:bg-slate-800">
                  {OPCIONES_CATEGORIA.map(
                    ({
                      value,
                      label,
                    }) => (
                      <button
                        key={
                          value ||
                          'todas'
                        }
                        type="button"
                        onClick={() => {
                          setCategoria(
                            value,
                          );
                          setMenuCategoriaAbierto(
                            false,
                          );
                        }}
                        className={`w-full rounded-xl px-4 py-2.5 text-left text-sm transition ${
                          categoria ===
                          value
                            ? 'bg-emerald-50 font-semibold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                            : 'text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-700'
                        }`}
                      >
                        {label}
                      </button>
                    ),
                  )}
                </div>
              </>
            )}
          </div>

          {/* PRIORIDAD */}

          <div className="relative">
            <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">
              Prioridad
            </label>

            <button
              type="button"
              onClick={() => {
                const abrir =
                  !menuPrioridadAbierto;

                cerrarMenus();
                setMenuPrioridadAbierto(
                  abrir,
                );
              }}
              className="flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left text-sm font-medium text-slate-700 shadow-sm transition hover:border-emerald-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              <span>
                {obtenerTextoPrioridad(
                  prioridad,
                ) ||
                  'Todas las prioridades'}
              </span>

              <svg
                className={`h-4 w-4 transition-transform ${
                  menuPrioridadAbierto
                    ? 'rotate-180'
                    : ''
                }`}
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path d="M5.5 7.5 10 12l4.5-4.5 1 1L10 14l-5.5-5.5 1-1Z" />
              </svg>
            </button>

            {menuPrioridadAbierto && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() =>
                    setMenuPrioridadAbierto(
                      false,
                    )
                  }
                />

                <div className="absolute left-0 top-full z-50 mt-2 w-full overflow-hidden rounded-2xl border border-slate-200 bg-white p-1 shadow-xl dark:border-slate-700 dark:bg-slate-800">
                  {OPCIONES_PRIORIDAD.map(
                    ({
                      value,
                      label,
                    }) => (
                      <button
                        key={
                          value ||
                          'todas'
                        }
                        type="button"
                        onClick={() => {
                          setPrioridad(
                            value,
                          );
                          setMenuPrioridadAbierto(
                            false,
                          );
                        }}
                        className={`w-full rounded-xl px-4 py-2.5 text-left text-sm transition ${
                          prioridad ===
                          value
                            ? 'bg-emerald-50 font-semibold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                            : 'text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-700'
                        }`}
                      >
                        {label}
                      </button>
                    ),
                  )}
                </div>
              </>
            )}
          </div>

          {/* ESTADO */}

          <div className="relative">
            <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">
              Estado
            </label>

            <button
              type="button"
              onClick={() => {
                const abrir =
                  !menuEstadoAbierto;

                cerrarMenus();
                setMenuEstadoAbierto(
                  abrir,
                );
              }}
              className="flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left text-sm font-medium text-slate-700 shadow-sm transition hover:border-emerald-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              <span>
                {obtenerTextoEstado(
                  estado,
                ) ||
                  'Todos los estados'}
              </span>

              <svg
                className={`h-4 w-4 transition-transform ${
                  menuEstadoAbierto
                    ? 'rotate-180'
                    : ''
                }`}
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path d="M5.5 7.5 10 12l4.5-4.5 1 1L10 14l-5.5-5.5 1-1Z" />
              </svg>
            </button>

            {menuEstadoAbierto && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() =>
                    setMenuEstadoAbierto(
                      false,
                    )
                  }
                />

                <div className="absolute left-0 top-full z-50 mt-2 w-full overflow-hidden rounded-2xl border border-slate-200 bg-white p-1 shadow-xl dark:border-slate-700 dark:bg-slate-800">
                  {OPCIONES_ESTADO.map(
                    ({
                      value,
                      label,
                    }) => (
                      <button
                        key={
                          value ||
                          'todos'
                        }
                        type="button"
                        onClick={() => {
                          setEstado(
                            value,
                          );
                          setMenuEstadoAbierto(
                            false,
                          );
                        }}
                        className={`w-full rounded-xl px-4 py-2.5 text-left text-sm transition ${
                          estado ===
                          value
                            ? 'bg-emerald-50 font-semibold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                            : 'text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-700'
                        }`}
                      >
                        {label}
                      </button>
                    ),
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {/* FECHAS */}
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
            {periodo ===
            'personalizado'
              ? fechaInicio &&
                fechaFin
                ? `${formatearFecha(
                    fechaInicio,
                  )} - ${formatearFecha(
                    fechaFin,
                  )}`
                : 'Seleccione el rango de fechas'
              : obtenerNombrePeriodo(
                  periodo,
                )}
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

      {!consultado &&
        !cargando && (
          <section className="rounded-3xl border border-dashed border-slate-300 bg-white/60 px-6 py-14 text-center dark:border-slate-700 dark:bg-slate-900/50">

            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
              {iconoGrafica}
            </div>

            <h3 className="text-lg font-bold text-slate-800 dark:text-white">
              Consulte el reporte
            </h3>

            <p className="mx-auto mt-2 max-w-md text-sm text-slate-500 dark:text-slate-400">
              Seleccione los filtros y presione "Consultar reporte" para visualizar las estadísticas de incidencias.
            </p>
          </section>
        )}

      {/* RESULTADOS */}

      {consultado &&
        datos && (
          <div className="space-y-6">

            {/* PERÍODO */}

            <section className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm dark:border-slate-700 dark:bg-slate-900 sm:px-6">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">

                <div>
                <p className="text-xs font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400">
                  Período analizado
                </p>

                  <p className="mt-0.5 text-lg font-bold text-slate-800 dark:text-white">
                    {periodo ===
                      'personalizado' &&
                    datos.fechaInicio &&
                    datos.fechaFin
                      ? `${formatearFecha(
                          datos.fechaInicio,
                        )} - ${formatearFecha(
                          datos.fechaFin,
                        )}`
                      : obtenerNombrePeriodo(
                          periodo,
                        )}
                  </p>

                  <p className="mt-1 text-xs font-semibold text-slate-600 dark:text-slate-300">
                    {datos.informacionGeneral?.nombre ??
                      'Reporte de incidencias'}
                  </p>

                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    Tipo:{' '}
                    {datos.informacionGeneral?.tipo ??
                      'incidencias'}{' '}
                    · Filtros:{' '}
                    {categoria || 'todas las categorias'}
                    {' / '}
                    {prioridad ||
                      'todas las prioridades'}
                    {' / '}
                    {estado || 'todos los estados'}
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
                  {datos.totalIncidencias}{' '}
                  incidencia
                  {datos.totalIncidencias ===
                  1
                    ? ''
                    : 's'}{' '}
                  encontrada
                  {datos.totalIncidencias ===
                  1
                    ? ''
                    : 's'}
                </p>
              </div>
            </section>

            {/* TARJETAS */}

            <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">

              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                  {iconoIncidencia}
                </div>

                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                  Total de incidencias
                </p>

                <p className="mt-1 text-3xl font-black text-slate-800 dark:text-white">
                  {
                    datos.totalIncidencias
                  }
                </p>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                  {iconoResuelta}
                </div>

                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                  Resueltas
                </p>

                <p className="mt-1 text-3xl font-black text-slate-800 dark:text-white">
                  {
                    incidenciasResueltas
                  }
                </p>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300">
                  {iconoPendiente}
                </div>

                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                  Pendientes
                </p>

                <p className="mt-1 text-3xl font-black text-slate-800 dark:text-white">
                  {
                    incidenciasPendientes
                  }
                </p>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                  {iconoCritica}
                </div>

                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                  Críticas
                </p>

                <p className="mt-1 text-3xl font-black text-slate-800 dark:text-white">
                  {
                    incidenciasCriticas
                  }
                </p>
              </div>
            </section>

            {/* =================================================
                CATEGORÍA + PRIORIDAD
                ================================================= */}

            <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">

              {/* CATEGORÍAS - NUEVA GRÁFICA */}

              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900 sm:p-6">

                <div className="mb-6 flex items-center gap-3">

                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
                    {iconoGrafica}
                  </span>

                  <div>
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white">
                      Incidencias por categoría
                    </h3>

                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      Distribución de incidencias según su categoría.
                    </p>
                  </div>
                </div>

                <GraficaCategorias
                  datos={
                    incidenciasPorCategoria
                  }
                />
              </div>

              {/* PRIORIDADES */}

              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900 sm:p-6">

                <div className="mb-5 flex items-center gap-3">

                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
                    {iconoMontana}
                  </span>

                  <div>
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white">
                      Incidencias por prioridad
                    </h3>

                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      Distribución según el nivel de prioridad.
                    </p>
                  </div>
                </div>

                {incidenciasPorPrioridad.length ===
                0 ? (
                  <div className="py-10 text-center text-sm text-slate-500 dark:text-slate-400">
                    No hay prioridades registradas durante este período.
                  </div>
                ) : (
                  <GraficaMontana
                    datos={
                      incidenciasPorPrioridad
                    }
                    idGradiente="degradadoMontanaPrioridad"
                    ariaLabel="Gráfica de incidencias por prioridad"
                  />
                )}
              </div>
            </section>

            {/* ESTADOS */}

            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900 sm:p-6">

              <div className="mb-6">
                <h3 className="text-lg font-bold text-slate-800 dark:text-white">
                  Incidencias por estado
                </h3>

                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Distribución de las incidencias según su estado actual.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">

                {ESTADOS_BASE.map(
                  ({
                    clave,
                    etiqueta,
                  }) => {
                    const cantidad =
                      incidenciasPorEstado.find(
                        (item) =>
                          item.nombre ===
                          clave,
                      )?.cantidad ??
                      0;

                    return (
                      <div
                        key={clave}
                        className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/70"
                      >
                        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                          {etiqueta}
                        </p>

                        <p className="mt-1 text-2xl font-black text-slate-800 dark:text-white">
                          {
                            cantidad
                          }
                        </p>
                      </div>
                    );
                  },
                )}
              </div>
            </section>

            {/* INCIDENCIAS POR MES */}

            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900 sm:p-6">

              <div className="mb-6 flex items-center gap-3">

                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                  {iconoGrafica}
                </div>

                <div>
                  <h3 className="text-lg font-bold text-slate-800 dark:text-white">
                    Incidencias por mes
                  </h3>

                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Cantidad de incidencias registradas por mes.
                  </p>
                </div>
              </div>

              {datos.incidenciasPorMes
                .length === 0 ? (
                <div className="py-10 text-center text-sm text-slate-500 dark:text-slate-400">
                  No hay datos para mostrar.
                </div>
              ) : (
                <div className="space-y-4">

                  {datos.incidenciasPorMes.map(
                    (item) => (
                      <div
                        key={item.mes}
                      >
                        <div className="mb-2 flex items-center justify-between gap-4">

                          <span className="text-sm font-semibold capitalize text-slate-700 dark:text-slate-300">
                            {
                              item.mes
                            }
                          </span>

                          <span className="text-sm font-bold text-slate-800 dark:text-white">
                            {
                              item.cantidad
                            }
                          </span>
                        </div>

                        <div className="h-3 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">

                          <div
                            className="h-full rounded-full bg-emerald-500 transition-all"
                            style={{
                              width:
                                maximoMes >
                                0
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
                  Detalle de incidencias
                </h3>

                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Incidencias incluidas en este reporte.
                </p>
              </div>

              {detalleIncidencias.length ===
              0 ? (
                <div className="px-6 py-12 text-center text-sm text-slate-500 dark:text-slate-400">
                  No se encontraron incidencias con los filtros seleccionados.
                </div>
              ) : (
                <div className="overflow-x-auto">

                  <table className="w-full min-w-[950px] text-left text-sm">

                    <thead className="bg-slate-50 dark:bg-slate-800/70">

                      <tr>

                        <th className="px-5 py-4 font-bold text-slate-600 dark:text-slate-300">
                          Incidencia
                        </th>

                        <th className="px-5 py-4 font-bold text-slate-600 dark:text-slate-300">
                          Fecha
                        </th>

                        <th className="px-5 py-4 font-bold text-slate-600 dark:text-slate-300">
                          Categoría
                        </th>

                        <th className="px-5 py-4 font-bold text-slate-600 dark:text-slate-300">
                          Prioridad
                        </th>

                        <th className="px-5 py-4 font-bold text-slate-600 dark:text-slate-300">
                          Estado
                        </th>

                        <th className="px-5 py-4 font-bold text-slate-600 dark:text-slate-300">
                          Ubicación
                        </th>

                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">

                      {detalleIncidencias.map(
                        (
                          incidencia,
                        ) => (
                          <tr
                            key={
                              incidencia.id
                            }
                            className="transition hover:bg-slate-50 dark:hover:bg-slate-800/50"
                          >

                            <td className="px-5 py-4">

                              <p className="font-semibold text-slate-800 dark:text-white">
                                {
                                  incidencia.titulo
                                }
                              </p>

                              <p className="mt-1 max-w-[260px] truncate text-xs text-slate-500 dark:text-slate-400">
                                {
                                  incidencia.descripcion
                                }
                              </p>
                            </td>

                            <td className="px-5 py-4 text-slate-600 dark:text-slate-300">
                              {formatearFecha(
                                incidencia.fechaRegistro,
                              )}
                            </td>

                            <td className="px-5 py-4">

                              <span className="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold capitalize text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                                {obtenerTextoCategoria(
                                  incidencia.categoria,
                                )}
                              </span>

                            </td>

                            <td className="px-5 py-4">

                              <span
                                className={`inline-flex rounded-full px-3 py-1 text-xs font-bold capitalize ${obtenerEstilosPrioridad(
                                  incidencia.prioridad,
                                )}`}
                              >
                                {obtenerTextoPrioridad(
                                  incidencia.prioridad,
                                )}
                              </span>

                            </td>

                            <td className="px-5 py-4">

                              <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                                {obtenerTextoEstado(
                                  incidencia.estado,
                                )}
                              </span>

                            </td>

                            <td className="px-5 py-4">

                              <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">

                                <span className="text-emerald-600 dark:text-emerald-400">
                                  {
                                    iconoUbicacion
                                  }
                                </span>

                                <span className="max-w-[180px] truncate">
                                  {incidencia.ubicacion ||
                                    'Sin ubicación'}
                                </span>

                              </div>

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
