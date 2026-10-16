import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import {
  cerrarMiIncidencia,
  obtenerComentariosIncidencia,
  obtenerMisIncidencias,
  type AccionCierreIncidencia,
  type ComentarioIncidencia,
  type EstadoIncidencia,
  type Incidencia,
} from '../../services/incidenciaServices';
import { formatearFechaHora } from '../../utils/fechas';
import parqueHero from '../../assets/parque-hero.jpg';

type FiltroEstado =
  | 'todas'
  | 'pendientes'
  | 'en_proceso'
  | 'resueltas'
  | 'cerradas';

const etiquetasEstado: Record<EstadoIncidencia, string> = {
  pendiente: 'Pendiente',
  en_revision: 'En revisión',
  en_proceso: 'En proceso',
  resuelta: 'Resuelta',
  rechazada: 'Rechazada',
  cerrada: 'Archivada',
};

const clasesEstado: Record<EstadoIncidencia, string> = {
  pendiente: 'bg-amber-100/80 text-amber-800 ring-amber-500/20',
  en_revision: 'bg-sky-100/80 text-sky-800 ring-sky-500/20',
  en_proceso: 'bg-lime-100/80 text-lime-800 ring-lime-500/20',
  resuelta: 'bg-emerald-100/80 text-emerald-800 ring-emerald-500/20',
  rechazada: 'bg-rose-100/80 text-rose-800 ring-rose-500/20',
  cerrada: 'bg-slate-200/80 text-slate-700 ring-slate-500/20',
};

const etiquetasFiltros: Record<FiltroEstado, string> = {
  todas: 'Todas',
  pendientes: 'Pendientes',
  en_proceso: 'En proceso',
  resueltas: 'Resueltas',
  cerradas: 'Cerradas',
};

function codigoIncidencia(incidencia: Incidencia): string {
  const codigo = incidencia.codigo || '#INC-00000000';
  return codigo.startsWith('#INC-') ? codigo : `#INC-${codigo}`;
}

function coincideFiltro(
  incidencia: Incidencia,
  filtro: FiltroEstado,
): boolean {
  if (filtro === 'todas') return true;

  if (filtro === 'resueltas') {
    return incidencia.estado === 'resuelta';
  }

  if (filtro === 'cerradas') {
    return incidencia.estado === 'cerrada';
  }

  if (filtro === 'en_proceso') {
    return incidencia.estado === 'en_proceso';
  }

  return !['resuelta', 'cerrada'].includes(incidencia.estado);
}

function formatearFechaComentario(fecha: string): string {
  return new Intl.DateTimeFormat('es-CR', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true,
  }).format(new Date(fecha));
}

