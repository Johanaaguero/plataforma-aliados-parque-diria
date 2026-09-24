import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';

import {
  listarIncidencias,
  ETIQUETAS_ESTADO,
  urlArchivoEvidencia,
} from '../../services/incidenciaServices';

import type {
  Incidencia,
  FiltrosIncidencia,
  CategoriaIncidencia,
  PrioridadIncidencia,
  EstadoIncidencia,
} from '../../services/incidenciaServices';

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

const categoriasInfo: Record<
  CategoriaIncidencia,
  { nombre: string; dot: string; badge: string }
> = {
  seguridad: {
    nombre: 'Seguridad',
    dot: 'bg-amber-500',
    badge: 'bg-amber-500/10 text-amber-700 dark:text-amber-400',
  },
  incendio: {
    nombre: 'Incendio',
    dot: 'bg-red-500',
    badge: 'bg-red-500/10 text-red-700 dark:text-red-400',
  },
  flora_fauna: {
    nombre: 'Flora y fauna',
    dot: 'bg-emerald-500',
    badge: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
  },
  ambiental: {
    nombre: 'Ambiental',
    dot: 'bg-teal-500',
    badge: 'bg-teal-500/10 text-teal-700 dark:text-teal-400',
  },
  infraestructura: {
    nombre: 'Infraestructura',
    dot: 'bg-indigo-500',
    badge: 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-400',
  },
  senderos: {
    nombre: 'Senderos',
    dot: 'bg-lime-600',
    badge: 'bg-lime-500/10 text-lime-700 dark:text-lime-400',
  },
  servicios: {
    nombre: 'Servicios',
    dot: 'bg-sky-500',
    badge: 'bg-sky-500/10 text-sky-700 dark:text-sky-400',
  },
  otro: {
    nombre: 'Otro',
    dot: 'bg-slate-500',
    badge: 'bg-slate-500/10 text-slate-700 dark:text-slate-300',
  },
};

const estadoBadge: Record<EstadoIncidencia, string> = {
  pendiente: 'bg-amber-500/10 text-amber-700 dark:text-amber-400',
  en_revision: 'bg-sky-500/10 text-sky-700 dark:text-sky-400',
  en_proceso: 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-400',
  resuelta: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
  rechazada: 'bg-red-500/10 text-red-700 dark:text-red-400',
  cerrada: 'bg-slate-500/10 text-slate-700 dark:text-slate-300',
};

