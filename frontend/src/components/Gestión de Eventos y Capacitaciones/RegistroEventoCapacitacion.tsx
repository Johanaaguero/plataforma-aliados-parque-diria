import { useState, useEffect } from 'react';
import type { FormEvent } from 'react';
import ImageDropzone from './Imagedropzone';
import DatePickerCampo from '../ui/DatePickerCampo';

type Estado = 'idle' | 'cargando' | 'exito' | 'error';
type TipoActividad = 'evento' | 'capacitacion';
type Temporada = 'seca' | 'lluviosa';
type EstadoRegistro = 'borrador' | 'no_publicado';

interface CampoErrores {
  nombre?: string;
  descripcion?: string;
  fecha?: string;
  hora?: string;
  lugar?: string;
  cupoMinimo?: string;
  cupoMaximo?: string;
  edadMinima?: string;
  edadMaxima?: string;
  temporada?: string;
}

interface RegistroEventoCapacitacionProps {
  isOpen: boolean;
  onClose: () => void;
  onRegistrado?: () => void;
}

interface RespuestaRegistro {
  id?: number;
  mensaje?: string;
  message?: string;
  code?: string;
}

const SEGUNDOS_CIERRE = 2;

const INPUT_BASE_CLASS =
  'mt-2 block w-full rounded-2xl border bg-white/90 px-4 py-3 text-[0.9375rem] text-slate-900 shadow-sm outline-none placeholder:text-slate-400 focus-visible:ring-4 motion-safe:transition-[border-color,box-shadow,background-color] motion-safe:duration-200 motion-reduce:transition-none';

const INPUT_DEFAULT_CLASS =
  'border-[#095540]/20 hover:border-[#095540]/45 focus-visible:border-[#009444] focus-visible:ring-[#009444]/25';

const INPUT_ERROR_CLASS =
  'border-[#D9D823] bg-[#D9D823]/10 focus-visible:border-[#D9D823] focus-visible:ring-[#D9D823]/30';

const LABEL_CLASS = 'text-sm font-semibold text-[#095540]';

const ERROR_CLASS =
  'mt-2 flex items-center gap-2 text-xs font-semibold text-[#095540]';

function obtenerUrlBaseApi(): string | null {
  const urlConfigurada = import.meta.env.VITE_API_URL?.trim();

  return urlConfigurada ? urlConfigurada.replace(/\/+$/, '') : null;
}

function obtenerToken(): string | null {
  return (
    sessionStorage.getItem('token') ??
    localStorage.getItem('token')
  );
}

function obtenerFechaHoy(): string {
  const hoy = new Date();

  const yyyy = hoy.getFullYear();
  const mm = String(hoy.getMonth() + 1).padStart(2, '0');
  const dd = String(hoy.getDate()).padStart(2, '0');

  return `${yyyy}-${mm}-${dd}`;
}

function leerArchivoComoBase64(archivo: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const lector = new FileReader();

    lector.onload = () => resolve(lector.result as string);

    lector.onerror = () =>
      reject(lector.error ?? new Error('Error al leer el archivo'));

    lector.readAsDataURL(archivo);
  });
}

async function subirImagen(
  urlBaseApi: string,
  eventoId: number,
  archivo: File,
): Promise<void> {
  const imagenBase64 = await leerArchivoComoBase64(archivo);
  const token = obtenerToken();

  if (!token) {
    throw new Error('No se encontró el token de autenticación');
  }

  const respuesta = await fetch(
    `${urlBaseApi}/api/eventos-capacitaciones/${eventoId}/imagenes`,
    {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        imagenBase64,
        tipoMime: archivo.type,
        nombreArchivo: archivo.name,
      }),
    },
  );

  if (!respuesta.ok) {
    let detalle = 'No se pudo subir la imagen';

    try {
      const resultado = await respuesta.json();

      if (resultado?.message) {
        detalle = resultado.message;
      } else if (resultado?.mensaje) {
        detalle = resultado.mensaje;
      }
    } catch {
      //
    }

    throw new Error(detalle);
  }
}

