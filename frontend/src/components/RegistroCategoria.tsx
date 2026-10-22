import { useState } from 'react';
import { crearCategoria } from '../services/categoriaEmprendimientoService';
import { mostrarFeedback } from './ui/FeedbackToast';

interface Props {
  onCategoriaCreada?: () => void;
  onCerrar?: () => void;
}

function RegistroCategoria({
  onCategoriaCreada,
  onCerrar,
}: Props) {
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, setExito] = useState(false);

  async function handleSubmit(
    e: React.FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();

    setError(null);
    setExito(false);
    setEnviando(true);

    try {
      await crearCategoria({
        nombre,
        descripcion: descripcion || undefined,
      });

      setExito(true);
      mostrarFeedback('categoria', 'La categoría ya está disponible para asignarla a emprendimientos.');
      setNombre('');
      setDescripcion('');

      onCategoriaCreada?.();
    } catch (err: any) {
      setError(
        err?.message ||
          'Ocurrió un error al crear la categoría.'
      );
    } finally {
      setEnviando(false);
    }
  }

  const inputClase =
    'w-full rounded-2xl border border-[#095540]/15 bg-white/60 px-4 py-3 text-stone-800 shadow-[inset_0_1px_2px_rgba(9,85,64,0.05)] backdrop-blur-sm placeholder:text-stone-400 outline-none motion-safe:transition-[border-color,background-color,box-shadow] motion-safe:duration-200 hover:border-[#009444]/50 hover:bg-white/80 focus-visible:border-[#009444] focus-visible:bg-white focus-visible:ring-4 focus-visible:ring-[#009444]/15 disabled:cursor-not-allowed disabled:bg-stone-100 disabled:text-stone-500';

  const labelClase =
    'flex flex-col gap-2 text-sm font-semibold text-[#095540] dark:text-emerald-100';

  return (
    <div className="relative mx-auto w-full max-w-xl rounded-[2rem] border border-white/50 bg-white/40 shadow-[inset_0_1px_0_rgba(255,255,255,0.85),0_24px_60px_rgba(9,85,64,0.12)] backdrop-blur-2xl dark:border-white/10 dark:bg-slate-900/60">

      {/* Resplandores de fondo para dar profundidad al vidrio */}
      <div
        className="pointer-events-none absolute inset-0 overflow-hidden rounded-[2rem]"
        aria-hidden="true"
      >
        <div className="absolute -right-14 -top-16 h-56 w-56 rounded-full bg-[#8DC63F]/25 blur-3xl" />
        <div className="absolute -bottom-20 -left-14 h-64 w-64 rounded-full bg-[#009444]/15 blur-3xl" />
      </div>

      <div className="relative p-4 sm:p-6">

        {/* =====================================================
            BOTÓN CERRAR
        ===================================================== */}

        {onCerrar && (
          <button
            type="button"
            onClick={onCerrar}
            aria-label="Cerrar formulario"
            title="Cerrar"
            className="absolute right-7 top-7 z-10 flex h-10 w-10 items-center justify-center rounded-full border border-white/70 bg-white/60 text-[#095540] shadow-sm backdrop-blur-md motion-safe:transition-all motion-safe:duration-200 hover:bg-white/90 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#009444] focus-visible:ring-offset-2 sm:right-9 sm:top-9"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
        )}

        {/* =====================================================
            ENCABEZADO
        ===================================================== */}

        <div className="relative mb-5 overflow-hidden rounded-3xl border border-white/70 bg-gradient-to-br from-white/75 via-[#eef6e8]/60 to-white/40 px-6 py-7 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_8px_28px_rgba(9,85,64,0.08)] backdrop-blur-xl dark:border-white/10 dark:from-white/10 dark:via-white/5 dark:to-transparent sm:px-8">
          <div
            className="pointer-events-none absolute -right-10 -top-14 h-40 w-40 rounded-full bg-[#d9d823]/20 blur-3xl"
            aria-hidden="true"
          />

          <div className="relative pr-12">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#8DC63F]/40 bg-[#8DC63F]/15 px-3 py-1.5 text-xs font-bold text-[#095540] backdrop-blur-sm dark:text-emerald-100">
              <span className="h-2 w-2 rounded-full bg-[#d9d823]" />
              Administración
            </div>

            <h2 className="font-brand text-2xl font-bold tracking-tight text-[#095540] dark:text-emerald-100 sm:text-3xl">
              Registrar categoría
            </h2>

            <p className="mt-2 max-w-lg text-sm leading-6 text-slate-600 dark:text-slate-300">
              Creá una nueva categoría para organizar los
              emprendimientos de la comunidad.
            </p>
          </div>
        </div>

        {/* =====================================================
            FORMULARIO
        ===================================================== */}

        <form
          onSubmit={handleSubmit}
          className="relative flex flex-col gap-5"
        >
          <div className="space-y-5 rounded-3xl border border-white/60 bg-white/45 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_10px_32px_rgba(9,85,64,0.08)] backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.04] sm:p-6">

            {/* NOMBRE */}

            <label className={labelClase}>
              Nombre

              <input
                value={nombre}
                onChange={(e) =>
                  setNombre(e.target.value)
                }
                required
                maxLength={100}
                placeholder="Ej. Gastronomía"
                className={inputClase}
              />

              <span className="flex items-center justify-between text-xs font-normal text-stone-500">
                <span>Máximo 100 caracteres.</span>
                <span className="text-stone-400">
                  {nombre.length}/100
                </span>
              </span>
            </label>

            {/* DESCRIPCIÓN */}

            <label className={labelClase}>
              <span>
                Descripción{' '}
                <span className="font-normal text-stone-400">
                  (opcional)
                </span>
              </span>

              <textarea
                value={descripcion}
                onChange={(e) =>
                  setDescripcion(e.target.value)
                }
                rows={4}
                placeholder="Describí brevemente esta categoría..."
                className={`${inputClase} resize-none`}
              />
            </label>
          </div>

          {/* ERROR */}

          {error && (
            <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50/80 px-4 py-3 text-sm text-red-700 backdrop-blur-md" role="alert">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="mt-0.5 h-5 w-5 shrink-0"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden="true"
              >
                <circle
                  cx="12"
                  cy="12"
                  r="9"
                />
                <line
                  x1="12"
                  y1="8"
                  x2="12"
                  y2="12"
                />
                <line
                  x1="12"
                  y1="16"
                  x2="12.01"
                  y2="16"
                />
              </svg>

              <span>{error}</span>
            </div>
          )}

          {/* =================================================
              BOTONES
          ================================================= */}

          <div className="flex flex-col-reverse gap-3 border-t border-white/60 pt-5 sm:flex-row sm:justify-end">

            {onCerrar && (
              <button
                type="button"
                onClick={onCerrar}
                disabled={enviando}
                className="rounded-2xl border border-white/70 bg-white/60 px-6 py-3 font-semibold text-[#095540] shadow-sm backdrop-blur-md motion-safe:transition-colors motion-safe:duration-200 hover:bg-white/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#009444] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancelar
              </button>
            )}

            <button
              type="submit"
              disabled={enviando}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#095540] px-6 py-3 font-semibold text-white shadow-lg shadow-[#095540]/25 motion-safe:transition-all motion-safe:duration-200 motion-safe:hover:-translate-y-0.5 hover:bg-[#009444] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8dc63f] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 motion-reduce:transform-none"
            >
              {enviando ? (
                <>
                  <svg
                    className="h-5 w-5 motion-safe:animate-spin motion-reduce:animate-none"
                    viewBox="0 0 24 24"
                    fill="none"
                    aria-hidden="true"
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
                      className="opacity-75"
                      d="M21 12a9 9 0 0 1-9 9"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeLinecap="round"
                    />
                  </svg>

                  Guardando...
                </>
              ) : (
                <>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    aria-hidden="true"
                  >
                    <path
                      d="M12 5v14"
                      strokeLinecap="round"
                    />

                    <path
                      d="M5 12h14"
                      strokeLinecap="round"
                    />
                  </svg>

                  Crear categoría
                </>
              )}
            </button>

          </div>

        </form>
      </div>
    </div>
  );
}

export default RegistroCategoria;