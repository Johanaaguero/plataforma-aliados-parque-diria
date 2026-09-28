import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import {
  cerrarMiIncidencia,
  obtenerMisIncidencias,
  type AccionCierreIncidencia,
  type EstadoIncidencia,
  type Incidencia,
} from '../../services/incidenciaServices';
import { formatearFechaHora } from '../../utils/fechas';
import parqueHero from '../../assets/parque-hero.jpg';

type FiltroEstado = 'todas' | 'pendientes' | 'resueltas' | 'archivadas';

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
  resueltas: 'Resueltas',
  archivadas: 'Archivadas',
};

function codigoIncidencia(incidencia: Incidencia): string { return `#INC-${incidencia.codigo || '00000000'}`; }

function coincideFiltro(incidencia: Incidencia, filtro: FiltroEstado): boolean {
  if (filtro === 'todas') return true;
  if (filtro === 'resueltas') return incidencia.estado === 'resuelta';
  if (filtro === 'archivadas') return incidencia.estado === 'cerrada';

  return !['resuelta', 'cerrada'].includes(incidencia.estado);
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

  const procesarCierre = async (
    incidencia: Incidencia,
    accion: AccionCierreIncidencia,
  ) => {
    setAccionEnCurso(incidencia.id);
    setError(null);
    setMensajeExito(null);

    try {
      const actualizada = await cerrarMiIncidencia(incidencia.id, accion);

      setIncidencias((actuales) =>
        actuales.map((actual) =>
          actual.id === actualizada.id ? actualizada : actual,
        ),
      );
      setMensajeExito(
        accion === 'aceptar_resolucion'
          ? 'Confirmaste la resolución y la incidencia fue archivada.'
          : 'La incidencia fue archivada correctamente.',
      );
    } catch (errorSolicitud) {
      setError(
        errorSolicitud instanceof Error
          ? errorSolicitud.message
          : 'No se pudo completar la acción.',
      );
    } finally {
      setAccionEnCurso(null);
    }
  };

  return (
    <main className="relative isolate min-h-screen overflow-x-hidden bg-[#071c14] px-4 pb-14 pt-28 text-emerald-950 dark:text-white sm:px-6 lg:px-10">
      <img src={parqueHero} alt="" aria-hidden="true" className="pointer-events-none fixed inset-0 -z-20 h-full w-full object-cover" />
      <div className="pointer-events-none fixed inset-0 -z-10 bg-emerald-950/65 backdrop-blur-[3px]" />
      <section className="mx-auto w-full max-w-6xl rounded-[2rem] border border-white/55 bg-white/55 p-5 shadow-[0_24px_70px_rgba(11,58,39,0.12)] backdrop-blur-2xl dark:border-white/10 dark:bg-slate-900/55 sm:p-8">
        <button type="button" onClick={() => navigate('/')} className="mb-6 inline-flex items-center gap-2 rounded-2xl border border-white/55 bg-white/55 px-4 py-2.5 text-sm font-bold text-emerald-900 shadow-sm backdrop-blur-xl transition hover:bg-white/80 dark:border-white/10 dark:bg-white/10 dark:text-white dark:hover:bg-white/15"><svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="m15 18-6-6 6-6" /></svg>Volver atrás</button>
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
            const puedeCerrar = incidencia.estado === 'resuelta';

            return <article key={incidencia.id} className="rounded-3xl border border-white/55 bg-white/60 p-5 shadow-[0_12px_32px_rgba(11,58,39,0.06)] backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/55 sm:p-6">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-emerald-700/10 px-3 py-1 text-xs font-black tracking-wide text-emerald-800 dark:bg-emerald-400/10 dark:text-emerald-200">{codigoIncidencia(incidencia)}</span><span className={`rounded-full px-3 py-1 text-xs font-bold ring-1 ${clasesEstado[incidencia.estado]}`}>{etiquetasEstado[incidencia.estado]}</span></div>
                  <h2 className="mt-4 text-xl font-extrabold text-emerald-950 dark:text-white">{incidencia.titulo}</h2>
                  <p className="mt-2 text-sm font-medium text-emerald-950/65 dark:text-white/65">{incidencia.categoria.replace('_', ' ')} · Registrada el {formatearFechaHora(incidencia.fechaRegistro)}</p>
                  <div className="mt-4 rounded-2xl border border-white/55 bg-white/45 px-4 py-3 text-sm leading-6 text-emerald-950/75 backdrop-blur-lg dark:border-white/10 dark:bg-white/5 dark:text-white/75"><span className="font-bold">Observación administrativa: </span>{incidencia.observacionesAdmin ?? 'Aún no hay observaciones administrativas.'}</div>
                </div>

                {puedeCerrar && <div className="flex shrink-0 flex-col gap-2 sm:flex-row lg:flex-col"><button type="button" disabled={enAccion} onClick={() => void procesarCierre(incidencia, 'aceptar_resolucion')} className="min-h-11 rounded-2xl bg-emerald-700 px-4 py-2.5 text-sm font-bold text-white shadow-[0_10px_22px_rgba(5,84,64,0.22)] transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60">{enAccion ? 'Guardando...' : 'Aceptar resolución'}</button><button type="button" disabled={enAccion} onClick={() => void procesarCierre(incidencia, 'archivar')} className="min-h-11 rounded-2xl border border-emerald-800/15 bg-white/65 px-4 py-2.5 text-sm font-bold text-emerald-900 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/15 dark:bg-white/10 dark:text-white dark:hover:bg-white/15">Cerrar incidencia</button></div>}
              </div>
            </article>;
          })}

          {!cargando && incidenciasFiltradas.length === 0 && <div className="rounded-3xl border border-dashed border-emerald-700/20 bg-white/35 p-10 text-center backdrop-blur-xl dark:border-white/15 dark:bg-white/5"><p className="text-lg font-bold">No hay incidencias para mostrar</p><p className="mt-2 text-sm text-emerald-950/65 dark:text-white/65">Prueba con otro filtro o código de incidencia.</p></div>}
        </div>
      </section>
    </main>
  );
}
