import { useState } from 'react';
import { crearCategoria } from '../services/categoriaEmprendimientoService';

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
  const [exito, setExito] = useState(false);

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
    'w-full rounded-xl border border-gray-300 bg-gray-50 px-4 py-3 text-gray-800 placeholder-gray-400 outline-none transition-all duration-200 focus:border-emerald-600 focus:bg-white focus:ring-4 focus:ring-emerald-100';

  const labelClase =
    'flex flex-col gap-2 text-sm font-semibold text-gray-700';

  return (
    <div className="relative mx-auto max-w-xl overflow-hidden rounded-3xl bg-white shadow-xl">

      {/* =====================================================
          BOTÓN CERRAR
      ===================================================== */}

      {onCerrar && (
        <button
          type="button"
          onClick={onCerrar}
          aria-label="Cerrar formulario"
          title="Cerrar"
          className="absolute right-5 top-5 z-10 flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 shadow-sm transition-all duration-200 hover:scale-105 hover:border-red-200 hover:bg-red-50 hover:text-red-600 hover:shadow-md focus:outline-none focus:ring-4 focus:ring-red-100"
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

      <div className="bg-gradient-to-r from-emerald-900 via-emerald-800 to-green-800 px-8 py-7 text-white sm:px-10">
        <div className="pr-10">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-emerald-100">
            <span className="h-2 w-2 rounded-full bg-emerald-300" />
            Administración
          </div>

          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Registrar categoría
          </h2>

          <p className="mt-2 max-w-lg text-sm leading-6 text-emerald-50">
            Creá una nueva categoría para organizar los
            emprendimientos de la comunidad.
          </p>
        </div>
      </div>

      {/* =====================================================
          FORMULARIO
      ===================================================== */}

      <div className="p-8 sm:p-10">

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

            <span className="text-xs font-normal text-gray-500">
              Máximo 100 caracteres.
            </span>
          </label>

          {/* DESCRIPCIÓN */}

          <label className={labelClase}>
            Descripción
            <span className="font-normal text-gray-400">
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
            <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
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

          {exito && (
            <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="mt-0.5 h-5 w-5 shrink-0"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path
                  d="M5 12.5 9.5 17 19 7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>

              <span>
                Categoría creada correctamente.
              </span>
            </div>
          )}

          {/* =================================================
              BOTONES
          ================================================= */}

          <div className="mt-2 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">

            {onCerrar && (
              <button
                type="button"
                onClick={onCerrar}
                disabled={enviando}
                className="rounded-xl border border-gray-300 bg-white px-6 py-3 font-semibold text-gray-700 transition-all duration-200 hover:border-gray-400 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancelar
              </button>
            )}

            <button
              type="submit"
              disabled={enviando}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-800 px-6 py-3 font-semibold text-white shadow-md transition-all duration-200 hover:-translate-y-0.5 hover:bg-emerald-700 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60"
            >
              {enviando ? (
                <>
                  <svg
                    className="h-5 w-5 animate-spin"
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