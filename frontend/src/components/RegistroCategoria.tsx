import { useState } from 'react';
import { crearCategoria } from '../services/categoriaEmprendimientoService';

interface Props {
  onCategoriaCreada?: () => void;
}

function RegistroCategoria({ onCategoriaCreada }: Props) {
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exito, setExito] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setEnviando(true);
    try {
      await crearCategoria({ nombre, descripcion: descripcion || undefined });
      setExito(true);
      setNombre('');
      setDescripcion('');
      onCategoriaCreada?.();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setEnviando(false);
    }
  }

  const inputClase =
    'w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-800 focus:border-green-700 focus:outline-none focus:ring-2 focus:ring-green-200 transition-colors';
  const labelClase = 'flex flex-col gap-1 text-sm font-medium text-gray-700';

  return (
    <div className="mx-auto max-w-xl rounded-2xl bg-white p-8 shadow-md">
      <h2 className="mb-2 text-2xl font-semibold text-green-800">
        Registrar categoría de emprendimiento
      </h2>
      <p className="mb-6 text-sm text-gray-600">
        Necesitás al menos una categoría antes de poder registrar emprendimientos.
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <label className={labelClase}>
          Nombre
          <input
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            required
            maxLength={100}
            className={inputClase}
          />
        </label>

        <label className={labelClase}>
          Descripción (opcional)
          <textarea
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            rows={3}
            className={inputClase}
          />
        </label>

        {error && (
          <p className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">{error}</p>
        )}
        {exito && (
          <p className="rounded-lg bg-green-50 px-4 py-2 text-sm text-green-700">
            Categoría creada correctamente.
          </p>
        )}

        <button
          type="submit"
          disabled={enviando}
          className="mt-2 rounded-lg bg-green-800 px-6 py-3 font-medium text-white transition-colors hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {enviando ? 'Guardando...' : 'Crear categoría'}
        </button>
      </form>
    </div>
  );
}

export default RegistroCategoria;