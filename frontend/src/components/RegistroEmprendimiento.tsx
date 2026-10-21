import {
  useState,
  useEffect,
  useCallback,
  useRef,
  type ChangeEvent,
  type DragEvent,
  type ReactNode,
  type SyntheticEvent,
} from 'react';

import { obtenerCategorias } from '../services/categoriaEmprendimientoService';
import type { CategoriaEmprendimiento } from '../services/categoriaEmprendimientoService';
import { crearEmprendimiento } from '../services/emprendimientoService';
import RegistroCategoria from './RegistroCategoria';
import { mostrarFeedback } from './ui/FeedbackToast';
import SelectorUbicacion from './SelectorUbicacion';

import PhoneInput, {
  isValidPhoneNumber,
} from 'react-phone-number-input';

import 'react-phone-number-input/style.css';

import CountrySelectPersonalizado from './CountrySelectPersonalizado';

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
  imagenes?: string;
}

type FormErrors = Partial<Record<keyof FormState, string>>;

interface ImagenSeleccionada {
  archivo: File;
  preview: string;
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

// =====================================================
// VALIDACIONES
// =====================================================

const validarCorreo = (correo: string): boolean => {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  return regex.test(correo.trim());
};

const validarTelefono = (telefono: string): boolean => {
  if (!telefono.trim()) {
    return false;
  }

  return isValidPhoneNumber(telefono);
};

const validarNumero = (valor: string): boolean => {
  if (!valor.trim()) {
    return false;
  }

  return Number.isFinite(Number(valor));
};

const validarFormulario = (
  form: FormState,
  esBorrador: boolean,
): FormErrors => {
  const errores: FormErrors = {};

  // NOMBRE
  if (!form.nombre.trim()) {
    if (!esBorrador) {
      errores.nombre = 'El nombre del emprendimiento es obligatorio.';
    }
  } else if (form.nombre.trim().length < 3) {
    errores.nombre = 'El nombre debe tener al menos 3 caracteres.';
  } else if (form.nombre.trim().length > 150) {
    errores.nombre = 'El nombre no puede superar los 150 caracteres.';
  }

  // DESCRIPCIÓN
  if (!form.descripcion.trim()) {
    errores.descripcion = 'La descripción es obligatoria.';
  } else if (form.descripcion.trim().length > 500) {
    errores.descripcion = 'La descripción no puede superar los 500 caracteres.';
  }

  // CATEGORÍA
  if (!form.categoriaId && !esBorrador) {
    errores.categoriaId = 'Debe seleccionar una categoría.';
  }

  // PROVINCIA
  if (!form.provincia.trim()) {
    if (!esBorrador) {
      errores.provincia = 'La provincia es obligatoria.';
    }
  } else if (form.provincia.trim().length > 100) {
    errores.provincia = 'La provincia no puede superar los 100 caracteres.';
  }

  // CANTÓN
  if (!form.canton.trim()) {
    if (!esBorrador) {
      errores.canton = 'El cantón es obligatorio.';
    }
  } else if (form.canton.trim().length > 100) {
    errores.canton = 'El cantón no puede superar los 100 caracteres.';
  }

  // DISTRITO
  if (!form.distrito.trim()) {
    if (!esBorrador) {
      errores.distrito = 'El distrito es obligatorio.';
    }
  } else if (form.distrito.trim().length > 100) {
    errores.distrito = 'El distrito no puede superar los 100 caracteres.';
  }

  // DIRECCIÓN
  if (!form.direccion.trim()) {
    if (!esBorrador) {
      errores.direccion = 'La dirección es obligatoria.';
    }
  } else if (form.direccion.trim().length > 250) {
    errores.direccion = 'La dirección no puede superar los 250 caracteres.';
  }

  // LATITUD
  if (!form.latitud.trim()) {
    if (!esBorrador) {
      errores.latitud = 'La latitud es obligatoria.';
    }
  } else if (!validarNumero(form.latitud)) {
    errores.latitud = 'Ingrese una latitud válida.';
  } else {
    const latitud = Number(form.latitud);

    if (latitud < -90 || latitud > 90) {
      errores.latitud = 'La latitud debe estar entre -90 y 90.';
    }
  }

  // LONGITUD
  if (!form.longitud.trim()) {
    if (!esBorrador) {
      errores.longitud = 'La longitud es obligatoria.';
    }
  } else if (!validarNumero(form.longitud)) {
    errores.longitud = 'Ingrese una longitud válida.';
  } else {
    const longitud = Number(form.longitud);

    if (longitud < -180 || longitud > 180) {
      errores.longitud = 'La longitud debe estar entre -180 y 180.';
    }
  }

  // CORREO
  if (!form.correoElectronico.trim()) {
    if (!esBorrador) {
      errores.correoElectronico = 'El correo electrónico es obligatorio.';
    }
  } else if (!validarCorreo(form.correoElectronico)) {
    errores.correoElectronico = 'Ingrese un correo electrónico válido.';
  }

  // TELÉFONO
  if (!form.telefono.trim()) {
    if (!esBorrador) {
      errores.telefono = 'El teléfono es obligatorio.';
    }
  } else if (!validarTelefono(form.telefono)) {
    errores.telefono = 'Ingrese un número de teléfono válido.';
  }

  return errores;
};

// =====================================================
// CATEGORÍAS: ICONO Y DESCRIPCIÓN
// =====================================================

const CATEGORIAS_META = [
  {
    claves: ['hotel', 'hosped', 'aloj', 'cabina'],
    descripcion: 'Alojamientos y servicios de hospedaje',
    path: 'M3 21h18M5 21V7a2 2 0 012-2h10a2 2 0 012 2v14M8 9h2M8 13h2M14 9h2M14 13h2M9 21v-4h6v4',
  },
  {
    claves: ['restaurante', 'aliment', 'comida', 'gastr'],
    descripcion: 'Restaurantes y servicios gastronómicos',
    path: 'M4 3v7a3 3 0 003 3h1V3M7 3v5M10 3v5M8 13v8M16 3v18M16 3c2.2 0 4-1.8 4-4V3h-4z',
  },
  {
    claves: ['turismo', 'tour', 'aventura', 'actividad'],
    descripcion: 'Tours, experiencias y actividades',
    path: 'M3 20l6-8 4 5 3-4 5 7M3 20h18M15 6a2 2 0 100-4 2 2 0 000 4z',
  },
  {
    claves: ['artesan', 'manual', 'arte'],
    descripcion: 'Productos y trabajos artesanales',
    path: 'M12 3l2.5 5.5L20 11l-5.5 2.5L12 19l-2.5-5.5L4 11l5.5-2.5L12 3zM19 17l.7 1.3L21 19l-1.3.7L19 21l-.7-1.3L17 19l1.3-.7L19 17z',
  },
  {
    claves: ['transporte', 'viaje', 'movilidad'],
    descripcion: 'Servicios de transporte y movilidad',
    path: 'M5 17h14l1-5-2-6H6L4 12l1 5zM7 17v2M17 17v2M6 12h12M8 15h.01M16 15h.01',
  },
];

const CATEGORIA_POR_DEFECTO = {
  descripcion: 'Servicios y actividades del emprendimiento',
  path: 'M4 5a2 2 0 012-2h12a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V5zM8 7h8M8 11h8M8 15h5',
};

const obtenerMetaCategoria = (nombre: string) => {
  const texto = nombre.toLowerCase();

  return (
    CATEGORIAS_META.find(({ claves }) =>
      claves.some((clave) => texto.includes(clave)),
    ) ?? CATEGORIA_POR_DEFECTO
  );
};

// =====================================================
// ICONOS REUTILIZABLES
// =====================================================

function Icono({
  path,
  className = 'h-5 w-5',
  strokeWidth = 1.8,
}: {
  path: string;
  className?: string;
  strokeWidth?: number;
}) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={strokeWidth}
        d={path}
      />
    </svg>
  );
}

