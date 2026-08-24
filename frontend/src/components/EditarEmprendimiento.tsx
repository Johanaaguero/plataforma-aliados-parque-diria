import {
  useState,
  useEffect,
  useCallback,
  type ChangeEvent,
  type SyntheticEvent,
} from 'react';

import { obtenerCategorias } from '../services/categoriaEmprendimientoService';
import type { CategoriaEmprendimiento } from '../services/categoriaEmprendimientoService';

import {
  obtenerEmprendimientoPorId,
  actualizarEmprendimiento,
} from '../services/emprendimientoService';

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

interface EditarEmprendimientoProps {
  id: number;
  onActualizado?: () => void;
  onCancelar?: () => void;
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

const validarTelefono = (
  telefono: string,
): boolean => {
  return /^\d{8}$/.test(telefono);
};

const validarNumero = (
  valor: string,
): boolean => {
  if (!valor.trim()) {
    return false;
  }

  const numero = Number(valor);

  return Number.isFinite(numero);
};

const validarFormulario = (
  form: FormState,
): FormErrors => {
  const errores: FormErrors = {};

  /* ==========================================================
     NOMBRE
  ========================================================== */

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

  /* ==========================================================
     DESCRIPCIÓN
  ========================================================== */

  if (form.descripcion.trim().length > 500) {
    errores.descripcion =
      'La descripción no puede superar los 500 caracteres.';
  }

  /* ==========================================================
     CATEGORÍA
  ========================================================== */

  if (!form.categoriaId) {
    errores.categoriaId =
      'Debe seleccionar una categoría.';
  }

  /* ==========================================================
     DIRECCIÓN
  ========================================================== */

  if (form.direccion.trim().length > 250) {
    errores.direccion =
      'La dirección no puede superar los 250 caracteres.';
  }

  /* ==========================================================
     LATITUD
  ========================================================== */

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

  /* ==========================================================
     LONGITUD
  ========================================================== */

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

  /* ==========================================================
     CORREO
  ========================================================== */

  if (!form.correoElectronico.trim()) {
    errores.correoElectronico =
      'El correo electrónico es obligatorio.';
  } else if (
    !validarCorreo(form.correoElectronico)
  ) {
    errores.correoElectronico =
      'Ingrese un correo electrónico válido.';
  }

  /* ==========================================================
     TELÉFONO
  ========================================================== */

  if (!form.telefono.trim()) {
    errores.telefono =
      'El teléfono es obligatorio.';
  } else if (
    !validarTelefono(form.telefono)
  ) {
    errores.telefono =
      'El teléfono debe contener exactamente 8 números.';
  }

  return errores;
};

/* ============================================================
   COMPONENTE
============================================================ */

function EditarEmprendimiento({
  id,
  onActualizado,
  onCancelar,
}: EditarEmprendimientoProps) {
  const [categorias, setCategorias] =
    useState<CategoriaEmprendimiento[]>([]);

  const [cargando, setCargando] =
    useState(true);

  const [cargandoCategorias, setCargandoCategorias] =
    useState(true);

  const [errorCarga, setErrorCarga] =
    useState<string | null>(null);

  const [errorCategorias, setErrorCategorias] =
    useState<string | null>(null);

  const [form, setForm] =
    useState<FormState>(INITIAL_FORM);

  const [errores, setErrores] =
    useState<FormErrors>({});

  const [imagen, setImagen] =
    useState<File | null>(null);

  const [imagenActual, setImagenActual] =
    useState<string | null>(null);

  const [imagenPreview, setImagenPreview] =
    useState<string | null>(null);

  const [eliminarImagenActual, setEliminarImagenActual] =
    useState(false);

  const [guardando, setGuardando] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const [exito, setExito] =
    useState(false);

  /* ==========================================================
     CARGAR CATEGORÍAS
  ========================================================== */

  const cargarCategorias = useCallback(
    async () => {
      setCargandoCategorias(true);
      setErrorCategorias(null);

      try {
        const data =
          await obtenerCategorias();

        setCategorias(data);
      } catch (err) {
        setErrorCategorias(
          err instanceof Error
            ? err.message
            : 'Error al obtener categorías',
        );
      } finally {
        setCargandoCategorias(false);
      }
    },
    [],
  );

  /* ==========================================================
     CARGAR EMPRENDIMIENTO
  ========================================================== */

  const cargarEmprendimiento =
    useCallback(async () => {
      if (!Number.isInteger(id) || id <= 0) {
        setErrorCarga(
          'El ID del emprendimiento no es válido.',
        );

        setCargando(false);
        return;
      }

      setCargando(true);
      setErrorCarga(null);

      try {
        const emprendimiento =
          await obtenerEmprendimientoPorId(id);

        /* ====================================================
           OBTENER ID DE CATEGORÍA
        ==================================================== */

        let categoriaId = '';

        if (
          emprendimiento.categoria &&
          typeof emprendimiento.categoria ===
            'object'
        ) {
          categoriaId =
            String(
              emprendimiento.categoria.id,
            );
        }

        /* ====================================================
           CARGAR FORMULARIO
        ==================================================== */

        setForm({
          nombre:
            emprendimiento.nombre ?? '',

          descripcion:
            emprendimiento.descripcion ?? '',

          categoriaId,

          direccion:
            emprendimiento.direccion ?? '',

          latitud:
            emprendimiento.latitud !== null &&
            emprendimiento.latitud !== undefined
              ? String(
                  emprendimiento.latitud,
                )
              : '',

          longitud:
            emprendimiento.longitud !== null &&
            emprendimiento.longitud !== undefined
              ? String(
                  emprendimiento.longitud,
                )
              : '',

          correoElectronico:
            emprendimiento.correoElectronico ??
            '',

          telefono:
            emprendimiento.telefono ?? '',
        });

        /* ====================================================
           IMAGEN ACTUAL
        ==================================================== */

        setImagenActual(
          emprendimiento.imagen ?? null,
        );

        setImagen(null);
        setImagenPreview(null);
        setEliminarImagenActual(false);
        setErrores({});
        setError(null);
      } catch (err) {
        setErrorCarga(
          err instanceof Error
            ? err.message
            : 'No se pudo cargar el emprendimiento.',
        );
      } finally {
        setCargando(false);
      }
    }, [id]);

  /* ==========================================================
     EFECTO INICIAL
  ========================================================== */

  useEffect(() => {
    void cargarCategorias();
    void cargarEmprendimiento();
  }, [
    cargarCategorias,
    cargarEmprendimiento,
  ]);

  /* ==========================================================
     LIMPIAR URL DE PREVIEW
  ========================================================== */

  useEffect(() => {
    return () => {
      if (imagenPreview) {
        URL.revokeObjectURL(
          imagenPreview,
        );
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
    >,
  ) => {
    const {
      name,
      value,
    } = e.target;

    /* ========================================================
       TELÉFONO
    ======================================================== */

    if (name === 'telefono') {
      const solamenteNumeros =
        value
          .replace(/\D/g, '')
          .slice(0, 8);

      setForm((prev) => ({
        ...prev,
        telefono:
          solamenteNumeros,
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

      setError(null);
      setExito(false);

      return;
    }

    const nuevoFormulario = {
      ...form,
      [name]: value,
    } as FormState;

    setForm(nuevoFormulario);

    const nuevosErrores =
      validarFormulario(
        nuevoFormulario,
      );

    setErrores((prev) => ({
      ...prev,
      [name]:
        nuevosErrores[
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
    e: ChangeEvent<HTMLInputElement>,
  ) => {
    const file =
      e.target.files?.[0];

    if (!file) {
      return;
    }

    /* ========================================================
       TAMAÑO
    ======================================================== */

    if (
      file.size >
      5 * 1024 * 1024
    ) {
      setError(
        'La imagen no debe superar los 5MB.',
      );

      e.target.value = '';
      return;
    }

    /* ========================================================
       TIPO
    ======================================================== */

    const tiposPermitidos = [
      'image/png',
      'image/jpeg',
      'image/webp',
    ];

    if (
      !tiposPermitidos.includes(
        file.type,
      )
    ) {
      setError(
        'La imagen debe ser PNG, JPG o WEBP.',
      );

      e.target.value = '';
      return;
    }

    /* ========================================================
       LIMPIAR PREVIEW ANTERIOR
    ======================================================== */

    if (imagenPreview) {
      URL.revokeObjectURL(
        imagenPreview,
      );
    }

    const nuevaPreview =
      URL.createObjectURL(file);

    setImagen(file);
    setImagenPreview(
      nuevaPreview,
    );

    /*
     * Al seleccionar una imagen nueva,
     * ya no se elimina la imagen.
     */

    setEliminarImagenActual(false);

    setError(null);
    setExito(false);
  };

  /* ==========================================================
     QUITAR NUEVA IMAGEN
  ========================================================== */

  const handleRemoveNewImage =
    () => {
      if (imagenPreview) {
        URL.revokeObjectURL(
          imagenPreview,
        );
      }

      setImagen(null);
      setImagenPreview(null);
    };

  /* ==========================================================
     QUITAR IMAGEN ACTUAL
  ========================================================== */

  const handleRemoveCurrentImage =
    () => {
      setImagenActual(null);
      setEliminarImagenActual(
        true,
      );
      setError(null);
    };

  /* ==========================================================
     CANCELAR ELIMINACIÓN DE IMAGEN
  ========================================================== */

  const handleRestoreCurrentImage =
    () => {
      setEliminarImagenActual(
        false,
      );

      /*
       * Volvemos a cargar el emprendimiento
       * para recuperar la imagen original.
       */

      void cargarEmprendimiento();
    };

  /* ==========================================================
     SUBMIT
  ========================================================== */

  const handleSubmit = async (
    e: SyntheticEvent<HTMLFormElement>,
  ) => {
    e.preventDefault();

    setError(null);
    setExito(false);

    /* ========================================================
       VALIDAR
    ======================================================== */

    const erroresFormulario =
      validarFormulario(form);

    setErrores(
      erroresFormulario,
    );

    if (
      Object.keys(
        erroresFormulario,
      ).length > 0
    ) {
      setError(
        'Por favor, corrija los campos indicados antes de continuar.',
      );

      return;
    }

    setGuardando(true);

    try {
      const formData =
        new FormData();

      /* ======================================================
         DATOS
      ====================================================== */

      formData.append(
        'nombre',
        form.nombre.trim(),
      );

      formData.append(
        'descripcion',
        form.descripcion.trim(),
      );

      formData.append(
        'categoriaId',
        form.categoriaId,
      );

      formData.append(
        'direccion',
        form.direccion.trim(),
      );

      formData.append(
        'latitud',
        form.latitud,
      );

      formData.append(
        'longitud',
        form.longitud,
      );

      formData.append(
        'correoElectronico',
        form.correoElectronico.trim(),
      );

      formData.append(
        'telefono',
        form.telefono,
      );

      /* ======================================================
         IMAGEN
      ====================================================== */

      if (imagen) {
        formData.append(
          'imagen',
          imagen,
        );
      }

    
      await actualizarEmprendimiento(
        id,
        formData,
      );

      setExito(true);
      setErrores({});
      setError(null);

      await cargarEmprendimiento();

     

      if (onActualizado) {
        onActualizado();
      }
    } catch (err) {
      const mensaje =
        err instanceof Error
          ? err.message
          : 'Ocurrió un error al actualizar el emprendimiento.';

      setError(mensaje);
    } finally {
      setGuardando(false);
    }
  };

  /* ==========================================================
     ESTILOS
  ========================================================== */

  const inputClase =
    'w-full rounded-xl border px-4 py-3 text-gray-800 transition-all focus:outline-none focus:ring-2';

  const obtenerClaseInput = (
    campo: keyof FormErrors,
  ) => {
    return `${inputClase} ${
      errores[campo]
        ? 'border-red-400 bg-red-50 focus:border-red-500 focus:ring-red-100'
        : 'border-gray-300 bg-white focus:border-green-700 focus:ring-green-100'
    }`;
  };

  const labelClase =
    'flex flex-col gap-1.5 text-sm font-semibold text-gray-700';

 
  if (
    cargando ||
    cargandoCategorias
  ) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex items-center gap-3 text-gray-600">
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-green-700 border-t-transparent" />

          <span>
            Cargando información...
          </span>
        </div>
      </div>
    );
  }

 
  if (errorCarga) {
    return (
      <div className="mx-auto max-w-xl rounded-2xl border border-red-200 bg-red-50 p-6 text-center shadow-sm">
        <div className="text-3xl">
          ⚠
        </div>

        <h3 className="mt-3 font-bold text-red-800">
          No se pudo cargar el emprendimiento
        </h3>

        <p className="mt-2 text-sm text-red-700">
          {errorCarga}
        </p>

        <button
          type="button"
          onClick={() =>
            void cargarEmprendimiento()
          }
          className="mt-4 rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-800"
        >
          Reintentar
        </button>

        {onCancelar && (
          <button
            type="button"
            onClick={onCancelar}
            className="ml-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
          >
            Regresar
          </button>
        )}
      </div>
    );
  }

 
  if (errorCategorias) {
    return (
      <div className="mx-auto max-w-xl rounded-xl border border-red-200 bg-red-50 p-6 text-center shadow-sm">
        <p className="font-medium text-red-700">
          Error al cargar categorías:{' '}
          {errorCategorias}
        </p>

        <button
          type="button"
          onClick={() =>
            void cargarCategorias()
          }
          className="mt-3 text-sm font-semibold text-red-800 underline hover:text-red-900"
        >
          Reintentar
        </button>
      </div>
    );
  }

 
  if (categorias.length === 0) {
    return (
      <div className="mx-auto max-w-xl rounded-xl border border-amber-200 bg-amber-50 p-6">
        <strong className="block text-base text-amber-900">
          No hay categorías disponibles.
        </strong>

        <p className="mt-1 text-sm text-amber-800">
          Debe existir al menos una categoría
          para poder editar el emprendimiento.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl rounded-3xl bg-white p-6 shadow-xl ring-1 ring-gray-100 sm:p-8">

     
      <div className="mb-8 border-b border-gray-100 pb-6">

        <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-bold uppercase tracking-wide text-blue-800">
          <span className="h-2 w-2 rounded-full bg-blue-600" />
          Edición de emprendimiento
        </div>

        <h2 className="text-2xl font-bold text-green-950 sm:text-3xl">
          Editar emprendimiento
        </h2>

        <p className="mt-2 text-sm leading-6 text-gray-500">
          Modifique la información del
          emprendimiento. Los cambios se
          guardarán inmediatamente.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        noValidate
        className="space-y-8"
      >

      
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
                  'nombre',
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
                  'categoriaId',
                )}
              >
                <option value="">
                  Selecciona una categoría
                </option>

                {categorias.map(
                  (categoria) => (
                    <option
                      key={categoria.id}
                      value={
                        categoria.id
                      }
                    >
                      {categoria.nombre}
                    </option>
                  ),
                )}
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
                'descripcion',
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
                {
                  form.descripcion
                    .length
                }
                /500
              </span>
            </div>
          </label>
        </div>

        {/* ==================================================
            IMAGEN
        ================================================== */}

        <div className="space-y-3">

          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-green-700">
              2. Imagen representativa
            </h3>

            <p className="mt-1 text-xs text-gray-400">
              Puede conservar la imagen actual o
              seleccionar una nueva.
            </p>
          </div>

          {/* =================================================
              NUEVA IMAGEN
          ================================================= */}

          {imagenPreview ? (
            <div className="relative max-w-sm overflow-hidden rounded-2xl border border-blue-200 shadow-sm">

              <img
                src={imagenPreview}
                alt="Nueva imagen seleccionada"
                className="h-56 w-full object-cover"
              />

              <div className="absolute left-3 top-3 rounded-full bg-blue-600 px-3 py-1 text-xs font-bold text-white shadow">
                Nueva imagen
              </div>

              <button
                type="button"
                onClick={
                  handleRemoveNewImage
                }
                className="absolute right-3 top-3 rounded-full bg-red-600 p-2 text-white shadow-md transition hover:bg-red-700"
                title="Cancelar nueva imagen"
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
          ) : imagenActual ? (
            <div className="relative max-w-sm overflow-hidden rounded-2xl border border-gray-200 shadow-sm">

              <img
                src={imagenActual}
                alt="Imagen actual del emprendimiento"
                className={`h-56 w-full object-cover ${
                  eliminarImagenActual
                    ? 'opacity-40 grayscale'
                    : ''
                }`}
              />

              <div className="absolute left-3 top-3 rounded-full bg-gray-800/80 px-3 py-1 text-xs font-bold text-white shadow">
                Imagen actual
              </div>

              {!eliminarImagenActual ? (
                <button
                  type="button"
                  onClick={
                    handleRemoveCurrentImage
                  }
                  className="absolute right-3 top-3 rounded-full bg-red-600 p-2 text-white shadow-md transition hover:bg-red-700"
                  title="Quitar imagen"
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
              ) : (
                <button
                  type="button"
                  onClick={
                    handleRestoreCurrentImage
                  }
                  className="absolute right-3 top-3 rounded-lg bg-green-700 px-3 py-2 text-xs font-bold text-white shadow-md transition hover:bg-green-800"
                >
                  Conservar imagen
                </button>
              )}
            </div>
          ) : (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
              <p className="text-sm font-semibold text-amber-800">
                Este emprendimiento no tiene una
                imagen registrada.
              </p>
            </div>
          )}

          {/* =================================================
              SUBIR NUEVA IMAGEN
          ================================================= */}

          <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-300 bg-gray-50 p-6 transition-colors hover:border-green-600 hover:bg-green-50/50">

            <svg
              className="h-8 w-8 text-gray-400"
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

            <span className="mt-2 text-sm font-semibold text-gray-600">
              Seleccionar nueva imagen
            </span>

            <span className="mt-1 text-xs text-gray-400">
              PNG, JPG o WEBP · Máximo 5MB
            </span>

            <input
              type="file"
              accept="image/png, image/jpeg, image/webp"
              onChange={
                handleImageChange
              }
              className="hidden"
            />
          </label>
        </div>

        {/* ==================================================
            UBICACIÓN
        ================================================== */}

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
                'direccion',
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
                  'latitud',
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
                  'longitud',
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

        {/* ==================================================
            CONTACTO
        ================================================== */}

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
                value={
                  form.correoElectronico
                }
                onChange={handleChange}
                required
                placeholder="contacto@emprendimiento.com"
                className={obtenerClaseInput(
                  'correoElectronico',
                )}
              />

              {errores.correoElectronico && (
                <p className="flex items-center gap-1 text-xs font-medium text-red-600">
                  <span>⚠</span>
                  {
                    errores.correoElectronico
                  }
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
                  'telefono',
                )}
              />

              <div className="flex justify-between">

                {errores.telefono ? (
                  <p className="flex items-center gap-1 text-xs font-medium text-red-600">
                    <span>⚠</span>
                    {
                      errores.telefono
                    }
                  </p>
                ) : (
                  <p className="text-xs text-gray-400">
                    8 dígitos numéricos
                  </p>
                )}

                <span className="text-xs text-gray-400">
                  {
                    form.telefono.length
                  }
                  /8
                </span>
              </div>
            </label>
          </div>
        </div>

        {/* ==================================================
            ESTADO
        ================================================== */}

        <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">

          <div className="flex items-start gap-3">

            <span className="mt-0.5 text-lg">
              ℹ
            </span>

            <div>
              <p className="font-bold text-blue-900">
                El estado de publicación no se modifica aquí
              </p>

              <p className="mt-1 text-sm leading-5 text-blue-800">
                El estado del emprendimiento se
                administra por separado según los
                permisos correspondientes.
              </p>
            </div>
          </div>
        </div>

        {/* ==================================================
            ERROR GENERAL
        ================================================== */}

        {error && (
          <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">

            <span className="text-lg">
              ⚠
            </span>

            <div>
              <p className="font-bold">
                No se pudo actualizar el emprendimiento
              </p>

              <p className="mt-1">
                {error}
              </p>
            </div>
          </div>
        )}

        {/* ==================================================
            ÉXITO
        ================================================== */}

        {exito && (
          <div className="flex items-start gap-3 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-800">

            <span className="text-lg">
              ✓
            </span>

            <div>
              <p className="font-bold">
                ¡Emprendimiento actualizado correctamente!
              </p>

              <p className="mt-1">
                Los cambios fueron guardados correctamente.
              </p>
            </div>
          </div>
        )}

        {/* ==================================================
            BOTONES
        ================================================== */}

        <div className="flex flex-col gap-3 border-t border-gray-100 pt-6 sm:flex-row">

          {onCancelar && (
            <button
              type="button"
              onClick={onCancelar}
              disabled={guardando}
              className="w-full rounded-xl border border-gray-300 bg-white px-6 py-3.5 font-semibold text-gray-700 transition-all hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-300 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 sm:w-1/3"
            >
              Cancelar
            </button>
          )}

          <button
            type="submit"
            disabled={guardando}
            className="w-full rounded-xl bg-green-800 px-6 py-3.5 font-semibold text-white shadow-md transition-all hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-600 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {guardando
              ? 'Guardando cambios...'
              : 'Guardar cambios'}
          </button>
        </div>

        <p className="text-center text-xs text-gray-400">
          Los campos marcados con * son obligatorios.
        </p>
      </form>
    </div>
  );
}

export default EditarEmprendimiento;

