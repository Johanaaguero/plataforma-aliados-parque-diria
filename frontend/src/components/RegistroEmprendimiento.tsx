import {
  useState,
  useEffect,
  useCallback,
  useRef,
  type ChangeEvent,
  type DragEvent,
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

interface ImagenSeleccionada {
  archivo: File;
  preview: string;
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
  form: FormState,
  esBorrador: boolean,
): FormErrors => {
  const errores: FormErrors = {};

  /* ----------------------------------------------------------
     NOMBRE
  ---------------------------------------------------------- */

  if (!form.nombre.trim()) {
    if (!esBorrador) {
      errores.nombre =
        'El nombre del emprendimiento es obligatorio.';
    }
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

  if (!form.categoriaId && !esBorrador) {
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
    if (!esBorrador) {
      errores.latitud =
        'La latitud es obligatoria.';
    }
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
    if (!esBorrador) {
      errores.longitud =
        'La longitud es obligatoria.';
    }
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
    if (!esBorrador) {
      errores.correoElectronico =
        'El correo electrónico es obligatorio.';
    }
  } else if (!validarCorreo(form.correoElectronico)) {
    errores.correoElectronico =
      'Ingrese un correo electrónico válido.';
  }

  /* ----------------------------------------------------------
     TELÉFONO
  ---------------------------------------------------------- */

  if (!form.telefono.trim()) {
    if (!esBorrador) {
      errores.telefono =
        'El teléfono es obligatorio.';
    }
  } else if (!validarTelefono(form.telefono)) {
    errores.telefono =
      'El teléfono debe contener exactamente 8 números.';
  }

  return errores;
};

/* ============================================================
   COMPONENTE
============================================================ */

interface Props {
  onExito?: () => void;
}

function RegistroEmprendimiento({ onExito }: Props) {
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

  const [imagenes, setImagenes] = useState<ImagenSeleccionada[]>([]);
  const imagenesRef = useRef<ImagenSeleccionada[]>([]);
  const [portadaIndex, setPortadaIndex] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const dragDepth = useRef(0);

  const [enviando, setEnviando] =
    useState(false);

  const [guardandoBorrador, setGuardandoBorrador] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const [exito, setExito] =
    useState(false);

  const procesando = enviando || guardandoBorrador;

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

  useEffect(() => () => {
    imagenesRef.current.forEach((imagen) => URL.revokeObjectURL(imagen.preview));
  }, []);

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
            ? undefined
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


    const nuevoFormulario = {
      ...form,
      [name]: value,
    };

    const nuevosErrores =
      validarFormulario(nuevoFormulario, false);

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

  const agregarImagenes = (archivos: FileList | File[]) => {
    const tiposPermitidos = ['image/png', 'image/jpeg', 'image/webp'];
    const existentes = new Set(
      imagenes.map(({ archivo }) => `${archivo.name}-${archivo.size}-${archivo.lastModified}`),
    );
    const nuevas: ImagenSeleccionada[] = [];

    Array.from(archivos).forEach((archivo) => {
      const clave = `${archivo.name}-${archivo.size}-${archivo.lastModified}`;
      if (existentes.has(clave)) return;
      if (archivo.size > 5 * 1024 * 1024 || !tiposPermitidos.includes(archivo.type)) {
        setError('Las imágenes deben ser PNG, JPG o WEBP y no superar los 5MB cada una.');
        return;
      }
      existentes.add(clave);
      nuevas.push({ archivo, preview: URL.createObjectURL(archivo) });
    });

    if (nuevas.length) {
      setImagenes((actuales) => {
        const siguientes = [...actuales, ...nuevas];
        imagenesRef.current = siguientes;
        return siguientes;
      });
      setError(null);
    }
  };

  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) agregarImagenes(e.target.files);
    e.target.value = '';
  };

  const handleDrop = (e: DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    dragDepth.current = 0;
    setIsDragging(false);
    agregarImagenes(e.dataTransfer.files);
  };

  const handleRemoveImage = (indice: number) => {
    setImagenes((actuales) => {
      const imagen = actuales[indice];
      if (imagen) URL.revokeObjectURL(imagen.preview);
      const restantes = actuales.filter((_, index) => index !== indice);
      imagenesRef.current = restantes;
      setPortadaIndex((actual) => restantes.length ? Math.min(actual, restantes.length - 1) : 0);
      return restantes;
    });
  };

  const procesarEnvio = async (esBorrador: boolean) => {
    setError(null);
    setExito(false);

    const erroresFormulario =
      validarFormulario(form, esBorrador);

    setErrores(erroresFormulario);

    if (Object.keys(erroresFormulario).length > 0) {
      setError(
        esBorrador
          ? 'Algunos campos tienen un formato inválido. Corríjalos o déjelos vacíos.'
          : 'Por favor, corrija los campos indicados antes de continuar.'
      );

      return;
    }

    if (esBorrador) {
      setGuardandoBorrador(true);
    } else {
      setEnviando(true);
    }

    try {
      const formDataToSend =
        new FormData();

     

      if (form.nombre.trim()) {
        formDataToSend.append(
          'nombre',
          form.nombre.trim()
        );
      } else if (!esBorrador) {
        formDataToSend.append('nombre', form.nombre.trim());
      }

      if (form.descripcion.trim()) {
        formDataToSend.append(
          'descripcion',
          form.descripcion.trim()
        );
      }

      if (form.categoriaId) {
        formDataToSend.append(
          'categoriaId',
          form.categoriaId
        );
      }

      if (form.direccion.trim()) {
        formDataToSend.append(
          'direccion',
          form.direccion.trim()
        );
      }

      if (form.latitud.trim()) {
        formDataToSend.append(
          'latitud',
          form.latitud
        );
      }

      if (form.longitud.trim()) {
        formDataToSend.append(
          'longitud',
          form.longitud
        );
      }

      if (form.correoElectronico.trim()) {
        formDataToSend.append(
          'correoElectronico',
          form.correoElectronico.trim()
        );
      }

      if (form.telefono.trim()) {
        formDataToSend.append(
          'telefono',
          form.telefono
        );
      }

              const imagenesOrdenadas = portadaIndex > 0
                ? [imagenes[portadaIndex], ...imagenes.filter((_, indice) => indice !== portadaIndex)]
                : imagenes;
              imagenesOrdenadas.forEach(({ archivo }) => formDataToSend.append('imagenes', archivo));

      formDataToSend.append(
        'modo',
        esBorrador ? 'borrador' : 'cambios'
      );

          await crearEmprendimiento(
        formDataToSend
      );

      setExito(true);
      setForm(INITIAL_FORM);
      setErrores({});
      imagenes.forEach(({ preview }) => URL.revokeObjectURL(preview));
      setImagenes([]);
      imagenesRef.current = [];
      setPortadaIndex(0);

      if (onExito) {
        window.setTimeout(() => {
          onExito();
        }, 1200);
      }

    } catch (err) {
      const mensaje =
        err instanceof Error
          ? err.message
          : 'Ocurrió un error al guardar el emprendimiento.';

      setError(mensaje);

    } finally {
      setEnviando(false);
      setGuardandoBorrador(false);
    }
  };

  const handleSubmit = async (
    e: SyntheticEvent<HTMLFormElement>
  ) => {
    e.preventDefault();
    await procesarEnvio(false);
  };

  const handleGuardarBorrador = async () => {
    await procesarEnvio(true);
  };

  /* ==========================================================
     ESTILOS
  ========================================================== */

  const inputClase =
    'w-full rounded-2xl border bg-[#fffef9] px-4 py-3 text-stone-800 outline-none motion-safe:transition-[border-color,background-color,box-shadow] motion-safe:duration-200 focus-visible:ring-4 disabled:cursor-not-allowed disabled:bg-stone-100 disabled:text-stone-500 ';

  const obtenerClaseInput = (
    campo: keyof FormErrors
  ) => {
    return `${inputClase} ${
      errores[campo]
        ? 'border-red-400 bg-red-50 focus-visible:border-red-500 focus-visible:ring-red-100'
        : 'border-stone-200 focus-visible:border-emerald-700 focus-visible:bg-white focus-visible:ring-emerald-100'
    }`;
  };

  const labelClase =
    'flex flex-col gap-1.5 text-sm font-semibold text-stone-700';

  /* ==========================================================
     CARGANDO CATEGORÍAS
  ========================================================== */

  if (cargandoCategorias) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex items-center gap-3 text-stone-600">
          <span className="h-5 w-5 rounded-full border-2 border-emerald-800 border-t-transparent motion-safe:animate-spin motion-reduce:animate-none" />

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
      <div className="mx-auto max-w-xl rounded-2xl border border-red-200 bg-red-50 p-6 text-center shadow-sm" role="alert">
        <p className="font-medium text-red-700">
          Error al cargar categorías:{' '}
          {errorCategorias}
        </p>

        <button
          type="button"
          onClick={() => void cargarCategorias()}
          className="mt-3 rounded-lg text-sm font-semibold text-red-800 underline underline-offset-4 hover:text-red-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2"
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
        <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-6 shadow-sm">
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
    <div className="mx-auto w-full max-w-3xl overflow-hidden rounded-[2rem] border border-emerald-950/10 bg-[#fffef9] p-5 shadow-[0_24px_70px_rgba(20,83,45,0.12)] sm:p-8">

      {/* ENCABEZADO */}

      <div className="relative mb-8 overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-950 via-emerald-900 to-green-800 p-6 text-white shadow-lg sm:p-8">
        <div className="pointer-events-none absolute -right-12 -top-16 h-44 w-44 rounded-full bg-[#d9d823]/15 blur-3xl" aria-hidden="true" />
        <div className="relative mb-3 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.14em] text-emerald-50 backdrop-blur-sm">
          <span className="h-2 w-2 rounded-full bg-[#d9d823]" />
          Directorio de emprendimientos
        </div>

        <h2 className="relative text-2xl font-bold tracking-tight text-white sm:text-3xl">
          Registrar nuevo emprendimiento
        </h2>

        <p className="relative mt-2 max-w-2xl text-sm leading-6 text-emerald-50/85">
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
            <h3 className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-800">
              1. Información general
            </h3>

            <p className="mt-1 text-xs text-stone-500">
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

              <span className="text-xs text-stone-400">
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
            <h3 className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-800">
              2. Imagen representativa
            </h3>

            <p className="mt-1 text-xs text-stone-500">
              Agregue una imagen para identificar
              visualmente el emprendimiento.
            </p>
          </div>

          <label
            className={`flex cursor-pointer flex-col items-center justify-center rounded-3xl border-2 border-dashed p-6 text-center motion-safe:transition-colors motion-safe:duration-200 sm:p-8 ${isDragging ? 'border-[#009444] bg-[#8DC63F]/15' : 'border-stone-300 bg-stone-50/70 hover:border-emerald-600 hover:bg-emerald-50/70'} focus-within:border-emerald-700 focus-within:ring-4 focus-within:ring-emerald-100`}
            onDragEnter={(event) => { event.preventDefault(); dragDepth.current += 1; setIsDragging(true); }}
            onDragOver={(event) => { event.preventDefault(); event.dataTransfer.dropEffect = 'copy'; }}
            onDragLeave={(event) => { event.preventDefault(); dragDepth.current -= 1; if (dragDepth.current <= 0) { dragDepth.current = 0; setIsDragging(false); } }}
            onDrop={handleDrop}
          >

              <svg
                className="h-10 w-10 text-emerald-700"
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

              <span className="mt-3 text-sm font-semibold text-stone-700">
                {isDragging ? 'Soltá las fotografías aquí' : 'Arrastrá tus fotografías aquí o seleccioná archivos'}
              </span>

              <span className="mt-1 text-xs text-stone-500">
                JPG · PNG · WEBP · Máximo 5MB cada una
              </span>

              <input
                type="file"
                multiple
                accept="image/png, image/jpeg, image/webp"
                onChange={handleImageChange}
                className="hidden"
              />
            </label>
          {imagenes.length > 0 && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {imagenes.map((imagenSeleccionada, indice) => (
                <div key={imagenSeleccionada.preview} className="relative overflow-hidden rounded-2xl border border-emerald-950/10 bg-stone-100 shadow-sm">
                  <img src={imagenSeleccionada.preview} alt={`Vista previa ${indice + 1}`} className="aspect-square h-full w-full object-cover" />
                  <span className="absolute left-2 top-2 rounded-full bg-[#095540]/90 px-2 py-1 text-[10px] font-bold text-white">
                    {indice === portadaIndex ? 'Portada' : `Foto ${indice + 1}`}
                  </span>
                  {indice !== portadaIndex && (
                    <button type="button" onClick={() => setPortadaIndex(indice)} className="absolute bottom-2 left-2 rounded-lg bg-white/90 px-2 py-1 text-[10px] font-bold text-[#095540] backdrop-blur-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#009444]">
                      Hacer portada
                    </button>
                  )}
                  <button type="button" onClick={() => handleRemoveImage(indice)} className="absolute right-2 top-2 rounded-full bg-red-700 p-1.5 text-white shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white" aria-label={`Eliminar fotografía ${indice + 1}`}>
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ====================================================
            UBICACIÓN
        ==================================================== */}

        <div className="space-y-5">

          <div>
            <h3 className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-800">
              3. Ubicación
            </h3>

            <p className="mt-1 text-xs text-stone-500">
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
            <h3 className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-800">
              4. Datos de contacto
            </h3>

            <p className="mt-1 text-xs text-stone-500">
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
                  <p className="text-xs text-stone-400">
                    8 dígitos numéricos
                  </p>
                )}

                <span className="text-xs text-stone-400">
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
          <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700" role="alert">
            <span className="text-lg">⚠</span>

            <div>
              <p className="font-bold">
                No se pudo guardar el emprendimiento
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
          <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800" role="status" aria-live="polite">
            <span className="text-lg">✓</span>

            <div>
              <p className="font-bold">
                ¡Emprendimiento guardado correctamente!
              </p>

              <p className="mt-1">
                La información fue enviada correctamente.
              </p>
            </div>
          </div>
        )}

        {/* ====================================================
            BOTONES
        ==================================================== */}

        <div className="border-t border-stone-200 pt-6">

          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="submit"
              disabled={procesando}
              className="flex-1 rounded-2xl bg-emerald-900 px-6 py-3.5 font-semibold text-white shadow-md motion-safe:transition-all motion-safe:duration-200 motion-safe:hover:-translate-y-0.5 hover:bg-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8dc63f] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 motion-reduce:transform-none"
            >
              {enviando
                ? 'Guardando registro...'
                : 'Registrar emprendimiento'}
            </button>

            <button
              type="button"
              onClick={() => void handleGuardarBorrador()}
              disabled={procesando}
              className="flex-1 rounded-2xl border-2 border-emerald-800 bg-white px-6 py-3.5 font-semibold text-emerald-900 shadow-sm motion-safe:transition-colors motion-safe:duration-200 hover:bg-emerald-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {guardandoBorrador
                ? 'Guardando borrador...'
                : 'Guardar como borrador'}
            </button>
          </div>

          <p className="mt-3 text-center text-xs text-stone-400">
            Los campos marcados con * son obligatorios para el registro completo.
            Al guardar como borrador puede dejarlos vacíos.
          </p>
        </div>
      </form>
    </div>
  );
}

export default RegistroEmprendimiento;
