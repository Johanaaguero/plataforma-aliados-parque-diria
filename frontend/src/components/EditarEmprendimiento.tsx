import {
  useState,
  useEffect,
  useCallback,
  useRef,
  type ChangeEvent,
  type DragEvent,
  type SyntheticEvent,
} from 'react';

import PhoneInput, {
  isValidPhoneNumber,
} from 'react-phone-number-input';

import 'react-phone-number-input/style.css';

import { obtenerCategorias } from '../services/categoriaEmprendimientoService';
import type { CategoriaEmprendimiento } from '../services/categoriaEmprendimientoService';

import {
  obtenerEmprendimientoPorId,
  actualizarEmprendimiento,
} from '../services/emprendimientoService';

import SelectorUbicacion from './SelectorUbicacion';

interface FormState {
  nombre: string;
  descripcion: string;
  categoriaId: string;
  provincia: string;
  canton: string;
  distrito: string;
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
  provincia?: string;
  canton?: string;
  distrito?: string;
  direccion?: string;
  latitud?: string;
  longitud?: string;
  correoElectronico?: string;
  telefono?: string;
}

interface ImagenExistente {
  id: number;
  imagen: string;
  esPortada: boolean;
}

interface ImagenNueva {
  archivo: File;
  preview: string;
}

type ModoGuardado = 'cambios' | 'borrador';

interface EditarEmprendimientoProps {
  id: number;
  onActualizado?: () => void;
  onCancelar?: () => void;
}

const INITIAL_FORM: FormState = {
  nombre: '',
  descripcion: '',
  categoriaId: '',
  provincia: '',
  canton: '',
  distrito: '',
  direccion: '',
  latitud: '',
  longitud: '',
  correoElectronico: '',
  telefono: '',
};

const validarCorreo = (
  correo: string,
): boolean => {
  const regex =
    /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  return regex.test(correo.trim());
};

/*
 * El componente PhoneInput trabaja con números
 * internacionales en formato E.164.
 *
 * Ejemplo:
 * +50688888888
 *
 * Si el teléfono existente está guardado
 * como 8 dígitos:
 *
 * 88888888
 *
 * se convierte automáticamente a:
 *
 * +50688888888
 */
const normalizarTelefono = (
  telefono: string,
): string => {
  const valor = telefono.trim();

  if (!valor) {
    return '';
  }

  if (valor.startsWith('+')) {
    return valor;
  }

  const solamenteNumeros =
    valor.replace(/\D/g, '');

  if (solamenteNumeros.length === 8) {
    return `+506${solamenteNumeros}`;
  }

  return valor;
};

const validarTelefono = (
  telefono: string,
): boolean => {
  return (
    !!telefono.trim() &&
    isValidPhoneNumber(telefono)
  );
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

  if (!form.nombre.trim()) {
    errores.nombre =
      'El nombre del emprendimiento es obligatorio.';
  } else if (
    form.nombre.trim().length < 3
  ) {
    errores.nombre =
      'El nombre debe tener al menos 3 caracteres.';
  } else if (
    form.nombre.trim().length > 150
  ) {
    errores.nombre =
      'El nombre no puede superar los 150 caracteres.';
  }

  if (
    form.descripcion.trim().length > 500
  ) {
    errores.descripcion =
      'La descripción no puede superar los 500 caracteres.';
  }

  if (!form.categoriaId) {
    errores.categoriaId =
      'Debe seleccionar una categoría.';
  }

  if (!form.provincia.trim()) {
    errores.provincia =
      'La provincia es obligatoria.';
  }

  if (!form.canton.trim()) {
    errores.canton =
      'El cantón es obligatorio.';
  }

  if (!form.distrito.trim()) {
    errores.distrito =
      'El distrito es obligatorio.';
  }

  if (!form.direccion.trim()) {
    errores.direccion =
      'La dirección es obligatoria.';
  } else if (
    form.direccion.trim().length > 250
  ) {
    errores.direccion =
      'La dirección no puede superar los 250 caracteres.';
  }

  if (!form.latitud.trim()) {
    errores.latitud =
      'La latitud es obligatoria.';
  } else if (
    !validarNumero(form.latitud)
  ) {
    errores.latitud =
      'Ingrese una latitud válida.';
  } else {
    const latitud = Number(form.latitud);

    if (
      latitud < -90 ||
      latitud > 90
    ) {
      errores.latitud =
        'La latitud debe estar entre -90 y 90.';
    }
  }

  if (!form.longitud.trim()) {
    errores.longitud =
      'La longitud es obligatoria.';
  } else if (
    !validarNumero(form.longitud)
  ) {
    errores.longitud =
      'Ingrese una longitud válida.';
  } else {
    const longitud = Number(
      form.longitud,
    );

    if (
      longitud < -180 ||
      longitud > 180
    ) {
      errores.longitud =
        'La longitud debe estar entre -180 y 180.';
    }
  }

  if (!form.correoElectronico.trim()) {
    errores.correoElectronico =
      'El correo electrónico es obligatorio.';
  } else if (
    !validarCorreo(
      form.correoElectronico,
    )
  ) {
    errores.correoElectronico =
      'Ingrese un correo electrónico válido.';
  }

  if (!form.telefono.trim()) {
    errores.telefono =
      'El teléfono es obligatorio.';
  } else if (
    !validarTelefono(form.telefono)
  ) {
    errores.telefono =
      'Ingrese un número de teléfono válido.';
  }

  return errores;
};

