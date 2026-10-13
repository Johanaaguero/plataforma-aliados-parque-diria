import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import SelectorUbicacion from '../SelectorUbicacion';
import { useLanguage } from '../../i18n/LanguageContext';
import paisajeParque from '../../assets/parque-hero.jpg';

import type {
  ChangeEvent,
  DragEvent,
  ReactNode,
} from 'react';

interface RegistroIncidenciaProps {
  onClose?: () => void;
  onRegistrada?: () => void;
}

function ExitoIncidenciaOverlay({
  mensaje,
  codigo,
  onCerrar,
}: {
  mensaje: string;
  codigo: string;
  onCerrar: () => void;
}) {
  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-live="polite"
      className="fixed inset-0 z-[9999] flex h-screen w-screen items-center justify-center bg-black/60 p-4 backdrop-blur-md"
    >
      <div className="w-full max-w-md rounded-3xl border border-white/20 bg-white/95 p-8 text-center shadow-2xl animate-fade-in dark:bg-emerald-950/95">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500 text-2xl font-bold text-white">✓</span>
        <h3 className="mt-4 text-2xl font-black text-emerald-950 dark:text-white">¡Registro exitoso!</h3>
        <p className="mt-3 text-sm leading-6 text-emerald-950/75 dark:text-emerald-50/85">
          {mensaje} Código: <strong>{codigo || '#INC-00000000'}</strong>.
        </p>
        <button type="button" onClick={onCerrar} className="mt-6 w-full rounded-2xl bg-emerald-700 px-5 py-3 font-bold text-white shadow-lg shadow-emerald-950/20 transition hover:bg-emerald-600">
          Aceptar
        </button>
      </div>
    </div>,
    document.body,
  );
}

type Categoria =
  | 'seguridad'
  | 'incendio'
  | 'flora_fauna'
  | 'ambiental'
  | 'infraestructura'
  | 'senderos'
  | 'servicios'
  | 'otro';

interface ArchivoPreview {
  id: string;
  file: File;
  preview: string;
}

const API_URL =
  import.meta.env.VITE_API_URL ||
  'http://localhost:3000';

