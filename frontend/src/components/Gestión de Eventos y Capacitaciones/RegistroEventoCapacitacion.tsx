import { useState, useEffect } from 'react';
import type { FormEvent } from 'react';
import ImageDropzone from './Imagedropzone';

type Estado = 'idle' | 'cargando' | 'exito' | 'error';
type TipoActividad = 'evento' | 'capacitacion';

interface CampoErrores {
  nombre?: string;
  descripcion?: string;
  fecha?: string;
  hora?: string;
  lugar?: string;
  cupoMaximo?: string;
}

interface RegistroEventoCapacitacionProps {
  isOpen: boolean;
  onClose: () => void;
  onRegistrado?: () => void;
}

interface RespuestaRegistro {
  id?: number;
  mensaje?: string;
}

const SEGUNDOS_CIERRE = 2;

const INPUT_BASE_CLASS =
  'mt-2 block w-full rounded-2xl border bg-white/90 px-4 py-3 text-[0.9375rem] text-slate-900 shadow-sm outline-none placeholder:text-slate-400 focus-visible:ring-4 motion-safe:transition-[border-color,box-shadow,background-color] motion-safe:duration-200 motion-reduce:transition-none';
const INPUT_DEFAULT_CLASS =
  'border-[#095540]/20 hover:border-[#095540]/45 focus-visible:border-[#009444] focus-visible:ring-[#009444]/25';
const INPUT_ERROR_CLASS =
  'border-[#D9D823] bg-[#D9D823]/10 focus-visible:border-[#D9D823] focus-visible:ring-[#D9D823]/30';
const LABEL_CLASS = 'text-sm font-semibold text-[#095540]';
const ERROR_CLASS = 'mt-2 flex items-center gap-2 text-xs font-semibold text-[#095540]';

function obtenerUrlBaseApi(): string | null {
  const urlConfigurada = import.meta.env.VITE_API_URL?.trim();

  return urlConfigurada ? urlConfigurada.replace(/\/+$/, '') : null;
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
    lector.onerror = () => reject(lector.error ?? new Error('Error al leer el archivo'));
    lector.readAsDataURL(archivo);
  });
}

async function subirImagen(urlBaseApi: string, eventoId: number, archivo: File): Promise<void> {
  const imagenBase64 = await leerArchivoComoBase64(archivo);

  const respuesta = await fetch(
    `${urlBaseApi}/api/eventos-capacitaciones/${eventoId}/imagenes`,
    {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        imagenBase64,
        tipoMime: archivo.type,
        nombreArchivo: archivo.name,
      }),
    },
  );

  if (!respuesta.ok) {
    throw new Error('No se pudo subir la imagen');
  }
}

