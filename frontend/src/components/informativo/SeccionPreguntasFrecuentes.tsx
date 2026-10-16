import { useEffect, useState } from 'react';
import { api } from '../../services/api';

interface PreguntaFrecuentePublicada {
  id: number;
  pregunta: string;
  respuesta: string;
}

export default function SeccionPreguntasFrecuentes() {
  const [preguntas, setPreguntas] = useState<PreguntaFrecuentePublicada[]>([]);
  const [abiertas, setAbiertas] = useState<Set<number>>(() => new Set());
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    let activo = true;
    api.solicitar<PreguntaFrecuentePublicada[]>(
      '/preguntas-frecuentes',
      { method: 'GET' },
      { incluirAuth: false, mensajeError: 'No se pudieron cargar las preguntas frecuentes.' },
    ).then((resultado) => {
      if (activo) setPreguntas(resultado);
    }).catch(() => {
      if (activo) setPreguntas([]);
    }).finally(() => {
      if (activo) setCargando(false);
    });
    return () => { activo = false; };
  }, []);

  const alternar = (id: number) => {
    setAbiertas((actuales) => {
      const nuevas = new Set(actuales);
      if (nuevas.has(id)) nuevas.delete(id);
      else nuevas.add(id);
      return nuevas;
    });
  };

  if (!cargando && preguntas.length === 0) return null;

  return (
    <section aria-labelledby="titulo-preguntas-frecuentes" className="bg-gradient-to-b from-white to-[#f3f8eb] px-4 py-16 sm:px-6 dark:from-[#0b241b] dark:to-[#0d3024]">
      <div className="mx-auto max-w-5xl">
        <header className="mx-auto mb-9 max-w-3xl text-center">
          <h2 id="titulo-preguntas-frecuentes" className="mt-2 text-3xl font-bold tracking-tight text-emerald-950 dark:text-white sm:text-4xl">Preguntas frecuentes</h2>
          <p className="mt-3 text-sm leading-6 text-emerald-900/70 dark:text-emerald-100/70">Aqui encontraras respuesta a las preguntas más comunes.</p>
        </header>
        {cargando ? (
          <p
            role="status"
            className="text-center text-sm text-emerald-900/70 dark:text-emerald-100/70"
          >
            Cargando preguntas…
          </p>
        ) : (
          <div className="space-y-3">
            {preguntas.map((pregunta) => {
              const abierta = abiertas.has(pregunta.id);
              const respuestaId = `respuesta-pregunta-frecuente-${pregunta.id}`;
              const botonId = `boton-pregunta-frecuente-${pregunta.id}`;

              return (
                <article
                  key={pregunta.id}
                  className="overflow-hidden rounded-2xl border border-emerald-500/20 bg-white/50 shadow-lg backdrop-blur-md transition-all duration-300 hover:border-emerald-500/40 md:rounded-3xl dark:border-white/10 dark:bg-slate-900/50"
                >
                  <h3>
                    <button
                      id={botonId}
                      type="button"
                      aria-expanded={abierta}
                      aria-controls={respuestaId}
                      onClick={() => alternar(pregunta.id)}
                      style={{ transform: 'none' }}
                      className="flex min-h-16 w-full items-center justify-between gap-4 px-5 py-4 text-left text-base font-bold text-emerald-950 outline-none transition hover:bg-emerald-50/70 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-600 dark:text-white dark:hover:bg-white/10"
                    >
                      <span>{pregunta.pregunta}</span>
                      <svg
                        className={`h-5 w-5 shrink-0 text-emerald-700 transition-transform dark:text-emerald-300 ${abierta ? 'rotate-180' : ''}`}
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        aria-hidden="true"
                      >
                        <path d="m6 9 6 6 6-6" />
                      </svg>
                    </button>
                  </h3>
                  <div
                    id={respuestaId}
                    role="region"
                    aria-labelledby={botonId}
                    hidden={!abierta}
                    className="border-t border-emerald-900/10 px-5 py-4 text-sm leading-7 text-emerald-950/80 dark:border-white/10 dark:text-emerald-100/80"
                  >
                    <p className="whitespace-pre-wrap">{pregunta.respuesta}</p>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