const ICONO_GRID =
  'M4 6a2 2 0 012-2h4v6H4V6zM14 4h4a2 2 0 012 2v4h-6V4zM4 14h6v6H6a2 2 0 01-2-2v-4zM14 14h6v4a2 2 0 01-2 2h-4v-6z';
const ICONO_INFO =
  'M4 5a2 2 0 012-2h12a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V5zM8 7h8M8 11h8M8 15h5';
const ICONO_IMAGEN =
  'M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z';
const ICONO_UBICACION =
  'M12 21s-7-6.2-7-11a7 7 0 1114 0c0 4.8-7 11-7 11zM12 12a2 2 0 100-4 2 2 0 000 4z';
const ICONO_CONTACTO =
  'M3 8l9 6 9-6M5 5h14a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2z';

// =====================================================
// COMPONENTES DE PRESENTACIÓN
// =====================================================

function Seccion({
  icono,
  titulo,
  descripcion,
  children,
}: {
  icono: string;
  titulo: string;
  descripcion: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-5 rounded-3xl border border-white/60 bg-white/45 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_10px_32px_rgba(9,85,64,0.08)] backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.04] sm:p-6">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#8DC63F]/20 text-[#095540] dark:text-emerald-100">
          <Icono path={icono} />
        </div>

        <div>
          <h3 className="text-base font-bold text-[#095540] dark:text-emerald-100">
            {titulo}
          </h3>

          <p className="mt-0.5 text-xs text-stone-500 dark:text-slate-400">
            {descripcion}
          </p>
        </div>
      </div>

      {children}
    </section>
  );
}