export default function RegistroEventoCapacitacion({
  isOpen,
  onClose,
  onRegistrado,
}: RegistroEventoCapacitacionProps) {
  const [tipoActividad, setTipoActividad] =
    useState<TipoActividad>('evento');

  const [temporada, setTemporada] =
    useState<Temporada | ''>('');

  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [fecha, setFecha] = useState('');
  const [hora, setHora] = useState('');
  const [lugar, setLugar] = useState('');
  const [cupoMinimo, setCupoMinimo] = useState('');
  const [cupoMaximo, setCupoMaximo] = useState('');
  const [edadMinima, setEdadMinima] = useState('');
  const [edadMaxima, setEdadMaxima] = useState('');
  const [imagenes, setImagenes] = useState<File[]>([]);
  const [esPago, setEsPago] = useState(false);
  const [precio, setPrecio] = useState('');
  const [tipoPago, setTipoPago] = useState<'sinpe_movil' | 'transferencia_bancaria'>('sinpe_movil');
  const [politicasCancelacion, setPoliticasCancelacion] = useState('');

  const [mensaje, setMensaje] = useState('');
  const [estado, setEstado] = useState<Estado>('idle');
  const [errores, setErrores] = useState<CampoErrores>({});
  const [segundosRestantes, setSegundosRestantes] =
    useState<number | null>(null);

  const [accionGuardado, setAccionGuardado] =
    useState<EstadoRegistro | null>(null);

  const esCapacitacion = tipoActividad === 'capacitacion';

  const colorAcento = esCapacitacion ? '#00AEEF' : '#8DC63F';

  const colorAcentoOscuro = esCapacitacion
    ? '#0B7FB0'
    : '#009444';

  useEffect(() => {
    if (!isOpen) return;

    const overflowOriginal = document.body.style.overflow;

    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = overflowOriginal;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const manejarTecla = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && estado !== 'cargando') {
        onClose();
      }
    };

    window.addEventListener('keydown', manejarTecla);

    return () =>
      window.removeEventListener('keydown', manejarTecla);
  }, [isOpen, estado, onClose]);

  useEffect(() => {
    if (segundosRestantes === null) return;

    if (segundosRestantes === 0) {
      handleCerrarYLimpiar();
      onRegistrado?.();
      return;
    }

    const temporizador = setTimeout(() => {
      setSegundosRestantes((prev) =>
        prev !== null ? prev - 1 : null,
      );
    }, 1000);

    return () => clearTimeout(temporizador);

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [segundosRestantes]);

  if (!isOpen) return null;

  const validarCamposParaPublicar = (): CampoErrores => {
    const nuevosErrores: CampoErrores = {};

    if (!nombre.trim()) {
      nuevosErrores.nombre = 'Completa este campo';
    } else if (nombre.trim().length > 150) {
      nuevosErrores.nombre = 'Máximo 150 caracteres';
    }

    if (!descripcion.trim()) {
      nuevosErrores.descripcion = 'Completa este campo';
    }

    if (!fecha) {
      nuevosErrores.fecha = 'Completa este campo';
    } else if (fecha < obtenerFechaHoy()) {
      nuevosErrores.fecha =
        'La fecha no puede ser anterior a hoy';
    }

    if (!hora) {
      nuevosErrores.hora = 'Completa este campo';
    }

    if (!lugar.trim()) {
      nuevosErrores.lugar = 'Completa este campo';
    } else if (lugar.trim().length > 255) {
      nuevosErrores.lugar = 'Máximo 255 caracteres';
    }

    if (!cupoMinimo.trim()) {
      nuevosErrores.cupoMinimo = 'Completa este campo';
    } else {
      const valor = Number(cupoMinimo);

      if (!Number.isInteger(valor) || valor <= 0) {
        nuevosErrores.cupoMinimo =
          'Debe ser un número entero positivo';
      }
    }

    if (!cupoMaximo.trim()) {
      nuevosErrores.cupoMaximo = 'Completa este campo';
    } else {
      const valor = Number(cupoMaximo);

      if (!Number.isInteger(valor) || valor <= 0) {
        nuevosErrores.cupoMaximo =
          'Debe ser un número entero positivo';
      }
    }

    if (cupoMinimo.trim() && cupoMaximo.trim()) {
      const valorMinimo = Number(cupoMinimo);
      const valorMaximo = Number(cupoMaximo);

      if (
        Number.isInteger(valorMinimo) &&
        Number.isInteger(valorMaximo) &&
        valorMinimo > valorMaximo
      ) {
        nuevosErrores.cupoMinimo =
          'El cupo mínimo no puede ser mayor que el cupo máximo';
      }
    }

    if (!edadMinima.trim()) {
      nuevosErrores.edadMinima = 'Completa este campo';
    } else {
      const valor = Number(edadMinima);

      if (!Number.isInteger(valor) || valor < 0) {
        nuevosErrores.edadMinima =
          'Debe ser un número entero mayor o igual a 0';
      }
    }

    if (!edadMaxima.trim()) {
      nuevosErrores.edadMaxima = 'Completa este campo';
    } else {
      const valor = Number(edadMaxima);

      if (!Number.isInteger(valor) || valor < 0) {
        nuevosErrores.edadMaxima =
          'Debe ser un número entero mayor o igual a 0';
      }
    }

    if (edadMinima.trim() && edadMaxima.trim()) {
      const valorMinimo = Number(edadMinima);
      const valorMaximo = Number(edadMaxima);

      if (
        Number.isInteger(valorMinimo) &&
        Number.isInteger(valorMaximo) &&
        valorMinimo > valorMaximo
      ) {
        nuevosErrores.edadMinima =
          'La edad mínima no puede ser mayor que la edad máxima';
      }
    }

    if (!temporada) {
      nuevosErrores.temporada = 'Selecciona una temporada';
    }

    return nuevosErrores;
  };

  const limpiarError = (campo: keyof CampoErrores) => {
    setErrores((prev) => {
      if (!prev[campo]) return prev;

      const copia = { ...prev };

      delete copia[campo];

      return copia;
    });
  };

  const handleCerrarYLimpiar = () => {
    setTipoActividad('evento');
    setTemporada('');
    setNombre('');
    setDescripcion('');
    setFecha('');
    setHora('');
    setLugar('');
    setCupoMinimo('');
    setCupoMaximo('');
    setEdadMinima('');
    setEdadMaxima('');
    setImagenes([]);
    setEsPago(false);
    setPrecio('');
    setTipoPago('sinpe_movil');

    setErrores({});
    setMensaje('');
    setEstado('idle');
    setSegundosRestantes(null);
    setAccionGuardado(null);

    onClose();
  };

  const handleCancelar = () => {
    if (estado === 'cargando') return;

    handleCerrarYLimpiar();
  };

  const handleGuardarBorrador = async () => {
    await guardarActividad('borrador');
  };

  const handleGuardarNormal = async () => {
  const nuevosErrores = validarCamposParaPublicar();

  setErrores(nuevosErrores);

  if (Object.keys(nuevosErrores).length > 0) {
    setMensaje(
      'Completa todos los campos obligatorios para guardar la actividad.',
    );
    setEstado('error');
    return;
  }

  await guardarActividad('no_publicado');
};

  const guardarActividad = async (
    estadoRegistro: EstadoRegistro,
  ) => {
    setErrores({});
    setMensaje('');
    setAccionGuardado(estadoRegistro);
    setEstado('cargando');

    const urlBaseApi = obtenerUrlBaseApi();

    if (!urlBaseApi) {
      setMensaje(
        'No se pudo configurar la conexión con el servidor',
      );

      setEstado('error');
      setAccionGuardado(null);

      return;
    }

    const token = obtenerToken();

    if (!token) {
      setMensaje(
        'No se encontró el token de autenticación. Inicia sesión nuevamente.',
      );

      setEstado('error');
      setAccionGuardado(null);

      return;
    }

    try {
      const respuesta = await fetch(
        `${urlBaseApi}/api/eventos-capacitaciones`,
        {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            nombre: nombre.trim() || null,
            descripcion: descripcion.trim() || null,
            fecha: fecha || null,
            hora: hora || null,
            lugar: lugar.trim() || null,
            tipoActividad,
            cupoMinimo: cupoMinimo.trim()
              ? Number(cupoMinimo)
              : null,
            cupoMaximo: cupoMaximo.trim()
              ? Number(cupoMaximo)
              : null,
            edadMinima: edadMinima.trim()
              ? Number(edadMinima)
              : null,
            edadMaxima: edadMaxima.trim()
              ? Number(edadMaxima)
              : null,
            estado: estadoRegistro,
            temporada: temporada || null,
            esPago,
            precio: esPago ? Number(precio) : 0,
            tipoPago: esPago ? tipoPago : null,
            politicasCancelacion: esPago ? politicasCancelacion.trim() || null : null,
          }),
        },
      );

      let resultado: RespuestaRegistro;

      try {
        resultado =
          (await respuesta.json()) as RespuestaRegistro;
      } catch {
        setMensaje(
          'El servidor devolvió una respuesta inesperada',
        );

        setEstado('error');
        setAccionGuardado(null);

        return;
      }

      if (!respuesta.ok) {
  setMensaje(
    `Error ${respuesta.status}: ${
      resultado.mensaje ??
      resultado.message ??
      'No se pudo completar el registro'
    }`,
  );

  setEstado('error');
  setAccionGuardado(null);

  return;
}

      let advertencia = '';

      if (imagenes.length > 0 && resultado.id) {
        const subidas = await Promise.allSettled(
          imagenes.map((archivo) =>
            subirImagen(
              urlBaseApi,
              resultado.id as number,
              archivo,
            ),
          ),
        );

        const fallidas = subidas.filter(
          (r) => r.status === 'rejected',
        ).length;

        if (fallidas > 0) {
          advertencia = ` No obstante, ${fallidas} de ${imagenes.length} imagen(es) no se pudieron subir.`;
        }
      }

     if (estadoRegistro === 'borrador') {
  setMensaje(
    `El ${
      esCapacitacion
        ? 'borrador de la capacitación'
        : 'borrador del evento'
    } se guardó correctamente.${advertencia}`,
  );
} else {
  setMensaje(
    `${
      esCapacitacion
        ? 'Capacitación'
        : 'Evento'
    } registrado correctamente y quedó en estado no publicado.${advertencia}`,
  );
}

      setEstado('exito');
      setSegundosRestantes(SEGUNDOS_CIERRE);
    } catch (error) {
      console.error(
        'ERROR AL GUARDAR ACTIVIDAD:',
        error,
      );

      setMensaje(
        error instanceof Error
          ? `Error al guardar: ${error.message}`
          : 'No se pudo conectar con el servidor',
      );

      setEstado('error');
      setAccionGuardado(null);
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
  };

 return (
  <div
    className="fixed inset-0 z-50 overflow-y-auto bg-[#095540]/60 backdrop-blur-sm"
    role="dialog"
    aria-modal="true"
    aria-labelledby="registro-actividad-titulo"
    onMouseDown={(e) => {
      if (e.target === e.currentTarget) {
        handleCancelar();
      }
    }}
  >
    <div className="flex min-h-full items-start justify-center px-3 py-4 sm:px-6 sm:py-6 lg:items-center lg:py-8">
      <form
        className="relative my-auto w-full max-w-2xl overflow-hidden rounded-[2rem] border border-white/20 bg-white/70 shadow-xl backdrop-blur-md dark:border-white/10 dark:bg-slate-900/70 motion-safe:transition-[transform,box-shadow] motion-safe:duration-300 motion-safe:ease-out motion-reduce:transition-none"
        noValidate
        onSubmit={handleSubmit}
        aria-busy={estado === 'cargando'}
      >
        <div
          className="absolute inset-x-0 top-0 z-10 h-1.5 motion-safe:transition-[background] motion-safe:duration-300"
          style={{
            background: `linear-gradient(to right, #095540, ${colorAcentoOscuro}, ${colorAcento})`,
          }}
          aria-hidden="true"
        />

        {/* Contenido desplazable */}
        <div className="max-h-[calc(100vh-2rem)] overflow-y-auto overscroll-contain px-4 pb-5 pt-8 sm:max-h-[calc(100vh-3rem)] sm:px-8 sm:pb-7 sm:pt-10">
          <button
            type="button"
            onClick={handleCancelar}
            disabled={
              estado === 'cargando' ||
              segundosRestantes !== null
            }
            aria-label="Cerrar"
            className="absolute right-4 top-4 z-20 inline-flex h-9 w-9 items-center justify-center rounded-full text-[#095540]/60 outline-none hover:bg-[#095540]/8 hover:text-[#095540] focus-visible:ring-4 focus-visible:ring-[#009444]/25 disabled:cursor-not-allowed disabled:opacity-40 motion-safe:transition-colors motion-safe:duration-200"
          >
            <svg
              className="h-5 w-5"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M6 6l12 12M18 6L6 18"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>

          <div className="mb-6 text-left sm:mb-7">
            <span
              className="mb-3 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[0.68rem] font-bold uppercase tracking-[0.16em] motion-safe:transition-colors motion-safe:duration-300"
              style={{
                borderColor: `${colorAcento}80`,
                backgroundColor: `${colorAcento}2E`,
                color: '#095540',
              }}
            >
              Gestión de actividades
            </span>

            <h2
              id="registro-actividad-titulo"
              className="font-brand text-2xl font-bold tracking-tight text-[#095540] sm:text-3xl"
            >
              Nuevo registro
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-600">
              Registra un evento o capacitación para el parque
            </p>
          </div>

          <div>
            <span className={LABEL_CLASS}>
              Tipo de actividad
            </span>

            <div
              className="mt-2 grid grid-cols-2 gap-3"
              role="radiogroup"
              aria-label="Tipo de actividad"
            >
              <button
                type="button"
                role="radio"
                aria-checked={tipoActividad === 'evento'}
                onClick={() => {
                  setTipoActividad('evento');
                  setMensaje('');
                }}
                disabled={
                  estado === 'cargando' ||
                  segundosRestantes !== null
                }
                className={`rounded-2xl border px-4 py-3 text-sm font-bold outline-none focus-visible:ring-4 focus-visible:ring-[#009444]/25 motion-safe:transition-[transform,background-color,border-color,color] motion-safe:duration-200 motion-safe:active:scale-[0.98] ${
                  tipoActividad === 'evento'
                    ? 'border-[#009444] bg-[#8DC63F]/20 text-[#095540]'
                    : 'border-[#095540]/15 bg-white/80 text-slate-500 hover:border-[#095540]/35'
                }`}
              >
                Evento
              </button>

              <button
                type="button"
                role="radio"
                aria-checked={tipoActividad === 'capacitacion'}
                onClick={() => {
                  setTipoActividad('capacitacion');
                  setMensaje('');
                }}
                disabled={
                  estado === 'cargando' ||
                  segundosRestantes !== null
                }
                className={`rounded-2xl border px-4 py-3 text-sm font-bold outline-none focus-visible:ring-4 focus-visible:ring-[#00AEEF]/25 motion-safe:transition-[transform,background-color,border-color,color] motion-safe:duration-200 motion-safe:active:scale-[0.98] ${
                  tipoActividad === 'capacitacion'
                    ? 'border-[#0B7FB0] bg-[#00AEEF]/15 text-[#095540]'
                    : 'border-[#095540]/15 bg-white/80 text-slate-500 hover:border-[#095540]/35'
                }`}
              >
                Capacitación
              </button>
            </div>
          </div>






         <div className="mt-4 sm:mt-5">
  <span className={LABEL_CLASS}>
    Época del año
  </span>

  <div
    className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2"
    role="radiogroup"
    aria-label="Época del año"
  >
    <button
      type="button"
      role="radio"
      aria-checked={temporada === 'seca'}
      onClick={() => {
        setTemporada('seca');
        limpiarError('temporada');
      }}
      disabled={
        estado === 'cargando' ||
        segundosRestantes !== null
      }
      className={`group relative overflow-hidden rounded-2xl border px-4 py-4 text-left outline-none focus-visible:ring-4 focus-visible:ring-[#8DC63F]/30 disabled:cursor-not-allowed disabled:opacity-60 motion-safe:transition-[transform,background-color,border-color,box-shadow] motion-safe:duration-200 motion-safe:ease-out motion-safe:hover:-translate-y-0.5 ${
        temporada === 'seca'
          ? 'border-[#8DC63F] bg-[#8DC63F]/15 shadow-[0_8px_24px_rgba(141,198,63,0.16)]'
          : 'border-[#095540]/15 bg-white/80 hover:border-[#8DC63F]/60 hover:bg-[#8DC63F]/5'
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border motion-safe:transition-colors ${
              temporada === 'seca'
                ? 'border-[#8DC63F]/40 bg-[#8DC63F]/20 text-[#095540]'
                : 'border-[#095540]/10 bg-[#095540]/5 text-[#095540]/60'
            }`}
            aria-hidden="true"
          >
            <svg
              className="h-5 w-5"
              viewBox="0 0 24 24"
              fill="none"
            >
              <circle
                cx="12"
                cy="12"
                r="4"
                stroke="currentColor"
                strokeWidth="1.8"
              />
              <path
                d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.65 17.65l1.42 1.42M2 12h2M20 12h2M4.93 19.07l1.42-1.42M17.65 6.35l1.42-1.42"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
          </span>

          <div>
            <p className="text-sm font-bold text-[#095540]">
              Época seca
            </p>
            <p className="mt-0.5 text-xs text-slate-500">
              Temporada de menor precipitación
            </p>
          </div>
        </div>

        <span
          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 motion-safe:transition-[background-color,border-color] ${
            temporada === 'seca'
              ? 'border-[#009444] bg-[#009444]'
              : 'border-[#095540]/20 bg-white'
          }`}
          aria-hidden="true"
        >
          {temporada === 'seca' && (
            <svg
              className="h-3 w-3 text-white"
              viewBox="0 0 24 24"
              fill="none"
            >
              <path
                d="M5 12.5l4 4L19 7"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </span>
      </div>
    </button>

    <button
      type="button"
      role="radio"
      aria-checked={temporada === 'lluviosa'}
      onClick={() => {
        setTemporada('lluviosa');
        limpiarError('temporada');
      }}
      disabled={
        estado === 'cargando' ||
        segundosRestantes !== null
      }
      className={`group relative overflow-hidden rounded-2xl border px-4 py-4 text-left outline-none focus-visible:ring-4 focus-visible:ring-[#00AEEF]/30 disabled:cursor-not-allowed disabled:opacity-60 motion-safe:transition-[transform,background-color,border-color,box-shadow] motion-safe:duration-200 motion-safe:ease-out motion-safe:hover:-translate-y-0.5 ${
        temporada === 'lluviosa'
          ? 'border-[#00AEEF] bg-[#00AEEF]/10 shadow-[0_8px_24px_rgba(0,174,239,0.14)]'
          : 'border-[#095540]/15 bg-white/80 hover:border-[#00AEEF]/60 hover:bg-[#00AEEF]/5'
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border motion-safe:transition-colors ${
              temporada === 'lluviosa'
                ? 'border-[#00AEEF]/30 bg-[#00AEEF]/15 text-[#0B7FB0]'
                : 'border-[#095540]/10 bg-[#095540]/5 text-[#095540]/60'
            }`}
            aria-hidden="true"
          >
            <svg
              className="h-5 w-5"
              viewBox="0 0 24 24"
              fill="none"
            >
              <path
                d="M7 17.5h10a4 4 0 000-8 5.5 5.5 0 00-10.5-1A4.5 4.5 0 007 17.5z"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M8 20l-1 2M13 20l-1 2M18 20l-1 2"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
          </span>

          <div>
            <p className="text-sm font-bold text-[#095540]">
              Época lluviosa
            </p>
            <p className="mt-0.5 text-xs text-slate-500">
              Temporada de mayor precipitación
            </p>
          </div>
        </div>

        <span
          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 motion-safe:transition-[background-color,border-color] ${
            temporada === 'lluviosa'
              ? 'border-[#0B7FB0] bg-[#0B7FB0]'
              : 'border-[#095540]/20 bg-white'
          }`}
          aria-hidden="true"
        >
          {temporada === 'lluviosa' && (
            <svg
              className="h-3 w-3 text-white"
              viewBox="0 0 24 24"
              fill="none"
            >
              <path
                d="M5 12.5l4 4L19 7"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </span>
      </div>
    </button>
  </div>

  {errores.temporada && (
    <span
      id="temporada-error"
      className={ERROR_CLASS}
      role="alert"
    >
      <span
        className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#D9D823]"
        aria-hidden="true"
      />
      {errores.temporada}
    </span>
  )}
</div>

          <div className="mt-4 sm:mt-5">
            <label
              className={LABEL_CLASS}
              htmlFor="nombre"
            >
              Nombre
            </label>

            <input
              id="nombre"
              type="text"
              maxLength={150}
              className={
                errores.nombre
                  ? `${INPUT_BASE_CLASS} ${INPUT_ERROR_CLASS}`
                  : `${INPUT_BASE_CLASS} ${INPUT_DEFAULT_CLASS}`
              }
              value={nombre}
              aria-invalid={Boolean(errores.nombre)}
              aria-describedby={
                errores.nombre
                  ? 'nombre-error'
                  : undefined
              }
              onChange={(e) => {
                setNombre(e.target.value);
                limpiarError('nombre');
              }}
              placeholder="Ej. Taller de reciclaje comunitario"
              disabled={
                estado === 'cargando' ||
                segundosRestantes !== null
              }
            />

            {errores.nombre && (
              <span
                id="nombre-error"
                className={ERROR_CLASS}
                role="alert"
              >
                <span
                  className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#D9D823]"
                  aria-hidden="true"
                />
                {errores.nombre}
              </span>
            )}
          </div>

          <div className="mt-4 sm:mt-5">
            <label
              className={LABEL_CLASS}
              htmlFor="descripcion"
            >
              Descripción
            </label>

            <textarea
              id="descripcion"
              rows={3}
              className={
                errores.descripcion
                  ? `${INPUT_BASE_CLASS} ${INPUT_ERROR_CLASS} resize-none`
                  : `${INPUT_BASE_CLASS} ${INPUT_DEFAULT_CLASS} resize-none`
              }
              value={descripcion}
              aria-invalid={Boolean(
                errores.descripcion
              )}
              aria-describedby={
                errores.descripcion
                  ? 'descripcion-error'
                  : undefined
              }
              onChange={(e) => {
                setDescripcion(e.target.value);
                limpiarError('descripcion');
              }}
              placeholder="Describe brevemente en qué consiste la actividad"
              disabled={
                estado === 'cargando' ||
                segundosRestantes !== null
              }
            />

            {errores.descripcion && (
              <span
                id="descripcion-error"
                className={ERROR_CLASS}
                role="alert"
              >
                <span
                  className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#D9D823]"
                  aria-hidden="true"
                />
                {errores.descripcion}
              </span>
            )}
          </div>

          <div className="mt-4 grid gap-4 sm:mt-5 sm:grid-cols-2 sm:gap-5">
            <div>
              <label
                className={LABEL_CLASS}
                htmlFor="fecha"
              >
                Fecha
              </label>

              <DatePickerCampo
                id="fecha"
                min={obtenerFechaHoy()}
                className={
                  errores.fecha
                    ? `${INPUT_BASE_CLASS} ${INPUT_ERROR_CLASS}`
                    : `${INPUT_BASE_CLASS} ${INPUT_DEFAULT_CLASS}`
                }
                value={fecha}
                aria-invalid={Boolean(errores.fecha)}
                aria-describedby={
                  errores.fecha
                    ? 'fecha-error'
                    : undefined
                }
                onChange={(valor) => {
                  setFecha(valor);
                  limpiarError('fecha');
                }}
                disabled={
                  estado === 'cargando' ||
                  segundosRestantes !== null
                }
              />

              {errores.fecha && (
                <span
                  id="fecha-error"
                  className={ERROR_CLASS}
                  role="alert"
                >
                  <span
                    className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#D9D823]"
                    aria-hidden="true"
                  />
                  {errores.fecha}
                </span>
              )}
            </div>

            <div>
              <label
                className={LABEL_CLASS}
                htmlFor="hora"
              >
                Hora
              </label>

              <input
                id="hora"
                type="time"
                className={
                  errores.hora
                    ? `${INPUT_BASE_CLASS} ${INPUT_ERROR_CLASS}`
                    : `${INPUT_BASE_CLASS} ${INPUT_DEFAULT_CLASS}`
                }
                value={hora}
                aria-invalid={Boolean(errores.hora)}
                aria-describedby={
                  errores.hora
                    ? 'hora-error'
                    : undefined
                }
                onChange={(e) => {
                  setHora(e.target.value);
                  limpiarError('hora');
                }}
                disabled={
                  estado === 'cargando' ||
                  segundosRestantes !== null
                }
              />

              {errores.hora && (
                <span
                  id="hora-error"
                  className={ERROR_CLASS}
                  role="alert"
                >
                  <span
                    className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#D9D823]"
                    aria-hidden="true"
                  />
                  {errores.hora}
                </span>
              )}
            </div>
          </div>

          <div className="mt-4 grid gap-4 sm:mt-5 sm:grid-cols-[1fr_auto] sm:gap-5">
            <div>
              <label
                className={LABEL_CLASS}
                htmlFor="lugar"
              >
                Lugar
              </label>

              <input
                id="lugar"
                type="text"
                maxLength={255}
                className={
                  errores.lugar
                    ? `${INPUT_BASE_CLASS} ${INPUT_ERROR_CLASS}`
                    : `${INPUT_BASE_CLASS} ${INPUT_DEFAULT_CLASS}`
                }
                value={lugar}
                aria-invalid={Boolean(errores.lugar)}
                aria-describedby={
                  errores.lugar
                    ? 'lugar-error'
                    : undefined
                }
                onChange={(e) => {
                  setLugar(e.target.value);
                  limpiarError('lugar');
                }}
                placeholder="Ej. Casona del Parque"
                disabled={
                  estado === 'cargando' ||
                  segundosRestantes !== null
                }
              />

              {errores.lugar && (
                <span
                  id="lugar-error"
                  className={ERROR_CLASS}
                  role="alert"
                >
                  <span
                    className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#D9D823]"
                    aria-hidden="true"
                  />
                  {errores.lugar}
                </span>
              )}
            </div>
          </div>

          <div className="mt-4 sm:mt-5">
            <label className="flex items-center gap-3 rounded-2xl border border-[#095540]/15 bg-emerald-50/50 p-4 text-sm font-semibold text-[#095540]">
              <input type="checkbox" checked={esPago} onChange={(e) => setEsPago(e.target.checked)} disabled={estado === 'cargando' || segundosRestantes !== null} />
              Es actividad de pago
            </label>
            {esPago && (
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <label className={LABEL_CLASS}>Precio (₡)
                  <input type="number" min={1} step={1} required className={`${INPUT_BASE_CLASS} ${INPUT_DEFAULT_CLASS}`} value={precio} onChange={(e) => setPrecio(e.target.value)} disabled={estado === 'cargando' || segundosRestantes !== null} />
                </label>
                <label className={LABEL_CLASS}>Método de pago
                  <select className={`${INPUT_BASE_CLASS} ${INPUT_DEFAULT_CLASS}`} value={tipoPago} onChange={(e) => setTipoPago(e.target.value as 'sinpe_movil' | 'transferencia_bancaria')} disabled={estado === 'cargando' || segundosRestantes !== null}>
                    <option value="sinpe_movil">SINPE Móvil</option>
                    <option value="transferencia_bancaria">Transferencia bancaria</option>
                  </select>
                </label>
                <label className={LABEL_CLASS}>Políticas de cancelación
                  <textarea className={`${INPUT_BASE_CLASS} ${INPUT_DEFAULT_CLASS}`} value={politicasCancelacion} onChange={(e) => setPoliticasCancelacion(e.target.value)} disabled={estado === 'cargando' || segundosRestantes !== null} placeholder="Ej. Cancelaciones con 48 horas de anticipación." />
                </label>
              </div>
            )}
          </div>

          <div className="mt-4 sm:mt-5">
            <span className={LABEL_CLASS}>Cupos</span>

            <div className="mt-2 grid gap-4 sm:grid-cols-2 sm:gap-5">
              <div>
                <label
                  className={LABEL_CLASS}
                  htmlFor="cupoMinimo"
                >
                  Cupo mínimo
                </label>

                <input
                  id="cupoMinimo"
                  type="number"
                  min={1}
                  step={1}
                  className={
                    errores.cupoMinimo
                      ? `${INPUT_BASE_CLASS} ${INPUT_ERROR_CLASS}`
                      : `${INPUT_BASE_CLASS} ${INPUT_DEFAULT_CLASS}`
                  }
                  value={cupoMinimo}
                  aria-invalid={Boolean(
                    errores.cupoMinimo
                  )}
                  aria-describedby={
                    errores.cupoMinimo
                      ? 'cupoMinimo-error'
                      : undefined
                  }
                  onChange={(e) => {
                    setCupoMinimo(e.target.value);
                    limpiarError('cupoMinimo');
                  }}
                  placeholder="Opcional"
                  disabled={
                    estado === 'cargando' ||
                    segundosRestantes !== null
                  }
                />

                {errores.cupoMinimo && (
                  <span
                    id="cupoMinimo-error"
                    className={ERROR_CLASS}
                    role="alert"
                  >
                    <span
                      className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#D9D823]"
                      aria-hidden="true"
                    />
                    {errores.cupoMinimo}
                  </span>
                )}
              </div>

              <div>
                <label
                  className={LABEL_CLASS}
                  htmlFor="cupoMaximo"
                >
                  Cupo máximo
                </label>

                <input
                  id="cupoMaximo"
                  type="number"
                  min={1}
                  step={1}
                  className={
                    errores.cupoMaximo
                      ? `${INPUT_BASE_CLASS} ${INPUT_ERROR_CLASS}`
                      : `${INPUT_BASE_CLASS} ${INPUT_DEFAULT_CLASS}`
                  }
                  value={cupoMaximo}
                  aria-invalid={Boolean(
                    errores.cupoMaximo
                  )}
                  aria-describedby={
                    errores.cupoMaximo
                      ? 'cupoMaximo-error'
                      : undefined
                  }
                  onChange={(e) => {
                    setCupoMaximo(e.target.value);
                    limpiarError('cupoMaximo');
                  }}
                  placeholder="Opcional"
                  disabled={
                    estado === 'cargando' ||
                    segundosRestantes !== null
                  }
                />

                {errores.cupoMaximo && (
                  <span
                    id="cupoMaximo-error"
                    className={ERROR_CLASS}
                    role="alert"
                  >
                    <span
                      className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#D9D823]"
                      aria-hidden="true"
                    />
                    {errores.cupoMaximo}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="mt-4 sm:mt-5">
            <span className={LABEL_CLASS}>Rango de edad</span>

            <div className="mt-2 grid gap-4 sm:grid-cols-2 sm:gap-5">
              <div>
                <label
                  className={LABEL_CLASS}
                  htmlFor="edadMinima"
                >
                  Edad mínima
                </label>

                <input
                  id="edadMinima"
                  type="number"
                  min={0}
                  step={1}
                  className={
                    errores.edadMinima
                      ? `${INPUT_BASE_CLASS} ${INPUT_ERROR_CLASS}`
                      : `${INPUT_BASE_CLASS} ${INPUT_DEFAULT_CLASS}`
                  }
                  value={edadMinima}
                  aria-invalid={Boolean(
                    errores.edadMinima
                  )}
                  aria-describedby={
                    errores.edadMinima
                      ? 'edadMinima-error'
                      : undefined
                  }
                  onChange={(e) => {
                    setEdadMinima(e.target.value);
                    limpiarError('edadMinima');
                  }}
                  placeholder="Opcional"
                  disabled={
                    estado === 'cargando' ||
                    segundosRestantes !== null
                  }
                />

                {errores.edadMinima && (
                  <span
                    id="edadMinima-error"
                    className={ERROR_CLASS}
                    role="alert"
                  >
                    <span
                      className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#D9D823]"
                      aria-hidden="true"
                    />
                    {errores.edadMinima}
                  </span>
                )}
              </div>

              <div>
                <label
                  className={LABEL_CLASS}
                  htmlFor="edadMaxima"
                >
                  Edad máxima
                </label>

                <input
                  id="edadMaxima"
                  type="number"
                  min={0}
                  step={1}
                  className={
                    errores.edadMaxima
                      ? `${INPUT_BASE_CLASS} ${INPUT_ERROR_CLASS}`
                      : `${INPUT_BASE_CLASS} ${INPUT_DEFAULT_CLASS}`
                  }
                  value={edadMaxima}
                  aria-invalid={Boolean(
                    errores.edadMaxima
                  )}
                  aria-describedby={
                    errores.edadMaxima
                      ? 'edadMaxima-error'
                      : undefined
                  }
                  onChange={(e) => {
                    setEdadMaxima(e.target.value);
                    limpiarError('edadMaxima');
                  }}
                  placeholder="Opcional"
                  disabled={
                    estado === 'cargando' ||
                    segundosRestantes !== null
                  }
                />

                {errores.edadMaxima && (
                  <span
                    id="edadMaxima-error"
                    className={ERROR_CLASS}
                    role="alert"
                  >
                    <span
                      className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#D9D823]"
                      aria-hidden="true"
                    />
                    {errores.edadMaxima}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="mt-4 sm:mt-5">
            <span className={LABEL_CLASS}>
              Imágenes (opcional)
            </span>

            <p className="mt-1 text-xs text-slate-500">
              Se subirán automáticamente al guardar el
              registro.
            </p>

            <div className="mt-2">
              <ImageDropzone
                value={imagenes}
                onChange={setImagenes}
                disabled={
                  estado === 'cargando' ||
                  segundosRestantes !== null
                }
              />
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:mt-8 sm:grid-cols-3">
            <button
              type="button"
              className="inline-flex items-center justify-center rounded-2xl border border-[#095540]/20 bg-white/90 px-5 py-3 text-sm font-bold text-[#095540] outline-none hover:border-[#009444]/45 hover:bg-[#8DC63F]/12 focus-visible:ring-4 focus-visible:ring-[#009444]/30 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-stone-100 disabled:text-stone-400 motion-safe:transition-[transform,background-color,border-color] motion-safe:duration-200 motion-safe:ease-out motion-safe:hover:-translate-y-0.5 motion-safe:active:scale-[0.98] motion-reduce:transform-none motion-reduce:transition-none"
              onClick={handleCancelar}
              disabled={
                estado === 'cargando' ||
                segundosRestantes !== null
              }
            >
              Cancelar
            </button>

            <button
              type="button"
              onClick={handleGuardarBorrador}
              disabled={
                estado === 'cargando' ||
                segundosRestantes !== null
              }
              className="inline-flex items-center justify-center rounded-2xl border border-[#095540]/25 bg-[#095540]/5 px-5 py-3 text-sm font-bold text-[#095540] outline-none hover:border-[#095540]/45 hover:bg-[#095540]/10 focus-visible:ring-4 focus-visible:ring-[#095540]/25 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 motion-safe:transition-[transform,background-color,border-color] motion-safe:duration-200 motion-safe:ease-out motion-safe:hover:-translate-y-0.5 motion-safe:active:scale-[0.98] motion-reduce:transform-none motion-reduce:transition-none"
            >
              {estado === 'cargando' &&
              accionGuardado === 'borrador'
                ? 'Guardando...'
                : 'Guardar borrador'}
            </button>

            <button
              type="button"
              onClick={handleGuardarNormal}
              disabled={
                estado === 'cargando' ||
                segundosRestantes !== null
              }
              className="inline-flex items-center justify-center rounded-2xl bg-[#8DC63F] px-5 py-3 text-sm font-bold text-[#095540] shadow-[0_10px_24px_rgba(141,198,63,0.24)] outline-none hover:bg-[#009444] hover:text-white hover:shadow-[0_14px_30px_rgba(0,148,68,0.3)] focus-visible:ring-4 focus-visible:ring-[#8DC63F]/45 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-[#8DC63F]/45 disabled:text-[#095540]/60 disabled:shadow-none motion-safe:transition-[transform,background-color,box-shadow] motion-safe:duration-200 motion-safe:ease-out motion-safe:hover:-translate-y-0.5 motion-safe:active:scale-[0.98] motion-reduce:transform-none motion-reduce:transition-none"
            >
             {estado === 'cargando' &&
  accionGuardado === 'no_publicado'
    ? 'Guardando...'
    : 'Guardar registro'}
            </button>
          </div>

          {mensaje && (
            <p
              className={`mt-4 flex items-start gap-2.5 rounded-2xl border px-4 py-3 text-sm font-medium leading-5 sm:mt-5 ${
                estado === 'exito'
                  ? 'border-[#009444]/30 bg-[#009444]/10 text-[#095540]'
                  : 'border-[#D9D823]/70 bg-[#D9D823]/15 text-black'
              }`}
              role={
                estado === 'error'
                  ? 'alert'
                  : 'status'
              }
              aria-live={
                estado === 'error'
                  ? 'assertive'
                  : 'polite'
              }
            >
              <span
                className="mt-0.5 inline-flex shrink-0"
                aria-hidden="true"
              >
                {estado === 'exito' ? (
                  <svg
                    className="h-4 w-4"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <path
                      d="M5 13l4 4L19 7"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                ) : (
                  <svg
                    className="h-4 w-4"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <path
                      d="M12 3l9 16H3l9-16z"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M12 10v4"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                    <circle
                      cx="12"
                      cy="17"
                      r="1"
                      fill="currentColor"
                    />
                  </svg>
                )}
              </span>

              {mensaje}
            </p>
          )}

          {segundosRestantes !== null && (
            <p className="mt-3 text-center text-xs font-medium text-slate-500">
              Cerrando en {segundosRestantes}...
            </p>
          )}
        </div>
      </form>
    </div>
  </div>
);


}