function EstadoBadge({ estado }: { estado: EstadoIncidencia }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold ${estadoBadge[estado]}`}
    >
      {ETIQUETAS_ESTADO[estado]}
    </span>
  );
}

function TarjetaEvidenciaChica({
  id,
  tipo,
}: {
  id: number;
  tipo: 'foto' | 'video';
}) {
  const url = urlArchivoEvidencia(id);

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="block h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-800"
    >
      {tipo === 'video' ? (
        <video
          src={url}
          className="h-full w-full object-cover"
          muted
        />
      ) : (
        <img
          src={url}
          alt="Evidencia"
          className="h-full w-full object-cover"
        />
      )}
    </a>
  );
}

function TarjetaIncidencia({
  incidencia,
}: {
  incidencia: Incidencia;
}) {
  const infoCategoria = categoriasInfo[incidencia.categoria];

  const primeraEvidencia = incidencia.evidencias?.[0];
  const restoEvidencias = incidencia.evidencias?.slice(1) ?? [];

  return (
    <div className="overflow-hidden rounded-[1.75rem] border border-slate-100 bg-white shadow-[0_24px_60px_rgba(15,23,42,0.1)] dark:border-slate-800 dark:bg-slate-900">

      <div className="flex flex-col sm:flex-row">

        {/* Imagen */}
        <div className="relative h-52 w-full shrink-0 bg-slate-200 sm:h-60 sm:w-56 dark:bg-slate-800">

          {primeraEvidencia ? (
            primeraEvidencia.tipo === 'video' ? (
              <video
                src={urlArchivoEvidencia(primeraEvidencia.id)}
                className="h-full w-full object-cover"
                muted
              />
            ) : (
              <img
                src={urlArchivoEvidencia(primeraEvidencia.id)}
                alt={incidencia.titulo}
                className="h-full w-full object-cover"
              />
            )
          ) : (
            <div className="flex h-full w-full items-center justify-center text-slate-400 dark:text-slate-600">
              <Icon className="h-8 w-8">
                <path d="M4 16l4.586-4.586a2 2 0 0 1 2.828 0L16 16" />
                <circle cx="9" cy="9" r="1.5" />
                <rect
                  x="3"
                  y="4"
                  width="18"
                  height="16"
                  rx="2"
                />
              </Icon>
            </div>
          )}

        </div>

        {/* Información */}
        <div className="flex-1 p-5 sm:p-6">

          {/* Categoría y estado */}
          <div className="flex flex-wrap items-center gap-2">

            <span
              className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-bold ${infoCategoria.badge}`}
            >
              <span
                className={`h-2 w-2 rounded-full ${infoCategoria.dot}`}
              />

              {infoCategoria.nombre}
            </span>

            <EstadoBadge estado={incidencia.estado} />

          </div>

          {/* Título */}
          <h3 className="mt-3 text-lg font-bold tracking-tight text-slate-900 dark:text-white">
            {incidencia.titulo}
          </h3>

          {/* Descripción */}
          <p className="mt-1.5 text-sm leading-6 text-slate-600 dark:text-slate-400">
            {incidencia.descripcion}
          </p>

          {/* Información */}
          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-500 dark:text-slate-400">

            {/* Fecha */}
            <span className="flex items-center gap-1.5">

              <Icon className="h-3.5 w-3.5">
                <rect
                  x="3"
                  y="4"
                  width="18"
                  height="18"
                  rx="2"
                />

                <path d="M16 2v4M8 2v4M3 10h18" />
              </Icon>

              {new Date(
                incidencia.fechaRegistro
              ).toLocaleDateString('es-CR', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}

            </span>

            {/* Ubicación */}
            {incidencia.ubicacion && (
              <span className="flex items-center gap-1.5">

                <Icon className="h-3.5 w-3.5">
                  <path d="M12 21c5-3.2 8-7.1 8-11a8 8 0 0 0-16 0c0 3.9 3 7.8 8 11Z" />
                  <circle cx="12" cy="10" r="2.5" />
                </Icon>

                {incidencia.ubicacion}

              </span>
            )}

            {/* Usuario */}
            {incidencia.usuarioReporta && (
              <span className="flex items-center gap-1.5">

                <Icon className="h-3.5 w-3.5">
                  <circle cx="12" cy="8" r="4" />
                  <path d="M4 21c0-4 4-6 8-6s8 2 8 6" />
                </Icon>

                {incidencia.usuarioReporta.nombre}

              </span>
            )}

          </div>

          {/* Observaciones */}
          {incidencia.observacionesAdmin && (
            <div className="mt-3 rounded-xl border border-slate-200/80 bg-slate-50 p-3 text-xs text-slate-600 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-300">

              <strong>
                Observaciones del administrador:
              </strong>

              <p className="mt-1">
                {incidencia.observacionesAdmin}
              </p>

            </div>
          )}

          {/* Evidencias restantes */}
          {restoEvidencias.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">

              {restoEvidencias.map((evidencia) => (
                <TarjetaEvidenciaChica
                  key={evidencia.id}
                  id={evidencia.id}
                  tipo={evidencia.tipo}
                />
              ))}

            </div>
          )}

        </div>
      </div>
    </div>
  );
}