function MensajeError({ mensaje }: { mensaje?: string }) {
  if (!mensaje) {
    return null;
  }

  return (
    <p className="flex items-center gap-1 text-xs font-medium text-red-600">
      <span aria-hidden="true">⚠</span>
      {mensaje}
    </p>
  );
}

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

  const [imagenes, setImagenes] =
    useState<ImagenSeleccionada[]>([]);

  const imagenesRef =
    useRef<ImagenSeleccionada[]>([]);

  const [portadaIndex, setPortadaIndex] =
    useState(0);

  const [isDragging, setIsDragging] =
    useState(false);

  const dragDepth =
    useRef(0);

  const [enviando, setEnviando] =
    useState(false);

  const [guardandoBorrador, setGuardandoBorrador] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const [, setExito] =
    useState(false);

  const [categoriaAbierta, setCategoriaAbierta] =
    useState(false);

  const categoriaRef =
    useRef<HTMLDivElement>(null);

  const procesando =
    enviando || guardandoBorrador;

  // =====================================================
  // CARGAR CATEGORÍAS
  // =====================================================

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
          : 'Error al obtener categorías',
      );
    } finally {
      setCargandoCategorias(false);
    }
  }, []);

  useEffect(() => {
    void cargarCategorias();
  }, [cargarCategorias]);

  // =====================================================
  // LIMPIAR URL DE IMÁGENES
  // =====================================================

  useEffect(
    () => () => {
      imagenesRef.current.forEach((imagen) =>
        URL.revokeObjectURL(imagen.preview),
      );
    },
    [],
  );

  // =====================================================
  // CERRAR CATEGORÍA AL HACER CLICK AFUERA
  // =====================================================

  useEffect(() => {
    const manejarClickFuera = (event: MouseEvent) => {
      if (
        categoriaRef.current &&
        !categoriaRef.current.contains(event.target as Node)
      ) {
        setCategoriaAbierta(false);
      }
    };

    document.addEventListener('mousedown', manejarClickFuera);

    return () => {
      document.removeEventListener('mousedown', manejarClickFuera);
    };
  }, []);

  // =====================================================
  // CAMBIOS GENERALES DEL FORMULARIO
  // =====================================================

  const handleChange = (
    e: ChangeEvent<
      HTMLInputElement |
      HTMLTextAreaElement |
      HTMLSelectElement
    >,
  ) => {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));

    const nuevosErrores = validarFormulario(
      { ...form, [name]: value },
      false,
    );

    setErrores((prev) => ({
      ...prev,
      [name]: nuevosErrores[name as keyof FormErrors],
    }));

    setError(null);
    setExito(false);
  };

  // =====================================================
  // CAMBIO DE TELÉFONO
  // =====================================================

  const handleTelefonoChange = (valor?: string) => {
    const nuevoValor = valor ?? '';

    setForm((prev) => ({
      ...prev,
      telefono: nuevoValor,
    }));

    const nuevosErrores = validarFormulario(
      { ...form, telefono: nuevoValor },
      false,
    );

    setErrores((prev) => ({
      ...prev,
      telefono: nuevosErrores.telefono,
    }));

    setError(null);
    setExito(false);
  };

  // =====================================================
  // SELECCIONAR CATEGORÍA
  // =====================================================

  const seleccionarCategoria = (categoriaId: string) => {
    setForm((prev) => ({
      ...prev,
      categoriaId,
    }));

    const nuevosErrores = validarFormulario(
      { ...form, categoriaId },
      false,
    );

    setErrores((prev) => ({
      ...prev,
      categoriaId: nuevosErrores.categoriaId,
    }));

    setCategoriaAbierta(false);
    setError(null);
    setExito(false);
  };

  // =====================================================
  // AGREGAR IMÁGENES
  // =====================================================

  const agregarImagenes = (archivos: FileList | File[]) => {
    const tiposPermitidos = [
      'image/png',
      'image/jpeg',
      'image/webp',
    ];

    const existentes = new Set(
      imagenes.map(
        ({ archivo }) =>
          `${archivo.name}-${archivo.size}-${archivo.lastModified}`,
      ),
    );

    const nuevas: ImagenSeleccionada[] = [];

    Array.from(archivos).forEach((archivo) => {
      const clave =
        `${archivo.name}-${archivo.size}-${archivo.lastModified}`;

      if (existentes.has(clave)) {
        return;
      }

      if (
        archivo.size > 5 * 1024 * 1024 ||
        !tiposPermitidos.includes(archivo.type)
      ) {
        setError(
          'Las imágenes deben ser PNG, JPG o WEBP y no superar los 5MB cada una.',
        );

        return;
      }

      existentes.add(clave);

      nuevas.push({
        archivo,
        preview: URL.createObjectURL(archivo),
      });
    });

    if (nuevas.length) {
      setImagenes((actuales) => {
        const siguientes = [...actuales, ...nuevas];

        imagenesRef.current = siguientes;

        return siguientes;
      });

      setErrores((prev) => ({
        ...prev,
        imagenes: undefined,
      }));
      setError(null);
    }
  };

  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      agregarImagenes(e.target.files);
    }

    e.target.value = '';
  };

  // =====================================================
  // DRAG & DROP
  // =====================================================

  const handleDrop = (e: DragEvent<HTMLLabelElement>) => {
    e.preventDefault();

    dragDepth.current = 0;
    setIsDragging(false);

    agregarImagenes(e.dataTransfer.files);
  };

  // =====================================================
  // ELIMINAR IMAGEN
  // =====================================================

  const handleRemoveImage = (indice: number) => {
    setImagenes((actuales) => {
      const imagen = actuales[indice];

      if (imagen) {
        URL.revokeObjectURL(imagen.preview);
      }

      const restantes = actuales.filter(
        (_, index) => index !== indice,
      );

      imagenesRef.current = restantes;

      setPortadaIndex((actual) =>
        restantes.length
          ? Math.min(actual, restantes.length - 1)
          : 0,
      );

      return restantes;
    });
  };

  // =====================================================
  // ENVÍO
  // =====================================================

  const procesarEnvio = async (esBorrador: boolean) => {
    setError(null);
    setExito(false);

    const erroresFormulario = validarFormulario(form, esBorrador);

     if (!esBorrador && imagenes.length === 0) {
      erroresFormulario.imagenes = 'Debe agregar al menos una imagen para registrar el emprendimiento.';
    } 

    setErrores(erroresFormulario);

    if (Object.keys(erroresFormulario).length > 0) {
      setError(
        esBorrador
          ? 'Algunos campos tienen un formato inválido. Corríjalos o déjelos vacíos.'
          : 'Por favor, corrija los campos indicados antes de continuar.',
      );

      return;
    }

    if (esBorrador) {
      setGuardandoBorrador(true);
    } else {
      setEnviando(true);
    }

    try {
      const formDataToSend = new FormData();

      if (form.nombre.trim()) {
        formDataToSend.append('nombre', form.nombre.trim());
      }

      if (form.descripcion.trim()) {
        formDataToSend.append('descripcion', form.descripcion.trim());
      }

      if (form.categoriaId) {
        formDataToSend.append('categoriaId', form.categoriaId);
      }

      if (form.provincia.trim()) {
        formDataToSend.append('provincia', form.provincia.trim());
      }

      if (form.canton.trim()) {
        formDataToSend.append('canton', form.canton.trim());
      }

      if (form.distrito.trim()) {
        formDataToSend.append('distrito', form.distrito.trim());
      }

      if (form.direccion.trim()) {
        formDataToSend.append('direccion', form.direccion.trim());
      }

      if (form.latitud.trim()) {
        formDataToSend.append('latitud', form.latitud);
      }

      if (form.longitud.trim()) {
        formDataToSend.append('longitud', form.longitud);
      }

      if (form.correoElectronico.trim()) {
        formDataToSend.append(
          'correoElectronico',
          form.correoElectronico.trim(),
        );
      }

      if (form.telefono.trim()) {
        formDataToSend.append('telefono', form.telefono);
      }

      const imagenesOrdenadas =
        portadaIndex > 0
          ? [
              imagenes[portadaIndex],
              ...imagenes.filter((_, indice) => indice !== portadaIndex),
            ]
          : imagenes;

      imagenesOrdenadas.forEach(({ archivo }) =>
        formDataToSend.append('imagenes', archivo),
      );

      formDataToSend.append(
        'modo',
        esBorrador ? 'borrador' : 'cambios',
      );

      await crearEmprendimiento(formDataToSend);

      setExito(true);
      mostrarFeedback(
        'registro',
        esBorrador
          ? 'El borrador del emprendimiento se guardó correctamente.'
          : 'El emprendimiento se registró correctamente.',
        esBorrador
          ? 'Borrador de emprendimiento guardado correctamente'
          : '¡Emprendimiento registrado con éxito!',
      );
      // Al guardar un borrador se conserva la categoría elegida para que el
      // usuario pueda seguir completándolo sin tener que seleccionarla otra vez.
      setForm((formularioActual) =>
        esBorrador
          ? { ...INITIAL_FORM, categoriaId: formularioActual.categoriaId }
          : INITIAL_FORM,
      );
      setErrores({});
      setCategoriaAbierta(false);

      imagenes.forEach(({ preview }) =>
        URL.revokeObjectURL(preview),
      );

      setImagenes([]);
      imagenesRef.current = [];
      setPortadaIndex(0);

      if (onExito && !esBorrador) {
        onExito();
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
    e: SyntheticEvent<HTMLFormElement>,
  ) => {
    e.preventDefault();

    await procesarEnvio(false);
  };

  const handleGuardarBorrador = async () => {
    await procesarEnvio(true);
  };

  // =====================================================
  // ESTILOS
  // =====================================================

  const inputBase =
    'w-full rounded-2xl border bg-white/60 px-4 py-3 text-stone-800 shadow-[inset_0_1px_2px_rgba(9,85,64,0.05)] backdrop-blur-sm placeholder:text-stone-400 outline-none motion-safe:transition-[border-color,background-color,box-shadow] motion-safe:duration-200 focus-visible:bg-white focus-visible:ring-4 disabled:cursor-not-allowed disabled:bg-stone-100 disabled:text-stone-500';

  const obtenerClaseInput = (campo: keyof FormErrors) =>
    `${inputBase} ${
      errores[campo]
        ? 'border-red-400 bg-red-50/70 focus-visible:border-red-500 focus-visible:ring-red-100'
        : 'border-[#095540]/15 hover:border-[#009444]/50 hover:bg-white/80 focus-visible:border-[#009444] focus-visible:ring-[#009444]/15'
    }`;

  const labelClase =
    'flex flex-col gap-2 text-sm font-semibold text-[#095540] dark:text-emerald-100';

  const categoriaSeleccionada = categorias.find(
    (categoria) => String(categoria.id) === form.categoriaId,
  );

  const metaSeleccionada = categoriaSeleccionada
    ? obtenerMetaCategoria(categoriaSeleccionada.nombre)
    : null;

  // =====================================================
  // CARGANDO CATEGORÍAS
  // =====================================================

  if (cargandoCategorias) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex items-center gap-3 text-[#095540] dark:text-emerald-100">
          <span className="h-5 w-5 rounded-full border-2 border-[#009444] border-t-transparent motion-safe:animate-spin motion-reduce:animate-none" />

          <span>Cargando categorías...</span>
        </div>
      </div>
    );
  }

  // =====================================================
  // ERROR CATEGORÍAS
  // =====================================================

  if (errorCategorias) {
    return (
      <div
        className="mx-auto max-w-xl rounded-3xl border border-red-200 bg-red-50/80 p-6 text-center shadow-sm backdrop-blur-md"
        role="alert"
      >
        <p className="font-medium text-red-700">
          Error al cargar categorías: {errorCategorias}
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

  // =====================================================
  // SIN CATEGORÍAS
  // =====================================================

  if (categorias.length === 0) {
    return (
      <div className="mx-auto max-w-xl">
        <div className="mb-6 rounded-3xl border border-amber-200 bg-amber-50/80 p-6 shadow-sm backdrop-blur-md">
          <strong className="block text-base text-amber-900">
            Aún no hay categorías registradas.
          </strong>

          <p className="mt-1 text-sm text-amber-800">
            Debes crear al menos una categoría antes de registrar un
            emprendimiento.
          </p>
        </div>

        <RegistroCategoria onCategoriaCreada={cargarCategorias} />
      </div>
    );
  }

  // =====================================================
  // FORMULARIO
  // =====================================================

  return (
    <div className="relative mx-auto w-full max-w-4xl rounded-[2rem] border border-white/50 bg-white/40 shadow-[inset_0_1px_0_rgba(255,255,255,0.85),0_24px_60px_rgba(9,85,64,0.12)] backdrop-blur-2xl dark:border-white/10 dark:bg-slate-900/60">

      {/* Resplandores de fondo para dar profundidad al vidrio */}
      <div
        className="pointer-events-none absolute inset-0 overflow-hidden rounded-[2rem]"
        aria-hidden="true"
      >
        <div className="absolute -right-14 -top-16 h-56 w-56 rounded-full bg-[#8DC63F]/25 blur-3xl" />
        <div className="absolute -bottom-20 -left-14 h-64 w-64 rounded-full bg-[#009444]/15 blur-3xl" />
      </div>

      <div className="relative p-4 sm:p-6">

        {/* ================= ENCABEZADO ================= */}

        <div className="relative mb-5 overflow-hidden rounded-3xl border border-white/70 bg-gradient-to-br from-white/75 via-[#eef6e8]/60 to-white/40 px-6 py-7 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_8px_28px_rgba(9,85,64,0.08)] backdrop-blur-xl dark:border-white/10 dark:from-white/10 dark:via-white/5 dark:to-transparent sm:px-8">
          <div
            className="pointer-events-none absolute -right-10 -top-14 h-40 w-40 rounded-full bg-[#d9d823]/20 blur-3xl"
            aria-hidden="true"
          />

          <div className="relative">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#8DC63F]/40 bg-[#8DC63F]/15 px-3 py-1.5 text-xs font-bold text-[#095540] backdrop-blur-sm dark:text-emerald-100">
              <span className="h-2 w-2 rounded-full bg-[#d9d823]" />
              Directorio de emprendimientos
            </div>

            <h2 className="font-brand text-2xl font-bold tracking-tight text-[#095540] dark:text-emerald-100 sm:text-3xl">
              Registrar nuevo emprendimiento
            </h2>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
              Complete la información solicitada para registrar un nuevo
              emprendimiento en el directorio del Parque Nacional Diriá.
            </p>
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          noValidate
          className="relative flex flex-col gap-5"
        >

          {/* ============== INFORMACIÓN GENERAL ============== */}

          <Seccion
            icono={ICONO_INFO}
            titulo="Información general"
            descripcion="Nombre, categoría y descripción del emprendimiento."
          >
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
                className={obtenerClaseInput('nombre')}
              />

              <MensajeError mensaje={errores.nombre} />
            </label>

            {/* CATEGORÍA */}

<div ref={categoriaRef} className="flex flex-col gap-2">              <label
                htmlFor="categoriaId"
                className="text-sm font-semibold text-[#095540] dark:text-emerald-100"
              >
                Categoría *
              </label>

              <button
                id="categoriaId"
                type="button"
                aria-haspopup="listbox"
                aria-expanded={categoriaAbierta}
                onClick={() => setCategoriaAbierta((actual) => !actual)}
                className={`flex w-full items-center justify-between gap-4 rounded-2xl border bg-white/60 px-4 py-3 text-left shadow-[inset_0_1px_2px_rgba(9,85,64,0.05)] backdrop-blur-sm outline-none motion-safe:transition-[border-color,background-color,box-shadow] motion-safe:duration-200 focus-visible:bg-white focus-visible:ring-4 ${
                  errores.categoriaId
                    ? 'border-red-400 bg-red-50/70 focus-visible:ring-red-100'
                    : categoriaAbierta
                      ? 'border-[#009444] bg-white ring-4 ring-[#009444]/15'
                      : 'border-[#095540]/15 hover:border-[#009444]/50 hover:bg-white/80 focus-visible:border-[#009444] focus-visible:ring-[#009444]/15'
                }`}
              >
                {categoriaSeleccionada && metaSeleccionada ? (
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#8DC63F]/20 text-[#095540]">
                      <Icono path={metaSeleccionada.path} className="h-6 w-6" />
                    </div>

                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-stone-800">
                        {categoriaSeleccionada.nombre}
                      </p>

                      <p className="truncate text-xs font-normal text-stone-500">
                        {metaSeleccionada.descripcion}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-stone-100/80 text-stone-500">
                      <Icono path={ICONO_GRID} />
                    </div>

                    <div>
                      <p className="text-sm font-semibold text-stone-600">
                        Seleccionar categoría
                      </p>

                      <p className="text-xs font-normal text-stone-400">
                        Elija la que mejor represente su emprendimiento
                      </p>
                    </div>
                  </div>
                )}

                <svg
                  className={`h-5 w-5 shrink-0 text-[#095540] motion-safe:transition-transform motion-safe:duration-200 ${
                    categoriaAbierta ? 'rotate-180' : ''
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="m6 9 6 6 6-6"
                  />
                </svg>
              </button>

              {categoriaAbierta && (
<div className="max-h-80 overflow-y-auto rounded-2xl border border-white/70 bg-white/90 p-2 shadow-[0_18px_45px_rgba(9,85,64,0.16)] backdrop-blur-xl">                  <div
                    role="listbox"
                    aria-label="Categorías disponibles"
                    className="space-y-1"
                  >
                    {categorias.map((categoria) => {
                      const seleccionada =
                        String(categoria.id) === form.categoriaId;

                      const meta = obtenerMetaCategoria(categoria.nombre);

                      return (
                        <button
                          key={categoria.id}
                          type="button"
                          role="option"
                          aria-selected={seleccionada}
                          onClick={() =>
                            seleccionarCategoria(String(categoria.id))
                          }
                          className={`group flex w-full items-center gap-3 rounded-xl p-3 text-left outline-none motion-safe:transition-colors motion-safe:duration-200 focus-visible:ring-2 focus-visible:ring-[#009444] ${
                            seleccionada
                              ? 'bg-[#8DC63F]/20 ring-1 ring-[#009444]/30'
                              : 'hover:bg-[#eef6e8]/70'
                          }`}
                        >
                          <div
                            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl motion-safe:transition-colors motion-safe:duration-200 ${
                              seleccionada
                                ? 'bg-[#095540] text-white'
                                : 'bg-[#8DC63F]/20 text-[#095540] group-hover:bg-[#8DC63F]/30'
                            }`}
                          >
                            <Icono path={meta.path} className="h-6 w-6" />
                          </div>

                          <div className="min-w-0 flex-1">
                            <p
                              className={`text-sm font-bold ${
                                seleccionada
                                  ? 'text-[#095540]'
                                  : 'text-stone-800'
                              }`}
                            >
                              {categoria.nombre}
                            </p>

                            <p className="mt-0.5 text-xs font-normal text-stone-500">
                              {meta.descripcion}
                            </p>
                          </div>

                          {seleccionada && (
                            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#095540] text-white">
                              <Icono
                                path="m5 12 4 4L19 6"
                                className="h-4 w-4"
                                strokeWidth={2}
                              />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <MensajeError mensaje={errores.categoriaId} />
            </div>

            {/* DESCRIPCIÓN */}

            <label className={labelClase}>
              <span>
                Descripción *
              </span>

              <textarea
                name="descripcion"
                value={form.descripcion}
                onChange={handleChange}
                rows={4}
                maxLength={500}
                placeholder="Escribe una breve descripción del emprendimiento..."
                className={`${obtenerClaseInput('descripcion')} resize-none`}
              />

              <span className="flex items-center justify-between text-xs font-normal">
                <span className="text-red-600">
                  {errores.descripcion && (
                    <span className="flex items-center gap-1 font-medium">
                      <span aria-hidden="true">⚠</span>
                      {errores.descripcion}
                    </span>
                  )}
                </span>

                <span className="text-stone-400">
                  {form.descripcion.length}/500
                </span>
              </span>
            </label>
          </Seccion>

          {/* ================== IMÁGENES ================== */}

          <Seccion
            icono={ICONO_IMAGEN}
            titulo="Imágenes"
            descripcion="Agregue fotografías para identificar visualmente el emprendimiento."
          >
            <label
              className={`flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-6 text-center backdrop-blur-sm motion-safe:transition-colors motion-safe:duration-200 sm:p-8 ${
                isDragging
                  ? 'border-[#009444] bg-[#8DC63F]/20'
                  : 'border-[#095540]/25 bg-white/50 hover:border-[#009444] hover:bg-white/80'
              } focus-within:border-[#009444] focus-within:ring-4 focus-within:ring-[#009444]/15`}
              onDragEnter={(event) => {
                event.preventDefault();

                dragDepth.current += 1;

                setIsDragging(true);
              }}
              onDragOver={(event) => {
                event.preventDefault();

                event.dataTransfer.dropEffect = 'copy';
              }}
              onDragLeave={(event) => {
                event.preventDefault();

                dragDepth.current -= 1;

                if (dragDepth.current <= 0) {
                  dragDepth.current = 0;
                  setIsDragging(false);
                }
              }}
              onDrop={handleDrop}
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#8DC63F]/20 text-[#095540]">
                <Icono path={ICONO_IMAGEN} className="h-8 w-8" strokeWidth={1.8} />
              </div>

              <span className="mt-3 text-sm font-semibold text-[#095540] dark:text-emerald-100">
                {isDragging
                  ? 'Soltá las fotografías aquí'
                  : 'Arrastrá tus fotografías aquí o seleccioná archivos'}
              </span>

              <span className="mt-1 text-xs text-stone-500">
                JPG, PNG o WEBP · Máximo 5MB cada una
              </span>

              <input
                type="file"
                multiple
                accept="image/png, image/jpeg, image/webp"
                onChange={handleImageChange}
                className="sr-only"
              />
            </label>

            {imagenes.length > 0 && (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {imagenes.map((imagenSeleccionada, indice) => (
                  <div
                    key={imagenSeleccionada.preview}
                    className="relative overflow-hidden rounded-2xl border border-white/70 bg-white/60 shadow-[0_8px_24px_rgba(9,85,64,0.12)]"
                  >
                    <img
                      src={imagenSeleccionada.preview}
                      alt={`Vista previa ${indice + 1}`}
                      className="aspect-square h-full w-full object-cover"
                    />

                    <span className="absolute left-2 top-2 rounded-full bg-[#095540]/90 px-2.5 py-1 text-[10px] font-bold text-white backdrop-blur-sm">
                      {indice === portadaIndex
                        ? 'Portada'
                        : `Foto ${indice + 1}`}
                    </span>

                    {indice !== portadaIndex && (
                      <button
                        type="button"
                        onClick={() => setPortadaIndex(indice)}
                        className="absolute bottom-2 left-2 rounded-lg bg-white/90 px-2 py-1 text-[10px] font-bold text-[#095540] backdrop-blur-sm hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#009444]"
                      >
                        Hacer portada
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => handleRemoveImage(indice)}
                      className="absolute right-2 top-2 rounded-full bg-red-700 p-1.5 text-white shadow-md hover:bg-red-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                      aria-label={`Eliminar fotografía ${indice + 1}`}
                    >
                      <Icono
                        path="M6 18L18 6M6 6l12 12"
                        className="h-4 w-4"
                        strokeWidth={2}
                      />
                    </button>
                  </div>
                ))}
              </div>
            )}

              {/* --- AGREGA ESTO AQUÍ --- */}
            <MensajeError mensaje={errores.imagenes} />
            {/* ------------------------ */}


          </Seccion>

          {/* ================== UBICACIÓN ================== */}

          <Seccion
            icono={ICONO_UBICACION}
            titulo="Ubicación geográfica"
            descripcion="Seleccione la ubicación en el mapa o ingrese las coordenadas manualmente."
          >
            <div className="overflow-hidden rounded-2xl border border-white/70 shadow-[0_8px_24px_rgba(9,85,64,0.1)]">
              <SelectorUbicacion
                latitud={form.latitud ? Number(form.latitud) : null}
                longitud={form.longitud ? Number(form.longitud) : null}
                onChange={(latitud, longitud) => {
                  setForm((prev) => ({
                    ...prev,
                    latitud: latitud.toFixed(6),
                    longitud: longitud.toFixed(6),
                  }));

                  setErrores((prev) => ({
                    ...prev,
                    latitud: undefined,
                    longitud: undefined,
                  }));

                  setError(null);
                }}
              />
            </div>

            
        

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <label className={labelClase}>
                Latitud *

                <input
                  name="latitud"
                  type="number"
                  step="any"
                  min="-90"
                  max="90"
                  value={form.latitud}
                  onChange={handleChange}
                  required
                  placeholder="Ej. 10.620651"
                  className={obtenerClaseInput('latitud')}
                />

                <MensajeError mensaje={errores.latitud} />
              </label>

              <label className={labelClase}>
                Longitud *

                <input
                  name="longitud"
                  type="number"
                  step="any"
                  min="-180"
                  max="180"
                  value={form.longitud}
                  onChange={handleChange}
                  required
                  placeholder="Ej. -85.586673"
                  className={obtenerClaseInput('longitud')}
                />

                <MensajeError mensaje={errores.longitud} />
              </label>
            </div>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">

              {/* PROVINCIA */}

              <label className={labelClase}>
                Provincia *

                <input
                  name="provincia"
                  value={form.provincia}
                  onChange={handleChange}
                  required
                  maxLength={100}
                  placeholder="Ej. Guanacaste"
                  className={obtenerClaseInput('provincia')}
                />

                <MensajeError mensaje={errores.provincia} />
              </label>

              {/* CANTÓN */}

              <label className={labelClase}>
                Cantón *

                <input
                  name="canton"
                  value={form.canton}
                  onChange={handleChange}
                  required
                  maxLength={100}
                  placeholder="Ej. Nicoya"
                  className={obtenerClaseInput('canton')}
                />

                <MensajeError mensaje={errores.canton} />
              </label>

              {/* DISTRITO */}

              <label className={labelClase}>
                Distrito *

                <input
                  name="distrito"
                  value={form.distrito}
                  onChange={handleChange}
                  required
                  maxLength={100}
                  placeholder="Ej. Nicoya"
                  className={obtenerClaseInput('distrito')}
                />

                <MensajeError mensaje={errores.distrito} />
              </label>
            </div>

            {/* DIRECCIÓN */}

            <label className={labelClase}>
              Dirección exacta *

              <input
                name="direccion"
                value={form.direccion}
                onChange={handleChange}
                required
                maxLength={250}
                placeholder="Ej. 200m Norte del Parque Central"
                className={obtenerClaseInput('direccion')}
              />

              <MensajeError mensaje={errores.direccion} />
            </label>
          </Seccion>

          {/* ================== CONTACTO ================== */}

          <Seccion
            icono={ICONO_CONTACTO}
            titulo="Datos de contacto"
            descripcion="Medios por los que los visitantes podrán contactar al emprendimiento."
          >
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
                  className={obtenerClaseInput('correoElectronico')}
                />

                <MensajeError mensaje={errores.correoElectronico} />
              </label>

              {/* TELÉFONO */}

              <label className={labelClase}>
                Teléfono *

                <PhoneInput
                  international
                  defaultCountry="CR"
                  countrySelectComponent={CountrySelectPersonalizado}
                  value={form.telefono || undefined}
                  onChange={handleTelefonoChange}
                  placeholder="8888 8888"
                  className={`flex items-center gap-2 rounded-2xl border bg-white/60 px-4 py-3 shadow-[inset_0_1px_2px_rgba(9,85,64,0.05)] backdrop-blur-sm outline-none motion-safe:transition-[border-color,background-color,box-shadow] motion-safe:duration-200 focus-within:bg-white focus-within:ring-4 [&_input]:min-w-0 [&_input]:flex-1 [&_input]:border-none [&_input]:bg-transparent [&_input]:text-stone-800 [&_input]:outline-none [&_input]:placeholder:text-stone-400 ${
                    errores.telefono
                      ? 'border-red-400 bg-red-50/70 focus-within:border-red-500 focus-within:ring-red-100'
                      : 'border-[#095540]/15 hover:border-[#009444]/50 hover:bg-white/80 focus-within:border-[#009444] focus-within:ring-[#009444]/15'
                  }`}
                />

                {errores.telefono ? (
                  <MensajeError mensaje={errores.telefono} />
                ) : (
                  <p className="text-xs font-normal text-stone-400">
                    Seleccione el país y escriba el número local
                  </p>
                )}
              </label>
            </div>
          </Seccion>

          {/* ============== MENSAJE DE ERROR ============== */}

          {error && (
            <div
              className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50/80 px-4 py-3 text-sm text-red-700 backdrop-blur-md"
              role="alert"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="mt-0.5 h-5 w-5 shrink-0"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="9" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>

              <div>
                <p className="font-bold">
                  No se pudo guardar el emprendimiento
                </p>

                <p className="mt-0.5">{error}</p>
              </div>
            </div>
          )}

          {/* ================== BOTONES ================== */}

          <div className="border-t border-white/60 pt-5">
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">

              <button
                type="button"
                onClick={() => void handleGuardarBorrador()}
                disabled={procesando}
                className="rounded-2xl border border-white/70 bg-white/60 px-6 py-3 font-semibold text-[#095540] shadow-sm backdrop-blur-md motion-safe:transition-colors motion-safe:duration-200 hover:bg-white/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#009444] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {guardandoBorrador
                  ? 'Guardando borrador...'
                  : 'Guardar como borrador'}
              </button>

              <button
                type="submit"
                disabled={procesando}
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
                    Guardando registro...
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
                      <path d="M12 5v14" strokeLinecap="round" />
                      <path d="M5 12h14" strokeLinecap="round" />
                    </svg>
                    Registrar emprendimiento
                  </>
                )}
              </button>
            </div>

            <p className="mt-3 text-center text-xs text-stone-500 sm:text-right">
              Los campos marcados con * son obligatorios para el registro
              completo. Al guardar como borrador puede dejarlos vacíos.
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}

export default RegistroEmprendimiento;