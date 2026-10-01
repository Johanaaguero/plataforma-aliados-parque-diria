import { useCallback, useEffect, useMemo, useState } from 'react';
import DetalleNotificacion from './DetallesNotificacion/DetalleNotificacion';
import {
  eliminarNotificacion,
  marcarComoLeida,
  marcarTodasComoLeidas,
  obtenerMisNotificaciones,
  type Notificacion,
} from '../../services/notificacionesService';

type Filtro = 'todas' | 'no_leidas';

function tiempoRelativo(valor: string): string {
  const f = new Date(valor);
  if (Number.isNaN(f.getTime())) return '';

  const minutos = Math.floor((Date.now() - f.getTime()) / 60000);
  if (minutos < 1) return 'Ahora mismo';
  if (minutos < 60) return `Hace ${minutos} min`;

  const horas = Math.floor(minutos / 60);
  if (horas < 24) return `Hace ${horas} h`;

  const dias = Math.floor(horas / 24);
  if (dias < 7) return `Hace ${dias} ${dias === 1 ? 'día' : 'días'}`;

  return f.toLocaleDateString('es-CR', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function ListaNotificaciones() {
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<Filtro>('todas');
  const [abiertaId, setAbiertaId] = useState<number | null>(null);
  const [procesando, setProcesando] = useState(false);

  const cargar = useCallback(async (signal?: AbortSignal) => {
    try {
      setCargando(true);
      setError(null);
      const datos = await obtenerMisNotificaciones(signal);
      if (!signal?.aborted) setNotificaciones(datos);
    } catch (e) {
      if (signal?.aborted) return;
      setError(e instanceof Error ? e.message : 'No se pudieron cargar las notificaciones.');
    } finally {
      if (!signal?.aborted) setCargando(false);
    }
  }, []);

  useEffect(() => {
    const controlador = new AbortController();
    void cargar(controlador.signal);
    return () => controlador.abort();
  }, [cargar]);

  const noLeidas = useMemo(() => notificaciones.filter((n) => !n.leida).length, [notificaciones]);

  const visibles = useMemo(
    () => (filtro === 'no_leidas' ? notificaciones.filter((n) => !n.leida) : notificaciones),
    [notificaciones, filtro],
  );

  async function abrir(n: Notificacion) {
    setAbiertaId(n.id);

    if (!n.leida) {
      setNotificaciones((prev) => prev.map((x) => (x.id === n.id ? { ...x, leida: true } : x)));
      try {
        await marcarComoLeida(n.id);
      } catch {
        setNotificaciones((prev) => prev.map((x) => (x.id === n.id ? { ...x, leida: false } : x)));
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
      setError(e instanceof Error ? e.message : 'No se pudo completar la acción.');
    } finally {
      setProcesando(false);
    }
  }

  async function eliminar(id: number) {
    const anteriores = notificaciones;
    setNotificaciones((prev) => prev.filter((n) => n.id !== id));
    try {
      await eliminarNotificacion(id);
    } catch (e) {
      setNotificaciones(anteriores);
      setError(e instanceof Error ? e.message : 'No se pudo eliminar la notificación.');
    }
  }

  return (
    <section className="min-h-screen bg-[#f5f8f6] px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="font-brand text-3xl font-bold tracking-tight text-[#095540]">
              Notificaciones
            </h1>
            <p className="mt-1.5 text-sm text-slate-600">
              {noLeidas > 0
                ? `Tiene ${noLeidas} ${noLeidas === 1 ? 'notificación sin leer' : 'notificaciones sin leer'}.`
                : 'Está al día con sus notificaciones.'}
            </p>
          </div>

          <button
            type="button"
            onClick={() => void marcarTodas()}
            disabled={procesando || noLeidas === 0}
            className="rounded-xl border border-[#095540]/20 bg-white px-4 py-2.5 text-xs font-bold text-[#095540] shadow-sm transition hover:bg-[#8DC63F]/10 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Marcar todas como leídas
          </button>
        </div>

        <div
          className="mb-5 inline-flex gap-1.5 rounded-2xl border border-slate-200 bg-white p-1.5"
          role="group"
          aria-label="Filtro de notificaciones"
        >
          {(['todas', 'no_leidas'] as const).map((valor) => (
            <button
              key={valor}
              type="button"
              onClick={() => setFiltro(valor)}
              aria-pressed={filtro === valor}
              className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                filtro === valor
                  ? 'bg-[#095540] text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {valor === 'todas' ? 'Todas' : `Sin leer (${noLeidas})`}
            </button>
          ))}
        </div>

        {error && (
          <div
            className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-red-200 bg-white p-4 text-sm text-red-700"
            role="alert"
          >
            <span>{error}</span>
            <button
              type="button"
              onClick={() => void cargar()}
              className="shrink-0 font-bold text-[#009444] hover:text-[#095540]"
            >
              Reintentar
            </button>
          </div>
        )}

        {cargando && (
          <div className="space-y-3" role="status" aria-label="Cargando notificaciones">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 animate-pulse rounded-2xl bg-white shadow-sm" />
            ))}
          </div>
        )}

        {!cargando && !error && visibles.length === 0 && (
          <div className="rounded-2xl border border-slate-200 bg-white px-6 py-14 text-center shadow-sm">
            <h2 className="text-lg font-bold text-[#095540]">
              {filtro === 'no_leidas' ? 'No tiene notificaciones sin leer' : 'No tiene notificaciones'}
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              Cuando haya novedades, aparecerán aquí.
            </p>
          </div>
        )}

        {!cargando && (
          <ul className="space-y-3">
            {visibles.map((n) => (
              <li
                key={n.id}
                className={`group relative flex items-start gap-3 rounded-2xl border bg-white p-4 shadow-sm transition hover:shadow-md ${
                  n.leida ? 'border-slate-200' : 'border-[#8DC63F]/50'
                }`}
              >
                <span
                  className={`mt-2 h-2.5 w-2.5 shrink-0 rounded-full ${
                    n.leida ? 'bg-slate-200' : 'bg-[#8DC63F]'
                  }`}
                  aria-label={n.leida ? 'Leída' : 'Sin leer'}
                />

                <button
                  type="button"
                  onClick={() => void abrir(n)}
                  className="min-w-0 flex-1 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#009444] focus-visible:ring-offset-2"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className={`text-sm text-[#095540] ${n.leida ? 'font-semibold' : 'font-bold'}`}>
                      {n.titulo}
                    </p>
                    <span className="text-xs text-slate-400">{tiempoRelativo(n.createdAt)}</span>
                  </div>

                  <p className="mt-1 line-clamp-2 text-sm leading-6 text-slate-600">{n.mensaje}</p>

                  {n.referenciaTipo && (
                    <span className="mt-2 inline-block text-xs font-bold text-[#009444]">
                      Ver detalle
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => void eliminar(n.id)}
                  aria-label={`Eliminar notificación: ${n.titulo}`}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-300 transition hover:bg-red-50 hover:text-red-600"
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
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

      {abiertaId !== null && (
        <DetalleNotificacion notificacionId={abiertaId} onClose={() => setAbiertaId(null)} />
      )}
    </section>
  );
}