const validarFormularioBorrador = (
  form: FormState,
): FormErrors => {
  const errores: FormErrors = {};

  if (
    form.nombre.trim() &&
    (
      form.nombre.trim().length < 3 ||
      form.nombre.trim().length > 150
    )
  ) {
    errores.nombre =
      form.nombre.trim().length < 3
        ? 'El nombre debe tener al menos 3 caracteres.'
        : 'El nombre no puede superar los 150 caracteres.';
  }

  if (
    form.descripcion.trim().length > 500
  ) {
    errores.descripcion =
      'La descripción no puede superar los 500 caracteres.';
  }

  if (
    form.provincia.trim().length > 100
  ) {
    errores.provincia =
      'La provincia no puede superar los 100 caracteres.';
  }

  if (
    form.canton.trim().length > 100
  ) {
    errores.canton =
      'El cantón no puede superar los 100 caracteres.';
  }

  if (
    form.distrito.trim().length > 100
  ) {
    errores.distrito =
      'El distrito no puede superar los 100 caracteres.';
  }

  if (
    form.direccion.trim().length > 250
  ) {
    errores.direccion =
      'La dirección no puede superar los 250 caracteres.';
  }

  if (form.latitud.trim()) {
    if (!validarNumero(form.latitud)) {
      errores.latitud =
        'Ingrese una latitud válida.';
    } else {
      const latitud = Number(
        form.latitud,
      );

      if (
        latitud < -90 ||
        latitud > 90
      ) {
        errores.latitud =
          'La latitud debe estar entre -90 y 90.';
      }
    }
  }

  if (form.longitud.trim()) {
    if (!validarNumero(form.longitud)) {
      errores.longitud =
        'Ingrese una longitud válida.';
    } else {
      const longitud = Number(
        form.longitud,
      );

      if (
        longitud < -180 ||
        longitud > 180
      ) {
        errores.longitud =
          'La longitud debe estar entre -180 y 180.';
      }
    }
  }

  if (
    form.correoElectronico.trim() &&
    !validarCorreo(
      form.correoElectronico,
    )
  ) {
    errores.correoElectronico =
      'Ingrese un correo electrónico válido.';
  }

  if (
    form.telefono.trim() &&
    !validarTelefono(form.telefono)
  ) {
    errores.telefono =
      'Ingrese un número de teléfono válido.';
  }

  return errores;
};

