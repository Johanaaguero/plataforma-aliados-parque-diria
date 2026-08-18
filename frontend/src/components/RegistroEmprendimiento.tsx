import { useState, useEffect, useCallback, type ChangeEvent, type SyntheticEvent } from 'react';
import { obtenerCategorias } from '../services/categoriaEmprendimientoService';
import type { CategoriaEmprendimiento } from '../services/categoriaEmprendimientoService';
import { crearEmprendimiento } from '../services/emprendimientoService';
import RegistroCategoria from './RegistroCategoria';

interface FormState {
  nombre: string;
  descripcion: string;
  categoriaId: string;
  direccion: string;
  latitud: string;
  longitud: string;
  correoElectronico: string;
  telefono: string;
}

const INITIAL_FORM: FormState = {
  nombre: '',
  descripcion: '',
  categoriaId: '',
  direccion: '',
  latitud: '',
  longitud: '',
  correoElectronico: '',
  telefono: '',
};

function RegistroEmprendimiento() {
  const [categorias, setCategorias] = useState<CategoriaEmprendimiento[]>([]);
  const [cargandoCategorias, setCargandoCategorias] = useState(true);
  const [errorCategorias, setErrorCategorias] = useState<string | null>(null);

  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [imagen, setImagen] = useState<File | null>(null);
  const [imagenPreview, setImagenPreview] = useState<string | null>(null);

  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exito, setExito] = useState(false);

  const cargarCategorias = useCallback(async () => {
    setCargandoCategorias(true);
    setErrorCategorias(null);
    try {
      const data = await obtenerCategorias();
      setCategorias(data);
    } catch (err) {
      setErrorCategorias(err instanceof Error ? err.message : 'Error al obtener categorías');
    } finally {
      setCargandoCategorias(false);
    }
  }, []);

  useEffect(() => {
    cargarCategorias();
  }, [cargarCategorias]);

  useEffect(() => {
    return () => {
      if (imagenPreview) {
        URL.revokeObjectURL(imagenPreview);
      }
    };
  }, [imagenPreview]);

  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError('La imagen no debe superar los 5MB.');
        return;
      }
      setImagen(file);
      setImagenPreview(URL.createObjectURL(file));
      setError(null);
    }
  };

  const handleRemoveImage = () => {
    if (imagenPreview) {
      URL.revokeObjectURL(imagenPreview);
    }
    setImagen(null);
    setImagenPreview(null);
  };

  const handleSubmit = async (e: SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setExito(false);
    setEnviando(true);

    try {
      const formDataToSend = new FormData();
      formDataToSend.append('nombre', form.nombre);
      if (form.descripcion) formDataToSend.append('descripcion', form.descripcion);
      formDataToSend.append('categoriaId', form.categoriaId);
      if (form.direccion) formDataToSend.append('direccion', form.direccion);
      formDataToSend.append('latitud', form.latitud);
      formDataToSend.append('longitud', form.longitud);
      formDataToSend.append('correoElectronico', form.correoElectronico);
      formDataToSend.append('telefono', form.telefono);

      if (imagen) {
        formDataToSend.append('imagen', imagen);
      }

      await crearEmprendimiento(formDataToSend);

      setExito(true);
      setForm(INITIAL_FORM);
      handleRemoveImage();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ocurrió un error al guardar');
    } finally {
      setEnviando(false);
    }
  };

  const inputClase =
    'w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-800 transition-all focus:border-green-700 focus:outline-none focus:ring-2 focus:ring-green-100';
  const labelClase = 'flex flex-col gap-1.5 text-sm font-semibold text-gray-700';

  if (cargandoCategorias) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex items-center gap-3 text-gray-600">
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-green-700 border-t-transparent"></span>
          <span>Cargando categorías...</span>
        </div>
      </div>
    );
  }

  if (errorCategorias) {
    return (
      <div className="mx-auto max-w-xl rounded-xl border border-red-200 bg-red-50 p-6 text-center shadow-sm">
        <p className="font-medium text-red-700">Error al cargar categorías: {errorCategorias}</p>
        <button
          onClick={cargarCategorias}
          className="mt-3 text-sm font-semibold text-red-800 underline hover:text-red-900"
        >
          Reintentar
        </button>
      </div>
    );
  }

  if (categorias.length === 0) {
    return (
      <div className="mx-auto max-w-xl">
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-6 shadow-sm">
          <strong className="block text-base text-amber-900">
            Aún no hay categorías registradas.
          </strong>
          <p className="mt-1 text-sm text-amber-800">
            Debes crear al menos una categoría antes de registrar un emprendimiento.
          </p>
        </div>
        <RegistroCategoria onCategoriaCreada={cargarCategorias} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl rounded-2xl bg-white p-8 shadow-lg ring-1 ring-gray-100">
      <div className="mb-8 border-b border-gray-100 pb-4">
        <h2 className="text-2xl font-bold text-green-900">Registrar Nuevo Emprendimiento</h2>
        <p className="mt-1 text-sm text-gray-500">
          Completa el formulario para incluir un emprendimiento en el directorio.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Sección 1: Información General */}
        <div className="space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-green-700">
            1. Información General
          </h3>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className={labelClase}>
              Nombre del emprendimiento *
              <input
                name="nombre"
                value={form.nombre}
                onChange={handleChange}
                required
                maxLength={150}
                placeholder="Ej. Artesanías Diriá"
                className={inputClase}
              />
            </label>

            <label className={labelClase}>
              Categoría *
              <select
                name="categoriaId"
                value={form.categoriaId}
                onChange={handleChange}
                required
                className={inputClase}
              >
                <option value="">Selecciona una categoría</option>
                {categorias.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.nombre}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className={labelClase}>
            Descripción
            <textarea
              name="descripcion"
              value={form.descripcion}
              onChange={handleChange}
              rows={3}
              placeholder="Escribe una breve descripción..."
              className={inputClase}
            />
          </label>
        </div>

        {/* Sección: Imagen Representativa */}
        <div className="space-y-2">
          <label className={labelClase}>Imagen del emprendimiento</label>
          {!imagenPreview ? (
            <label className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 p-6 transition-colors hover:border-green-600 hover:bg-green-50/50 cursor-pointer">
              <svg
                className="h-10 w-10 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              <span className="mt-2 text-sm text-gray-600 font-medium">
                Haz clic para subir una imagen
              </span>
              <span className="text-xs text-gray-400">PNG, JPG o WEBP (Máx. 5MB)</span>
              <input
                type="file"
                accept="image/png, image/jpeg, image/webp"
                onChange={handleImageChange}
                className="hidden"
              />
            </label>
          ) : (
            <div className="relative w-full max-w-xs overflow-hidden rounded-xl border border-gray-200">
              <img
                src={imagenPreview}
                alt="Vista previa"
                className="h-48 w-full object-cover"
              />
              <button
                type="button"
                onClick={handleRemoveImage}
                className="absolute top-2 right-2 rounded-full bg-red-600 p-1.5 text-white shadow-md hover:bg-red-700 transition-colors"
                title="Eliminar imagen"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}
        </div>

        {/* Sección 2: Ubicación */}
        <div className="space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-green-700">
            2. Ubicación y Coordenadas
          </h3>

          <label className={labelClase}>
            Dirección exacta
            <input
              name="direccion"
              value={form.direccion}
              onChange={handleChange}
              placeholder="Ej. 200m Norte del Parque Central"
              className={inputClase}
            />
          </label>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className={labelClase}>
              Latitud *
              <input
                name="latitud"
                type="number"
                step="any"
                value={form.latitud}
                onChange={handleChange}
                required
                placeholder="10.123456"
                className={inputClase}
              />
            </label>

            <label className={labelClase}>
              Longitud *
              <input
                name="longitud"
                type="number"
                step="any"
                value={form.longitud}
                onChange={handleChange}
                required
                placeholder="-85.123456"
                className={inputClase}
              />
            </label>
          </div>
        </div>

        {/* Sección 3: Contacto */}
        <div className="space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-green-700">
            3. Datos de Contacto
          </h3>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className={labelClase}>
              Correo electrónico *
              <input
                name="correoElectronico"
                type="email"
                value={form.correoElectronico}
                onChange={handleChange}
                required
                placeholder="contacto@emprendimiento.com"
                className={inputClase}
              />
            </label>

            <label className={labelClase}>
              Teléfono *
              <input
                name="telefono"
                value={form.telefono}
                onChange={handleChange}
                required
                maxLength={20}
                placeholder="+506 8888-8888"
                className={inputClase}
              />
            </label>
          </div>
        </div>

        {/* Alertas */}
        {error && (
          <div className="rounded-xl bg-red-50 p-4 text-sm font-medium text-red-700 border border-red-200">
            {error}
          </div>
        )}

        {exito && (
          <div className="rounded-xl bg-green-50 p-4 text-sm font-medium text-green-800 border border-green-200">
            ¡Emprendimiento registrado con éxito!
          </div>
        )}

        {/* Acciones */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={enviando}
            className="w-full rounded-xl bg-green-800 px-6 py-3.5 font-semibold text-white shadow-md transition-all hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-600 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {enviando ? 'Guardando Registro...' : 'Registrar Emprendimiento'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default RegistroEmprendimiento;