export default function MisIncidencias() {
  const navigate = useNavigate();
  const [incidencias, setIncidencias] = useState<Incidencia[]>([]);
  const [filtro, setFiltro] = useState<FiltroEstado>('todas');
  const [busqueda, setBusqueda] = useState('');
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [accionEnCurso, setAccionEnCurso] = useState<number | null>(null);
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);
  const [observacionesUsuario, setObservacionesUsuario] =
  useState<Record<number, string>>({});
  const [historiales, setHistoriales] = useState<Record<number, ComentarioIncidencia[]>>({});
  const [cargandoHistoriales, setCargandoHistoriales] = useState(false);


  useEffect(() => {
    let activo = true;

    const cargarIncidencias = async () => {
      setCargando(true);
      setError(null);

      try {
        const respuesta = await obtenerMisIncidencias();
        if (activo) {
          setIncidencias(respuesta);
        }
      } catch (errorSolicitud) {
        if (activo) {
          setError(
            errorSolicitud instanceof Error
              ? errorSolicitud.message
              : 'No se pudieron cargar tus incidencias.',
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
    let activo = true;
    if (!incidencias.length) {
      setHistoriales({});
      return () => { activo = false; };
    }

    setCargandoHistoriales(true);
    Promise.all(incidencias.map(async (incidencia) => [incidencia.id, await obtenerComentariosIncidencia(incidencia.id)] as const))
      .then((resultados) => {
        if (activo) setHistoriales(Object.fromEntries(resultados));
      })
      .catch(() => {
        if (activo) setHistoriales({});
      })
      .finally(() => { if (activo) setCargandoHistoriales(false); });

    return () => { activo = false; };
  }, [incidencias]);

  const incidenciasFiltradas = useMemo(() => {
    const termino = busqueda.trim().toLowerCase();

    return [...incidencias]
      .filter((incidencia) => coincideFiltro(incidencia, filtro))
      .filter((incidencia) => {
        if (!termino) return true;

        return (
          codigoIncidencia(incidencia).toLowerCase().includes(termino) ||
          String(incidencia.id).includes(termino)
        );
      })
      .sort(
        (a, b) =>
          new Date(b.fechaRegistro).getTime() -
          new Date(a.fechaRegistro).getTime(),
      );
  }, [busqueda, filtro, incidencias]);

  const procesarRespuesta = async (
  incidencia: Incidencia,
  accion: AccionCierreIncidencia,
  observacionesUsuario?: string,
) => {
  setAccionEnCurso(incidencia.id);
  setError(null);
  setMensajeExito(null);

  try {
    const actualizada = await cerrarMiIncidencia(
      incidencia.id,
      accion,
      observacionesUsuario,
    );

    setIncidencias((actuales) =>
      actuales.map((actual) =>
        actual.id === actualizada.id ? actualizada : actual,
      ),
    );

    setMensajeExito(
      accion === 'satisfecho'
        ? 'Confirmaste que estás satisfecho con la solución. La incidencia permanecerá como RESUELTA durante 7 días antes de cerrarse automáticamente.'
        : 'Tu incidencia fue devuelta al administrador para que pueda revisarla nuevamente.',
    );
  } catch (errorSolicitud) {
    setError(
      errorSolicitud instanceof Error
        ? errorSolicitud.message
        : 'No se pudo registrar tu respuesta.',
    );
  } finally {
    setAccionEnCurso(null);
  }
};

  return (
    <main className="relative isolate min-h-screen overflow-x-hidden bg-[#071c14] px-4 pb-14 pt-28 text-emerald-950 dark:text-white sm:px-6 lg:px-10">
      <img src={parqueHero} alt="" aria-hidden="true" className="pointer-events-none fixed inset-0 -z-20 h-full w-full object-cover" />
      <div className="pointer-events-none fixed inset-0 -z-10 bg-emerald-950/65 backdrop-blur-[3px]" />
      <button
        type="button"
        onClick={() => navigate('/')}
        aria-label="Volver atrás"
        title="Volver atrás"
        className="fixed left-3 top-3 z-[60] flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-gray-100/80 text-gray-800 shadow-[0_10px_30px_rgba(7,63,49,0.12)] backdrop-blur-md transition-all duration-200 hover:bg-gray-200/80 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8dc63f] focus-visible:ring-offset-2 dark:border-white/15 dark:bg-white/10 dark:text-white dark:hover:bg-white/20 sm:left-5 sm:top-5"
      >
        <svg
          className="h-5 w-5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
        >
          <path
            d="m15 18-6-6 6-6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
      <section className="mx-auto w-full max-w-6xl rounded-[2rem] border border-white/55 bg-white/55 p-5 shadow-[0_24px_70px_rgba(11,58,39,0.12)] backdrop-blur-2xl dark:border-white/10 dark:bg-slate-900/55 sm:p-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-600">Seguimiento personal</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Mis incidencias</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-emerald-950/65 dark:text-white/65">Consulta el seguimiento de los reportes que enviaste y confirma la resolución cuando corresponda.</p>
          </div>

          <label className="relative block w-full max-w-sm">
            <span className="sr-only">Buscar por código de incidencia</span>
            <svg viewBox="0 0 24 24" className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-emerald-700/55 dark:text-emerald-200/65" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><circle cx="11" cy="11" r="6" /><path d="m16 16 4 4" /></svg>
            <input value={busqueda} onChange={(event) => setBusqueda(event.target.value)} placeholder="Buscar #INC-0001" className="h-12 w-full rounded-2xl border border-white/60 bg-white/70 pl-12 pr-4 text-sm font-semibold text-emerald-950 shadow-sm outline-none backdrop-blur-xl transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-500/10 dark:border-white/10 dark:bg-slate-950/45 dark:text-white" />
          </label>
        </div>

        <div className="mt-7 flex w-full gap-1 overflow-x-auto rounded-2xl border border-white/55 bg-white/45 p-1.5 backdrop-blur-xl [scrollbar-width:none] [&::-webkit-scrollbar]:hidden dark:border-white/10 dark:bg-white/5">
          {(Object.keys(etiquetasFiltros) as FiltroEstado[]).map((opcion) => (
            <button key={opcion} type="button" onClick={() => setFiltro(opcion)} className={`min-h-10 shrink-0 rounded-xl px-4 text-sm font-bold transition ${filtro === opcion ? 'bg-emerald-700 text-white shadow-[0_8px_18px_rgba(5,84,64,0.24)]' : 'text-emerald-950/65 hover:bg-white/70 dark:text-white/65 dark:hover:bg-white/10'}`} aria-pressed={filtro === opcion}>{etiquetasFiltros[opcion]}</button>
          ))}
        </div>

        {mensajeExito && <p className="mt-5 rounded-2xl border border-emerald-200/70 bg-emerald-50/80 px-4 py-3 text-sm font-semibold text-emerald-800 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-100" role="status">{mensajeExito}</p>}
        {error && <p className="mt-5 rounded-2xl border border-rose-200/70 bg-rose-50/80 px-4 py-3 text-sm font-semibold text-rose-800 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-100" role="alert">{error}</p>}

        <div className="mt-6 grid gap-4">
          {cargando && <div className="rounded-3xl border border-white/55 bg-white/45 p-8 text-center text-sm font-semibold text-emerald-900/65 backdrop-blur-xl dark:border-white/10 dark:bg-white/5 dark:text-white/65">Cargando tus incidencias...</div>}

          {!cargando && incidenciasFiltradas.map((incidencia) => {
            const enAccion = accionEnCurso === incidencia.id;
            const puedeResponder =
  incidencia.estado === 'en_revision' &&
  incidencia.conformidadUsuario === 'pendiente';
  console.log('INCIDENCIA:', {
  id: incidencia.id,
  estado: incidencia.estado,
  conformidadUsuario: incidencia.conformidadUsuario,
  puedeResponder,
});

            return <article key={incidencia.id} className="rounded-3xl border border-white/55 bg-white/60 p-5 shadow-[0_12px_32px_rgba(11,58,39,0.06)] backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/55 sm:p-6">
             <div className="flex flex-col gap-5">
  <div className="min-w-0 w-full">
    <div className="flex flex-wrap items-center gap-2">
      <span className="rounded-full bg-emerald-700/10 px-3 py-1 text-xs font-black tracking-wide text-emerald-800 dark:bg-emerald-400/10 dark:text-emerald-200">
        {codigoIncidencia(incidencia)}
      </span>

      <span
        className={`rounded-full px-3 py-1 text-xs font-bold ring-1 ${clasesEstado[incidencia.estado]}`}
      >
        {etiquetasEstado[incidencia.estado]}
      </span>
    </div>

    <h2 className="mt-4 text-xl font-extrabold text-emerald-950 dark:text-white">
      {incidencia.titulo}
    </h2>

    <p className="mt-2 text-sm font-medium text-emerald-950/65 dark:text-white/65">
      {incidencia.categoria.replace('_', ' ')} · Registrada el{' '}
      {formatearFechaHora(incidencia.fechaRegistro)}
    </p>

    <div className="mt-4 w-full rounded-2xl border border-white/55 bg-white/45 px-4 py-3 text-sm leading-6 text-emerald-950/75 backdrop-blur-lg dark:border-white/10 dark:bg-white/5 dark:text-white/75">
      <span className="font-bold">
        Observación administrativa:{' '}
      </span>

      <span className="break-words">
        {incidencia.observacionesAdmin ??
          'Aún no hay observaciones administrativas.'}
      </span>
    </div>

    <section className="mt-4 rounded-2xl border border-emerald-500/15 bg-emerald-500/[0.05] p-4 backdrop-blur-xl dark:border-emerald-400/15 dark:bg-emerald-400/[0.05]">
      <h3 className="text-sm font-extrabold text-emerald-900 dark:text-emerald-100">Historial de Seguimiento</h3>
      <div className="mt-3 space-y-3">
        {cargandoHistoriales && <p className="text-sm text-emerald-900/60 dark:text-white/60">Cargando seguimiento…</p>}
        {!cargandoHistoriales && !(historiales[incidencia.id]?.length) && <p className="text-sm text-emerald-900/60 dark:text-white/60">Aún no hay actualizaciones públicas.</p>}
        {historiales[incidencia.id]?.filter((comentario) => !comentario.esNotaPrivada && !comentario.esDatoSensible).map((comentario) => <article key={comentario.id} className="rounded-xl border border-white/50 bg-white/45 p-3 dark:border-white/10 dark:bg-slate-950/25"><div className="flex flex-wrap items-center justify-between gap-2"><p className="text-sm font-bold text-emerald-950 dark:text-white">{comentario.nombreAutor}</p><time className="text-xs font-semibold text-emerald-900/55 dark:text-white/60" dateTime={comentario.fechaHora}>{formatearFechaComentario(comentario.fechaHora)}</time></div><p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-emerald-950/75 dark:text-white/75">{comentario.texto}</p></article>)}
      </div>
    </section>
  </div>

 {puedeResponder && (
  <div className="flex w-full flex-col gap-3">

    <textarea
      value={observacionesUsuario[incidencia.id] ?? ''}
      onChange={(event) => {
        setObservacionesUsuario((actuales) => ({
          ...actuales,
          [incidencia.id]: event.target.value,
        }));

        setError(null);
      }}
      rows={3}
      placeholder="Si no estás satisfecho, explica qué debe revisarse..."
      className="w-full rounded-2xl border border-white/60 bg-white/70 px-4 py-3 text-sm text-emerald-950 shadow-sm outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-500/10 dark:border-white/10 dark:bg-slate-950/45 dark:text-white"
    />

    <button
      type="button"
      disabled={enAccion}
      onClick={() =>
        void procesarRespuesta(incidencia, 'satisfecho')
      }
      className="min-h-11 w-full rounded-2xl bg-emerald-700 px-4 py-2.5 text-sm font-bold text-white shadow-[0_10px_22px_rgba(5,84,64,0.22)] transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {enAccion ? 'Guardando...' : 'Estoy satisfecho'}
    </button>

    <button
      type="button"
      disabled={enAccion}
      onClick={() => {
        const observaciones =
          observacionesUsuario[incidencia.id]?.trim() || '';

        if (!observaciones) {
          setError(
            'Indica qué parte de la solución no te satisface antes de continuar.',
          );
          return;
        }

        void procesarRespuesta(
          incidencia,
          'no_satisfecho',
          observaciones,
        );
      }}
      className="min-h-11 w-full rounded-2xl border border-emerald-800/15 bg-white/65 px-4 py-2.5 text-sm font-bold text-emerald-900 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/15 dark:bg-white/10 dark:text-white dark:hover:bg-white/15"
    >
      {enAccion ? 'Guardando...' : 'No estoy satisfecho'}
    </button>

  </div>
)}
</div>
            </article>;
          })}

          {!cargando && incidenciasFiltradas.length === 0 && <div className="rounded-3xl border border-dashed border-emerald-700/20 bg-white/35 p-10 text-center backdrop-blur-xl dark:border-white/15 dark:bg-white/5"><p className="text-lg font-bold">No hay incidencias para mostrar</p><p className="mt-2 text-sm text-emerald-950/65 dark:text-white/65">Prueba con otro filtro o código de incidencia.</p></div>}
        </div>
      </section>
    </main>
  );
}