export default function ListaIncidencias() {

  const [incidencias, setIncidencias] =
    useState<Incidencia[]>([]);

  const [cargando, setCargando] =
    useState(true);

  const [error, setError] =
    useState('');

  const [filtroCategoria, setFiltroCategoria] =
    useState<CategoriaIncidencia | ''>('');

  const [filtroPrioridad, setFiltroPrioridad] =
    useState<PrioridadIncidencia | ''>('');

  const [filtroEstado, setFiltroEstado] =
    useState<EstadoIncidencia | ''>('');

  const [indiceActual, setIndiceActual] =
    useState(0);

  /*
   * Cargar incidencias
   */
  useEffect(() => {

    let cancelado = false;

    const cargarIncidencias = async () => {

      setCargando(true);
      setError('');

      const filtros: FiltrosIncidencia = {};

      if (filtroCategoria) {
        filtros.categoria = filtroCategoria;
      }

      if (filtroPrioridad) {
        filtros.prioridad = filtroPrioridad;
      }

      if (filtroEstado) {
        filtros.estado = filtroEstado;
      }

      try {

        const datos =
          await listarIncidencias(filtros);

        if (!cancelado) {

          setIncidencias(datos);
          setIndiceActual(0);

        }

      } catch (err) {

        if (!cancelado) {

          setError(
            err instanceof Error
              ? err.message
              : 'No se pudieron cargar las incidencias.'
          );

        }

      } finally {

        if (!cancelado) {
          setCargando(false);
        }

      }
    };

    cargarIncidencias();

    return () => {
      cancelado = true;
    };

  }, [
    filtroCategoria,
    filtroPrioridad,
    filtroEstado,
  ]);

  /*
   * Limpiar filtros
   */
  const limpiarFiltros = () => {

    setFiltroCategoria('');
    setFiltroPrioridad('');
    setFiltroEstado('');

  };

  /*
   * Ir a incidencia anterior
   */
  const irAnterior = () => {

    setIndiceActual((actual) =>
      actual === 0
        ? incidencias.length - 1
        : actual - 1
    );

  };

  /*
   * Ir a incidencia siguiente
   */
  const irSiguiente = () => {

    setIndiceActual((actual) =>
      actual === incidencias.length - 1
        ? 0
        : actual + 1
    );

  };

  const hayFiltrosActivos =
    filtroCategoria !== '' ||
    filtroPrioridad !== '' ||
    filtroEstado !== '';

  const hayVarias =
    incidencias.length > 1;

  const anterior = hayVarias
    ? incidencias[
        indiceActual === 0
          ? incidencias.length - 1
          : indiceActual - 1
      ]
    : null;

  const siguiente = hayVarias
    ? incidencias[
        indiceActual === incidencias.length - 1
          ? 0
          : indiceActual + 1
      ]
    : null;

  /*
   * Animación
   */
  const estilosCarrusel = `
    @keyframes fadeInIncidencia {
      from {
        opacity: 0;
        transform: translateX(20px);
      }

      to {
        opacity: 1;
        transform: translateX(0);
      }
    }
  `;

  return (
    <>
      <style>{estilosCarrusel}</style>

<section
  className="
    w-full
    bg-[#f7fbe9]
    px-4
    py-16
    sm:px-6
    lg:px-8
    dark:bg-[#0b241b]
  "
>

        <div className="mx-auto max-w-5xl">

          {/* =================================
              ENCABEZADO
          ================================== */}
          <div className="mb-10 text-center">

            <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-1.5 text-xs font-bold text-emerald-700 shadow-sm dark:border-slate-700 dark:bg-slate-900">

              <span className="h-2 w-2 rounded-full bg-emerald-500" />

              Reportes de la comunidad

            </span>

            <h2 className="mt-4 text-3xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
              Incidencias reportadas
            </h2>

            <p className="mx-auto mt-3 max-w-xl text-sm text-slate-600 dark:text-slate-400 sm:text-base">
              Consulte el estado de los reportes registrados en el parque.
            </p>

          </div>

          {/* =================================
              FILTROS
          ================================== */}
          <div className="mb-8 flex flex-wrap items-center justify-center gap-2.5">

            {/* Categoría */}
            <select
              value={filtroCategoria}
              onChange={(e) =>
                setFiltroCategoria(
                  e.target.value as
                    | CategoriaIncidencia
                    | ''
                )
              }
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-sm focus:border-emerald-500 focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
            >

              <option value="">
                Todas las categorias
              </option>

              {Object.entries(categoriasInfo).map(
                ([valor, info]) => (
                  <option
                    key={valor}
                    value={valor}
                  >
                    {info.nombre}
                  </option>
                )
              )}

            </select>

            {/* Prioridad */}
            <select
              value={filtroPrioridad}
              onChange={(e) =>
                setFiltroPrioridad(
                  e.target.value as
                    | PrioridadIncidencia
                    | ''
                )
              }
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-sm focus:border-emerald-500 focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
            >

              <option value="">
                Toda prioridad
              </option>

              <option value="baja">
                Baja
              </option>

              <option value="media">
                Media
              </option>

              <option value="alta">
                Alta
              </option>

              <option value="critica">
                Critica
              </option>

            </select>

            {/* Estado */}
            <select
              value={filtroEstado}
              onChange={(e) =>
                setFiltroEstado(
                  e.target.value as
                    | EstadoIncidencia
                    | ''
                )
              }
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-sm focus:border-emerald-500 focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
            >

              <option value="">
                Todo estado
              </option>

              {Object.entries(
                ETIQUETAS_ESTADO
              ).map(
                ([valor, etiqueta]) => (
                  <option
                    key={valor}
                    value={valor}
                  >
                    {etiqueta}
                  </option>
                )
              )}

            </select>

            {/* Limpiar filtros */}
            {hayFiltrosActivos && (
              <button
                type="button"
                onClick={limpiarFiltros}
                className="text-xs font-bold text-slate-500 underline hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
              >
                Limpiar filtros
              </button>
            )}

          </div>

          {/* =================================
              CARGANDO
          ================================== */}
          {cargando && (
            <div className="flex items-center justify-center gap-2 rounded-3xl border border-slate-200/80 bg-white p-10 text-sm text-slate-500 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">

              <Icon className="h-4 w-4 animate-spin">

                <circle
                  cx="12"
                  cy="12"
                  r="10"
                  strokeDasharray="32"
                  strokeDashoffset="10"
                />

              </Icon>

              Cargando incidencias...

            </div>
          )}

          {/* =================================
              ERROR
          ================================== */}
          {!cargando && error && (
            <div
              role="alert"
              className="flex items-start gap-3 rounded-3xl border border-red-200 bg-red-50/80 p-5 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200"
            >

              <Icon className="mt-0.5 h-5 w-5 shrink-0 text-red-600 dark:text-red-400">

                <circle
                  cx="12"
                  cy="12"
                  r="10"
                />

                <path d="M12 8v4M12 16h.01" />

              </Icon>

              <div>

                <p className="font-semibold">
                  No se pudo completar la consulta
                </p>

                <p className="mt-0.5 text-xs opacity-90">
                  {error}
                </p>

              </div>

            </div>
          )}

          {/* =================================
              SIN INCIDENCIAS
          ================================== */}
          {!cargando &&
            !error &&
            incidencias.length === 0 && (

              <div className="rounded-3xl border border-slate-200/80 bg-white p-10 text-center text-sm text-slate-500 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">

                {hayFiltrosActivos
                  ? 'No hay incidencias registradas con esos filtros.'
                  : 'No hay incidencias registradas todavia.'}

              </div>

            )}

          {/* =================================
              CARRUSEL
          ================================== */}
          {!cargando &&
            !error &&
            incidencias.length > 0 && (

              <div className="relative">

                <div className="relative flex min-h-[430px] items-center justify-center overflow-hidden py-8">

                  {/* =================================
                      TARJETA ANTERIOR
                  ================================== */}
                  {anterior && (
                    <div
                      className="
                        pointer-events-none
                        absolute
                        left-0
                        z-0
                        w-[85%]
                        max-w-2xl
                        -translate-x-[72%]
                        scale-[0.88]
                        opacity-25
                        blur-[1px]
                        transition-all
                        duration-500
                        ease-in-out
                      "
                    >

                      <TarjetaIncidencia
                        incidencia={anterior}
                      />

                    </div>
                  )}

                  {/* =================================
                      TARJETA SIGUIENTE
                  ================================== */}
                  {siguiente && (
                    <div
                      className="
                        pointer-events-none
                        absolute
                        right-0
                        z-0
                        w-[85%]
                        max-w-2xl
                        translate-x-[72%]
                        scale-[0.88]
                        opacity-25
                        blur-[1px]
                        transition-all
                        duration-500
                        ease-in-out
                      "
                    >

                      <TarjetaIncidencia
                        incidencia={siguiente}
                      />

                    </div>
                  )}

                  {/* =================================
                      TARJETA PRINCIPAL
                  ================================== */}
                  <div
                    key={incidencias[indiceActual].id}
                    className="
                      relative
                      z-10
                      w-full
                      max-w-2xl
                    "
                    style={{
                      animation:
                        'fadeInIncidencia 0.5s ease-in-out',
                    }}
                  >

                    <TarjetaIncidencia
                      incidencia={
                        incidencias[indiceActual]
                      }
                    />

                  </div>

                  {/* =================================
                      FLECHA IZQUIERDA
                  ================================== */}
                  {hayVarias && (
                    <button
                      type="button"
                      onClick={irAnterior}
                      aria-label="Incidencia anterior"
                      className="
                        absolute
                        left-2
                        top-1/2
                        z-20
                        flex
                        h-11
                        w-11
                        -translate-y-1/2
                        items-center
                        justify-center
                        rounded-full
                        border
                        border-slate-200
                        bg-white/95
                        text-slate-600
                        shadow-lg
                        backdrop-blur
                        transition-all
                        duration-200
                        hover:scale-105
                        hover:bg-white
                        active:scale-95
                        dark:border-slate-700
                        dark:bg-slate-800/95
                        dark:text-slate-200
                      "
                    >

                      <Icon className="h-5 w-5">
                        <path d="M15 18l-6-6 6-6" />
                      </Icon>

                    </button>
                  )}

                  {/* =================================
                      FLECHA DERECHA
                  ================================== */}
                  {hayVarias && (
                    <button
                      type="button"
                      onClick={irSiguiente}
                      aria-label="Siguiente incidencia"
                      className="
                        absolute
                        right-2
                        top-1/2
                        z-20
                        flex
                        h-11
                        w-11
                        -translate-y-1/2
                        items-center
                        justify-center
                        rounded-full
                        border
                        border-slate-200
                        bg-white/95
                        text-slate-600
                        shadow-lg
                        backdrop-blur
                        transition-all
                        duration-200
                        hover:scale-105
                        hover:bg-white
                        active:scale-95
                        dark:border-slate-700
                        dark:bg-slate-800/95
                        dark:text-slate-200
                      "
                    >

                      <Icon className="h-5 w-5">
                        <path d="M9 18l6-6-6-6" />
                      </Icon>

                    </button>
                  )}

                </div>

                {/* =================================
                    INDICADORES
                ================================== */}
                {hayVarias && (
                  <div className="mt-4 flex items-center justify-center gap-1.5">

                    {incidencias.map(
                      (incidencia, index) => (

                        <button
                          key={incidencia.id}
                          type="button"
                          onClick={() =>
                            setIndiceActual(index)
                          }
                          aria-label={`Ir a la incidencia ${
                            index + 1
                          }`}
                          aria-current={
                            index === indiceActual
                          }
                          className={`
                            h-2
                            rounded-full
                            transition-all
                            duration-300
                            ${
                              index === indiceActual
                                ? 'w-6 bg-[#095540]'
                                : 'w-2 bg-slate-300 hover:bg-slate-400 dark:bg-slate-700'
                            }
                          `}
                        />

                      )
                    )}

                  </div>
                )}

              </div>

            )}

        </div>

      </section>
    </>
  );
}