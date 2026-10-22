import { useEffect, useRef, useState } from 'react';
import type { MouseEvent as ReactMouseEvent } from 'react';
import type { ReactNode } from 'react';

import {
  listarIncidencias,
  obtenerComentariosIncidencia,
  obtenerDetalleIncidencia,
  ETIQUETAS_ESTADO,
} from '../../services/incidenciaServices';

import type {
  Incidencia,
  FiltrosIncidencia,
  CategoriaIncidencia,
  PrioridadIncidencia,
  EstadoIncidencia,
  ComentarioIncidencia,
} from '../../services/incidenciaServices';
import EvidenciaMedia from './EvidenciaMedia';

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

const etiquetasPrioridad: Record<PrioridadIncidencia, string> = {
  baja: 'Baja',
  media: 'Media',
  alta: 'Alta',
  critica: 'Crítica',
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
  onClick,
}: {
  id: number;
  tipo: 'foto' | 'video';
  onClick: (event: ReactMouseEvent<HTMLAnchorElement>) => void;
}) {
  return (
    <EvidenciaMedia
      evidenciaId={id}
      tipo={tipo}
      alt="Evidencia"
      className="h-full w-full object-cover"
      muted
      abrirEnlace
      onClick={onClick}
      claseEnlace="block h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-800"
    />
  );
}

function TarjetaIncidencia({
  incidencia,
  onAbrir,
}: {
  incidencia: Incidencia;
  onAbrir: () => void;
}) {
  const infoCategoria = categoriasInfo[incidencia.categoria];

  const primeraEvidencia = incidencia.evidencias?.[0];
  const restoEvidencias = incidencia.evidencias?.slice(1) ?? [];

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`Ver detalle de la incidencia: ${incidencia.titulo}`}
      onClick={onAbrir}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onAbrir();
        }
      }}
      className="cursor-pointer overflow-hidden rounded-2xl border border-white/40 bg-white/70 shadow-lg backdrop-blur-md transition-all hover:shadow-2xl focus:outline-none focus:ring-4 focus:ring-emerald-500/30 dark:border-white/10 dark:bg-slate-800/70"
    >

      <div className="flex flex-col sm:flex-row">

        {/* Imagen */}
        <div className="relative h-52 w-full shrink-0 bg-slate-200 sm:h-60 sm:w-56 dark:bg-slate-800">

          {primeraEvidencia ? (
            <EvidenciaMedia
              evidenciaId={primeraEvidencia.id}
              tipo={primeraEvidencia.tipo}
              alt={incidencia.titulo}
              className="h-full w-full object-cover"
              muted
            />
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

          {/* Evidencias restantes */}
          {restoEvidencias.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">

              {restoEvidencias.map((evidencia) => (
                <TarjetaEvidenciaChica
                  key={evidencia.id}
                  id={evidencia.id}
                  tipo={evidencia.tipo}
                  onClick={(event) => event.stopPropagation()}
                />
              ))}

            </div>
          )}

        </div>
      </div>
    </div>
  );
}