export default function RegistroEventoCapacitacion({
  isOpen,
  onClose,
  onRegistrado,
}: RegistroEventoCapacitacionProps) {
  const [tipoActividad, setTipoActividad] = useState<TipoActividad>('evento');
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [fecha, setFecha] = useState('');
  const [hora, setHora] = useState('');
  const [lugar, setLugar] = useState('');
  const [cupoMaximo, setCupoMaximo] = useState('');
  const [imagenes, setImagenes] = useState<File[]>([]);

  const [mensaje, setMensaje] = useState('');
  const [estado, setEstado] = useState<Estado>('idle');
  const [errores, setErrores] = useState<CampoErrores>({});
  const [segundosRestantes, setSegundosRestantes] = useState<number | null>(null);

  const esCapacitacion = tipoActividad === 'capacitacion';
  const colorAcento = esCapacitacion ? '#00AEEF' : '#8DC63F';
  const colorAcentoOscuro = esCapacitacion ? '#0B7FB0' : '#009444';

  // Bloquea el scroll del fondo mientras el modal está abierto
  useEffect(() => {
    if (!isOpen) return;

    const overflowOriginal = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = overflowOriginal;
    };
  }, [isOpen]);

  // Cierra con la tecla Escape
  useEffect(() => {
    if (!isOpen) return;

    const manejarTecla = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && estado !== 'cargando') onClose();
    };

    window.addEventListener('keydown', manejarTecla);
    return () => window.removeEventListener('keydown', manejarTecla);
  }, [isOpen, estado, onClose]);

  useEffect(() => {
    if (segundosRestantes === null) return;

    if (segundosRestantes === 0) {
      handleCerrarYLimpiar();
      onRegistrado?.();
      return;
    }

    const temporizador = setTimeout(() => {
      setSegundosRestantes((prev) => (prev !== null ? prev - 1 : null));
    }, 1000);

    return () => clearTimeout(temporizador);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [segundosRestantes]);

  if (!isOpen) return null;

  const validarCampos = (): CampoErrores => {
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
      nuevosErrores.fecha = 'La fecha no puede ser anterior a hoy';
    }

    if (!hora) {
      nuevosErrores.hora = 'Completa este campo';
    }

    if (!lugar.trim()) {
      nuevosErrores.lugar = 'Completa este campo';
    } else if (lugar.trim().length > 255) {
      nuevosErrores.lugar = 'Máximo 255 caracteres';
    }

    if (cupoMaximo.trim()) {
      const valor = Number(cupoMaximo);
      if (!Number.isInteger(valor) || valor <= 0) {
        nuevosErrores.cupoMaximo = 'Debe ser un número entero positivo';
      }
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
    setNombre('');
    setDescripcion('');
    setFecha('');
    setHora('');
    setLugar('');
    setCupoMaximo('');
    setImagenes([]);
    setErrores({});
    setMensaje('');
    setEstado('idle');
    setSegundosRestantes(null);
    onClose();
  };

  const handleCancelar = () => {
    if (estado === 'cargando') return;
    handleCerrarYLimpiar();
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    const nuevosErrores = validarCampos();
    setErrores(nuevosErrores);

    if (Object.keys(nuevosErrores).length > 0) {
      setMensaje('');
      return;
    }

    setEstado('cargando');

    const urlBaseApi = obtenerUrlBaseApi();

    if (!urlBaseApi) {
      setMensaje('No se pudo configurar la conexión con el servidor');
      setEstado('error');
      return;
    }

    try {
      const respuesta = await fetch(`${urlBaseApi}/api/eventos-capacitaciones`, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nombre: nombre.trim(),
          descripcion: descripcion.trim(),
          fecha,
          hora,
          lugar: lugar.trim(),
          tipoActividad,
          cupoMaximo: cupoMaximo.trim() ? Number(cupoMaximo) : null,
        }),
      });

      let resultado: RespuestaRegistro;

      try {
        resultado = (await respuesta.json()) as RespuestaRegistro;
      } catch {
        setMensaje('El servidor devolvió una respuesta inesperada');
        setEstado('error');
        return;
      }

      if (!respuesta.ok) {
        setMensaje(resultado.mensaje ?? 'No se pudo completar el registro');
        setEstado('error');
        return;
      }

      let advertencia = '';

      if (imagenes.length > 0 && resultado.id) {
        const subidas = await Promise.allSettled(
          imagenes.map((archivo) => subirImagen(urlBaseApi, resultado.id as number, archivo)),
        );
        const fallidas = subidas.filter((r) => r.status === 'rejected').length;

        if (fallidas > 0) {
          advertencia = ` No obstante, ${fallidas} de ${imagenes.length} imagen(es) no se pudieron subir.`;
        }
      }

      setMensaje(
        (esCapacitacion
          ? 'Capacitación registrada correctamente.'
          : 'Evento registrado correctamente.') + advertencia,
      );
      setEstado('exito');
      setSegundosRestantes(SEGUNDOS_CIERRE);
    } catch (error) {
      console.error(error);
      setMensaje('No se pudo conectar con el servidor');
      setEstado('error');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-[#095540]/60 px-4 py-8 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="registro-actividad-titulo"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) handleCancelar();
      }}
    >
      <form
        className="relative w-full max-w-2xl overflow-hidden rounded-[2rem] border border-white/65 bg-white/95 p-6 pt-9 shadow-[0_30px_90px_rgba(0,0,0,0.35)] backdrop-blur-2xl motion-safe:transition-[transform,box-shadow] motion-safe:duration-300 motion-safe:ease-out motion-reduce:transition-none sm:p-9 sm:pt-11"
        noValidate
        onSubmit={handleSubmit}
        aria-busy={estado === 'cargando'}
      >
        <div
          className="absolute inset-x-0 top-0 h-1.5 motion-safe:transition-[background] motion-safe:duration-300"
          style={{
            background: `linear-gradient(to right, #095540, ${colorAcentoOscuro}, ${colorAcento})`,
          }}
          aria-hidden="true"
        />

        <button
          type="button"
          onClick={handleCancelar}
          disabled={estado === 'cargando'}
          aria-label="Cerrar"
          className="absolute right-5 top-6 inline-flex h-9 w-9 items-center justify-center rounded-full text-[#095540]/60 outline-none hover:bg-[#095540]/8 hover:text-[#095540] focus-visible:ring-4 focus-visible:ring-[#009444]/25 disabled:cursor-not-allowed disabled:opacity-40 motion-safe:transition-colors motion-safe:duration-200"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M6 6l12 12M18 6L6 18"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </button>

        <div className="mb-7 text-left">
          <span
            className="mb-3 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[0.68rem] font-bold uppercase tracking-[0.16em] motion-safe:transition-colors motion-safe:duration-300"
            style={{
              borderColor: `${colorAcento}80`,
              backgroundColor: `${colorAcento}2E`,
              color: '#095540',
            }}
          >
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M12 2C7 2 3 6 3 11c0 5.5 6 10 9 11 3-1 9-5.5 9-11 0-5-4-9-9-9z"
                fill="currentColor"
              />
            </svg>
            Gestión de actividades
          </span>

          <h2
            id="registro-actividad-titulo"
            className="font-brand text-3xl font-bold tracking-tight text-[#095540] sm:text-[2rem]"
          >
            Nuevo registro
          </h2>

          <p className="mt-2 text-sm leading-6 text-slate-600">
            Registra un evento o capacitación para el parque
          </p>
        </div>

        <div>
          <span className={LABEL_CLASS}>Tipo de actividad</span>

          <div className="mt-2 grid grid-cols-2 gap-3" role="radiogroup" aria-label="Tipo de actividad">
            <button
              type="button"
              role="radio"
              aria-checked={tipoActividad === 'evento'}
              onClick={() => setTipoActividad('evento')}
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
              onClick={() => setTipoActividad('capacitacion')}
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

        <div className="mt-5">
          <label className={LABEL_CLASS} htmlFor="nombre">
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
            aria-describedby={errores.nombre ? 'nombre-error' : undefined}
            onChange={(e) => {
              setNombre(e.target.value);
              limpiarError('nombre');
            }}
            placeholder="Ej. Taller de reciclaje comunitario"
          />

          {errores.nombre && (
            <span id="nombre-error" className={ERROR_CLASS} role="alert">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#D9D823]" aria-hidden="true" />
              {errores.nombre}
            </span>
          )}
        </div>

        <div className="mt-5">
          <label className={LABEL_CLASS} htmlFor="descripcion">
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
            aria-invalid={Boolean(errores.descripcion)}
            aria-describedby={errores.descripcion ? 'descripcion-error' : undefined}
            onChange={(e) => {
              setDescripcion(e.target.value);
              limpiarError('descripcion');
            }}
            placeholder="Describe brevemente en qué consiste la actividad"
          />

          {errores.descripcion && (
            <span id="descripcion-error" className={ERROR_CLASS} role="alert">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#D9D823]" aria-hidden="true" />
              {errores.descripcion}
            </span>
          )}
        </div>

        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <div>
            <label className={LABEL_CLASS} htmlFor="fecha">
              Fecha
            </label>

            <input
              id="fecha"
              type="date"
              min={obtenerFechaHoy()}
              className={
                errores.fecha
                  ? `${INPUT_BASE_CLASS} ${INPUT_ERROR_CLASS}`
                  : `${INPUT_BASE_CLASS} ${INPUT_DEFAULT_CLASS}`
              }
              value={fecha}
              aria-invalid={Boolean(errores.fecha)}
              aria-describedby={errores.fecha ? 'fecha-error' : undefined}
              onChange={(e) => {
                setFecha(e.target.value);
                limpiarError('fecha');
              }}
            />

            {errores.fecha && (
              <span id="fecha-error" className={ERROR_CLASS} role="alert">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#D9D823]" aria-hidden="true" />
                {errores.fecha}
              </span>
            )}
          </div>

          <div>
            <label className={LABEL_CLASS} htmlFor="hora">
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
              aria-describedby={errores.hora ? 'hora-error' : undefined}
              onChange={(e) => {
                setHora(e.target.value);
                limpiarError('hora');
              }}
            />

            {errores.hora && (
              <span id="hora-error" className={ERROR_CLASS} role="alert">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#D9D823]" aria-hidden="true" />
                {errores.hora}
              </span>
            )}
          </div>
        </div>

        <div className="mt-5 grid gap-5 sm:grid-cols-[1fr_auto]">
          <div>
            <label className={LABEL_CLASS} htmlFor="lugar">
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
              aria-describedby={errores.lugar ? 'lugar-error' : undefined}
              onChange={(e) => {
                setLugar(e.target.value);
                limpiarError('lugar');
              }}
              placeholder="Ej. Salón comunal del parque"
            />

            {errores.lugar && (
              <span id="lugar-error" className={ERROR_CLASS} role="alert">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#D9D823]" aria-hidden="true" />
                {errores.lugar}
              </span>
            )}
          </div>

          <div>
            <label className={LABEL_CLASS} htmlFor="cupoMaximo">
              Cupo máximo
            </label>

            <input
              id="cupoMaximo"
              type="number"
              min={1}
              step={1}
              className={
                errores.cupoMaximo
                  ? `${INPUT_BASE_CLASS} ${INPUT_ERROR_CLASS} sm:w-36`
                  : `${INPUT_BASE_CLASS} ${INPUT_DEFAULT_CLASS} sm:w-36`
              }
              value={cupoMaximo}
              aria-invalid={Boolean(errores.cupoMaximo)}
              aria-describedby={errores.cupoMaximo ? 'cupoMaximo-error' : undefined}
              onChange={(e) => {
                setCupoMaximo(e.target.value);
                limpiarError('cupoMaximo');
              }}
              placeholder="Opcional"
            />

            {errores.cupoMaximo && (
              <span id="cupoMaximo-error" className={ERROR_CLASS} role="alert">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#D9D823]" aria-hidden="true" />
                {errores.cupoMaximo}
              </span>
            )}
          </div>
        </div>

        <div className="mt-5">
          <span className={LABEL_CLASS}>Imágenes (opcional)</span>
          <p className="mt-1 text-xs text-slate-500">
            Se subirán automáticamente al guardar el registro.
          </p>

          <div className="mt-2">
            <ImageDropzone
              value={imagenes}
              onChange={setImagenes}
              disabled={estado === 'cargando' || segundosRestantes !== null}
            />
          </div>
        </div>

        <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row">
          <button
            type="button"
            className="inline-flex flex-1 items-center justify-center rounded-2xl border border-[#095540]/20 bg-white/90 px-5 py-3 text-sm font-bold text-[#095540] outline-none hover:border-[#009444]/45 hover:bg-[#8DC63F]/12 focus-visible:ring-4 focus-visible:ring-[#009444]/30 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-stone-100 disabled:text-stone-400 motion-safe:transition-[transform,background-color,border-color] motion-safe:duration-200 motion-safe:ease-out motion-safe:hover:-translate-y-0.5 motion-safe:active:scale-[0.98] motion-reduce:transform-none motion-reduce:transition-none"
            onClick={handleCancelar}
            disabled={estado === 'cargando' || segundosRestantes !== null}
          >
            Cancelar
          </button>

          <button
            type="submit"
            className="inline-flex flex-1 items-center justify-center rounded-2xl bg-[#8DC63F] px-5 py-3 text-sm font-bold text-[#095540] shadow-[0_10px_24px_rgba(141,198,63,0.24)] outline-none hover:bg-[#009444] hover:text-white hover:shadow-[0_14px_30px_rgba(0,148,68,0.3)] focus-visible:ring-4 focus-visible:ring-[#8DC63F]/45 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-[#8DC63F]/45 disabled:text-[#095540]/60 disabled:shadow-none motion-safe:transition-[transform,background-color,box-shadow] motion-safe:duration-200 motion-safe:ease-out motion-safe:hover:-translate-y-0.5 motion-safe:active:scale-[0.98] motion-reduce:transform-none motion-reduce:transition-none"
            disabled={estado === 'cargando' || segundosRestantes !== null}
          >
            {estado === 'cargando' ? 'Guardando...' : 'Guardar registro'}
          </button>
        </div>

        {mensaje && (
          <p
            className={`mt-5 flex items-start gap-2.5 rounded-2xl border px-4 py-3 text-sm font-medium leading-5 ${
              estado === 'exito'
                ? 'border-[#009444]/30 bg-[#009444]/10 text-[#095540]'
                : 'border-[#D9D823]/70 bg-[#D9D823]/15 text-black'
            }`}
            role={estado === 'error' ? 'alert' : 'status'}
            aria-live={estado === 'error' ? 'assertive' : 'polite'}
          >
            <span className="mt-0.5 inline-flex shrink-0" aria-hidden="true">
              {estado === 'exito' ? (
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M5 13l4 4L19 7"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              ) : (
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M12 3l9 16H3l9-16z"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinejoin="round"
                  />
                  <path d="M12 10v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  <circle cx="12" cy="17" r="1" fill="currentColor" />
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
      </form>
    </div>
  );
}