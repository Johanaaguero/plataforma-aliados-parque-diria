// Mostrar todas las notificaciones del usuario

import { useCallback, useEffect, useMemo, useState } from 'react';

import DetalleNotificacion from './DetalleNotificacion';

import {
  eliminarTodasLasNotificaciones,
  eliminarNotificacion,
  marcarComoLeida,
  marcarTodasComoLeidas,
  obtenerMisNotificaciones,
  obtenerNotificacionesIncidencias,
  type Notificacion,
} from '../../services/notificacionesService';

type Filtro =
  | 'todas'
  | 'no_leidas'
  | 'incidencias'
  | 'eventos'
  | 'reservas'
  | 'emprendimientos'
  | 'comunicados';

const filtros: { id: Filtro; etiqueta: string }[] = [
  { id: 'todas', etiqueta: 'Todas' },
  { id: 'no_leidas', etiqueta: 'No leídas' },
  { id: 'incidencias', etiqueta: 'Incidencias' },
  { id: 'eventos', etiqueta: 'Eventos y capacitaciones' },
  { id: 'reservas', etiqueta: 'Reservas' },
  { id: 'emprendimientos', etiqueta: 'Emprendimientos' },
  { id: 'comunicados', etiqueta: 'Comunicados' },
];

function categoriaNotificacion(
  tipo: string,
): Exclude<Filtro, 'todas' | 'no_leidas'> | null {
  if (
    tipo === 'nueva_incidencia' ||
    tipo === 'seguimiento_incidencia' ||
    tipo === 'incidencia_compartida'
  ) return 'incidencias';

  if (tipo === 'nuevo_evento' || tipo === 'nueva_capacitacion') return 'eventos';

  if (
    tipo === 'reserva_realizada' ||
    tipo === 'nueva_reserva_admin' ||
    tipo === 'reserva_aprobada' ||
    tipo === 'reserva_rechazada'
  ) return 'reservas';

  if (tipo === 'nuevo_emprendimiento') return 'emprendimientos';
  if (tipo === 'nuevo_comunicado') return 'comunicados';
  return null;
}

function IconoTipoNotificacion({ tipo }: { tipo: string }) {
  const categoria = categoriaNotificacion(tipo);
  const rutas: Record<string, string> = {
    incidencias: 'M12 3 2.8 20h18.4L12 3ZM12 9v5m0 3h.01',
    eventos: 'M4 6h16v14H4zM8 3v6m8-6v6M4 10h16',
    reservas: 'M5 4h14v16H5zM8 8h8M8 12h8M8 16h5',
    emprendimientos: 'M4 20h16M6 20V9l6-5 6 5v11M9 20v-5h6v5',
    comunicados: 'M4 11v2h3l5 4V7L7 11H4Zm11-2c1.2 1 1.2 5 0 6',
    general: 'M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4',
  };

  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={rutas[categoria ?? 'general']} />
    </svg>
  );
}

interface ListaNotificacionesProps {
  /** true si quien ve la lista es administrador */
  esAdministrador: boolean;
}

