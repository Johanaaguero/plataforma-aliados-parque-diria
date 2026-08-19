import {
  useState,
  useEffect,
  useCallback,
  type ChangeEvent,
  type SyntheticEvent,
} from 'react';

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

interface FormErrors {
  nombre?: string;
  descripcion?: string;
  categoriaId?: string;
  direccion?: string;
  latitud?: string;
  longitud?: string;
  correoElectronico?: string;
  telefono?: string;
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


const validarCorreo = (correo: string): boolean => {
  const regex =
    /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  return regex.test(correo.trim());
};

const validarTelefono = (telefono: string): boolean => {
  return /^\d{8}$/.test(telefono);
};

const validarNumero = (valor: string): boolean => {
  if (!valor.trim()) {
    return false;
  }

  const numero = Number(valor);

  return Number.isFinite(numero);
};

const validarFormulario = (
  form: FormState
): FormErrors => {
  const errores: FormErrors = {};

  /* ----------------------------------------------------------
     NOMBRE
  ---------------------------------------------------------- */

  if (!form.nombre.trim()) {
    errores.nombre =
      'El nombre del emprendimiento es obligatorio.';
  } else if (form.nombre.trim().length < 3) {
    errores.nombre =
      'El nombre debe tener al menos 3 caracteres.';
  } else if (form.nombre.trim().length > 150) {
    errores.nombre =
      'El nombre no puede superar los 150 caracteres.';
  }

  /* ----------------------------------------------------------
     DESCRIPCIÓN
  ---------------------------------------------------------- */

  if (form.descripcion.trim().length > 500) {
    errores.descripcion =
      'La descripción no puede superar los 500 caracteres.';
  }

  /* ----------------------------------------------------------
     CATEGORÍA
  ---------------------------------------------------------- */

  if (!form.categoriaId) {
    errores.categoriaId =
      'Debe seleccionar una categoría.';
  }

  /* ----------------------------------------------------------
     DIRECCIÓN
  ---------------------------------------------------------- */

  if (form.direccion.trim().length > 250) {
    errores.direccion =
      'La dirección no puede superar los 250 caracteres.';
  }

  /* ----------------------------------------------------------
     LATITUD
  ---------------------------------------------------------- */

  if (!form.latitud.trim()) {
    errores.latitud =
      'La latitud es obligatoria.';
  } else if (!validarNumero(form.latitud)) {
    errores.latitud =
      'Ingrese una latitud válida.';
  } else {
    const latitud = Number(form.latitud);

    if (latitud < -90 || latitud > 90) {
      errores.latitud =
        'La latitud debe estar entre -90 y 90.';
    }
  }

  /* ----------------------------------------------------------
     LONGITUD
  ---------------------------------------------------------- */

  if (!form.longitud.trim()) {
    errores.longitud =
      'La longitud es obligatoria.';
  } else if (!validarNumero(form.longitud)) {
    errores.longitud =
      'Ingrese una longitud válida.';
  } else {
    const longitud = Number(form.longitud);

    if (longitud < -180 || longitud > 180) {
      errores.longitud =
        'La longitud debe estar entre -180 y 180.';
    }
  }

  /* ----------------------------------------------------------
     CORREO
  ---------------------------------------------------------- */

  if (!form.correoElectronico.trim()) {
    errores.correoElectronico =
      'El correo electrónico es obligatorio.';
  } else if (!validarCorreo(form.correoElectronico)) {
    errores.correoElectronico =
      'Ingrese un correo electrónico válido.';
  }

  /* ----------------------------------------------------------
     TELÉFONO
  ---------------------------------------------------------- */

  if (!form.telefono.trim()) {
    errores.telefono =
      'El teléfono es obligatorio.';
  } else if (!validarTelefono(form.telefono)) {
    errores.telefono =
      'El teléfono debe contener exactamente 8 números.';
  }

  return errores;
};

/* ============================================================
   COMPONENTE
============================================================ */

function RegistroEmprendimiento() {
  const [categorias, setCategorias] =
    useState<CategoriaEmprendimiento[]>([]);

  const [cargandoCategorias, setCargandoCategorias] =
    useState(true);

  const [errorCategorias, setErrorCategorias] =
    useState<string | null>(null);

  const [form, setForm] =
    useState<FormState>(INITIAL_FORM);

  const [errores, setErrores] =
    useState<FormErrors>({});

  const [imagen, setImagen] =
    useState<File | null>(null);

  const [imagenPreview, setImagenPreview] =
    useState<string | null>(null);

  const [enviando, setEnviando] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const [exito, setExito] =
    useState(false);

  /* ==========================================================
     CATEGORÍAS
  ========================================================== */

  const cargarCategorias = useCallback(async () => {
    setCargandoCategorias(true);
    setErrorCategorias(null);

    try {
      const data = await obtenerCategorias();

      setCategorias(data);
    } catch (err) {
      setErrorCategorias(
        err instanceof Error
          ? err.message
          : 'Error al obtener categorías'
      );
    } finally {
      setCargandoCategorias(false);
    }
  }, []);

  useEffect(() => {
    void cargarCategorias();
  }, [cargarCategorias]);

  /* ==========================================================
     LIMPIAR URL DE IMAGEN
  ========================================================== */

  useEffect(() => {
    return () => {
      if (imagenPreview) {
        URL.revokeObjectURL(imagenPreview);
      }
    };
  }, [imagenPreview]);

  /* ==========================================================
     CAMBIOS DEL FORMULARIO
  ========================================================== */

  const handleChange = (
    e: ChangeEvent<
      HTMLInputElement |
      HTMLTextAreaElement |
      HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;

    /*
     * TELÉFONO:
     * Solo permite números.
     * Máximo 8 dígitos.
     */

    if (name === 'telefono') {
      const solamenteNumeros = value
        .replace(/\D/g, '')
        .slice(0, 8);

      setForm((prev) => ({
        ...prev,
        telefono: solamenteNumeros,
      }));

      setErrores((prev) => ({
        ...prev,
        telefono:
          solamenteNumeros.length === 0
            ? 'El teléfono es obligatorio.'
            : solamenteNumeros.length < 8
              ? 'El teléfono debe contener exactamente 8 números.'
              : undefined,
      }));

      return;
    }

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));