function EditarEmprendimiento({
  id,
  onActualizado,
  onCancelar,
}: EditarEmprendimientoProps) {
  const [categorias, setCategorias] =
    useState<CategoriaEmprendimiento[]>([]);

  const [cargando, setCargando] =
    useState(true);

  const [
    cargandoCategorias,
    setCargandoCategorias,
  ] = useState(true);

  const [
    imagenesExistentes,
    setImagenesExistentes,
  ] = useState<ImagenExistente[]>([]);

  const [
    imagenesNuevas,
    setImagenesNuevas,
  ] = useState<ImagenNueva[]>([]);

const [portadaNuevaIndex, setPortadaNuevaIndex] =
  useState<number | null>(null);

  const [isDragging, setIsDragging] =
    useState(false);

  const imagenesNuevasRef =
    useRef<ImagenNueva[]>([]);

  const dragDepth = useRef(0);

  const [errorCarga, setErrorCarga] =
    useState<string | null>(null);

  const [
    errorCategorias,
    setErrorCategorias,
  ] = useState<string | null>(null);

  const [form, setForm] =
    useState<FormState>(INITIAL_FORM);

  const [errores, setErrores] =
    useState<FormErrors>({});

  const [imagen, setImagen] =
    useState<File | null>(null);

  const [, setImagenActual] =
    useState<string | null>(null);

  const [
    imagenPreview,
    setImagenPreview,
  ] = useState<string | null>(null);

  const [
    eliminarImagenActual,
    setEliminarImagenActual,
  ] = useState(false);

  const [guardando, setGuardando] =
    useState(false);

  const [
    modoGuardando,
    setModoGuardando,
  ] = useState<ModoGuardado | null>(null);

  const [error, setError] =
    useState<string | null>(null);

  const [exito, setExito] =
    useState(false);

  const [modoExito, setModoExito] =
    useState<ModoGuardado | null>(null);

  /*
   * Controla si el selector personalizado
   * de categorías está abierto.
   */
  const [
    categoriaAbierta,
    setCategoriaAbierta,
  ] = useState(false);

  const cargarCategorias =
    useCallback(async () => {
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
    }, []);

  const cargarEmprendimiento =
    useCallback(async () => {
      if (
        !Number.isInteger(id) ||
        id <= 0
      ) {
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
          await obtenerEmprendimientoPorId(
            id,
          );

        let categoriaId = '';

        if (
          emprendimiento.categoria &&
          typeof emprendimiento.categoria ===
            'object'
        ) {
          categoriaId = String(
            emprendimiento.categoria.id,
          );
        }

        setForm({
          nombre:
            emprendimiento.nombre ?? '',

          descripcion:
            emprendimiento.descripcion ?? '',

          categoriaId,

          provincia:
            emprendimiento.provincia ?? '',

          canton:
            emprendimiento.canton ?? '',

          distrito:
            emprendimiento.distrito ?? '',

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
            normalizarTelefono(
              emprendimiento.telefono ?? '',
            ),
        });

        setImagenesExistentes(
          emprendimiento.imagenes?.length
            ? emprendimiento.imagenes
            : emprendimiento.imagen
              ? [
                  {
                    id: 0,
                    imagen:
                      emprendimiento.imagen,
                    esPortada: true,
                  },
                ]
              : [],
        );

        imagenesNuevasRef.current.forEach(
          (imagen) =>
            URL.revokeObjectURL(
              imagen.preview,
            ),
        );

        setImagenesNuevas([]);
        setPortadaNuevaIndex(null);
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

  useEffect(() => {
    void cargarCategorias();
    void cargarEmprendimiento();
  }, [
    cargarCategorias,
    cargarEmprendimiento,
  ]);

  /*
   * Cerrar el selector al presionar Escape.
   */
  useEffect(() => {
    const manejarEscape = (
      event: KeyboardEvent,
    ) => {
      if (
        event.key === 'Escape'
      ) {
        setCategoriaAbierta(false);
      }
    };

    document.addEventListener(
      'keydown',
      manejarEscape,
    );

    return () => {
      document.removeEventListener(
        'keydown',
        manejarEscape,
      );
    };
  }, []);

  useEffect(
    () => () => {
      imagenesNuevasRef.current.forEach(
        (imagen) =>
          URL.revokeObjectURL(
            imagen.preview,
          ),
      );
    },
    [],
  );

  useEffect(() => {
    return () => {
      if (imagenPreview) {
        URL.revokeObjectURL(
          imagenPreview,
        );
      }
    };
  }, [imagenPreview]);

  const handleChange = (
    e: ChangeEvent<
      HTMLInputElement |
        HTMLTextAreaElement |
        HTMLSelectElement
    >,
  ) => {
    const { name, value } =
      e.target;

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

  /*
   * Handler exclusivo del PhoneInput.
   */
  const handleTelefonoChange = (
    value: string | undefined,
  ) => {
    const nuevoTelefono =
      value ?? '';

    setForm((prev) => ({
      ...prev,
      telefono: nuevoTelefono,
    }));

    setErrores((prev) => ({
      ...prev,
      telefono:
        !nuevoTelefono
          ? 'El teléfono es obligatorio.'
          : !validarTelefono(
                nuevoTelefono,
              )
            ? 'Ingrese un número de teléfono válido.'
            : undefined,
    }));

    setError(null);
    setExito(false);
  };

  const handleUbicacionChange = (
    latitud: number,
    longitud: number,
  ) => {
    const nuevaLatitud =
      Number.isFinite(latitud)
        ? latitud.toFixed(6)
        : '';

    const nuevaLongitud =
      Number.isFinite(longitud)
        ? longitud.toFixed(6)
        : '';

    setForm((prev) => ({
      ...prev,
      latitud: nuevaLatitud,
      longitud: nuevaLongitud,
    }));

    setErrores((prev) => ({
      ...prev,
      latitud: undefined,
      longitud: undefined,
    }));

    setError(null);
    setExito(false);
  };

  /*
   * Agregar imágenes.
   */
  const agregarImagenes = (
    archivos: FileList | File[],
  ) => {
    const tiposPermitidos = [
      'image/png',
      'image/jpeg',
      'image/webp',
    ];

    const existentes = new Set(
      imagenesNuevas.map(
        ({ archivo }) =>
          `${archivo.name}-${archivo.size}-${archivo.lastModified}`,
      ),
    );

    const nuevas: ImagenNueva[] =
      [];

    Array.from(archivos).forEach(
      (archivo) => {
        const clave =
          `${archivo.name}-${archivo.size}-${archivo.lastModified}`;

        if (existentes.has(clave))
          return;

        if (
          archivo.size >
            5 * 1024 * 1024 ||
          !tiposPermitidos.includes(
            archivo.type,
          )
        ) {
          setError(
            'Las imágenes deben ser PNG, JPG o WEBP y no superar los 5MB cada una.',
          );

          return;
        }

        existentes.add(clave);

        nuevas.push({
          archivo,
          preview:
            URL.createObjectURL(
              archivo,
            ),
        });
      },
    );

    if (nuevas.length) {
      setImagenesNuevas(
        (actuales) => {
          const siguientes = [
            ...actuales,
            ...nuevas,
          ];

          imagenesNuevasRef.current =
            siguientes;

          return siguientes;
        },
      );

      setError(null);
      setExito(false);
    }
  };

  const handleImageChange = (
    e: ChangeEvent<HTMLInputElement>,
  ) => {
    if (e.target.files) {
      agregarImagenes(
        e.target.files,
      );
    }

    e.target.value = '';
  };

  const handleDrop = (
    e: DragEvent<HTMLLabelElement>,
  ) => {
    e.preventDefault();

    dragDepth.current = 0;
    setIsDragging(false);

    agregarImagenes(
      e.dataTransfer.files,
    );
  };

  const handleRemoveNewImage = (
    indice: number,
  ) => {
    setImagenesNuevas(

      (actuales) => {
        const imagen =
          actuales[indice];

        if (imagen) {
          URL.revokeObjectURL(
            imagen.preview,
          );
        }

        const restantes =
          actuales.filter(
            (_, index) =>
              index !== indice,
          );

        imagenesNuevasRef.current =
          restantes;

        return restantes;
      },
    );
    setPortadaNuevaIndex((actual) => {
  if (actual === null || actual === indice) {
    return null;
  }

  return actual > indice ? actual - 1 : actual;
});
  };

  const handleRemoveCurrentImage = (
    indice: number,
  ) => {
    setImagenesExistentes(
      (actuales) =>
        actuales.filter(
          (_, index) =>
            index !== indice,
        ),
    );

    setError(null);
  };

  /*
   * Seleccionar categoría.
   */
  const seleccionarCategoria = (
    categoriaId: number,
  ) => {
    const nuevoFormulario = {
      ...form,
      categoriaId: String(
        categoriaId,
      ),
    };

    setForm(nuevoFormulario);

    setErrores((prev) => ({
      ...prev,
      categoriaId: undefined,
    }));

    setCategoriaAbierta(false);

    setError(null);
    setExito(false);
  };

  /*
   * Categoría actualmente seleccionada.
   */
  const categoriaSeleccionada =
    categorias.find(
      (categoria) =>
        String(categoria.id) ===
        form.categoriaId,
    );

  const handleGuardar = async (
    e: SyntheticEvent,
    modo: ModoGuardado,
  ) => {
    e.preventDefault();

    setError(null);
    setExito(false);

    const erroresFormulario =
      modo === 'cambios'
        ? validarFormulario(form)
        : validarFormularioBorrador(
            form,
          );

    setErrores(
      erroresFormulario,
    );

    if (
      Object.keys(
        erroresFormulario,
      ).length > 0
    ) {
      setError(
        modo === 'cambios'
          ? 'Por favor, complete todos los campos obligatorios y corrija los campos indicados antes de continuar.'
          : 'Por favor, corrija los campos indicados antes de guardar el borrador.',
      );

      return;
    }

    setGuardando(true);
    setModoGuardando(modo);

    try {
      const formData =
        new FormData();

      formData.append(
        'nombre',
        form.nombre.trim(),
      );

      formData.append(
        'imagenesConservadas',
        JSON.stringify(
          imagenesExistentes
            .filter(
              (imagen) =>
                imagen.id > 0,
            )
            .map(
              (imagen) =>
                imagen.id,
            ),
        ),
      );

     const imagenNuevaPortada =
  portadaNuevaIndex !== null
    ? imagenesNuevas[portadaNuevaIndex]
    : undefined;

const imagenesNuevasOrdenadas = imagenNuevaPortada
  ? [
      imagenNuevaPortada,
      ...imagenesNuevas.filter(
        (_, indice) => indice !== portadaNuevaIndex,
      ),
    ]
  : imagenesNuevas;

imagenesNuevasOrdenadas.forEach(({ archivo }) =>
  formData.append('imagenes', archivo),
);

      const portadaExistente =
        imagenesExistentes.find(
          (imagen) =>
            imagen.esPortada,
        );

     if (imagenNuevaPortada) {
        formData.append(
          'portadaNueva',
          'true',
        );
      } else if (
        portadaExistente &&
        portadaExistente.id > 0
      ) {
        formData.append(
          'portadaImagenId',
          String(
            portadaExistente.id,
          ),
        );
      } else if (
        !imagenesExistentes.length &&
        !imagenesNuevas.length
      ) {
        formData.append(
          'eliminarImagen',
          'true',
        );
      }

      formData.append(
        'descripcion',
        form.descripcion.trim(),
      );

      formData.append(
        'categoriaId',
        form.categoriaId,
      );

      formData.append(
        'provincia',
        form.provincia.trim(),
      );

      formData.append(
        'canton',
        form.canton.trim(),
      );

      formData.append(
        'distrito',
        form.distrito.trim(),
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

      /*
       * Se envía el número completo
       * en formato internacional.
       *
       * Ejemplo:
       * +50688888888
       */
      formData.append(
        'telefono',
        form.telefono,
      );

      formData.append(
        'modo',
        modo,
      );

      if (
        eliminarImagenActual &&
        !imagen
      ) {
        formData.append(
          'eliminarImagen',
          'true',
        );
      }

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
      setModoExito(modo);
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
      setModoGuardando(null);
    }
  };

  const inputClase =
    'w-full rounded-2xl border bg-[#fffef9] px-4 py-3 text-stone-800 outline-none motion-safe:transition-[border-color,background-color,box-shadow] motion-safe:duration-200 focus-visible:ring-4 disabled:cursor-not-allowed disabled:bg-stone-100 disabled:text-stone-500';

  const obtenerClaseInput = (
    campo: keyof FormErrors,
  ) => {
    return `${inputClase} ${
      errores[campo]
        ? 'border-red-400 bg-red-50 focus-visible:border-red-500 focus-visible:ring-red-100'
        : 'border-stone-200 focus-visible:border-emerald-700 focus-visible:bg-white focus-visible:ring-emerald-100'
    }`;
  };

  const labelClase =
    'flex flex-col gap-1.5 text-sm font-semibold text-stone-700';

  if (
    cargando ||
    cargandoCategorias
  ) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex items-center gap-3 text-stone-600">
          <span className="h-5 w-5 rounded-full border-2 border-emerald-800 border-t-transparent motion-safe:animate-spin motion-reduce:animate-none" />

          <span>
            Cargando información...
          </span>
        </div>
      </div>
    );
  }

  if (errorCarga) {
    return (
      <div
        className="mx-auto max-w-xl rounded-2xl border border-red-200 bg-red-50 p-6 text-center shadow-sm"
        role="alert"
      >
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
          className="mt-4 rounded-xl bg-red-700 px-4 py-2 text-sm font-semibold text-white motion-safe:transition-colors hover:bg-red-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2"
        >
          Reintentar
        </button>

        {onCancelar && (
          <button
            type="button"
            onClick={onCancelar}
            className="ml-2 rounded-xl border border-stone-300 bg-white px-4 py-2 text-sm font-semibold text-stone-700 motion-safe:transition-colors hover:bg-stone-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-400 focus-visible:ring-offset-2"
          >
            Regresar
          </button>
        )}
      </div>
    );
  }

  if (errorCategorias) {
    return (
      <div
        className="mx-auto max-w-xl rounded-2xl border border-red-200 bg-red-50 p-6 text-center shadow-sm"
        role="alert"
      >
        <p className="font-medium text-red-700">
          Error al cargar categorías:{' '}
          {errorCategorias}
        </p>

        <button
          type="button"
          onClick={() =>
            void cargarCategorias()
          }
          className="mt-3 rounded-lg text-sm font-semibold text-red-800 underline underline-offset-4 hover:text-red-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2"
        >
          Reintentar
        </button>
      </div>
    );
  }

  if (categorias.length === 0) {
    return (
      <div className="mx-auto max-w-xl rounded-2xl border border-amber-200 bg-amber-50 p-6">
        <strong className="block text-base text-amber-900">
          No hay categorías disponibles.
        </strong>

        <p className="mt-1 text-sm text-amber-800">
          Debe existir al menos una categoría para poder editar el emprendimiento.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl overflow-hidden rounded-[2rem] border border-white/20 bg-white/70 p-5 shadow-xl shadow-black/5 backdrop-blur-lg dark:border-white/10 dark:bg-slate-900/70 dark:shadow-black/20 sm:p-8">
      <div className="relative mb-8 overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-950 via-emerald-900 to-green-800 p-6 text-white shadow-lg sm:p-8">
        <div
          className="pointer-events-none absolute -right-12 -top-16 h-44 w-44 rounded-full bg-[#d9d823]/15 blur-3xl"
          aria-hidden="true"
        />

        <div className="relative mb-3 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.14em] text-emerald-50 backdrop-blur-sm">
          <span className="h-2 w-2 rounded-full bg-[#d9d823]" />

          Edición de emprendimiento
        </div>

        <h2 className="relative text-2xl font-bold tracking-tight text-white sm:text-3xl">
          Editar emprendimiento
        </h2>

        <p className="relative mt-2 max-w-2xl text-sm leading-6 text-emerald-50/85">
          Modifique la información del emprendimiento. Puede guardar los cambios
          definitivos o guardar como borrador para continuar más tarde.
        </p>
      </div>

      <form
        onSubmit={(e) =>
          handleGuardar(e, 'cambios')
        }
        noValidate
        className="space-y-8"
      >
        <div className="space-y-5">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-800">
              1. Información general
            </h3>

            <p className="mt-1 text-xs text-stone-500">
              Información principal del emprendimiento.
            </p>
          </div>

          <label className={labelClase}>
            Nombre del emprendimiento *

            <input
              name="nombre"
              value={form.nombre}
              onChange={handleChange}
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

          {/* ==========================================
              SELECTOR VISUAL DE CATEGORÍA
              ========================================== */}

          <div className="mx-auto w-full max-w-2xl rounded-3xl border border-emerald-900/10 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-800">
                <svg
                  className="h-5 w-5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <rect
                    x="3"
                    y="3"
                    width="7"
                    height="7"
                    rx="1"
                    strokeWidth="2"
                  />

                  <rect
                    x="14"
                    y="3"
                    width="7"
                    height="7"
                    rx="1"
                    strokeWidth="2"
                  />

                  <rect
                    x="3"
                    y="14"
                    width="7"
                    height="7"
                    rx="1"
                    strokeWidth="2"
                  />

                  <rect
                    x="14"
                    y="14"
                    width="7"
                    height="7"
                    rx="1"
                    strokeWidth="2"
                  />
                </svg>
              </div>

              <div>
                <label
                  htmlFor="categoriaId"
                  className="block text-sm font-bold text-stone-800"
                >
                  Categoría{' '}
                  <span className="text-emerald-800">
                    *
                  </span>
                </label>

                <p className="mt-1 text-xs font-normal text-stone-500">
                  Seleccione la categoría que mejor representa su emprendimiento.
                </p>
              </div>
            </div>

            <div className="relative">
              {/* Botón principal */}
              <button
                type="button"
                id="categoriaId"
                onClick={() =>
                  setCategoriaAbierta(
                    (abierta) =>
                      !abierta,
                  )
                }
                className={`flex w-full items-center justify-between rounded-2xl border bg-[#fffef9] px-4 py-3 text-left outline-none motion-safe:transition-all motion-safe:duration-200 ${
                  errores.categoriaId
                    ? 'border-red-400 bg-red-50 focus-visible:ring-4 focus-visible:ring-red-100'
                    : categoriaAbierta
                      ? 'border-emerald-700 bg-white shadow-[0_0_0_4px_rgba(16,185,129,0.10)]'
                      : 'border-stone-200 hover:border-emerald-500 hover:bg-white focus-visible:border-emerald-700 focus-visible:ring-4 focus-visible:ring-emerald-100'
                }`}
                aria-haspopup="listbox"
                aria-expanded={
                  categoriaAbierta
                }
              >
                <div className="flex min-w-0 items-center gap-3">
                  {/* Ícono */}
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl motion-safe:transition-colors motion-safe:duration-200 ${
                      categoriaSeleccionada
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-stone-100 text-stone-400'
                    }`}
                  >
                    <svg
                      className="h-5 w-5"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      aria-hidden="true"
                    >
                      <path
                        d="M4 6.5A2.5 2.5 0 0 1 6.5 4h4A2.5 2.5 0 0 1 13 6.5v4a2.5 2.5 0 0 1-2.5 2.5h-4A2.5 2.5 0 0 1 4 10.5v-4Z"
                        strokeWidth="1.8"
                      />

                      <path
                        d="M13 13.5a2.5 2.5 0 0 1 2.5-2.5h2a2.5 2.5 0 0 1 2.5 2.5v4a2.5 2.5 0 0 1-2.5 2.5h-2a2.5 2.5 0 0 1-2.5-2.5v-4Z"
                        strokeWidth="1.8"
                      />
                    </svg>
                  </div>

                  {/* Texto seleccionado */}
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
                      Categoría seleccionada
                    </p>

                    <p
                      className={`truncate text-sm font-semibold ${
                        categoriaSeleccionada
                          ? 'text-stone-800'
                          : 'text-stone-400'
                      }`}
                    >
                      {categoriaSeleccionada
                        ? categoriaSeleccionada.nombre
                        : 'Selecciona una categoría'}
                    </p>
                  </div>
                </div>

                {/* Flecha */}
                <svg
                  className={`h-5 w-5 shrink-0 text-emerald-800 motion-safe:transition-transform motion-safe:duration-200 ${
                    categoriaAbierta
                      ? 'rotate-180'
                      : ''
                  }`}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    d="m6 9 6 6 6-6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                  />
                </svg>
              </button>

              {/* =====================================
                  MENÚ DE CATEGORÍAS
                  ===================================== */}

              {categoriaAbierta && (
                <div
                  className="absolute left-0 right-0 z-50 mt-2 overflow-hidden rounded-2xl border border-emerald-900/10 bg-white p-2 shadow-[0_20px_45px_rgba(20,83,45,0.15)]"
                  role="listbox"
                  aria-labelledby="categoriaId"
                >
                  <div className="mb-2 px-2 py-1.5">
                    <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-emerald-800">
                      Categorías disponibles
                    </p>

                    <p className="mt-0.5 text-xs text-stone-400">
                      Seleccione una opción
                    </p>
                  </div>

                  <div className="max-h-64 space-y-1 overflow-y-auto">
                    {categorias.map(
                      (categoria) => {
                        const seleccionada =
                          String(
                            categoria.id,
                          ) ===
                          form.categoriaId;

                        return (
                          <button
                            key={
                              categoria.id
                            }
                            type="button"
                            role="option"
                            aria-selected={
                              seleccionada
                            }
                            onClick={() =>
                              seleccionarCategoria(
                                categoria.id,
                              )
                            }
                            className={`group flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left outline-none motion-safe:transition-all motion-safe:duration-150 ${
                              seleccionada
                                ? 'bg-emerald-50 ring-1 ring-emerald-200'
                                : 'hover:bg-stone-50 hover:ring-1 hover:ring-stone-200 focus-visible:bg-stone-50 focus-visible:ring-2 focus-visible:ring-emerald-500'
                            }`}
                          >
                            {/* Ícono */}
                            <div
                              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl motion-safe:transition-colors ${
                                seleccionada
                                  ? 'bg-emerald-800 text-white'
                                  : 'bg-emerald-50 text-emerald-700 group-hover:bg-emerald-100'
                              }`}
                            >
                              <svg
                                className="h-5 w-5"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                aria-hidden="true"
                              >
                                <path
                                  d="M4 7.5A3.5 3.5 0 0 1 7.5 4h9A3.5 3.5 0 0 1 20 7.5v9a3.5 3.5 0 0 1-3.5 3.5h-9A3.5 3.5 0 0 1 4 16.5v-9Z"
                                  strokeWidth="1.8"
                                />

                                <path
                                  d="M8 9h8M8 13h5"
                                  strokeLinecap="round"
                                  strokeWidth="1.8"
                                />
                              </svg>
                            </div>

                            {/* Información */}
                            <div className="min-w-0 flex-1">
                              <p
                                className={`truncate text-sm font-semibold ${
                                  seleccionada
                                    ? 'text-emerald-900'
                                    : 'text-stone-700'
                                }`}
                              >
                                {
                                  categoria.nombre
                                }
                              </p>

                              <p className="mt-0.5 text-[11px] text-stone-400">
                                Categoría de emprendimiento
                              </p>
                            </div>

                            {/* Check */}
                            {seleccionada && (
                              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-800 text-white">
                                <svg
                                  className="h-4 w-4"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  aria-hidden="true"
                                >
                                  <path
                                    d="m5 12 4 4L19 6"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth="2.5"
                                  />
                                </svg>
                              </div>
                            )}
                          </button>
                        );
                      },
                    )}
                  </div>
                </div>
              )}
            </div>

            {errores.categoriaId && (
              <p className="mt-2 flex items-center gap-1 text-xs font-medium text-red-600">
                <span>⚠</span>
                {errores.categoriaId}
              </p>
            )}
          </div>

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

              <span className="text-xs text-stone-400">
                {form.descripcion.length}/500
              </span>
            </div>
          </label>
        </div>

        {/* ==========================================
            2. IMÁGENES
            ========================================== */}

        <div className="space-y-3">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-800">
              2. Imagen representativa
            </h3>

            <p className="mt-1 text-xs text-stone-500">
              Puede conservar la imagen actual o seleccionar una nueva.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {imagenesExistentes.map(
              (imagen, indice) => (
                <div
                  key={
                    imagen.id ||
                    imagen.imagen
                  }
                  className="relative overflow-hidden rounded-2xl border border-emerald-950/10 bg-stone-100 shadow-sm"
                >
                  <img
                    src={imagen.imagen}
                    alt={`Imagen existente ${indice + 1}`}
                    className="aspect-square h-full w-full object-cover"
                  />

                  {imagen.esPortada &&
                    portadaNuevaIndex === null && (
                      <span className="absolute left-2 top-2 rounded-full bg-[#095540]/90 px-2 py-1 text-[10px] font-bold text-white">
                        Portada
                      </span>
                    )}

                  {(!imagen.esPortada ||
                    portadaNuevaIndex !== null) &&
                    imagen.id > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          setPortadaNuevaIndex(null);

                          setImagenesExistentes((actuales) =>
                            actuales.map((actual) => ({
                              ...actual,
                              esPortada: actual.id === imagen.id,
                            })),
                          );
                        }}
                        className="absolute bottom-2 left-2 rounded-lg bg-white/90 px-2 py-1 text-[10px] font-bold text-[#095540] backdrop-blur-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#009444]"
                      >
                        Hacer portada
                      </button>
                    )}

                  <button
                    type="button"
                    onClick={() =>
                      handleRemoveCurrentImage(
                        indice,
                      )
                    }
                    className="absolute right-2 top-2 rounded-full bg-red-700 p-1.5 text-white shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                    aria-label={`Eliminar fotografía existente ${indice + 1}`}
                  >
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
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
              ),
            )}

            {imagenesNuevas.map(
              (imagen, indice) => (
                <div
                  key={imagen.preview}
                  className="relative overflow-hidden rounded-2xl border border-[#8DC63F]/50 bg-stone-100 shadow-sm"
                >
                  <img
                    src={imagen.preview}
                    alt={`Nueva fotografía ${indice + 1}`}
                    className="aspect-square h-full w-full object-cover"
                  />

                  {portadaNuevaIndex === indice && (
                    <span className="absolute left-2 top-2 rounded-full bg-[#095540]/90 px-2 py-1 text-[10px] font-bold text-white">
                      Portada
                    </span>
                  )}

                  {portadaNuevaIndex !== indice && (
                    <button
                      type="button"
                      onClick={() => setPortadaNuevaIndex(indice)}
                      className="absolute bottom-2 left-2 rounded-lg bg-white/90 px-2 py-1 text-[10px] font-bold text-[#095540] backdrop-blur-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#009444]"
                    >
                      Hacer portada
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() =>
                      handleRemoveNewImage(
                        indice,
                      )
                    }
                    className="absolute right-2 top-2 rounded-full bg-red-700 p-1.5 text-white shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                    aria-label={`Eliminar fotografía nueva ${indice + 1}`}
                  >
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
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
              ),
            )}
          </div>

          <label
            className={`flex cursor-pointer flex-col items-center justify-center rounded-3xl border-2 border-dashed p-6 text-center motion-safe:transition-colors motion-safe:duration-200 ${
              isDragging
                ? 'border-[#009444] bg-[#8DC63F]/15'
                : 'border-stone-300 bg-stone-50/70 hover:border-emerald-600 hover:bg-emerald-50/70'
            } focus-within:border-emerald-700 focus-within:ring-4 focus-within:ring-emerald-100`}
            onDragEnter={(event) => {
              event.preventDefault();

              dragDepth.current += 1;
              setIsDragging(true);
            }}
            onDragOver={(event) => {
              event.preventDefault();

              event.dataTransfer.dropEffect =
                'copy';
            }}
            onDragLeave={(event) => {
              event.preventDefault();

              dragDepth.current -= 1;

              if (
                dragDepth.current <=
                0
              ) {
                dragDepth.current = 0;
                setIsDragging(false);
              }
            }}
            onDrop={handleDrop}
          >
            <svg
              className="h-8 w-8 text-emerald-700"
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

            <span className="mt-2 text-sm font-semibold text-stone-700">
              {isDragging
                ? 'Soltá las fotografías aquí'
                : 'Arrastrá tus fotografías aquí o seleccioná archivos'}
            </span>

            <span className="mt-1 text-xs text-stone-500">
              PNG, JPG o WEBP · Máximo 5MB cada una
            </span>

            <input
              type="file"
              multiple
              accept="image/png, image/jpeg, image/webp"
              onChange={
                handleImageChange
              }
              className="hidden"
            />
          </label>
        </div>

        {/* ==========================================
            3. UBICACIÓN
            ========================================== */}

        <div className="space-y-5">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-800">
              3. Ubicación geográfica
            </h3>

            <p className="mt-1 text-xs text-stone-500">
              Seleccione la ubicación en el mapa o ingrese las coordenadas manualmente.
            </p>
          </div>

          <SelectorUbicacion
            latitud={
              form.latitud
                ? Number(
                    form.latitud,
                  )
                : null
            }
            longitud={
              form.longitud
                ? Number(
                    form.longitud,
                  )
                : null
            }
            onChange={
              handleUbicacionChange
            }
          />

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
            <label className={labelClase}>
              Provincia *

              <input
                name="provincia"
                value={
                  form.provincia
                }
                onChange={
                  handleChange
                }
                maxLength={100}
                placeholder="Ej. Guanacaste"
                className={obtenerClaseInput(
                  'provincia',
                )}
              />

              {errores.provincia && (
                <p className="flex items-center gap-1 text-xs font-medium text-red-600">
                  <span>⚠</span>
                  {
                    errores.provincia
                  }
                </p>
              )}
            </label>

            <label className={labelClase}>
              Cantón *

              <input
                name="canton"
                value={
                  form.canton
                }
                onChange={
                  handleChange
                }
                maxLength={100}
                placeholder="Ej. Nicoya"
                className={obtenerClaseInput(
                  'canton',
                )}
              />

              {errores.canton && (
                <p className="flex items-center gap-1 text-xs font-medium text-red-600">
                  <span>⚠</span>
                  {errores.canton}
                </p>
              )}
            </label>

            <label className={labelClase}>
              Distrito *

              <input
                name="distrito"
                value={
                  form.distrito
                }
                onChange={
                  handleChange
                }
                maxLength={100}
                placeholder="Ej. Nicoya"
                className={obtenerClaseInput(
                  'distrito',
                )}
              />

              {errores.distrito && (
                <p className="flex items-center gap-1 text-xs font-medium text-red-600">
                  <span>⚠</span>
                  {errores.distrito}
                </p>
              )}
            </label>
          </div>

          <label className={labelClase}>
            Dirección exacta *

            <input
              name="direccion"
              value={
                form.direccion
              }
              onChange={
                handleChange
              }
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
            <label className={labelClase}>
              Latitud *

              <input
                name="latitud"
                type="number"
                step="any"
                value={
                  form.latitud
                }
                onChange={
                  handleChange
                }
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

            <label className={labelClase}>
              Longitud *

              <input
                name="longitud"
                type="number"
                step="any"
                value={
                  form.longitud
                }
                onChange={
                  handleChange
                }
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

        {/* ==========================================
            4. DATOS DE CONTACTO
            ========================================== */}

        <div className="space-y-5">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-800">
              4. Datos de contacto
            </h3>

            <p className="mt-1 text-xs text-stone-500">
              Información mediante la cual los visitantes podrán contactar al emprendimiento.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <label className={labelClase}>
              Correo electrónico *

              <input
                name="correoElectronico"
                type="email"
                value={
                  form.correoElectronico
                }
                onChange={
                  handleChange
                }
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

            {/* TELÉFONO INTERNACIONAL */}

            <div className={labelClase}>
              <label
                htmlFor="telefono"
                className="text-sm font-semibold text-stone-700"
              >
                Teléfono *
              </label>

              <div
                className={`w-full rounded-2xl border bg-[#fffef9] px-4 py-2 text-stone-800 outline-none motion-safe:transition-[border-color,background-color,box-shadow] motion-safe:duration-200 focus-within:ring-4 ${
                  errores.telefono
                    ? 'border-red-400 bg-red-50 focus-within:border-red-500 focus-within:ring-red-100'
                    : 'border-stone-200 focus-within:border-emerald-700 focus-within:bg-white focus-within:ring-emerald-100'
                }`}
              >
                <PhoneInput
                  id="telefono"
                  international
                  defaultCountry="CR"
                  value={
                    form.telefono ||
                    undefined
                  }
                  onChange={
                    handleTelefonoChange
                  }
                  countryCallingCodeEditable={
                    false
                  }
                  placeholder="8888 8888"
                  className="phone-input-editar"
                />
              </div>

              <div className="flex justify-between">
                {errores.telefono ? (
                  <p className="flex items-center gap-1 text-xs font-medium text-red-600">
                    <span>⚠</span>

                    {
                      errores.telefono
                    }
                  </p>
                ) : (
                  <p className="text-xs text-stone-400">
                    Seleccione el país e ingrese el número de teléfono.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* INFORMACIÓN */}

        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 text-lg">
              ℹ
            </span>

            <div>
              <p className="font-bold text-emerald-950">
                El estado de publicación no se modifica aquí
              </p>

              <p className="mt-1 text-sm leading-5 text-emerald-800">
                El estado del emprendimiento se administra por separado según los permisos correspondientes.
              </p>
            </div>
          </div>
        </div>

        {/* ERROR */}

        {error && (
          <div
            className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700"
            role="alert"
          >
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

        {/* ÉXITO */}

        {exito && (
          <div
            className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800"
            role="status"
            aria-live="polite"
          >
            <span className="text-lg">
              ✓
            </span>

            <div>
              <p className="font-bold">
                {modoExito ===
                'borrador'
                  ? '¡Borrador guardado correctamente!'
                  : '¡Emprendimiento actualizado correctamente!'}
              </p>

              <p className="mt-1">
                {modoExito ===
                'borrador'
                  ? 'Puede continuar completando la información más tarde.'
                  : 'Los cambios fueron guardados correctamente.'}
              </p>
            </div>
          </div>
        )}

        {/* BOTONES */}

        <div className="flex flex-col gap-3 border-t border-stone-200 pt-6 sm:flex-row">
          {onCancelar && (
            <button
              type="button"
              onClick={
                onCancelar
              }
              disabled={
                guardando
              }
              className="w-full rounded-2xl border border-stone-300 bg-white px-6 py-3.5 font-semibold text-stone-700 shadow-sm motion-safe:transition-colors motion-safe:duration-200 hover:bg-stone-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-400 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
            >
              Cancelar
            </button>
          )}

          <button
            type="button"
            onClick={(e) =>
              handleGuardar(
                e,
                'borrador',
              )
            }
            disabled={
              guardando
            }
            className="w-full rounded-2xl border-2 border-emerald-800 bg-white px-6 py-3.5 font-semibold text-emerald-900 shadow-sm motion-safe:transition-colors motion-safe:duration-200 hover:bg-emerald-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
          >
            {guardando &&
            modoGuardando ===
              'borrador'
              ? 'Guardando borrador...'
              : 'Guardar como borrador'}
          </button>

          <button
            type="submit"
            disabled={
              guardando
            }
            className="w-full rounded-2xl bg-emerald-900 px-6 py-3.5 font-semibold text-white shadow-md motion-safe:transition-all motion-safe:duration-200 motion-safe:hover:-translate-y-0.5 hover:bg-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8dc63f] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 motion-reduce:transform-none"
          >
            {guardando &&
            modoGuardando ===
              'cambios'
              ? 'Guardando cambios...'
              : 'Guardar cambios'}
          </button>
        </div>

        <p className="text-center text-xs text-stone-400">
          Los campos marcados con * son obligatorios para "Guardar cambios".
          El borrador permite dejarlos vacíos.
        </p>
      </form>
    </div>
  );
}

export default EditarEmprendimiento;