const categorias: {
  value: Categoria;
  nombre: string;
  descripcion: string;
  activeColor: string;
}[] = [
  {
    value: 'seguridad',
    nombre: 'Seguridad',
    descripcion:
      'Situaciones que puedan afectar a visitantes.',
    activeColor:
      'border-amber-500 bg-amber-500/10 text-amber-600 dark:text-amber-400',
  },
  {
    value: 'incendio',
    nombre: 'Incendio',
    descripcion:
      'Incendios, humo o riesgo de fuego.',
    activeColor:
      'border-red-500 bg-red-500/10 text-red-600 dark:text-red-400',
  },
  {
    value: 'flora_fauna',
    nombre: 'Flora y fauna',
    descripcion:
      'Afectaciones a animales o vegetación.',
    activeColor:
      'border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  },
  {
    value: 'ambiental',
    nombre: 'Ambiental',
    descripcion:
      'Contaminación u otros problemas ambientales.',
    activeColor:
      'border-teal-500 bg-teal-500/10 text-teal-600 dark:text-teal-400',
  },
  {
    value: 'infraestructura',
    nombre: 'Infraestructura',
    descripcion:
      'Daños en instalaciones o estructuras.',
    activeColor:
      'border-indigo-500 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400',
  },
  {
    value: 'senderos',
    nombre: 'Senderos',
    descripcion:
      'Problemas, daños u obstrucciones.',
    activeColor:
      'border-lime-600 bg-lime-500/10 text-lime-600 dark:text-lime-400',
  },
  {
    value: 'servicios',
    nombre: 'Servicios',
    descripcion:
      'Problemas relacionados con servicios.',
    activeColor:
      'border-sky-500 bg-sky-500/10 text-sky-600 dark:text-sky-400',
  },
  {
    value: 'otro',
    nombre: 'Otro',
    descripcion:
      'Situaciones que no corresponden a otra categoría.',
    activeColor:
      'border-slate-500 bg-slate-500/10 text-slate-700 dark:text-slate-300',
  },
];

function Icon({
  children,
  className = 'h-5 w-5',
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

function CategoriaIcon({
  categoria,
}: {
  categoria: Categoria;
}) {
  switch (categoria) {
    case 'seguridad':
      return (
        <Icon className="h-6 w-6">
          <path d="M12 3l7 3v5c0 4.5-2.9 7.8-7 10-4.1-2.2-7-5.5-7-10V6l7-3z" />
          <path d="M12 8v4" />
          <path d="M12 15h.01" />
        </Icon>
      );

    case 'incendio':
      return (
        <Icon className="h-6 w-6">
          <path d="M12 21c4 0 7-2.7 7-6.5 0-3.1-2-5.4-4.5-7.5.1 2-1 3.5-2.5 4.5.2-3-1.2-5.8-4-8.5.2 3.5-3 5.7-3 9.5C5 17.2 8 21 12 21z" />
        </Icon>
      );

    case 'flora_fauna':
      return (
        <Icon className="h-6 w-6">
          <path d="M12 21v-7" />
          <path d="M12 14c-4 0-6-2.2-6-5 3.8 0 6 1.5 6 5z" />
          <path d="M12 14c4 0 6-2.2 6-5-3.8 0-6 1.5-6 5z" />
          <path d="M12 8c-2.2-1.5-3-3.2-3-5 2.8.3 4.4 1.8 3 5z" />
        </Icon>
      );

    case 'ambiental':
      return (
        <Icon className="h-6 w-6">
          <path d="M12 21c5 0 8-3.5 8-8.5C20 8 17 4.5 12 3c-5 1.5-8 5-8 9.5C4 17.5 7 21 12 21z" />
          <path d="M8 14c2.5 0 5 1.5 6 4" />
          <path d="M12 7v9" />
        </Icon>
      );

    case 'infraestructura':
      return (
        <Icon className="h-6 w-6">
          <path d="M3 21h18" />
          <path d="M5 21V9l7-5 7 5v12" />
          <path d="M9 21v-6h6v6" />
          <path d="M9 10h.01M15 10h.01" />
        </Icon>
      );

    case 'senderos':
      return (
        <Icon className="h-6 w-6">
          <path d="M6 21c2-4 2-6 0-9s-2-5 0-9" />
          <path d="M18 21c-2-4  -2-6 0-9s2-5 0-9" />
          <path d="M9 5h6M8 10h8M9 15h6M10 20h4" />
        </Icon>
      );

    case 'servicios':
      return (
        <Icon className="h-6 w-6">
          <path d="M14.7 6.3a4 4 0 01-5.6 5.6L4 17v3h3l5.1-5.1a4 4 0 005.6-5.6l-2.1 2.1-2-2 2.1-2.1z" />
        </Icon>
      );

    default:
      return (
        <Icon className="h-6 w-6">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 8v5" />
          <path d="M12 16h.01" />
        </Icon>
      );
  }
}

const convertirArchivoABase64 = (
  archivo: File,
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const lector = new FileReader();

    lector.onload = () => {
      const resultado = lector.result;

      if (typeof resultado !== 'string') {
        reject(
          new Error(
            'No se pudo procesar el archivo.',
          ),
        );
        return;
      }

      resolve(resultado);
    };

    lector.onerror = () =>
      reject(
        new Error(
          'No se pudo leer el archivo.',
        ),
      );

    lector.readAsDataURL(archivo);
  });
};

const formatearTamano = (bytes: number) => {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export default function RegistroIncidencia({
  onClose,
  onRegistrada,
}: RegistroIncidenciaProps) {
  const { t } = useLanguage();
  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] =
    useState('');
  const [categoria, setCategoria] =
    useState<Categoria | ''>('');
  const [ubicacion, setUbicacion] =
    useState('');
  const [latitud, setLatitud] =
    useState<number | null>(null);
  const [longitud, setLongitud] =
    useState<number | null>(null);
  const [
    obteniendoUbicacion,
    setObteniendoUbicacion,
  ] = useState(false);
  const [esAnonimo, setEsAnonimo] =
    useState(false);
  const [nombreContacto, setNombreContacto] = useState('');
  const [telefonoContacto, setTelefonoContacto] = useState('');
  const [
    isDraggingOver,
    setIsDraggingOver,
  ] = useState(false);
  const [archivos, setArchivos] =
    useState<ArchivoPreview[]>([]);
  const [cargando, setCargando] =
    useState(false);
  const [error, setError] =
    useState('');
  const [exito, setExito] =
    useState('');
  const [codigoRegistrado, setCodigoRegistrado] = useState('');

  const cerrarExito = () => {
    setExito('');
    setCodigoRegistrado('');
    onClose?.();
  };

  const aceptarExito = () => {
    cerrarExito();
    window.location.assign('/');
  };

  useEffect(() => {
    if (!exito) return undefined;
    const temporizador = window.setTimeout(cerrarExito, 3800);
    return () => window.clearTimeout(temporizador);
  }, [exito]);

  const inputArchivoRef =
    useRef<HTMLInputElement>(null);

  const tituloRef =
    useRef<HTMLInputElement>(null);

  const descripcionRef =
    useRef<HTMLTextAreaElement>(null);

  const categoriaRef =
    useRef<HTMLElement>(null);

  const ubicacionRef =
    useRef<HTMLInputElement>(null);

  const archivoArrastrado =
    useRef<number | null>(null);

  const irAElemento = (
    elemento: HTMLElement | null,
  ) => {
    if (!elemento) {
      return;
    }

    elemento.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
    });

    elemento.focus({
      preventScroll: true,
    });
  };

  const token =
    sessionStorage.getItem('token') ||
    localStorage.getItem('token');

  const usuarioAutenticado =
    Boolean(token);

  const obtenerUbicacion = () => {
    if (!navigator.geolocation) {
      setError(
        'El navegador no permite obtener la ubicación.',
      );
      return;
    }

    setError('');
    setObteniendoUbicacion(true);

    navigator.geolocation.getCurrentPosition(
      (posicion) => {
        const lat =
          posicion.coords.latitude;

        const lng =
          posicion.coords.longitude;

        setLatitud(lat);
        setLongitud(lng);

        setUbicacion(
          `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
        );

        setObteniendoUbicacion(false);
      },
      () => {
        setError(
          'No fue posible obtener su ubicación. Puede escribirla manualmente.',
        );

        setObteniendoUbicacion(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      },
    );
  };

  const agregarArchivos = (
    nuevos: File[],
  ) => {
    setError('');

    const archivosValidos: ArchivoPreview[] =
      [];

    for (const archivo of nuevos) {
      const esImagen =
        archivo.type.startsWith('image/');

      const esPdf = archivo.type === 'application/pdf';

      if (!esImagen && !esPdf) {
        setError(
          'Solo se permiten imágenes JPG, JPEG, PNG y documentos PDF.',
        );
        continue;
      }

      if (
        archivo.size >
        20 * 1024 * 1024
      ) {
        setError(
          `El archivo "${archivo.name}" supera el límite de 20 MB.`,
        );
        continue;
      }

      archivosValidos.push({
        id: `${Date.now()}-${Math.random()}`,
        file: archivo,
        preview:
          URL.createObjectURL(archivo),
      });
    }

    setArchivos((actuales) => [
      ...actuales,
      ...archivosValidos,
    ]);
  };

  const seleccionarArchivos = (
    evento: ChangeEvent<HTMLInputElement>,
  ) => {
    const archivosSeleccionados =
      Array.from(
        evento.target.files || [],
      );

    agregarArchivos(
      archivosSeleccionados,
    );

    evento.target.value = '';
  };

  const manejarDrop = (
    evento: DragEvent<HTMLDivElement>,
  ) => {
    evento.preventDefault();

    setIsDraggingOver(false);

    const nuevos = Array.from(
      evento.dataTransfer.files,
    );

    agregarArchivos(nuevos);
  };

  const eliminarArchivo = (
    id: string,
  ) => {
    setArchivos((actuales) => {
      const archivo = actuales.find(
        (item) => item.id === id,
      );

      if (archivo) {
        URL.revokeObjectURL(
          archivo.preview,
        );
      }

      return actuales.filter(
        (item) => item.id !== id,
      );
    });
  };

  const iniciarArrastre = (
    index: number,
  ) => {
    archivoArrastrado.current = index;
  };

  const soltarArchivo = (
    index: number,
  ) => {
    const origen =
      archivoArrastrado.current;

    if (
      origen === null ||
      origen === index
    ) {
      return;
    }

    setArchivos((actuales) => {
      const copia = [...actuales];

      const [movido] =
        copia.splice(origen, 1);

      copia.splice(index, 0, movido);

      return copia;
    });

    archivoArrastrado.current =
      null;
  };

  const registrarIncidencia =
    async () => {
      setError('');
      setExito('');
      const reporteAnonimo = usuarioAutenticado ? esAnonimo : true;

      if (!titulo.trim()) {
        setError('Ingrese un título.');
        irAElemento(
          tituloRef.current,
        );
        return;
      }

      if (!descripcion.trim()) {
        setError(
          'Ingrese una descripción.',
        );
        irAElemento(
          descripcionRef.current,
        );
        return;
      }

      if (!categoria) {
        setError(
          'Seleccione una categoría.',
        );
        irAElemento(
          categoriaRef.current,
        );
        return;
      }

      if (!ubicacion.trim()) {
        setError(
          'Ingrese la ubicación del incidente.',
        );
        irAElemento(
          ubicacionRef.current,
        );
        return;
      }

      setCargando(true);

      try {
        const headers: HeadersInit = {
          'Content-Type':
            'application/json',
        };

        if (token) {
          headers.Authorization =
            `Bearer ${token}`;
        }

        const respuesta =
          await fetch(
            `${API_URL}/api/incidencias`,
            {
              method: 'POST',
              headers,
              body: JSON.stringify({
                titulo:
                  titulo.trim(),
                descripcion:
                  descripcion.trim(),
                categoria,
                ubicacion:
                  ubicacion.trim(),
                latitud,
                longitud,
                esAnonimo:
                  reporteAnonimo,
                nombreContacto: reporteAnonimo
                  ? nombreContacto.trim() || null
                  : null,
                telefonoContacto: reporteAnonimo
                  ? telefonoContacto.trim() || null
                  : null,
              }),
            },
          );

        const texto =
          await respuesta.text();

        let datos: any = {};

        try {
          datos = texto
            ? JSON.parse(texto)
            : {};
        } catch {
          datos = {};
        }

        if (!respuesta.ok) {
          throw new Error(
            datos.mensaje ||
              datos.message ||
              datos.error ||
              texto ||
              `Error ${respuesta.status}`,
          );
        }

        const incidenciaId =
          datos.incidencia?.id ||
          datos.id ||
          datos.data?.id;

        if (!incidenciaId) {
          throw new Error(
            'El servidor no devolvió el ID de la incidencia.',
          );
        }

        for (const archivo of archivos) {
          const base64 =
            await convertirArchivoABase64(
              archivo.file,
            );

          const headersEvidencia: HeadersInit =
            {
              'Content-Type':
                'application/json',
            };

          if (token) {
            headersEvidencia.Authorization =
              `Bearer ${token}`;
          }

          const respuestaEvidencia =
            await fetch(
              `${API_URL}/api/incidencias/${incidenciaId}/evidencias`,
              {
                method: 'POST',
                headers:
                  headersEvidencia,
                body: JSON.stringify({
                  archivo: base64,
                  tipoMime:
                    archivo.file.type,
                  nombreArchivo:
                    archivo.file.name,
                  tamanoBytes:
                    archivo.file.size,
                  tipo: 'foto',
                }),
              },
            );

          if (
            !respuestaEvidencia.ok
          ) {
            throw new Error(
              'La incidencia se registró, pero no se pudo subir una evidencia.',
            );
          }
        }

        setExito(
          reporteAnonimo
            ? 'La incidencia fue registrada de forma anónima correctamente.'
            : 'La incidencia fue registrada correctamente.',
        );
        setCodigoRegistrado(datos.incidencia?.codigo ?? '');

        setTitulo('');
        setDescripcion('');
        setCategoria('');
        setUbicacion('');
        setLatitud(null);
        setLongitud(null);
        setEsAnonimo(false);
        setNombreContacto('');
        setTelefonoContacto('');

        archivos.forEach((archivo) =>
          URL.revokeObjectURL(
            archivo.preview,
          ),
        );

        setArchivos([]);

        onRegistrada?.();
      } catch (error) {
        setError(
          error instanceof Error
            ? error.message
            : 'No se pudo registrar la incidencia.',
        );
      } finally {
        setCargando(false);
      }
    };

  return (
    <section
      className="sigtad-incidencia-form relative isolate w-full overflow-hidden px-4 py-8 sm:px-6 lg:px-8"
      style={{ backgroundImage: `url(${paisajeParque})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
    >
      {exito && <ExitoIncidenciaOverlay mensaje={exito} codigo={codigoRegistrado} onCerrar={aceptarExito} />}
      {exito && <style>{`.sigtad-incidencia-form [role="dialog"] { display: none !important; }`}</style>}
      {exito && <div role="dialog" aria-modal="true" className="fixed inset-0 z-[100] flex items-center justify-center bg-emerald-950/55 p-4 backdrop-blur-md"><div className="w-full max-w-sm rounded-3xl border border-white/30 bg-white/85 p-7 text-center shadow-2xl backdrop-blur-2xl dark:bg-slate-900/85"><span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500 text-2xl text-white">✓</span><h3 className="mt-4 text-2xl font-black text-emerald-950 dark:text-white">¡Registro exitoso!</h3><p className="mt-3 text-sm text-emerald-950/70 dark:text-white/70">Su incidencia ha sido registrada correctamente con el código <strong>{codigoRegistrado}</strong>.</p><button type="button" onClick={() => { setExito(''); setCodigoRegistrado(''); onClose?.(); }} className="mt-6 w-full rounded-2xl bg-emerald-700 px-5 py-3 font-bold text-white">Aceptar</button></div></div>}
      <div className="relative mx-auto flex max-w-4xl flex-col overflow-hidden rounded-3xl border border-white/40 bg-white/60 shadow-xl ring-1 ring-slate-900/10 backdrop-blur-xl dark:border-slate-700/70 dark:bg-slate-900/75 dark:ring-white/10 sm:bg-white/50">

        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/50 px-6 py-5 dark:border-slate-800/80 dark:bg-slate-900/50 sm:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
              <Icon className="h-5 w-5">
                <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </Icon>
            </div>

            <div>
              <h2 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white sm:text-xl">
                {t('incident.title')}
              </h2>

              <p className="text-xs text-slate-500 dark:text-slate-400">
                {t('incident.description')}
              </p>
            </div>
          </div>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="rounded-full p-2 text-slate-400 transition-colors hover:bg-slate-200/60 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              aria-label={t('incident.close')}
            >
              <Icon className="h-5 w-5">
                <path d="M6 18L18 6M6 6l12 12" />
              </Icon>
            </button>
          )}
        </div>

        <div className="space-y-8 px-6 py-6 sm:px-8">

          <div className="rounded-2xl border border-amber-400/35 bg-amber-50/80 p-4 text-sm text-amber-900 shadow-sm backdrop-blur-md dark:bg-amber-950/30 dark:text-amber-100">
            <p><strong>Nota aclaratoria:</strong> Esta sección está destinada exclusivamente al reporte y seguimiento comunitario o de infraestructura del parque, sus emprendimientos, eventos y capacitaciones.</p>
            <p className="mt-2 font-semibold">¡ATENCIÓN! : Este canal NO es un servicio de atención de emergencias. En caso de riesgo o emergencia real, llame directamente al 911.</p>
          </div>

          {error && (
            <div
              role="alert"
              className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50/80 p-4 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200"
            >
              <Icon className="mt-0.5 h-5 w-5 shrink-0 text-red-600 dark:text-red-400">
                <circle
                  cx="12"
                  cy="12"
                  r="10"
                />
                <path d="M12 8v4M12 16h.01" />
              </Icon>

              <div>
                <p className="font-semibold">
                  Revise el formulario
                </p>

                <p className="mt-0.5 text-xs opacity-90">
                  {error}
                </p>
              </div>
            </div>
          )}

          <section className="space-y-4">
            <div className="border-b border-slate-100 pb-2 dark:border-slate-800">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
                1. Información General
              </h3>
            </div>

            <div className="space-y-4">
              {(!usuarioAutenticado || esAnonimo) && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">Nombre completo<input value={nombreContacto} onChange={(event) => setNombreContacto(event.target.value)} required className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/50" /></label>
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">Número telefónico<input value={telefonoContacto} onChange={(event) => setTelefonoContacto(event.target.value)} required className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/50" /></label>
                </div>
              )}
              {(!usuarioAutenticado || esAnonimo) && <p className="rounded-2xl border border-white/50 bg-white/35 px-4 py-3 text-xs leading-5 text-slate-600 backdrop-blur-xl dark:border-white/10 dark:bg-white/5 dark:text-slate-300">Sus datos personales son confidenciales y no serán visibles públicamente. Se solicitan únicamente como medio de contacto futuro en caso de requerir más detalles sobre el reporte.</p>}
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                  Título del reporte{' '}
                  <span className="text-red-500">
                    *
                  </span>
                </label>

                <input
                  ref={tituloRef}
                  type="text"
                  value={titulo}
                  onChange={(e) =>
                    setTitulo(
                      e.target.value,
                    )
                  }
                  maxLength={150}
                  placeholder="Ej. Obstáculo por árbol caído en Sendero"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm text-slate-900 transition-all placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-emerald-500/10 dark:border-slate-800 dark:bg-slate-900/50 dark:text-white dark:focus:border-emerald-500 dark:focus:bg-slate-900"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                  Descripción detallada{' '}
                  <span className="text-red-500">
                    *
                  </span>
                </label>

                <textarea
                  ref={descripcionRef}
                  value={descripcion}
                  onChange={(e) =>
                    setDescripcion(
                      e.target.value,
                    )
                  }
                  rows={3}
                  placeholder="Proporcione detalles específicos que ayuden a localizar y solventar el problema..."
                  className="w-full resize-none rounded-2xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm text-slate-900 transition-all placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-emerald-500/10 dark:border-slate-800 dark:bg-slate-900/50 dark:text-white dark:focus:border-emerald-500 dark:focus:bg-slate-900"
                />
              </div>
            </div>
          </section>

          <section
            ref={categoriaRef}
            className="space-y-4"
          >
            <div className="border-b border-slate-100 pb-2 dark:border-slate-800">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
                2. Selección de Categoría{' '}
                <span className="text-red-500">
                  *
                </span>
              </h3>
            </div>

            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
              {categorias.map((item) => {
                const seleccionada =
                  categoria ===
                  item.value;

                return (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() =>
                      setCategoria(
                        item.value,
                      )
                    }
                    aria-pressed={
                      seleccionada
                    }
                    className={`group relative flex flex-col justify-between rounded-2xl border p-3.5 text-left transition-all duration-200 focus:outline-none ${
                      seleccionada
                        ? `${item.activeColor} ring-2 ring-emerald-500/20 shadow-sm`
                        : 'border-slate-200/80 bg-white hover:border-slate-300 hover:bg-slate-50/50 dark:border-slate-800 dark:bg-slate-800/40 dark:hover:border-slate-700 dark:hover:bg-slate-800'
                    }`}
                  >
                    <div className="mb-2 flex items-center justify-between">
                      <div
                        className={`transition-transform duration-200 group-hover:scale-110 ${
                          seleccionada
                            ? ''
                            : 'text-slate-500 dark:text-slate-400'
                        }`}
                      >
                        <CategoriaIcon
                          categoria={
                            item.value
                          }
                        />
                      </div>

                      {seleccionada && (
                        <span className="h-2 w-2 rounded-full bg-emerald-500" />
                      )}
                    </div>

                    <div>
                      <p
                        className={`text-xs font-bold ${
                          seleccionada
                            ? 'font-black'
                            : 'text-slate-800 dark:text-slate-200'
                        }`}
                      >
                        {item.nombre}
                      </p>

                      <p className="mt-1 line-clamp-2 text-[10px] leading-tight text-slate-500 dark:text-slate-400">
                        {item.descripcion}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="space-y-4">
            <div className="border-b border-slate-100 pb-2 dark:border-slate-800">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
                3. Ubicación del Incidente{' '}
                <span className="text-red-500">
                  *
                </span>
              </h3>
            </div>

            <div className="flex flex-col gap-2.5 sm:flex-row">
              <div className="relative flex-1">
                <Icon className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400">
                  <path d="M12 2a8 8 0 0 0-8 8c0 5.25 8 12 8 12s8-6.75 8-12a8 8 0 0 0-8-8z" />
                  <circle
                    cx="12"
                    cy="10"
                    r="2.5"
                  />
                </Icon>

                <input
                  ref={ubicacionRef}
                  type="text"
                  value={ubicacion}
                  onChange={(e) =>
                    setUbicacion(
                      e.target.value,
                    )
                  }
                  placeholder="Escriba la ubicación o punto de referencia..."
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 py-3 pl-10 pr-4 text-sm text-slate-900 transition-all placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-emerald-500/10 dark:border-slate-800 dark:bg-slate-900/50 dark:text-white dark:focus:border-emerald-500 dark:focus:bg-slate-900"
                />
              </div>

              <button
                type="button"
                onClick={
                  obtenerUbicacion
                }
                disabled={
                  obteniendoUbicacion
                }
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs font-bold text-slate-700 transition-all hover:bg-slate-50 hover:text-slate-900 active:scale-95 disabled:opacity-50 dark:border-slate-800 dark:bg-slate-800/80 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <Icon
                  className={`h-4 w-4 text-emerald-600 dark:text-emerald-400 ${
                    obteniendoUbicacion
                      ? 'animate-spin'
                      : ''
                  }`}
                >
                  <circle
                    cx="12"
                    cy="12"
                    r="9"
                  />
                  <circle
                    cx="12"
                    cy="12"
                    r="2"
                  />
                  <path d="M12 3v3M12 18v3M3 12h3M18 12h3" />
                </Icon>

                {obteniendoUbicacion
                  ? 'Localizando...'
                  : 'Usar mi ubicación actual'}
              </button>
            </div>

            {latitud !== null &&
              longitud !== null && (
                <p className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                  <Icon className="h-3.5 w-3.5">
                    <path d="M20 6L9 17l-5-5" />
                  </Icon>

                  Coordenadas registradas (
                  {latitud.toFixed(4)},
                  {longitud.toFixed(4)})
                </p>
              )}

            <div className="rounded-2xl border border-white/20 bg-white/60 p-3 backdrop-blur-md dark:border-white/10 dark:bg-slate-900/60">
              <p className="mb-3 text-xs font-semibold text-slate-600 dark:text-slate-300">
                Seleccione el punto exacto en el mapa o arrastre el marcador.
              </p>
              <SelectorUbicacion
                latitud={latitud}
                longitud={longitud}
                onChange={(nuevaLatitud, nuevaLongitud) => {
                  setLatitud(nuevaLatitud);
                  setLongitud(nuevaLongitud);
                  setUbicacion(
                    `${nuevaLatitud.toFixed(6)}, ${nuevaLongitud.toFixed(6)}`,
                  );
                }}
                disabled={cargando}
              />
            </div>
          </section>

          <section className="space-y-4">
            <div className="border-b border-slate-100 pb-2 dark:border-slate-800">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
                4. Evidencia fotográfica o documento PDF
              </h3>
            </div>

            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDraggingOver(
                  true,
                );
              }}
              onDragLeave={() =>
                setIsDraggingOver(
                  false,
                )
              }
              onDrop={manejarDrop}
              onClick={() =>
                inputArchivoRef.current?.click()
              }
              className={`group flex cursor-pointer flex-col items-center justify-center rounded-3xl border-2 border-dashed p-6 text-center transition-all ${
                isDraggingOver
                  ? 'border-emerald-500 bg-emerald-500/5'
                  : 'border-slate-200 bg-slate-50/30 hover:border-emerald-500/50 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900/30 dark:hover:border-emerald-500/40 dark:hover:bg-slate-900/50'
              }`}
            >
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-slate-600 shadow-sm ring-1 ring-slate-900/5 transition-transform group-hover:scale-110 dark:bg-slate-800 dark:text-slate-300 dark:ring-white/10">
                <Icon className="h-6 w-6 text-emerald-600 dark:text-emerald-400">
                  <path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242" />
                  <path d="M12 12v9" />
                  <path d="m16 16-4-4-4 4" />
                </Icon>
              </div>

              <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                Arrastre fotografías o documentos PDF aquí, o{' '}
                <span className="text-emerald-600 underline decoration-emerald-500/30 underline-offset-2 dark:text-emerald-400">
                  examine sus archivos
                </span>
              </p>

              <p className="mt-1 text-[11px] text-slate-400">
                Máximo 20 MB por archivo
                (PNG, JPG, JPEG o PDF)
              </p>

              <input
                ref={inputArchivoRef}
                type="file"
                accept="image/png,image/jpeg,application/pdf"
                multiple
                hidden
                onChange={
                  seleccionarArchivos
                }
              />
            </div>

            {archivos.length > 0 && (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {archivos.map(
                  (
                    archivo,
                    index,
                  ) => {
                    const esVideo =
                      archivo.file.type.startsWith(
                        'video/',
                      );

                    return (
                      <div
                        key={
                          archivo.id
                        }
                        draggable
                        onDragStart={() =>
                          iniciarArrastre(
                            index,
                          )
                        }
                        onDragOver={(e) =>
                          e.preventDefault()
                        }
                        onDrop={() =>
                          soltarArchivo(
                            index,
                          )
                        }
                        className="group relative overflow-hidden rounded-2xl border border-slate-200/80 bg-slate-50 transition-all dark:border-slate-800 dark:bg-slate-800/50"
                      >
                        <div className="relative aspect-video w-full overflow-hidden bg-slate-900">
                          {esVideo ? (
                            <video
                              src={
                                archivo.preview
                              }
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <img
                              src={
                                archivo.preview
                              }
                              alt={
                                archivo
                                  .file
                                  .name
                              }
                              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                            />
                          )}

                          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100" />

                          <button
                            type="button"
                            onClick={(
                              e,
                            ) => {
                              e.stopPropagation();

                              eliminarArchivo(
                                archivo.id,
                              );
                            }}
                            className="absolute right-2 top-2 rounded-xl bg-slate-900/80 p-1.5 text-slate-200 backdrop-blur-md transition-all hover:bg-red-600 hover:text-white"
                            aria-label={`Eliminar ${archivo.file.name}`}
                          >
                            <Icon className="h-3.5 w-3.5">
                              <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                            </Icon>
                          </button>
                        </div>

                        <div className="p-2.5">
                          <p className="truncate text-xs font-semibold text-slate-700 dark:text-slate-200">
                            {
                              archivo
                                .file
                                .name
                            }
                          </p>

                          <p className="text-[10px] text-slate-400">
                            {formatearTamano(
                              archivo
                                .file
                                .size,
                            )}
                          </p>
                        </div>
                      </div>
                    );
                  },
                )}
              </div>
            )}
          </section>

          <section>
            <div className="rounded-2xl border border-slate-200/80 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-800/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-200/60 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                    <Icon className="h-4 w-4">
                      <rect
                        x="3"
                        y="11"
                        width="18"
                        height="11"
                        rx="2"
                        ry="2"
                      />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </Icon>
                  </div>

                  <div>
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      Anonimato del Reporte
                    </p>

                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      {usuarioAutenticado
                        ? 'Oculta tus datos de identificación personal'
                        : 'El reporte se registrará automáticamente como anónimo'}
                    </p>
                  </div>
                </div>

                {usuarioAutenticado && (
                  <button
                    type="button"
                    onClick={() =>
                      setEsAnonimo(
                        !esAnonimo,
                      )
                    }
                    aria-pressed={
                      esAnonimo
                    }
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      esAnonimo
                        ? 'bg-emerald-500'
                        : 'bg-slate-300 dark:bg-slate-700'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        esAnonimo
                          ? 'translate-x-5'
                          : 'translate-x-0'
                      }`}
                    />
                  </button>
                )}
              </div>
            </div>
          </section>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-slate-100 bg-slate-50/50 px-6 py-4 dark:border-slate-800/80 dark:bg-slate-900/50 sm:px-8">
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              disabled={cargando}
              className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-xs font-bold text-slate-600 transition-all hover:bg-slate-100 hover:text-slate-900 disabled:opacity-50 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
            >
              Cancelar
            </button>
          )}

          <button
            type="button"
            onClick={
              registrarIncidencia
            }
            disabled={cargando}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-2.5 text-xs font-bold text-white shadow-lg shadow-emerald-600/20 transition-all hover:bg-emerald-500 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-emerald-500 dark:hover:bg-emerald-400"
          >
            {cargando ? (
              <>
                <Icon className="h-4 w-4 animate-spin">
                  <circle
                    cx="12"
                    cy="12"
                    r="10"
                    strokeDasharray="32"
                    strokeDashoffset="10"
                  />
                </Icon>

                <span>
                  Enviando...
                </span>
              </>
            ) : (
              <span>
                Registrar Incidencia
              </span>
            )}
          </button>
        </div>
      </div>
    </section>
  );
}