    /*
     * Validación inmediata del campo.
     */

    const nuevoFormulario = {
      ...form,
      [name]: value,
    };

    const nuevosErrores =
      validarFormulario(nuevoFormulario);

    setErrores((prev) => ({
      ...prev,
      [name]: nuevosErrores[
        name as keyof FormErrors
      ],
    }));

    setError(null);
    setExito(false);
  };

  /* ==========================================================
     IMAGEN
  ========================================================== */

  const handleImageChange = (
    e: ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];

    if (!file) {
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError(
        'La imagen no debe superar los 5MB.'
      );

      e.target.value = '';
      return;
    }

    const tiposPermitidos = [
      'image/png',
      'image/jpeg',
      'image/webp',
    ];

    if (!tiposPermitidos.includes(file.type)) {
      setError(
        'La imagen debe ser PNG, JPG o WEBP.'
      );

      e.target.value = '';
      return;
    }

    if (imagenPreview) {
      URL.revokeObjectURL(imagenPreview);
    }

    setImagen(file);
    setImagenPreview(
      URL.createObjectURL(file)
    );

    setError(null);
  };

  /* ==========================================================
     ELIMINAR IMAGEN
  ========================================================== */

  const handleRemoveImage = () => {
    if (imagenPreview) {
      URL.revokeObjectURL(imagenPreview);
    }

    setImagen(null);
    setImagenPreview(null);
  };

  /* ==========================================================
     SUBMIT
  ========================================================== */

  const handleSubmit = async (
    e: SyntheticEvent<HTMLFormElement>
  ) => {
    e.preventDefault();

    setError(null);
    setExito(false);

    /*
     * Validar TODOS los campos antes de enviar.
     */

    const erroresFormulario =
      validarFormulario(form);

    setErrores(erroresFormulario);

    /*
     * Si existen errores, no se envía nada.
     */

    if (Object.keys(erroresFormulario).length > 0) {
      setError(
        'Por favor, corrija los campos indicados antes de continuar.'
      );

      return;
    }

    setEnviando(true);

    try {
      const formDataToSend =
        new FormData();

      formDataToSend.append(
        'nombre',
        form.nombre.trim()
      );

      if (form.descripcion.trim()) {
        formDataToSend.append(
          'descripcion',
          form.descripcion.trim()
        );
      }

      formDataToSend.append(
        'categoriaId',
        form.categoriaId
      );

      if (form.direccion.trim()) {
        formDataToSend.append(
          'direccion',
          form.direccion.trim()
        );
      }

      formDataToSend.append(
        'latitud',
        form.latitud
      );

      formDataToSend.append(
        'longitud',
        form.longitud
      );

      formDataToSend.append(
        'correoElectronico',
        form.correoElectronico.trim()
      );

      formDataToSend.append(
        'telefono',
        form.telefono
      );

      if (imagen) {
        formDataToSend.append(
          'imagen',
          imagen
        );
      }

      await crearEmprendimiento(
        formDataToSend
      );

      setExito(true);
      setForm(INITIAL_FORM);
      setErrores({});
      handleRemoveImage();

    } catch (err) {
      /*
       * Aquí también capturamos el error del UNIQUE
       * que venga desde el backend.
       */

      const mensaje =
        err instanceof Error
          ? err.message
          : 'Ocurrió un error al guardar el emprendimiento.';

      setError(mensaje);

    } finally {
      setEnviando(false);
    }
  };

  /* ==========================================================
     ESTILOS
  ========================================================== */

  const inputClase =
    'w-full rounded-xl border px-4 py-3 text-gray-800 transition-all focus:outline-none focus:ring-2 ';

  const obtenerClaseInput = (
    campo: keyof FormErrors
  ) => {
    return `${inputClase} ${
      errores[campo]
        ? 'border-red-400 bg-red-50 focus:border-red-500 focus:ring-red-100'
        : 'border-gray-300 bg-white focus:border-green-700 focus:ring-green-100'
    }`;
  };

  const labelClase =
    'flex flex-col gap-1.5 text-sm font-semibold text-gray-700';

  /* ==========================================================
     CARGANDO CATEGORÍAS
  ========================================================== */

  if (cargandoCategorias) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex items-center gap-3 text-gray-600">
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-green-700 border-t-transparent" />

          <span>
            Cargando categorías...
          </span>
        </div>
      </div>
    );
  }

  /* ==========================================================
     ERROR CATEGORÍAS
  ========================================================== */

  if (errorCategorias) {
    return (
      <div className="mx-auto max-w-xl rounded-xl border border-red-200 bg-red-50 p-6 text-center shadow-sm">
        <p className="font-medium text-red-700">
          Error al cargar categorías:{' '}
          {errorCategorias}
        </p>

        <button
          type="button"
          onClick={() => void cargarCategorias()}
          className="mt-3 text-sm font-semibold text-red-800 underline hover:text-red-900"
        >
          Reintentar
        </button>
      </div>
    );
  }

  /* ==========================================================
     SIN CATEGORÍAS
  ========================================================== */

  if (categorias.length === 0) {
    return (
      <div className="mx-auto max-w-xl">
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-6 shadow-sm">
          <strong className="block text-base text-amber-900">
            Aún no hay categorías registradas.
          </strong>

          <p className="mt-1 text-sm text-amber-800">
            Debes crear al menos una categoría
            antes de registrar un emprendimiento.
          </p>
        </div>

        <RegistroCategoria
          onCategoriaCreada={cargarCategorias}
        />
      </div>
    );
  }

  /* ==========================================================
     FORMULARIO
  ========================================================== */

  return (
    <div className="mx-auto max-w-3xl rounded-3xl bg-white p-6 shadow-xl ring-1 ring-gray-100 sm:p-8">

      {/* ENCABEZADO */}

      <div className="mb-8 border-b border-gray-100 pb-6">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-green-50 px-3 py-1 text-xs font-bold uppercase tracking-wide text-green-800">
          <span className="h-2 w-2 rounded-full bg-green-600" />
          Directorio de emprendimientos
        </div>

        <h2 className="text-2xl font-bold text-green-950 sm:text-3xl">
          Registrar nuevo emprendimiento
        </h2>

        <p className="mt-2 text-sm leading-6 text-gray-500">
          Complete la información solicitada para
          registrar un nuevo emprendimiento en el
          directorio del Parque Nacional Diriá.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        noValidate
        className="space-y-8"
      >

        {/* ====================================================
            INFORMACIÓN GENERAL
        ==================================================== */}

        <div className="space-y-5">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-green-700">
              1. Información general
            </h3>

            <p className="mt-1 text-xs text-gray-400">
              Información principal del emprendimiento.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">

            {/* NOMBRE */}

            <label className={labelClase}>
              Nombre del emprendimiento *

              <input
                name="nombre"
                value={form.nombre}
                onChange={handleChange}
                required
                maxLength={150}
                placeholder="Ej. Artesanías Diriá"
                className={obtenerClaseInput(
                  'nombre'
                )}
              />

              {errores.nombre && (
                <p className="flex items-center gap-1 text-xs font-medium text-red-600">
                  <span>⚠</span>
                  {errores.nombre}
                </p>
              )}
            </label>

            {/* CATEGORÍA */}

            <label className={labelClase}>
              Categoría *

              <select
                name="categoriaId"
                value={form.categoriaId}
                onChange={handleChange}
                required
                className={obtenerClaseInput(
                  'categoriaId'
                )}
              >
                <option value="">
                  Selecciona una categoría
                </option>

                {categorias.map((cat) => (
                  <option
                    key={cat.id}
                    value={cat.id}
                  >
                    {cat.nombre}
                  </option>
                ))}
              </select>

              {errores.categoriaId && (
                <p className="flex items-center gap-1 text-xs font-medium text-red-600">
                  <span>⚠</span>
                  {errores.categoriaId}
                </p>
              )}
            </label>
          </div>

          {/* DESCRIPCIÓN */}

          <label className={labelClase}>
            Descripción

            <textarea
              name="descripcion"
              value={form.descripcion}
              onChange={handleChange}
              rows={4}
              maxLength={500}
              placeholder="Escribe una breve descripción del emprendimiento..."
              className={obtenerClaseInput(
                'descripcion'
              )}
            />

            <div className="flex justify-between">
              {errores.descripcion ? (
                <p className="flex items-center gap-1 text-xs font-medium text-red-600">
                  <span>⚠</span>
                  {errores.descripcion}
                </p>
              ) : (
                <span />
              )}

              <span className="text-xs text-gray-400">
                {form.descripcion.length}/500
              </span>
            </div>
          </label>
        </div>

        {/* ====================================================
            IMAGEN
        ==================================================== */}

        <div className="space-y-3">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-green-700">
              2. Imagen representativa
            </h3>

            <p className="mt-1 text-xs text-gray-400">
              Agregue una imagen para identificar
              visualmente el emprendimiento.
            </p>
          </div>

          {!imagenPreview ? (
            <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-300 bg-gray-50 p-8 transition-colors hover:border-green-600 hover:bg-green-50/50">

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

              <span className="mt-3 text-sm font-semibold text-gray-600">
                Haz clic para subir una imagen
              </span>

              <span className="mt-1 text-xs text-gray-400">
                PNG, JPG o WEBP · Máximo 5MB
              </span>

              <input
                type="file"
                accept="image/png, image/jpeg, image/webp"
                onChange={handleImageChange}
                className="hidden"
              />
            </label>
          ) : (
            <div className="relative max-w-sm overflow-hidden rounded-2xl border border-gray-200 shadow-sm">

              <img
                src={imagenPreview}
                alt="Vista previa del emprendimiento"
                className="h-56 w-full object-cover"
              />

              <button
                type="button"
                onClick={handleRemoveImage}
                className="absolute right-3 top-3 rounded-full bg-red-600 p-2 text-white shadow-md transition hover:bg-red-700"
                title="Eliminar imagen"
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          )}
        </div>

        {/* ====================================================
            UBICACIÓN
        ==================================================== */}

        <div className="space-y-5">

          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-green-700">
              3. Ubicación
            </h3>

            <p className="mt-1 text-xs text-gray-400">
              Indique dónde se encuentra ubicado el
              emprendimiento.
            </p>
          </div>

          <label className={labelClase}>
            Dirección

            <input
              name="direccion"
              value={form.direccion}
              onChange={handleChange}
              maxLength={250}
              placeholder="Ej. 200m Norte del Parque Central"
              className={obtenerClaseInput(
                'direccion'
              )}
            />

            {errores.direccion && (
              <p className="flex items-center gap-1 text-xs font-medium text-red-600">
                <span>⚠</span>
                {errores.direccion}
              </p>
            )}
          </label>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">

            {/* LATITUD */}

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
                className={obtenerClaseInput(
                  'latitud'
                )}
              />

              {errores.latitud && (
                <p className="flex items-center gap-1 text-xs font-medium text-red-600">
                  <span>⚠</span>
                  {errores.latitud}
                </p>
              )}
            </label>

            {/* LONGITUD */}

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
                className={obtenerClaseInput(
                  'longitud'
                )}
              />

              {errores.longitud && (
                <p className="flex items-center gap-1 text-xs font-medium text-red-600">
                  <span>⚠</span>
                  {errores.longitud}
                </p>
              )}
            </label>
          </div>
        </div>

        {/* ====================================================
            CONTACTO
        ==================================================== */}

        <div className="space-y-5">

          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-green-700">
              4. Datos de contacto
            </h3>

            <p className="mt-1 text-xs text-gray-400">
              Información mediante la cual los visitantes
              podrán contactar al emprendimiento.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">

            {/* CORREO */}

            <label className={labelClase}>
              Correo electrónico *

              <input
                name="correoElectronico"
                type="email"
                value={form.correoElectronico}
                onChange={handleChange}
                required
                placeholder="contacto@emprendimiento.com"
                className={obtenerClaseInput(
                  'correoElectronico'
                )}
              />

              {errores.correoElectronico && (
                <p className="flex items-center gap-1 text-xs font-medium text-red-600">
                  <span>⚠</span>
                  {errores.correoElectronico}
                </p>
              )}
            </label>

            {/* TELÉFONO */}

            <label className={labelClase}>
              Teléfono *

              <input
                name="telefono"
                type="tel"
                inputMode="numeric"
                value={form.telefono}
                onChange={handleChange}
                required
                maxLength={8}
                placeholder="88888888"
                className={obtenerClaseInput(
                  'telefono'
                )}
              />

              <div className="flex justify-between">

                {errores.telefono ? (
                  <p className="flex items-center gap-1 text-xs font-medium text-red-600">
                    <span>⚠</span>
                    {errores.telefono}
                  </p>
                ) : (
                  <p className="text-xs text-gray-400">
                    8 dígitos numéricos
                  </p>
                )}

                <span className="text-xs text-gray-400">
                  {form.telefono.length}/8
                </span>
              </div>
            </label>
          </div>
        </div>

        {/* ====================================================
            ALERTA GENERAL
        ==================================================== */}

        {error && (
          <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
            <span className="text-lg">⚠</span>

            <div>
              <p className="font-bold">
                No se pudo registrar el emprendimiento
              </p>

              <p className="mt-1">
                {error}
              </p>
            </div>
          </div>
        )}

        {/* ====================================================
            ÉXITO
        ==================================================== */}

        {exito && (
          <div className="flex items-start gap-3 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-800">
            <span className="text-lg">✓</span>

            <div>
              <p className="font-bold">
                ¡Emprendimiento registrado correctamente!
              </p>

              <p className="mt-1">
                La información fue enviada correctamente.
              </p>
            </div>
          </div>
        )}

        {/* ====================================================
            BOTÓN
        ==================================================== */}

        <div className="border-t border-gray-100 pt-6">

          <button
            type="submit"
            disabled={enviando}
            className="w-full rounded-xl bg-green-800 px-6 py-3.5 font-semibold text-white shadow-md transition-all hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-600 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {enviando
              ? 'Guardando registro...'
              : 'Registrar emprendimiento'}
          </button>

          <p className="mt-3 text-center text-xs text-gray-400">
            Los campos marcados con * son obligatorios.
          </p>
        </div>
      </form>
    </div>
  );
}

export default RegistroEmprendimiento;