function DetalleIncidenciaModal({
  incidenciaInicial,
  onClose,
}: {
  incidenciaInicial: Incidencia;
  onClose: () => void;
}) {
  const [incidencia, setIncidencia] = useState(incidenciaInicial);
  const [comentarios, setComentarios] = useState<ComentarioIncidencia[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    let cancelado = false;
    const overflowAnterior = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const cerrarConEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCloseRef.current();
    };
    document.addEventListener('keydown', cerrarConEscape);

    const cargarDetalle = async () => {
      setCargando(true);
      setError('');

      try {
        const [detalle, historial] = await Promise.all([
          obtenerDetalleIncidencia(incidenciaInicial.id),
          obtenerComentariosIncidencia(incidenciaInicial.id),
        ]);

        if (!cancelado) {
          setIncidencia(detalle);
          setComentarios(
            historial.filter(
              (comentario) =>
                !comentario.esNotaPrivada && !comentario.esDatoSensible,
            ),
          );
        }
      } catch (errorSolicitud) {
        if (!cancelado) {
          setError(
            errorSolicitud instanceof Error
              ? errorSolicitud.message
              : 'No se pudo cargar el detalle de la incidencia.',
          );
        }
      } finally {
        if (!cancelado) setCargando(false);
      }
    };

    void cargarDetalle();

    return () => {
      cancelado = true;
      document.body.style.overflow = overflowAnterior;
      document.removeEventListener('keydown', cerrarConEscape);
    };
  }, [incidenciaInicial.id]);

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center overflow-y-auto bg-slate-950/65 p-3 backdrop-blur-sm sm:p-6"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="detalle-incidencia-titulo"
        className="my-auto max-h-[95vh] w-full max-w-4xl overflow-y-auto rounded-2xl border border-white/30 bg-white/85 p-5 shadow-2xl backdrop-blur-md dark:border-white/10 dark:bg-slate-900/90 sm:p-8"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">
              Detalle de la incidencia
            </p>
            <h2
              id="detalle-incidencia-titulo"
              className="mt-1 text-2xl font-bold text-slate-900 dark:text-white"
            >
              {incidencia.titulo}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-full border border-white/40 bg-white/60 px-4 py-2 text-sm font-bold text-slate-700 shadow-sm backdrop-blur-md transition hover:bg-white dark:border-white/10 dark:bg-slate-800/70 dark:text-white dark:hover:bg-slate-700"
          >
            Volver
          </button>
        </div>

        {cargando && (
          <p className="mt-6 text-sm text-slate-600 dark:text-slate-300" role="status">
            Cargando información completa...
          </p>
        )}
        {error && (
          <p className="mt-6 rounded-xl border border-red-300/60 bg-red-50/80 p-4 text-sm text-red-800 dark:border-red-500/30 dark:bg-red-950/40 dark:text-red-200" role="alert">
            {error}
          </p>
        )}

        <div className="mt-6 flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-slate-500/10 px-3 py-1 text-xs font-bold text-slate-700 dark:text-slate-200">
            {incidencia.codigo}
          </span>
          <span className={`rounded-full px-3 py-1 text-xs font-bold ${categoriasInfo[incidencia.categoria].badge}`}>
            {categoriasInfo[incidencia.categoria].nombre}
          </span>
          <EstadoBadge estado={incidencia.estado} />
          <span className="rounded-full bg-orange-500/10 px-3 py-1 text-xs font-bold text-orange-800 dark:text-orange-200">
            Prioridad {etiquetasPrioridad[incidencia.prioridad]}
          </span>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Registrada el {new Date(incidencia.fechaRegistro).toLocaleDateString('es-CR', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </span>
        </div>
        {incidencia.usuarioReporta && (
          <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
            <strong>Reportada por:</strong> {incidencia.usuarioReporta.nombre}
          </p>
        )}

        <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(240px,0.7fr)]">
          <div className="space-y-4">
            <article className="rounded-2xl border border-white/50 bg-white/55 p-4 backdrop-blur-md dark:border-white/10 dark:bg-slate-800/50">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Descripción</h3>
              <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-slate-700 dark:text-slate-200">
                {incidencia.descripcion}
              </p>
            </article>
            {incidencia.ubicacion && (
              <p className="text-sm text-slate-600 dark:text-slate-300">
                <strong>Ubicación:</strong> {incidencia.ubicacion}
              </p>
            )}
          </div>

          <section>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Evidencias ({incidencia.evidencias.length})
            </h3>
            {incidencia.evidencias.length === 0 ? (
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                No hay imágenes ni videos adjuntos.
              </p>
            ) : (
              <div className="mt-3 grid grid-cols-2 gap-3">
                {incidencia.evidencias.map((evidencia) => {
                  return (
                    <EvidenciaMedia
                      key={evidencia.id}
                      evidenciaId={evidencia.id}
                      tipo={evidencia.tipo}
                      alt={`Evidencia de ${incidencia.titulo}`}
                      className="aspect-video w-full object-cover"
                      controls={evidencia.tipo === 'video'}
                      abrirEnlace
                      claseEnlace="overflow-hidden rounded-xl border border-white/50 bg-white/45 dark:border-white/10 dark:bg-slate-800/50"
                    />
                  );
                })}
              </div>
            )}
          </section>
        </div>

        <section className="mt-7 border-t border-slate-200/70 pt-5 dark:border-slate-700/70">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">
            Comentarios públicos
          </h3>
          {cargando && <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">Cargando comentarios...</p>}
          {!cargando && !error && comentarios.length === 0 && (
            <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
              Aún no hay comentarios públicos para esta incidencia.
            </p>
          )}
          <div className="mt-3 space-y-3">
            {comentarios.map((comentario) => (
              <article key={comentario.id} className="rounded-xl border border-white/50 bg-white/55 p-4 backdrop-blur-md dark:border-white/10 dark:bg-slate-800/50">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-bold text-slate-900 dark:text-white">{comentario.nombreAutor}</p>
                  <time className="text-xs text-slate-500 dark:text-slate-400" dateTime={comentario.fechaHora}>
                    {new Date(comentario.fechaHora).toLocaleString('es-CR')}
                  </time>
                </div>
                <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-slate-700 dark:text-slate-200">
                  {comentario.texto}
                </p>
              </article>
            ))}
          </div>
        </section>
      </section>
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
  const [incidenciaSeleccionada, setIncidenciaSeleccionada] =
    useState<Incidencia | null>(null);

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

      filtros.soloPublicas = true;

      try {

      const datos =
  await listarIncidencias(filtros);

if (!cancelado) {
  // Solo se muestran las que el administrador marcó como "Visible públicamente"
  setIncidencias(
    datos.filter((incidencia) => incidencia.esPublica === true)
  );
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
    rounded-3xl
    border
    border-white/20
    bg-white/70
    shadow-[0_8px_32px_0_rgba(0,0,0,0.2)]
    backdrop-blur-xl
    px-4
    py-16
    sm:px-6
    lg:px-8
    dark:border-white/10
    dark:bg-slate-900/60
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

            <FiltroFlotante
              etiqueta="Todas las categorías"
              valor={filtroCategoria}
              onChange={setFiltroCategoria}
              opciones={[
                { valor: '', etiqueta: 'Todas las categorías' },
                ...Object.entries(categoriasInfo).map(([valor, info]) => ({
                  valor: valor as CategoriaIncidencia,
                  etiqueta: info.nombre,
                })),
              ]}
            />

            <FiltroFlotante
              etiqueta="Toda prioridad"
              valor={filtroPrioridad}
              onChange={setFiltroPrioridad}
              opciones={[
                { valor: '', etiqueta: 'Toda prioridad' },
                { valor: 'baja', etiqueta: 'Baja' },
                { valor: 'media', etiqueta: 'Media' },
                { valor: 'alta', etiqueta: 'Alta' },
                { valor: 'critica', etiqueta: 'Crítica' },
              ]}
            />

         

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

                <div className="relative flex min-h-[430px] items-center justify-center py-8">

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
                      onAbrir={() => setIncidenciaSeleccionada(incidencias[indiceActual])}
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
                        border-white/30
                        bg-white/80
                        text-slate-600
                        shadow-lg
                        backdrop-blur-xl
                        transition-all
                        duration-200
                        hover:scale-105
                        hover:bg-white
                        active:scale-95
                        dark:border-white/10
                        dark:bg-slate-900/80
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
                        border-white/30
                        bg-white/80
                        text-slate-600
                        shadow-lg
                        backdrop-blur-xl
                        transition-all
                        duration-200
                        hover:scale-105
                        hover:bg-white
                        active:scale-95
                        dark:border-white/10
                        dark:bg-slate-900/80
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
                  <div className="mt-4 flex items-center justify-center">
                    <span className="rounded-full border border-white/40 bg-white/70 px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm backdrop-blur-md dark:border-white/10 dark:bg-slate-900/70 dark:text-slate-200" aria-live="polite">
                      {indiceActual + 1} de {incidencias.length}
                    </span>
                  </div>
                )}

              </div>

            )}

        </div>

      </section>
      {incidenciaSeleccionada && (
        <DetalleIncidenciaModal
          incidenciaInicial={incidenciaSeleccionada}
          onClose={() => setIncidenciaSeleccionada(null)}
        />
      )}
    </>
  );
}

