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
      mostrarFeedback('registro', 'Categoría creada correctamente.');
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
    'w-full rounded-2xl border border-stone-200 bg-[#fffef9] px-4 py-3 text-stone-800 placeholder:text-stone-400 outline-none motion-safe:transition-[border-color,background-color,box-shadow] motion-safe:duration-200 focus-visible:border-emerald-700 focus-visible:bg-white focus-visible:ring-4 focus-visible:ring-emerald-100 disabled:cursor-not-allowed disabled:bg-stone-100 disabled:text-stone-500';

  const labelClase =
    'flex flex-col gap-2 text-sm font-semibold text-stone-700';

  return (
    <div className="relative mx-auto w-full max-w-xl overflow-hidden rounded-[2rem] border border-white/20 bg-white/70 shadow-xl shadow-black/5 backdrop-blur-lg dark:border-white/10 dark:bg-slate-900/70 dark:shadow-black/20">

      {/* =====================================================
          BOTÓN CERRAR
      ===================================================== */}

      {onCerrar && (
        <button
          type="button"
          onClick={onCerrar}
          aria-label="Cerrar formulario"
          title="Cerrar"
          className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full border border-white/30 bg-white/90 text-emerald-950 shadow-sm backdrop-blur-sm motion-safe:transition-all motion-safe:duration-200 motion-safe:hover:scale-105 hover:bg-white hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8dc63f] focus-visible:ring-offset-2 focus-visible:ring-offset-emerald-900 motion-reduce:transform-none sm:right-5 sm:top-5"
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
          >
            <path d="M18 6 6 18" />
            <path d="m6 6 12 12" />
          </svg>
        </button>
      )}

      {/* =====================================================
          ENCABEZADO
      ===================================================== */}

      <div className="relative overflow-hidden bg-gradient-to-br from-emerald-950 via-emerald-900 to-green-800 px-6 py-8 text-white sm:px-10">
        <div className="pointer-events-none absolute -right-12 -top-14 h-40 w-40 rounded-full bg-[#d9d823]/15 blur-3xl" aria-hidden="true" />
        <div className="pr-10">
          <div className="relative mb-3 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-emerald-50 backdrop-blur-sm">
            <span className="h-2 w-2 rounded-full bg-[#d9d823]" />
            Administración
          </div>

          <h2 className="relative text-2xl font-bold tracking-tight sm:text-3xl">
            Registrar categoría
          </h2>

          <p className="relative mt-2 max-w-lg text-sm leading-6 text-emerald-50/85">
            Creá una nueva categoría para organizar los
            emprendimientos de la comunidad.
          </p>
        </div>
      </div>

      {/* =====================================================
          FORMULARIO
      ===================================================== */}

      <div className="p-6 sm:p-10">

        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-6"
        >

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

            <span className="text-xs font-normal text-stone-500">
              Máximo 100 caracteres.
            </span>
          </label>

          {/* DESCRIPCIÓN */}

          <label className={labelClase}>
            Descripción
            <span className="font-normal text-stone-400">
              (opcional)
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

          {/* ERROR */}

          {error && (
            <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="mt-0.5 h-5 w-5 shrink-0"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
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

          {/* ÉXITO */}

          {/* =================================================
              BOTONES
          ================================================= */}

          <div className="mt-2 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">

            {onCerrar && (
              <button
                type="button"
                onClick={onCerrar}
                disabled={enviando}
                className="rounded-2xl border border-stone-300 bg-white px-6 py-3 font-semibold text-stone-700 shadow-sm motion-safe:transition-colors motion-safe:duration-200 hover:border-stone-400 hover:bg-stone-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-400 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancelar
              </button>
            )}

            <button
              type="submit"
              disabled={enviando}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-900 px-6 py-3 font-semibold text-white shadow-md motion-safe:transition-all motion-safe:duration-200 motion-safe:hover:-translate-y-0.5 hover:bg-emerald-800 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8dc63f] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 motion-reduce:transform-none"
            >
              {enviando ? (
                <>
                  <svg
                    className="h-5 w-5 motion-safe:animate-spin motion-reduce:animate-none"
                    viewBox="0 0 24 24"
                    fill="none"
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
