import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

import type {
  CategoriaIncidencia,
  EstadoIncidencia,
  Incidencia,
  PrioridadIncidencia,
} from '../../../services/incidenciaServices';

import { listarIncidencias } from '../../../services/incidenciaServices';
import EditarIncidencia from './EditarIncidencia';

import imagenParque from '../../../assets/parque-hero.jpg';

/* =========================================================
   CONFIGURACIÓN
========================================================= */

const estados: EstadoIncidencia[] = [
  'pendiente',
  'en_revision',
  'en_proceso',
  'resuelta',
  'rechazada',
  'cerrada',
];

const categorias: CategoriaIncidencia[] = [
  'seguridad',
  'incendio',
  'flora_fauna',
  'ambiental',
  'infraestructura',
  'senderos',
  'servicios',
  'otro',
];

const prioridades: PrioridadIncidencia[] = [
  'baja',
  'media',
  'alta',
  'critica',
];

const etiquetasEstado: Record<EstadoIncidencia, string> = {
  pendiente: 'Pendiente',
  en_revision: 'En revisión',
  en_proceso: 'En proceso',
  resuelta: 'Resuelta',
  rechazada: 'Rechazada',
  cerrada: 'Cerrada',
};

const etiquetasCategoria: Record<CategoriaIncidencia, string> = {
  seguridad: 'Seguridad',
  incendio: 'Incendio',
  flora_fauna: 'Flora y fauna',
  ambiental: 'Ambiental',
  infraestructura: 'Infraestructura',
  senderos: 'Senderos',
  servicios: 'Servicios',
  otro: 'Otro',
};

const etiquetasPrioridad: Record<PrioridadIncidencia, string> = {
  baja: 'Baja',
  media: 'Media',
  alta: 'Alta',
  critica: 'Crítica',
};

/* =========================================================
   CHIPS
   Colores basados en la paleta institucional
========================================================= */

const estadoClases: Record<EstadoIncidencia, string> = {
  pendiente:
    'bg-[#F3F4D8] text-[#68731F]',

  en_revision:
    'bg-[#E4F3F7] text-[#187E9B]',

  en_proceso:
    'bg-[#E2F1E9] text-[#237B4C]',

  resuelta:
    'bg-[#E8F2DE] text-[#5E812E]',

  rechazada:
    'bg-[#F5E5E2] text-[#A64E45]',

  cerrada:
    'bg-[#EDF0ED] text-[#63736B]',
};

const prioridadClases: Record<PrioridadIncidencia, string> = {
  baja:
    'bg-[#EDF0ED] text-[#63736B]',

  media:
    'bg-[#E8F2DE] text-[#5E812E]',

  alta:
    'bg-[#F3F4D8] text-[#72771D]',

  critica:
    'bg-[#F5E5E2] text-[#A64E45]',
};

const categoriaClases: Record<CategoriaIncidencia, string> = {
  seguridad:
    'bg-[#E2F1E9] text-[#237B4C]',

  incendio:
    'bg-[#F5E5E2] text-[#A64E45]',

  flora_fauna:
    'bg-[#E8F2DE] text-[#5E812E]',

  ambiental:
    'bg-[#E2F1E9] text-[#237B4C]',

  infraestructura:
    'bg-[#E4F3F7] text-[#187E9B]',

  senderos:
    'bg-[#E8F2DE] text-[#5E812E]',

  servicios:
    'bg-[#E4F3F7] text-[#187E9B]',

  otro:
    'bg-[#E4F3F7] text-[#187E9B]',
};

/* =========================================================
   ICONO
========================================================= */