interface OpcionFiltro<T extends string> {
  valor: T | '';
  etiqueta: string;
}

function FiltroFlotante<T extends string>({
  etiqueta,
  valor,
  opciones,
  onChange,
}: {
  etiqueta: string;
  valor: T | '';
  opciones: OpcionFiltro<T>[];
  onChange: (valor: T | '') => void;
}) {
  const [abierto, setAbierto] = useState(false);
  const contenedorRef = useRef<HTMLDivElement>(null);
  const opcionActiva = opciones.find((opcion) => opcion.valor === valor);

  useEffect(() => {
    const cerrarAlHacerClickFuera = (event: MouseEvent) => {
      if (!contenedorRef.current?.contains(event.target as Node)) {
        setAbierto(false);
      }
    };

    document.addEventListener('mousedown', cerrarAlHacerClickFuera);
    return () => document.removeEventListener('mousedown', cerrarAlHacerClickFuera);
  }, []);

  return (
    <div ref={contenedorRef} className="relative">
      <button
        type="button"
        onClick={() => setAbierto((actual) => !actual)}
        aria-haspopup="listbox"
        aria-expanded={abierto}
        className="inline-flex min-w-[172px] items-center justify-between gap-3 rounded-2xl border border-white/30 bg-white/80 px-5 py-3 text-left text-xs font-semibold text-slate-700 shadow-xl shadow-emerald-950/10 backdrop-blur-xl transition duration-200 hover:bg-white focus:outline-none focus:ring-4 focus:ring-emerald-500/15 dark:border-white/10 dark:bg-slate-900/80 dark:text-slate-100 dark:hover:bg-slate-900"
      >
        <span>{opcionActiva?.etiqueta ?? etiqueta}</span>
        <Icon className={`h-4 w-4 text-emerald-700 transition-transform duration-200 dark:text-emerald-300 ${abierto ? 'rotate-180' : ''}`}>
          <path d="m6 9 6 6 6-6" />
        </Icon>
      </button>

      {abierto && (
        <div className="absolute left-0 top-full z-40 mt-2 min-w-full origin-top rounded-3xl border border-white/20 bg-white/80 p-2 shadow-2xl shadow-emerald-950/20 backdrop-blur-xl motion-safe:animate-[fadeInIncidencia_160ms_ease-out] dark:border-white/10 dark:bg-slate-900/80">
          <div role="listbox" aria-label={etiqueta} className="max-h-64 overflow-y-auto p-1">
            {opciones.map((opcion) => {
              const seleccionada = opcion.valor === valor;
              return (
                <button
                  key={opcion.valor || 'todos'}
                  type="button"
                  role="option"
                  aria-selected={seleccionada}
                  onClick={() => {
                    onChange(opcion.valor);
                    setAbierto(false);
                  }}
                  className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-xs font-semibold transition ${seleccionada ? 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-200' : 'text-slate-600 hover:bg-emerald-500/10 hover:text-emerald-800 dark:text-slate-300 dark:hover:text-emerald-100'}`}
                >
                  {opcion.etiqueta}
                  {seleccionada && <span className="h-2 w-2 rounded-full bg-emerald-500" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
