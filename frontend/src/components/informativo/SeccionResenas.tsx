import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { api } from '../../services/api';

interface Resena {
  id: number;
  puntuacion: number;
  comentario: string;
  nombreVisitante?: string | null;
  usuarioId?: number | null;
  fecha: string;
}

function Estrellas({
  valor,
  seleccionar,
  chica,
}: {
  valor: number;
  seleccionar?: (valor: number) => void;
  chica?: boolean;
}) {
  return (
    <div className="flex shrink-0 gap-0.5" aria-label={`${valor} de 5 estrellas`}>
      {[1, 2, 3, 4, 5].map((estrella) => (
        <button
          key={estrella}
          type="button"
          disabled={!seleccionar}
          onClick={() => seleccionar?.(estrella)}
          className={`${chica ? 'text-sm' : 'text-2xl'} leading-none ${
            estrella <= valor
              ? 'text-amber-400'
              : 'text-emerald-900/15 dark:text-white/20'
          } ${
            seleccionar
              ? 'cursor-pointer transition hover:scale-110'
              : 'cursor-default'
          }`}
          aria-label={`Calificar con ${estrella} estrellas`}
        >
          ★
        </button>
      ))}
    </div>
  );
}

export default function SeccionResenas({
  nombreUsuario,
}: {
  nombreUsuario: string | null;
}) {
  const [resenas, setResenas] = useState<Resena[]>([]);
  const [puntuacion, setPuntuacion] = useState(5);
  const [comentario, setComentario] = useState('');
  const [nombreVisitante, setNombreVisitante] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [mostrarResenas, setMostrarResenas] = useState(false);

  const cargar = () =>
    api
      .solicitar<Resena[]>(
        '/resenas',
        { method: 'GET' },
        {
          incluirAuth: false,
          mensajeError: 'No se pudieron cargar las reseñas.',
        },
      )
      .then(setResenas)
      .catch(() => setResenas([]));

  useEffect(() => {
    void cargar();
  }, []);

  const promedio = useMemo(
    () =>
      resenas.length
        ? resenas.reduce(
            (total, resena) => total + resena.puntuacion,
            0,
          ) / resenas.length
        : 0,
    [resenas],
  );

  const enviar = async (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault();
    setMensaje('');

    if (!nombreUsuario && !nombreVisitante.trim()) {
      setMensaje('Indica tu nombre completo.');
      return;
    }

    if (!comentario.trim()) {
      setMensaje('Escribe tu comentario antes de publicar.');
      return;
    }

    setEnviando(true);

    try {
      await api.solicitar<Resena>(
        '/resenas',
        {
          method: 'POST',
          body: JSON.stringify({
            puntuacion,
            comentario: comentario.trim(),
            ...(!nombreUsuario
              ? { nombreVisitante: nombreVisitante.trim() }
              : {}),
          }),
        },
        { mensajeError: 'No se pudo enviar tu opinión.' },
      );

      setComentario('');
      setNombreVisitante('');
      setPuntuacion(5);
      setMensaje('Gracias por compartir tu opinión.');

      await cargar();
    } catch (error) {
      setMensaje(
        error instanceof Error
          ? error.message
          : 'No se pudo enviar tu opinión.',
      );
    } finally {
      setEnviando(false);
    }
  };

  return (
    <section className="sigtad-public-section bg-gradient-to-b from-[#f7fbe9] to-emerald-100/50 px-4 py-12 sm:px-6 sm:py-16 dark:from-[#082a20] dark:to-[#0a3b2d]">
      <div className="mx-auto max-w-6xl">
        {/* Encabezado */}
        <div className="mb-9 text-center">
          <p className="text-xs font-bold uppercase tracking-[.22em] text-emerald-700 dark:text-emerald-300">
            Voces de la comunidad
          </p>

          <h2 className="mt-2 text-3xl font-bold tracking-tight text-emerald-950 dark:text-white">
            Reseñas y calificaciones
          </h2>
        </div>

        <div className="grid items-start gap-5 lg:grid-cols-[0.85fr_1.15fr]">
          {/* Promedio general y pestaña de reseñas */}
          <aside className="rounded-[2rem] border border-white/65 bg-white/60 p-6 shadow-[0_18px_45px_rgba(5,84,64,.12)] backdrop-blur-md dark:border-white/10 dark:bg-white/10">
            <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-200">
              Promedio general
            </p>

            <div className="mt-3 flex flex-wrap items-end gap-3">
              <strong className="text-5xl tracking-tight text-emerald-950 dark:text-white">
                {promedio.toFixed(1)}
              </strong>

              <Estrellas valor={Math.round(promedio)} />
            </div>

            <p className="mt-2 text-sm text-emerald-800/70 dark:text-emerald-100/70">
              Basado en {resenas.length}{' '}
              {resenas.length === 1 ? 'opinión' : 'opiniones'}
            </p>

            <div className="mt-6 space-y-2">
              {[5, 4, 3, 2, 1].map((valor) => {
                const cantidad = resenas.filter(
                  (resena) => resena.puntuacion === valor,
                ).length;

                return (
                  <div
                    key={valor}
                    className="flex items-center gap-2 text-xs text-emerald-900 dark:text-emerald-100"
                  >
                    <span className="w-3">{valor}</span>
                    <span className="text-amber-400">★</span>

                    <span className="h-2 flex-1 overflow-hidden rounded-full bg-emerald-900/10 dark:bg-white/10">
                      <span
                        className="block h-full rounded-full bg-emerald-500"
                        style={{
                          width: `${
                            resenas.length
                              ? (cantidad / resenas.length) * 100
                              : 0
                          }%`,
                        }}
                      />
                    </span>

                    <span className="w-4 text-right">{cantidad}</span>
                  </div>
                );
              })}
            </div>

            {/* Botón para desplegar todas las reseñas */}
            <button
              type="button"
              onClick={() => setMostrarResenas((anterior) => !anterior)}
              aria-expanded={mostrarResenas}
              className="mt-6 flex w-full items-center justify-between gap-3 rounded-xl border border-emerald-700/15 bg-emerald-50/80 px-4 py-3 text-left transition hover:bg-emerald-100 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
            >
              <span className="flex min-w-0 items-center gap-2.5">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-emerald-700/10 text-emerald-800 dark:bg-emerald-400/10 dark:text-emerald-300">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    className="size-5"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M7 8h10M7 12h7m-9 8 3.5-3H18a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v12a2 2 0 0 0 1 1.73V20Z"
                    />
                  </svg>
                </span>

                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-emerald-950 dark:text-white">
                    {mostrarResenas ? 'Ocultar reseñas' : 'Ver todas las reseñas'}
                  </span>
                  <span className="mt-0.5 block text-xs text-emerald-800/70 dark:text-emerald-100/60">
                    {resenas.length}{' '}
                    {resenas.length === 1 ? 'opinión publicada' : 'opiniones publicadas'}
                  </span>
                </span>
              </span>

              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className={`size-5 shrink-0 text-emerald-800 transition-transform dark:text-emerald-200 ${
                  mostrarResenas ? 'rotate-180' : ''
                }`}
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="m6 9 6 6 6-6"
                />
              </svg>
            </button>

            {/* Lista que aparece solamente al pulsar el botón */}
            {mostrarResenas && (
              <div className="mt-3 overflow-hidden rounded-xl border border-emerald-900/10 bg-white/60 dark:border-white/10 dark:bg-slate-950/20">
                <ul className="max-h-72 divide-y divide-emerald-900/10 overflow-y-auto dark:divide-white/10">
                  {resenas.length === 0 ? (
                    <li className="px-4 py-5 text-center text-sm text-slate-500 dark:text-slate-400">
                      Aún no hay reseñas publicadas.
                    </li>
                  ) : (
                    resenas.map((resena) => (
                      <li key={resena.id} className="px-4 py-3">
                        <div className="flex items-center justify-between gap-2">
                          <p className="min-w-0 truncate text-xs font-semibold text-emerald-800 dark:text-emerald-300">
                            {resena.nombreVisitante ||
                              (resena.usuarioId
                                ? 'Usuario verificado'
                                : 'Visitante')}
                          </p>

                          <Estrellas valor={resena.puntuacion} chica />
                        </div>

                      <p className="mt-1.5 max-h-10 overflow-y-auto pr-2 text-sm leading-5 text-slate-700 [overflow-wrap:anywhere] [scrollbar-width:thin] dark:text-slate-300">
  {resena.comentario}
</p>
                      </li>
                    ))
                  )}
                </ul>

                {resenas.length > 0 && (
                  <p className="border-t border-emerald-900/10 px-4 py-2 text-right text-xs text-slate-500 dark:border-white/10 dark:text-slate-400">
                    Desplázate para consultar todas las opiniones
                  </p>
                )}
              </div>
            )}
          </aside>

          {/* Formulario para publicar una reseña */}
          <form
            onSubmit={(evento) => void enviar(evento)}
            className="rounded-[2rem] border border-white/65 bg-white/60 p-6 shadow-[0_18px_45px_rgba(5,84,64,.12)] backdrop-blur-md dark:border-white/10 dark:bg-white/10"
          >
            <h3 className="text-lg font-bold text-emerald-950 dark:text-white">
              Comparte tu experiencia
            </h3>

            <div className="mt-4">
              <p className="mb-2 text-sm font-medium text-emerald-900 dark:text-emerald-100">
                Tu calificación
              </p>

              <Estrellas
                valor={puntuacion}
                seleccionar={setPuntuacion}
              />
            </div>

            {nombreUsuario ? (
              <p className="mt-4 rounded-2xl bg-emerald-100/70 px-4 py-3 text-sm text-emerald-900 dark:bg-white/10 dark:text-emerald-100">
                Publicarás como <strong>{nombreUsuario}</strong>
              </p>
            ) : (
              <label className="mt-4 block text-sm font-medium text-emerald-900 dark:text-emerald-100">
                Nombre completo
                <input
                  required
                  value={nombreVisitante}
                  onChange={(evento) =>
                    setNombreVisitante(evento.target.value)
                  }
                  className="mt-2 w-full rounded-2xl border border-emerald-900/10 bg-white/70 px-4 py-3 outline-none backdrop-blur-md focus:ring-2 focus:ring-emerald-500 dark:bg-white/10"
                />
              </label>
            )}

            <label className="mt-4 block text-sm font-medium text-emerald-900 dark:text-emerald-100">
              Comentario
              <textarea
                required
                value={comentario}
                onChange={(evento) => setComentario(evento.target.value)}
                rows={3}
                className="mt-2 w-full resize-none rounded-2xl border border-emerald-900/10 bg-white/70 px-4 py-3 outline-none backdrop-blur-md focus:ring-2 focus:ring-emerald-500 dark:bg-white/10"
              />
            </label>

            <button
              type="submit"
              disabled={enviando}
              className="mt-4 rounded-full bg-emerald-700 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-900/20 transition hover:bg-emerald-800 disabled:opacity-60"
            >
              {enviando ? 'Publicando…' : 'Publicar opinión'}
            </button>

            {mensaje && (
              <p
                role="status"
                aria-live="polite"
                className="mt-3 text-sm text-emerald-800 dark:text-emerald-100"
              >
                {mensaje}
              </p>
            )}
          </form>
        </div>
      </div>
    </section>
  );
}