function Icon({
  children,
  className = 'h-5 w-5',
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
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

/* =========================================================
   CHIP MODERNO
========================================================= */

function MetaChip({
  children,
  className,
}: {
  children: ReactNode;
  className: string;
}) {
  return (
    <span
      className={`
        inline-flex
        items-center
        justify-center
        rounded-full
        px-4
        py-2.5
        text-[11px]
        font-bold
        leading-none
        tracking-[0.01em]
        [font-family:'Montserrat',sans-serif]
        shadow-[0_5px_16px_rgba(9,85,64,0.045)]
        transition-all
        duration-200
        hover:-translate-y-[1px]
        hover:shadow-[0_8px_20px_rgba(9,85,64,0.06)]
        ${className}
      `}
    >
      {children}
    </span>
  );
}

/* =========================================================
   SELECT DE FILTRO
========================================================= */

function SelectFiltro<T extends string>({
  etiqueta,
  valor,
  opciones,
  etiquetas,
  onChange,
}: {
  etiqueta: string;
  valor: T | '';
  opciones: T[];
  etiquetas: Record<T, string>;
  onChange: (valor: T | '') => void;
}) {
  return (
    <label className="block">
      <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#5F766B]">
        {etiqueta}
      </span>

      <select
        value={valor}
        onChange={(event) => {
          onChange(event.target.value as T | '');
        }}
        className="
          mt-2
          h-12
          w-full
          rounded-[1rem]
          border
          border-white/70
          bg-white/60
          px-4
          text-sm
          font-semibold
          text-[#304B40]
          shadow-[0_7px_20px_rgba(7,63,49,0.035)]
          backdrop-blur-xl
          outline-none
          transition-all
          duration-200
          hover:bg-white/75
          focus:border-[#8DC63F]/60
          focus:ring-4
          focus:ring-[#8DC63F]/10
        "
      >
        <option value="">Todos</option>

        {opciones.map((opcion) => (
          <option key={opcion} value={opcion}>
            {etiquetas[opcion]}
          </option>
        ))}
      </select>
    </label>
  );
}

/* =========================================================
   FECHA
========================================================= */

const formatearFechaHoraLocal = (fecha: string | Date | null | undefined) => {
  if (!fecha) return 'No disponible';

  const valor = new Date(fecha);

  if (Number.isNaN(valor.getTime())) return 'No disponible';

  return new Intl.DateTimeFormat('es-CR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'America/Costa_Rica',
  }).format(valor);
};

/* =========================================================
   COMPONENTE PRINCIPAL
========================================================= */

interface IncidenciasAdminProps {
  onModoEdicionChange?: (editando: boolean) => void;
}

export default function IncidenciasAdmin({
  onModoEdicionChange,
}: IncidenciasAdminProps) {
  const [incidencias, setIncidencias] = useState<Incidencia[]>([]);

  const [seleccionada, setSeleccionada] =
    useState<Incidencia | null>(null);

  const [cargando, setCargando] = useState(true);

  const [error, setError] =
    useState<string | null>(null);

  const [filtroEstado, setFiltroEstado] =
    useState<EstadoIncidencia | ''>('');

  const [filtroCategoria, setFiltroCategoria] =
    useState<CategoriaIncidencia | ''>('');

  const [filtroPrioridad, setFiltroPrioridad] =
    useState<PrioridadIncidencia | ''>('');

  /* =======================================================
     CARGAR
  ======================================================= */

  useEffect(() => {
    let activo = true;

    const cargarIncidencias = async () => {
      try {
        setCargando(true);
        setError(null);

        const incidenciasObtenidas =
          await listarIncidencias();

        if (activo) {
          setIncidencias(incidenciasObtenidas);
        }
      } catch {
        if (activo) {
          setError(
            'No se pudieron cargar las incidencias.',
          );
        }
      } finally {
        if (activo) {
          setCargando(false);
        }
      }
    };

    void cargarIncidencias();

    return () => {
      activo = false;
    };
  }, []);

  useEffect(() => {
    onModoEdicionChange?.(seleccionada !== null);
  }, [onModoEdicionChange, seleccionada]);

  /* =======================================================
     FILTRAR
  ======================================================= */

  const incidenciasFiltradas = useMemo(() => {
    return incidencias.filter((incidencia) => {
      const coincideEstado =
        filtroEstado === '' ||
        incidencia.estado === filtroEstado;

      const coincideCategoria =
        filtroCategoria === '' ||
        incidencia.categoria === filtroCategoria;

      const coincidePrioridad =
        filtroPrioridad === '' ||
        incidencia.prioridad === filtroPrioridad;

      return (
        coincideEstado &&
        coincideCategoria &&
        coincidePrioridad
      );
    });
  }, [
    incidencias,
    filtroEstado,
    filtroCategoria,
    filtroPrioridad,
  ]);

  /* =======================================================
     GUARDAR
  ======================================================= */

  const guardarIncidencia = (
    actualizada: Incidencia,
  ) => {
    setIncidencias((actuales) =>
      actuales.map((incidencia) =>
        incidencia.id === actualizada.id
          ? actualizada
          : incidencia,
      ),
    );

    setSeleccionada(actualizada);
  };

  /* =======================================================
     EDICIÓN
  ======================================================= */

  if (seleccionada) {
    return (
      <EditarIncidencia
        incidencia={seleccionada}
        onCancelar={() => setSeleccionada(null)}
        onGuardar={guardarIncidencia}
      />
    );
  }

  /* =======================================================
     VISTA
  ======================================================= */

  return (
    <main
      className="
        relative
        min-h-screen
        w-full
        overflow-x-hidden
        text-[#17382B]
        [font-family:'Montserrat',sans-serif]
      "
    >

      {/* ===================================================
          FONDO DEL PARQUE
      =================================================== */}

      <div
        className="
          pointer-events-none
          fixed
          inset-0
          z-0
          overflow-hidden
        "
      >
        <img
          src={imagenParque}
          alt=""
          aria-hidden="true"
          className="
            absolute
            inset-0
            h-full
            w-full
            scale-110
            object-cover
            blur-[14px]
            opacity-[0.32]
            saturate-[0.65]
          "
        />

        <div
          className="
            absolute
            inset-0
            bg-[#EEF4EF]/76
            backdrop-blur-[4px]
          "
        />

        <div
          className="
            absolute
            -left-32
            top-0
            h-[420px]
            w-[420px]
            rounded-full
            bg-[#8DC63F]/10
            blur-[130px]
          "
        />

        <div
          className="
            absolute
            -right-24
            bottom-0
            h-[430px]
            w-[430px]
            rounded-full
            bg-[#00AEEF]/7
            blur-[130px]
          "
        />
      </div>

      {/* ===================================================
          CONTENIDO
      =================================================== */}

      <div
        className="
          relative
          z-10
          mx-auto
          w-full
          max-w-[1500px]
          px-4
          pb-12
          pt-5
          sm:px-7
          sm:pt-7
          lg:px-10
          lg:pt-9
        "
      >

        {/* =================================================
            TARJETA PRINCIPAL
        ================================================= */}

        <section
          className="
            overflow-hidden
            rounded-[2.6rem]
            border
            border-white/60
            bg-white/25
            shadow-[0_28px_80px_rgba(7,63,49,0.10)]
            backdrop-blur-[28px]
            sm:rounded-[3rem]
          "
        >

          {/* =================================================
              CABECERA
          ================================================= */}

          <header
            className="
              px-7
              pb-5
              pt-8
              sm:px-10
              sm:pb-6
              sm:pt-10
              lg:px-14
              lg:pt-12
            "
          >
            <div className="max-w-[920px]">

              <h1
                className="
                  text-5xl
                  font-bold
                  leading-[0.96]
                  tracking-[-0.025em]
                  text-[#123D30]
                  sm:text-6xl
                  lg:text-[4.15rem]
                "
              >
                Gestión de incidencias
              </h1>

              <p
                className="
                  mt-4
                  max-w-[800px]
                  text-base
                  font-normal
                  leading-7
                  text-[#687E74]
                  sm:text-lg
                "
              >
                Supervisa reportes, revisa prioridades y prepara
                el seguimiento administrativo de cada incidencia
                del parque.
              </p>

              <div className="mt-5 flex items-center gap-2">
                <span className="h-[4px] w-16 rounded-full bg-[#009444]" />
                <span className="h-[4px] w-10 rounded-full bg-[#8DC63F]" />
                <span className="h-[4px] w-6 rounded-full bg-[#D9D823]" />
                <span className="h-[4px] w-9 rounded-full bg-[#00AEEF]" />
              </div>

            </div>
          </header>

          {/* =================================================
              FILTRO
          ================================================= */}

          <section
            className="
              px-7
              pb-7
              pt-2
              sm:px-10
              sm:pb-8
              lg:px-14
            "
          >

            <div className="mb-4">
              <p
                className="
                  text-[18px]
                  font-bold
                  tracking-[0.03em]
                  text-[#00AEEF]
                  sm:text-[20px]
                "
              >
                Filtro
              </p>
            </div>

            <div
              className="
                rounded-[1.9rem]
                border
                border-white/60
                bg-white/24
                p-5
                shadow-[0_18px_45px_rgba(7,63,49,0.045)]
                backdrop-blur-2xl
                sm:p-6
                lg:p-7
              "
            >
              <div className="grid gap-5 md:grid-cols-3">

                <SelectFiltro
                  etiqueta="Estado"
                  valor={filtroEstado}
                  opciones={estados}
                  etiquetas={etiquetasEstado}
                  onChange={setFiltroEstado}
                />

                <SelectFiltro
                  etiqueta="Categoría"
                  valor={filtroCategoria}
                  opciones={categorias}
                  etiquetas={etiquetasCategoria}
                  onChange={setFiltroCategoria}
                />

                <SelectFiltro
                  etiqueta="Prioridad"
                  valor={filtroPrioridad}
                  opciones={prioridades}
                  etiquetas={etiquetasPrioridad}
                  onChange={setFiltroPrioridad}
                />

              </div>
            </div>
          </section>

          {/* =================================================
              INCIDENCIAS RECIENTES
          ================================================= */}

          <section
            className="
              px-7
              pb-8
              pt-1
              sm:px-10
              lg:px-14
            "
          >

            <div className="mb-5 flex items-center justify-between gap-4">

              <p
                className="
                  text-[17px]
                  font-bold
                  tracking-[0.03em]
                  text-[#00AEEF]
                  sm:text-[19px]
                "
              >
                Incidencias recientes
              </p>

              {/* RECENTES — mismo lenguaje visual que la referencia */}

              <span
                className="
                  inline-flex
                  items-center
                  justify-center
                  rounded-full
                  bg-[#E8F2DE]
                  px-4
                  py-2.5
                  text-[11px]
                  font-bold
                  leading-none
                  text-[#4F7F42]
                  [font-family:'Montserrat',sans-serif]
                  shadow-[0_5px_16px_rgba(79,127,66,0.04)]
                "
              >
                Recientes
              </span>

            </div>

            {/* CARGANDO */}

            {cargando && (
              <div
                className="
                  rounded-[1.8rem]
                  border
                  border-white/55
                  bg-white/25
                  p-10
                  text-center
                  text-sm
                  font-semibold
                  text-[#71847A]
                  backdrop-blur-xl
                "
              >
                Cargando incidencias...
              </div>
            )}

            {/* ERROR */}

            {error && (
              <div
                className="
                  rounded-[1.8rem]
                  border
                  border-[#C85B52]/25
                  bg-[#C85B52]/10
                  p-10
                  text-center
                  text-sm
                  font-semibold
                  text-[#AA4139]
                  backdrop-blur-xl
                "
              >
                {error}
              </div>
            )}

            {/* SIN RESULTADOS */}

            {!cargando &&
              !error &&
              incidenciasFiltradas.length === 0 && (
                <div
                  className="
                    rounded-[1.8rem]
                    border
                    border-white/55
                    bg-white/25
                    p-12
                    text-center
                    backdrop-blur-xl
                  "
                >
                  <div
                    className="
                      mx-auto
                      flex
                      h-12
                      w-12
                      items-center
                      justify-center
                      rounded-full
                      bg-[#8DC63F]/10
                      text-[#64842F]
                    "
                  >
                    <Icon className="h-5 w-5">
                      <path d="M4 6h16M7 12h10M10 18h4" />
                    </Icon>
                  </div>

                  <p className="mt-4 text-sm font-bold text-[#4E665A]">
                    No hay incidencias para mostrar.
                  </p>

                  <p className="mt-2 text-xs text-[#82938B]">
                    Pruebe con otros criterios de búsqueda.
                  </p>
                </div>
              )}

            {/* =================================================
                LISTA DE INCIDENCIAS
            ================================================= */}

            {!cargando &&
              !error &&
              incidenciasFiltradas.length > 0 && (
                <div className="space-y-4">

                  {incidenciasFiltradas.map((incidencia) => (
                    <article
                      key={incidencia.id}
                      className="
                        group
                        overflow-hidden
                        rounded-[1.8rem]
                        border
                        border-white/55
                        bg-white/25
                        shadow-[0_14px_38px_rgba(7,63,49,0.045)]
                        backdrop-blur-xl
                        transition-all
                        duration-300
                        hover:-translate-y-0.5
                        hover:bg-white/34
                        hover:shadow-[0_18px_45px_rgba(7,63,49,0.075)]
                      "
                    >

                      <div className="p-5 sm:p-6 lg:p-7">

                        <div className="flex flex-col gap-6 xl:flex-row xl:justify-between">

                          {/* INFORMACIÓN */}

                          <div className="min-w-0 flex-1">


                            {/* TÍTULO */}

                            <h2
                              className="
                                text-xl
                                font-bold
                                tracking-[-0.02em]
                                text-[#174D3B]
                                sm:text-2xl
                              "
                            >
                              {incidencia.titulo}
                            </h2>

                            {/* DESCRIPCIÓN */}

                            <p
                              className="
                                mt-2
                                max-w-4xl
                                text-sm
                                leading-6
                                text-[#71837B]
                              "
                            >
                              {incidencia.descripcion}
                            </p>

                            {/* INFORMACIÓN */}

                            <div
                              className="
                                mt-6
                                grid
                                gap-3
                                text-xs
                                text-[#6F8379]
                                sm:grid-cols-2
                                xl:grid-cols-3
                              "
                            >

                              {/* REGISTRO */}

                              <div className="flex items-center gap-2.5">
                                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#095540]/7 text-[#095540]">
                                  <Icon className="h-4 w-4">
                                    <rect
                                      x="3"
                                      y="4"
                                      width="18"
                                      height="18"
                                      rx="2"
                                    />
                                    <path d="M16 2v4M8 2v4M3 10h18" />
                                  </Icon>
                                </span>

                                <span>
                                  <strong className="font-bold text-[#50675C]">
                                    Registro:
                                  </strong>{' '}
                                  {new Date(
                                    incidencia.fechaRegistro,
                                  ).toLocaleDateString('es-CR')}
                                </span>
                              </div>

                              {/* ACTUALIZACIÓN */}

                              <div className="flex items-center gap-2.5">
                                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#00AEEF]/8 text-[#007FAE]">
                                  <Icon className="h-4 w-4">
                                    <path d="M3 12a9 9 0 1 0 3-6.7" />
                                    <path d="M3 4v5h5" />
                                  </Icon>
                                </span>

                                <span>
                                  <strong className="font-bold text-[#50675C]">
                                    Actualización:
                                  </strong>{' '}
                                  {formatearFechaHoraLocal(
                                    incidencia.fechaActualizacion,
                                  )}
                                </span>
                              </div>

                              {/* REPORTADO */}

                              <div className="flex items-center gap-2.5">
                                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#8DC63F]/10 text-[#648A30]">
                                  <Icon className="h-4 w-4">
                                    <circle
                                      cx="12"
                                      cy="8"
                                      r="4"
                                    />
                                    <path d="M4 21c0-4 4-6 8-6s8 2 8 6" />
                                  </Icon>
                                </span>

                                <span>
                                  <strong className="font-bold text-[#50675C]">
                                    Reportado por:
                                  </strong>{' '}
                                  {incidencia.usuarioReporta?.nombre ??
                                    'Anónimo'}
                                </span>
                              </div>

                              {/* ACTUALIZADO */}

                              <div className="flex items-center gap-2.5">
                                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#8DC63F]/10 text-[#648A30]">
                                  <Icon className="h-4 w-4">
                                    <circle
                                      cx="12"
                                      cy="8"
                                      r="4"
                                    />
                                    <path d="M4 21c0-4 4-6 8-6s8 2 8 6" />
                                  </Icon>
                                </span>

                                <span>
                                  <strong className="font-bold text-[#50675C]">
                                    Actualizado por:
                                  </strong>{' '}
                                  {incidencia.adminActualiza?.nombre ??
                                    'Sin actualización administrativa'}
                                </span>
                              </div>

                              {/* UBICACIÓN */}

                              <div className="flex items-center gap-2.5">
                                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#00AEEF]/8 text-[#007FAE]">
                                  <Icon className="h-4 w-4">
                                    <path d="M12 21c5-3.2 8-7.1 8-11a8 8 0 0 0-16 0c0 3.9 3 7.8 8 11Z" />
                                    <circle
                                      cx="12"
                                      cy="10"
                                      r="2.5"
                                    />
                                  </Icon>
                                </span>

                                <span>
                                  <strong className="font-bold text-[#50675C]">
                                    Ubicación:
                                  </strong>{' '}
                                  {incidencia.ubicacion ??
                                    'Sin ubicación'}
                                </span>
                              </div>

                              {/* OBSERVACIÓN */}

                              <div className="flex items-center gap-2.5">
                                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#D9D823]/10 text-[#777616]">
                                  <Icon className="h-4 w-4">
                                    <path d="M4 6h16M4 12h16M4 18h10" />
                                  </Icon>
                                </span>

                                <span>
                                  <strong className="font-bold text-[#50675C]">
                                    Observación:
                                  </strong>{' '}
                                  {incidencia.observacionesAdmin
                                    ? 'Disponible'
                                    : 'No disponible'}
                                </span>
                              </div>

                            </div>

                            {/* OBSERVACIÓN ADMINISTRATIVA */}

                            {/* CHIPS */}

                            <div className="mt-5 flex flex-wrap items-center gap-2.5 border-t border-white/35 pt-4">

                              <MetaChip
                                className={
                                  estadoClases[
                                    incidencia.estado
                                  ]
                                }
                              >
                                {
                                  etiquetasEstado[
                                    incidencia.estado
                                  ]
                                }
                              </MetaChip>

                              <MetaChip
                                className={
                                  prioridadClases[
                                    incidencia.prioridad
                                  ]
                                }
                              >
                                {
                                  etiquetasPrioridad[
                                    incidencia.prioridad
                                  ]
                                }
                              </MetaChip>

                              <MetaChip
                                className={
                                  categoriaClases[
                                    incidencia.categoria
                                  ]
                                }
                              >
                                {
                                  etiquetasCategoria[
                                    incidencia.categoria
                                  ]
                                }
                              </MetaChip>

                            </div>

                            {incidencia.observacionesAdmin && (
                              <div
                                className="
                                  mt-5
                                  flex
                                  items-start
                                  gap-3
                                  rounded-[1.35rem]
                                  border
                                  border-white/55
                                  bg-white/30
                                  px-4
                                  py-3.5
                                  shadow-[0_8px_24px_rgba(7,63,49,0.035)]
                                  backdrop-blur-xl
                                  transition-all
                                  duration-200
                                  hover:bg-white/38
                                "
                              >

                                <div
                                  className="
                                    flex
                                    h-10
                                    w-10
                                    shrink-0
                                    items-center
                                    justify-center
                                    rounded-full
                                    bg-[#8DC63F]/14
                                    text-[#648A30]
                                  "
                                >
                                  <Icon className="h-4 w-4">
                                    <path d="M5 5h14v14H5z" />
                                    <path d="M8 9h8M8 13h6" />
                                  </Icon>
                                </div>

                                <div className="min-w-0 pt-0.5">

                                  <p
                                    className="
                                      text-[9px]
                                      font-bold
                                      tracking-[0.08em]
                                      text-[#71867B]
                                    "
                                  >
                                    Observación administrativa
                                  </p>

                                  <p
                                    className="
                                      mt-1
                                      text-sm
                                      font-medium
                                      leading-6
                                      text-[#4E665B]
                                    "
                                  >
                                    {incidencia.observacionesAdmin}
                                  </p>

                                </div>

                              </div>
                            )}

                          </div>

                          {/* BOTÓN */}

                         <div className="shrink-0 xl:w-[190px]">

  <button
    type="button"
    onClick={() => {
      setSeleccionada(incidencia);
    }}
    className="
      inline-flex
      w-full
      items-center
      justify-center
      gap-2
      rounded-full
      bg-[#095540]
      px-5
      py-3
      text-sm
      font-bold
      text-white
      shadow-[0_10px_25px_rgba(9,85,64,0.16)]
      transition-all
      duration-200
      hover:-translate-y-0.5
      hover:bg-[#009444]
      hover:shadow-[0_15px_30px_rgba(0,148,68,0.20)]
      active:scale-[0.98]
    "
  >
    <Icon className="h-4 w-4">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </Icon>

    Gestionar incidencia
  </button>

  {incidencia.conformidadUsuario === 'no_satisfecho' && (
    <div className="mt-3 rounded-2xl border border-orange-300 bg-orange-50 px-4 py-3 text-orange-800 shadow-sm">
      <p className="text-xs font-bold">
        ⚠️  Usuario no satisfecho
      </p>

      {incidencia.observacionesUsuario && (
        <p className="mt-1 text-[11px] leading-5">
          {incidencia.observacionesUsuario}
        </p>
      )}
    </div>
  )}

</div>

                        </div>
                      </div>
                    </article>
                  ))}

                </div>
              )}

          </section>

          {/* =================================================
              PIE
          ================================================= */}

          {!cargando && (
            <footer
              className="
                border-t
                border-white/20
                px-7
                py-5
                sm:px-10
                lg:px-14
              "
            >
              <div
                className="
                  flex
                  flex-col
                  gap-3
                  sm:flex-row
                  sm:items-center
                  sm:justify-between
                "
              >

                <p className="text-[10px] font-semibold text-[#7D9086]">
                  Gestión administrativa · Aliados del Parque Nacional Diriá
                </p>

                <div
                  className="
                    flex
                    flex-wrap
                    items-center
                    gap-3
                    text-[9px]
                    font-bold
                    tracking-[0.12em]
                  "
                >
                  <span className="text-[#009444]">
                    Guanacaste
                  </span>

                  <span className="text-[#00AEEF]">
                    Costa Rica
                  </span>

                  <span className="text-[#D9D823]">
                    Parque Nacional Diriá
                  </span>
                </div>

              </div>
            </footer>
          )}

        </section>
      </div>
    </main>
  );
}