function tiempoRelativo(valor: string): string {
  const f = new Date(valor);

  if (Number.isNaN(f.getTime())) {
    return '';
  }

  const diferencia = Date.now() - f.getTime();
  if (diferencia < 0) return 'Próximamente';

  const minutos = Math.floor(diferencia / 60000);

  if (minutos < 1) return 'Ahora mismo';
  if (minutos < 60) return `Hace ${minutos} min`;

  const horas = Math.floor(minutos / 60);
  if (horas < 24) return `Hace ${horas} h`;

  const dias = Math.floor(horas / 24);
  if (dias < 7) return `Hace ${dias} ${dias === 1 ? 'día' : 'días'}`;

  return f.toLocaleDateString('es-CR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export default function ListaNotificaciones({
  esAdministrador,
}: ListaNotificacionesProps) {
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exito, setExito] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<Filtro>('todas');
  const [abiertaId, setAbiertaId] = useState<number | null>(null);
  const [notificacionPendienteEliminar, setNotificacionPendienteEliminar] =
    useState<number | null>(null);
  const [confirmacionVaciadoAbierta, setConfirmacionVaciadoAbierta] =
    useState(false);

  // Notificación seleccionada para mostrar el detalle
  const [notificacionAbierta, setNotificacionAbierta] =
    useState<Notificacion | null>(null);

  const [procesando, setProcesando] = useState(false);

  const cargar = useCallback(async (signal?: AbortSignal) => {
    try {
      setCargando(true);
      setError(null);

      const [datos, incidencias] = await Promise.all([
        obtenerMisNotificaciones(signal),
        // Si falla, la lista se muestra igual, solo sin códigos.
        obtenerNotificacionesIncidencias(signal).catch(() => null),
      ]);

      // id de notificación -> código de la incidencia
      const codigos = new Map(
        (incidencias?.notificaciones ?? []).map((n) => [
          n.id,
          n.referenciaCodigo ?? null,
        ]),
      );

      if (!signal?.aborted) {
        setNotificaciones(
          datos.map((n) => ({
            ...n,
            referenciaCodigo:
              n.referenciaCodigo ?? codigos.get(n.id) ?? null,
          })),
        );
      }
    } catch (e) {
      if (signal?.aborted) return;

      setError(
        e instanceof Error
          ? e.message
          : 'No se pudieron cargar las notificaciones.',
      );
    } finally {
      if (!signal?.aborted) {
        setCargando(false);
      }
    }
  }, []);

  useEffect(() => {
    const controlador = new AbortController();

    void cargar(controlador.signal);

    return () => {
      controlador.abort();
    };
  }, [cargar]);

  const noLeidas = useMemo(
    () => notificaciones.filter((n) => !n.leida).length,
    [notificaciones],
  );

  const visibles = useMemo(
    () => notificaciones.filter((n) => {
      if (filtro === 'no_leidas') return !n.leida;
      if (filtro === 'todas') return true;
      return categoriaNotificacion(n.tipo) === filtro;
    }),
    [notificaciones, filtro],
  );

  const cantidadPorFiltro = useMemo(() => {
    const conteos: Record<Filtro, number> = {
      todas: notificaciones.length,
      no_leidas: noLeidas,
      incidencias: 0,
      eventos: 0,
      reservas: 0,
      emprendimientos: 0,
      comunicados: 0,
    };

    notificaciones.forEach((notificacion) => {
      const categoria = categoriaNotificacion(notificacion.tipo);
      if (categoria) conteos[categoria] += 1;
    });

    return conteos;
  }, [notificaciones, noLeidas]);

  const cerrarDetalle = () => {
    setAbiertaId(null);
    setNotificacionAbierta(null);
  };

  async function abrir(n: Notificacion) {
    setAbiertaId(n.id);
    setNotificacionAbierta(n);

    if (!n.leida) {
      // Actualización optimista
      setNotificaciones((prev) =>
        prev.map((x) => (x.id === n.id ? { ...x, leida: true } : x)),
      );

      try {
        await marcarComoLeida(n.id);
      } catch {
        // Si falla, devolverla a estado no leído
        setNotificaciones((prev) =>
          prev.map((x) => (x.id === n.id ? { ...x, leida: false } : x)),
        );
      }
    }
  }

  async function marcarTodas() {
    if (procesando || noLeidas === 0) return;

    setProcesando(true);

    try {
      await marcarTodasComoLeidas();

      setNotificaciones((prev) => prev.map((n) => ({ ...n, leida: true })));
    } catch (e) {
      setError(
        e instanceof Error ? e.message : 'No se pudo completar la acción.',
      );
    } finally {
      setProcesando(false);
    }
  }

  function abrirConfirmacionEliminacion(id: number) {
    setNotificacionPendienteEliminar(id);
  }

  function cancelarEliminacion() {
    setNotificacionPendienteEliminar(null);
  }

  async function confirmarEliminacion() {
    const id = notificacionPendienteEliminar;

    if (id === null) return;

    setNotificacionPendienteEliminar(null);

    const anteriores = [...notificaciones];

    setExito(null);
    setNotificaciones((prev) => prev.filter((n) => n.id !== id));

    try {
      await eliminarNotificacion(id);

      setExito('Notificación eliminada correctamente');

      // Si se elimina la notificación abierta, también se cierra el detalle.
      if (abiertaId === id) {
        cerrarDetalle();
      }
    } catch (e) {
      setNotificaciones(anteriores);
      setExito(null);

      setError(
        e instanceof Error
          ? e.message
          : 'No se pudo eliminar la notificación.',
      );
    }
  }

  function abrirConfirmacionVaciado() {
    if (procesando || notificaciones.length === 0) return;
    setConfirmacionVaciadoAbierta(true);
  }

  async function vaciarNotificaciones() {
    if (procesando || notificaciones.length === 0) return;

    setConfirmacionVaciadoAbierta(false);

    const anteriores = [...notificaciones];
    setProcesando(true);
    setError(null);
    setExito(null);
    setNotificaciones([]);
    cerrarDetalle();

    try {
      const resultado = await eliminarTodasLasNotificaciones();
      setExito(
        resultado.cantidad > 0
          ? `${resultado.cantidad} notificaciones eliminadas correctamente.`
          : 'No había notificaciones para eliminar.',
      );
    } catch (e) {
      setNotificaciones(anteriores);
      setError(
        e instanceof Error
          ? e.message
          : 'No se pudieron eliminar las notificaciones.',
      );
    } finally {
      setProcesando(false);
    }
  }

  return (
    <section className="sigtad-notificaciones min-h-screen bg-gradient-to-b from-[#f5f8f6] via-[#f5f8f6] to-[#eaf2ed] px-4 py-12 text-[#17372c] transition-colors dark:from-[#071c14] dark:via-[#0b241b] dark:to-[#0d2b20] dark:text-[#edf8f1] sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-none">
        <header className="mb-7 flex flex-col gap-5 rounded-[1.75rem] border border-white/70 bg-white/75 p-5 shadow-[0_16px_45px_rgba(7,63,49,0.08)] backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.05] sm:flex-row sm:items-center sm:justify-between sm:p-7">
          <div>
            <p className="mb-1 text-xs font-bold uppercase tracking-[0.18em] text-[#009444] dark:text-[#a9d779]">
              Centro de actividad
            </p>
            <h1 className="font-brand text-3xl font-bold tracking-tight text-[#095540] dark:text-[#e7f5ed]">
              Notificaciones
            </h1>

            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              {noLeidas > 0
                ? `Tiene ${noLeidas} ${
                    noLeidas === 1
                      ? 'notificación sin leer'
                      : 'notificaciones sin leer'
                  }.`
                : 'Está al día con sus notificaciones.'}
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <button
            type="button"
            onClick={() => void marcarTodas()}
            disabled={procesando || noLeidas === 0}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#095540]/20 bg-white px-4 py-3 text-xs font-bold text-[#095540] shadow-sm transition hover:border-[#8DC63F]/60 hover:bg-[#8DC63F]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#009444] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/15 dark:bg-white/[0.07] dark:text-[#d9f1df] dark:hover:bg-white/10 dark:focus-visible:ring-offset-[#0b241b]"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="m5 12 4 4L19 6" />
            </svg>
            {procesando ? 'Actualizando…' : 'Marcar todas como leídas'}
          </button>
          <button
            type="button"
            onClick={abrirConfirmacionVaciado}
            disabled={procesando || notificaciones.length === 0}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-rose-500/25 bg-rose-50/80 px-4 py-3 text-xs font-bold text-rose-700 shadow-sm transition hover:bg-rose-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-rose-400/25 dark:bg-rose-500/10 dark:text-rose-200 dark:hover:bg-rose-500/20 dark:focus-visible:ring-offset-[#0b241b]"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M3 6h18M8 6V4h8v2m-7 4v7m4-7v7M6 6l1 15h10l1-15" />
            </svg>
            {procesando ? 'Actualizando…' : 'Vaciar notificaciones'}
          </button>
          </div>
        </header>

        <div
          className="mb-6 flex w-full gap-1.5 overflow-x-auto rounded-2xl border border-slate-200/80 bg-white/80 p-1.5 shadow-sm backdrop-blur-md dark:border-white/10 dark:bg-white/[0.05]"
          role="group"
          aria-label="Filtro de notificaciones"
        >
          {filtros.map(({ id, etiqueta }) => (
            <button
              key={id}
              type="button"
              onClick={() => setFiltro(id)}
              aria-pressed={filtro === id}
              className={`shrink-0 rounded-xl px-3.5 py-2.5 text-xs font-bold transition sm:text-sm ${
                filtro === id
                  ? 'bg-[#095540] text-white shadow-sm dark:bg-[#8DC63F] dark:text-[#09281f]'
                  : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-white/[0.07] dark:hover:text-white'
              }`}
            >
              {etiqueta}
              <span className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] ${filtro === id ? 'bg-white/15 dark:bg-black/10' : 'bg-slate-100 dark:bg-white/10'}`}>
                {cantidadPorFiltro[id]}
              </span>
            </button>
          ))}
        </div>

        {exito && (
          <div
            className="mb-4 rounded-xl border border-green-200 bg-white p-4 text-sm text-green-700"
            role="status"
          >
            {exito}
          </div>
        )}

        {error && (
          <div
            className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-red-200 bg-white p-4 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200"
            role="alert"
          >
            <span>{error}</span>

            <button
              type="button"
              onClick={() => void cargar()}
              className="shrink-0 font-bold text-[#009444] hover:text-[#095540] dark:text-[#a9d779] dark:hover:text-white"
            >
              Reintentar
            </button>
          </div>
        )}

        {cargando && (
          <div
            className="space-y-3"
            role="status"
            aria-label="Cargando notificaciones"
          >
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-28 animate-pulse rounded-2xl border border-white/60 bg-white/70 shadow-sm dark:border-white/10 dark:bg-white/[0.06]"
              />
            ))}
          </div>
        )}

        {!cargando && !error && visibles.length === 0 && (
          <div className="rounded-[1.75rem] border border-slate-200/80 bg-white/75 px-6 py-14 text-center shadow-sm backdrop-blur-md dark:border-white/10 dark:bg-white/[0.04]">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#eaf5df] text-[#095540] dark:bg-[#8DC63F]/15 dark:text-[#b8e68c]">
              <IconoTipoNotificacion tipo="general" />
            </span>
            <h2 className="mt-4 text-lg font-bold text-[#095540] dark:text-[#e7f5ed]">
              {filtro === 'no_leidas'
                ? 'No tiene notificaciones sin leer'
                : filtro === 'todas'
                  ? 'No tiene notificaciones'
                  : `No hay notificaciones de ${filtros.find((opcion) => opcion.id === filtro)?.etiqueta.toLowerCase()}`}
            </h2>

            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              {filtro === 'todas'
                ? 'Cuando haya novedades, aparecerán aquí.'
                : 'Pruebe otra categoría o consulte todas las notificaciones.'}
            </p>
          </div>
        )}

        {!cargando && (
          <ul className="w-full space-y-3">
            {visibles.map((n) => (
              <li
                key={n.id}
               
className={`group relative flex items-start gap-3 overflow-hidden rounded-2xl border p-4 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-lg sm:gap-4 sm:p-5 ${
  n.tipo === 'incidencia_compartida'
    ? 'border-red-400 bg-red-50 shadow-[0_10px_30px_rgba(220,38,38,.15)] dark:border-red-500/50 dark:bg-red-950/30'
    : n.leida
      ? 'border-slate-200/80 bg-white/75 hover:border-slate-300 dark:border-white/10 dark:bg-white/[0.045] dark:hover:border-white/20'
      : 'border-[#8DC63F]/55 bg-white shadow-[0_10px_30px_rgba(141,198,63,.10)] hover:border-[#8DC63F] dark:border-[#8DC63F]/35 dark:bg-[#102f24]/80 dark:shadow-[0_10px_30px_rgba(0,0,0,.12)]'
}`}

              >
                {!n.leida && (
                  <span className="absolute inset-y-0 left-0 w-1 bg-[#8DC63F]" aria-hidden="true" />
                )}

                <span className={`mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                  n.leida
                    ? 'bg-slate-100 text-slate-500 dark:bg-white/[0.07] dark:text-slate-300'
                    : 'bg-[#eaf5df] text-[#095540] dark:bg-[#8DC63F]/15 dark:text-[#c8ee8d]'
                }`} aria-label={categoriaNotificacion(n.tipo) ?? 'Notificación'}>
                  <IconoTipoNotificacion tipo={n.tipo} />
                </span>

                <button
                  type="button"
                  onClick={() => void abrir(n)}
                  className="min-w-0 flex-1 rounded-lg text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#009444] focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#102f24]"
                >
                  <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
                    <div className="flex min-w-0 flex-wrap items-center gap-2">
                      <p className={`text-sm text-[#095540] dark:text-[#e7f5ed] ${n.leida ? 'font-semibold' : 'font-extrabold'}`}>
                        {n.titulo}
                      </p>
                      {!n.leida && (
                        <span className="rounded-full bg-[#8DC63F]/20 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-[#095540] dark:bg-[#8DC63F]/15 dark:text-[#c8ee8d]">
                          Nueva
                          
                        </span>
                        
                        
                      )}
                      
{n.tipo === 'incidencia_compartida' && (
  <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-red-800 dark:bg-red-500/20 dark:text-red-200">
    ¡Gran importancia!
  </span>
)}

                    </div>

                    <time
                      dateTime={n.createdAt}
                      title={fechaCompleta(n.createdAt)}
                      className="shrink-0 text-xs font-medium text-slate-500 dark:text-slate-400"
                    >
                      {tiempoRelativo(n.createdAt)}
                    </time>
                  </div>

                  <p className={`mt-1.5 line-clamp-2 text-sm leading-6 ${n.leida ? 'text-slate-600 dark:text-slate-300' : 'text-slate-700 dark:text-slate-200'}`}>
                    {n.mensaje}
                  </p>

                  {n.referenciaTipo && (
                    <span className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-[#009444] dark:text-[#a9d779]">
                      Ver detalle
                      <svg viewBox="0 0 20 20" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                        <path d="m7 4 6 6-6 6" />
                      </svg>
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => abrirConfirmacionEliminacion(n.id)}
                  aria-label={`Eliminar notificación: ${n.titulo}`}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-400 transition hover:bg-red-50 hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 dark:text-slate-500 dark:hover:bg-red-950/40 dark:hover:text-red-300"
                >
                  <svg
                    className="h-4 w-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    aria-hidden="true"
                  >
                    <path
                      d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {abiertaId !== null && notificacionAbierta && (
        <DetalleNotificacion
          notificacionId={abiertaId}
          notificacion={notificacionAbierta}
          esAdministrador={esAdministrador}
          onClose={cerrarDetalle}
        />
      )}

      {confirmacionVaciadoAbierta && (
        <div
          className="fixed inset-0 z-[10000] flex items-center justify-center bg-emerald-950/55 p-4 backdrop-blur-md"
          role="presentation"
          onMouseDown={(evento) => {
            if (evento.target === evento.currentTarget && !procesando) {
              setConfirmacionVaciadoAbierta(false);
            }
          }}
        >
          <div
            className="w-full max-w-md rounded-3xl border border-white/60 bg-white/80 p-6 shadow-[0_24px_70px_rgba(5,84,64,.28)] backdrop-blur-2xl dark:border-white/10 dark:bg-slate-950/85 sm:p-7"
            role="dialog"
            aria-modal="true"
            aria-labelledby="titulo-confirmar-vaciado"
            aria-describedby="mensaje-confirmar-vaciado"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-rose-500/20 bg-rose-500/10 text-rose-600 dark:text-rose-300">
              <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>

            <h2 id="titulo-confirmar-vaciado" className="mt-5 text-xl font-bold tracking-tight text-[#095540] dark:text-white">
              Vaciar notificaciones
            </h2>
            <p id="mensaje-confirmar-vaciado" className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
              Se eliminarán todas las notificaciones de tu lista. Esta acción no se puede deshacer.
            </p>

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                autoFocus
                onClick={() => setConfirmacionVaciadoAbierta(false)}
                disabled={procesando}
                className="rounded-2xl border border-[#095540]/20 bg-white/70 px-4 py-2.5 text-sm font-bold text-[#095540] transition hover:bg-white disabled:opacity-50 dark:border-white/15 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => void vaciarNotificaciones()}
                disabled={procesando}
                className="rounded-2xl bg-rose-600 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-rose-900/20 transition hover:bg-rose-700 disabled:opacity-50"
              >
                {procesando ? 'Eliminando…' : 'Eliminar todas'}
              </button>
            </div>
          </div>
        </div>
      )}

      {notificacionPendienteEliminar !== null && (
        <div
          className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
          role="presentation"
          onMouseDown={(evento) => {
            if (evento.target === evento.currentTarget) {
              cancelarEliminacion();
            }
          }}
          onKeyDown={(evento) => {
            if (evento.key === 'Escape') {
              cancelarEliminacion();
            }
          }}
        >
          <div
            className="w-full max-w-md rounded-3xl border border-slate-100 bg-white p-6 shadow-2xl sm:p-7"
            role="dialog"
            aria-modal="true"
            aria-labelledby="titulo-confirmar-eliminacion"
            aria-describedby="mensaje-confirmar-eliminacion"
          >
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-red-600">
              <svg
                className="h-6 w-6"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                aria-hidden="true"
              >
                <path
                  d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>

            <h2
              id="titulo-confirmar-eliminacion"
              className="text-xl font-bold tracking-tight text-[#095540]"
            >
              Eliminar notificación
            </h2>

            <p
              id="mensaje-confirmar-eliminacion"
              className="mt-2 text-sm leading-relaxed text-slate-600"
            >
              ¿Estás seguro de que deseas eliminar esta notificación?
            </p>

            <p className="mt-1 text-xs text-slate-500">
              Esta acción quitará la notificación de tu lista.
            </p>

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                autoFocus
                onClick={cancelarEliminacion}
                className="rounded-2xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8DC63F] focus-visible:ring-offset-2"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={() => void confirmarEliminacion()}
                className="rounded-2xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function fechaCompleta(valor: string): string {
  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) return '';

  return fecha.toLocaleString('es-CR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}
