import { useState, useEffect, useRef } from 'react';
import type { FormEvent } from 'react';
import ImageDropzone from './Imagedropzone';

type Estado = 'idle' | 'cargando' | 'exito' | 'error';
type TipoActividad = 'evento' | 'capacitacion';
type Temporada = 'seca' | 'lluviosa';
type EstadoEventoCapacitacion =
  | 'borrador'
  | 'publicado'
  | 'no_publicado'
  | 'desactivado';

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

export interface EventoCapacitacionActual {
  id: number;
  nombre: string | null;
  descripcion: string | null;
  fecha: string | null;
  hora: string | null;
  lugar: string | null;
  tipoActividad: TipoActividad;
  cupoMinimo: number | null;
  cupoMaximo: number | null;
  edadMinima: number | null;
  edadMaxima: number | null;
  estado: EstadoEventoCapacitacion;
  esPago?: boolean;
  precio?: number;
  tipoPago?: 'sinpe_movil' | 'transferencia_bancaria' | null;
  politicasCancelacion?: string | null;
  temporada: Temporada | null;
}

interface ImagenExistente {
  id: number;
  tipoMime: string;
  nombreArchivo: string | null;
  tamanoBytes: number | null;
  fechaCreacion: string;
  eventoCapacitacionId: number;
}

interface EdicionEventoCapacitacionProps {
  isOpen: boolean;
  onClose: () => void;
  evento: EventoCapacitacionActual;
  onActualizado?: () => void;
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
  return sessionStorage.getItem('token') ?? localStorage.getItem('token');
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
  const token = obtenerToken();

  if (!token) throw new Error('No se encontró el token de autenticación');

  const respuesta = await fetch(`${urlBaseApi}/api/eventos-capacitaciones/${eventoId}/imagenes`, {
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
  });

  if (!respuesta.ok) {
    let detalle = 'No se pudo subir la imagen';
    try {
      const resultado = await respuesta.json();
      detalle = resultado?.message ?? resultado?.mensaje ?? detalle;
    } catch {
      //
    }
    throw new Error(detalle);
  }
}

export default function EdicionEventoCapacitacion({
  isOpen,
  onClose,
  evento,
  onActualizado,
}: EdicionEventoCapacitacionProps) {
  const contenidoFormularioRef = useRef<HTMLDivElement | null>(null);
  const [tipoActividad, setTipoActividad] = useState<TipoActividad>('evento');
  const [temporada, setTemporada] = useState<Temporada | ''>('');
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [fecha, setFecha] = useState('');
  const [hora, setHora] = useState('');
  const [lugar, setLugar] = useState('');
  const [cupoMinimo, setCupoMinimo] = useState('');
  const [cupoMaximo, setCupoMaximo] = useState('');
  const [edadMinima, setEdadMinima] = useState('');
  const [edadMaxima, setEdadMaxima] = useState('');
  const [imagenesNuevas, setImagenesNuevas] = useState<File[]>([]);
  const [esPago, setEsPago] = useState(false);
  const [precio, setPrecio] = useState('');
  const [tipoPago, setTipoPago] = useState<'sinpe_movil' | 'transferencia_bancaria'>('sinpe_movil');
  const [politicasCancelacion, setPoliticasCancelacion] = useState('');
  const [imagenesExistentes, setImagenesExistentes] = useState<ImagenExistente[]>([]);
  const [cargandoImagenes, setCargandoImagenes] = useState(false);
  const [imagenesEliminando, setImagenesEliminando] = useState<number[]>([]);

  const [mensaje, setMensaje] = useState('');
  const [estado, setEstado] = useState<Estado>('idle');
  const [errores, setErrores] = useState<CampoErrores>({});
  const [segundosRestantes, setSegundosRestantes] = useState<number | null>(null);

  const esCapacitacion = tipoActividad === 'capacitacion';
  const colorAcento = esCapacitacion ? '#00AEEF' : '#8DC63F';
  const colorAcentoOscuro = esCapacitacion ? '#0B7FB0' : '#009444';
  const tipoActividadBloqueado = evento.estado === 'publicado';

  // Precargar los campos con los datos actuales cada vez que se abre con un evento nuevo
  useEffect(() => {
    if (!isOpen) return;

    setTipoActividad(evento.tipoActividad);
    setTemporada(evento.temporada ?? '');
    setNombre(evento.nombre ?? '');
    setDescripcion(evento.descripcion ?? '');
    setFecha(evento.fecha ?? '');
    setHora(evento.hora ?? '');
    setLugar(evento.lugar ?? '');
    setCupoMinimo(evento.cupoMinimo != null ? String(evento.cupoMinimo) : '');
    setCupoMaximo(evento.cupoMaximo != null ? String(evento.cupoMaximo) : '');
    setEdadMinima(evento.edadMinima != null ? String(evento.edadMinima) : '');
    setEdadMaxima(evento.edadMaxima != null ? String(evento.edadMaxima) : '');
    setEsPago(evento.esPago ?? false);
    setPrecio(evento.precio != null ? String(evento.precio) : '');
    setTipoPago(evento.tipoPago ?? 'sinpe_movil');
    setPoliticasCancelacion(evento.politicasCancelacion ?? '');
    setImagenesNuevas([]);
    setErrores({});
    setMensaje('');
    setEstado('idle');
    setSegundosRestantes(null);
  }, [isOpen, evento]);

  useEffect(() => {
    if (!isOpen) return;

    const cuadro = window.requestAnimationFrame(() => {
      contenidoFormularioRef.current?.scrollTo({ top: 0, behavior: 'auto' });
    });

    return () => window.cancelAnimationFrame(cuadro);
  }, [isOpen, evento.id]);

  // Cargar las imágenes que ya tiene el evento
  useEffect(() => {
    if (!isOpen) return;

    const urlBaseApi = obtenerUrlBaseApi();
    if (!urlBaseApi) return;

    setCargandoImagenes(true);

    fetch(`${urlBaseApi}/api/eventos-capacitaciones/${evento.id}/imagenes`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data: ImagenExistente[]) => setImagenesExistentes(data))
      .catch(() => setImagenesExistentes([]))
      .finally(() => setCargandoImagenes(false));
  }, [isOpen, evento.id]);

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
      if (e.key === 'Escape' && estado !== 'cargando') onClose();
    };
    window.addEventListener('keydown', manejarTecla);
    return () => window.removeEventListener('keydown', manejarTecla);
  }, [isOpen, estado, onClose]);

  useEffect(() => {
    if (segundosRestantes === null) return;

    if (segundosRestantes === 0) {
      onActualizado?.();
      onClose();
      return;
    }

    const temporizador = setTimeout(() => {
      setSegundosRestantes((prev) => (prev !== null ? prev - 1 : null));
    }, 1000);

    return () => clearTimeout(temporizador);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [segundosRestantes]);

  if (!isOpen) return null;

  const limpiarError = (campo: keyof CampoErrores) => {
    setErrores((prev) => {
      if (!prev[campo]) return prev;
      const copia = { ...prev };
      delete copia[campo];
      return copia;
    });
  };

  const validarSiCorresponde = (): CampoErrores => {
    // Solo exigimos completitud si el evento ya está publicado o no_publicado,
    // igual que hace el backend al validar datos completos
    const debeEstarCompleto =
      evento.estado === 'publicado' || evento.estado === 'no_publicado';

    if (!debeEstarCompleto) return {};

    const nuevosErrores: CampoErrores = {};

    if (!nombre.trim()) nuevosErrores.nombre = 'Completa este campo';
    else if (nombre.trim().length > 150) nuevosErrores.nombre = 'Máximo 150 caracteres';

    if (!descripcion.trim()) nuevosErrores.descripcion = 'Completa este campo';

    if (!fecha) nuevosErrores.fecha = 'Completa este campo';
    else if (fecha < obtenerFechaHoy()) nuevosErrores.fecha = 'La fecha no puede ser anterior a hoy';

    if (!hora) nuevosErrores.hora = 'Completa este campo';

    if (!lugar.trim()) nuevosErrores.lugar = 'Completa este campo';
    else if (lugar.trim().length > 255) nuevosErrores.lugar = 'Máximo 255 caracteres';

    if (!temporada) nuevosErrores.temporada = 'Selecciona una temporada';

    if (!cupoMinimo.trim()) {
      nuevosErrores.cupoMinimo = 'Completa este campo';
    } else {
      const valor = Number(cupoMinimo);
      if (!Number.isInteger(valor) || valor <= 0) {
        nuevosErrores.cupoMinimo = 'Debe ser un número entero positivo';
      }
    }

    if (!cupoMaximo.trim()) {
      nuevosErrores.cupoMaximo = 'Completa este campo';
    } else {
      const valor = Number(cupoMaximo);
      if (!Number.isInteger(valor) || valor <= 0) {
        nuevosErrores.cupoMaximo = 'Debe ser un número entero positivo';
      }
    }

    if (!edadMinima.trim()) {
      nuevosErrores.edadMinima = 'Completa este campo';
    } else {
      const valor = Number(edadMinima);
      if (!Number.isInteger(valor) || valor < 0) {
        nuevosErrores.edadMinima = 'Debe ser un número entero mayor o igual a 0';
      }
    }

    if (!edadMaxima.trim()) {
      nuevosErrores.edadMaxima = 'Completa este campo';
    } else {
      const valor = Number(edadMaxima);
      if (!Number.isInteger(valor) || valor < 0) {
        nuevosErrores.edadMaxima = 'Debe ser un número entero mayor o igual a 0';
      }
    }

    const cupoMinimoValor = cupoMinimo.trim() ? Number(cupoMinimo) : null;
    const cupoMaximoValor = cupoMaximo.trim() ? Number(cupoMaximo) : null;
    const edadMinimaValor = edadMinima.trim() ? Number(edadMinima) : null;
    const edadMaximaValor = edadMaxima.trim() ? Number(edadMaxima) : null;

    if (
      cupoMinimoValor !== null &&
      cupoMaximoValor !== null &&
      cupoMinimoValor > cupoMaximoValor
    ) {
      nuevosErrores.cupoMinimo = 'El cupo mínimo no puede ser mayor que el cupo máximo';
    }

    if (
      edadMinimaValor !== null &&
      edadMaximaValor !== null &&
      edadMinimaValor > edadMaximaValor
    ) {
      nuevosErrores.edadMinima = 'La edad mínima no puede ser mayor que la edad máxima';
    }

    return nuevosErrores;
  };

  const handleCancelar = () => {
    if (estado === 'cargando') return;
    onClose();
  };

  const handleEliminarImagenExistente = async (imagenId: number) => {
    const urlBaseApi = obtenerUrlBaseApi();
    const token = obtenerToken();

    if (!urlBaseApi || !token) return;

    setImagenesEliminando((prev) => [...prev, imagenId]);

    try {
      const respuesta = await fetch(
        `${urlBaseApi}/api/eventos-capacitaciones/${evento.id}/imagenes/${imagenId}`,
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      if (respuesta.ok) {
        setImagenesExistentes((prev) => prev.filter((img) => img.id !== imagenId));
      }
    } finally {
      setImagenesEliminando((prev) => prev.filter((id) => id !== imagenId));
    }
  };

  const handleGuardar = async () => {
    const nuevosErrores = validarSiCorresponde();
    setErrores(nuevosErrores);

    if (Object.keys(nuevosErrores).length > 0) {
      setMensaje('Completa todos los campos obligatorios para guardar los cambios.');
      setEstado('error');
      return;
    }

    setErrores({});
    setMensaje('');
    setEstado('cargando');

    const urlBaseApi = obtenerUrlBaseApi();

    if (!urlBaseApi) {
      setMensaje('No se pudo configurar la conexión con el servidor');
      setEstado('error');
      return;
    }

    const token = obtenerToken();

    if (!token) {
      setMensaje('No se encontró el token de autenticación. Inicia sesión nuevamente.');
      setEstado('error');
      return;
    }

    try {
      const body: Record<string, unknown> = {
        nombre: nombre.trim() || null,
        descripcion: descripcion.trim() || null,
        fecha: fecha || null,
        hora: hora || null,
        lugar: lugar.trim() || null,
        cupoMinimo: cupoMinimo.trim() ? Number(cupoMinimo) : null,
        cupoMaximo: cupoMaximo.trim() ? Number(cupoMaximo) : null,
        edadMinima: edadMinima.trim() ? Number(edadMinima) : null,
        edadMaxima: edadMaxima.trim() ? Number(edadMaxima) : null,
        temporada: temporada || null,
        esPago,
        precio: esPago ? Number(precio) : 0,
        tipoPago: esPago ? tipoPago : null,
        politicasCancelacion: esPago ? politicasCancelacion.trim() || null : null,
      };

      // Solo mandamos tipoActividad si el usuario lo pudo cambiar
      // (si el evento ya está publicado, el backend lo rechaza igual,
      // pero evitamos mandar un cambio que ni se ofreció en la UI)
      if (!tipoActividadBloqueado) {
        body.tipoActividad = tipoActividad;
      }

      const respuesta = await fetch(`${urlBaseApi}/api/eventos-capacitaciones/${evento.id}`, {
        method: 'PUT',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      let resultado: { mensaje?: string; message?: string } = {};

      try {
        resultado = await respuesta.json();
      } catch {
        //
      }

      if (!respuesta.ok) {
        setMensaje(`Error ${respuesta.status}: ${resultado.mensaje ?? resultado.message ?? 'No se pudo actualizar'}`);
        setEstado('error');
        return;
      }

      let advertencia = '';

      if (imagenesNuevas.length > 0) {
        const subidas = await Promise.allSettled(
          imagenesNuevas.map((archivo) => subirImagen(urlBaseApi, evento.id, archivo)),
        );

        const fallidas = subidas.filter((r) => r.status === 'rejected').length;

        if (fallidas > 0) {
          advertencia = ` No obstante, ${fallidas} de ${imagenesNuevas.length} imagen(es) nuevas no se pudieron subir.`;
        }
      }

      setMensaje(`${esCapacitacion ? 'Capacitación' : 'Evento'} actualizado correctamente.${advertencia}`);
      setEstado('exito');
      setSegundosRestantes(SEGUNDOS_CIERRE);
    } catch (error) {
      setMensaje(error instanceof Error ? `Error al guardar: ${error.message}` : 'No se pudo conectar con el servidor');
      setEstado('error');
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
  };

  const urlBaseApi = obtenerUrlBaseApi();

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-black/60 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="edicion-actividad-titulo"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) handleCancelar();
      }}
    >
      <div className="flex min-h-0 w-full items-center justify-center">
        <form
          className="relative flex max-h-[85dvh] min-h-0 w-full max-w-xl flex-col overflow-hidden rounded-3xl border border-white/20 bg-white/70 p-6 shadow-xl backdrop-blur-md dark:border-white/10 dark:bg-slate-900/70"
          noValidate
          onSubmit={handleSubmit}
          aria-busy={estado === 'cargando'}
        >
          <div
            className="absolute inset-x-0 top-0 z-10 h-1.5"
            style={{ background: `linear-gradient(to right, #095540, ${colorAcentoOscuro}, ${colorAcento})` }}
            aria-hidden="true"
          />

          <div ref={contenidoFormularioRef} className="custom-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain pr-2 pt-2">
            <button
              type="button"
              onClick={handleCancelar}
              disabled={estado === 'cargando' || segundosRestantes !== null}
              aria-label="Cerrar"
              className="absolute right-4 top-4 z-20 inline-flex h-9 w-9 items-center justify-center rounded-full text-[#095540]/60 outline-none hover:bg-[#095540]/8 hover:text-[#095540] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>

            <div className="mb-6 text-left sm:mb-7">
              <span
                className="mb-3 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[0.68rem] font-bold uppercase tracking-[0.16em]"
                style={{ borderColor: `${colorAcento}80`, backgroundColor: `${colorAcento}2E`, color: '#095540' }}
              >
                Gestión de actividades
              </span>

              <h2 id="edicion-actividad-titulo" className="font-brand text-2xl font-bold tracking-tight text-[#095540] sm:text-3xl">
                Editar {esCapacitacion ? 'capacitación' : 'evento'}
              </h2>

              <p className="mt-2 text-sm leading-6 text-slate-600">
                Actualiza los datos de la actividad. Estado actual: <strong>{evento.estado}</strong>
              </p>
            </div>

            <div>
              <span className={LABEL_CLASS}>Tipo de actividad</span>

              {tipoActividadBloqueado && (
                <p className="mt-1 text-xs text-slate-500">
                  No se puede cambiar el tipo una vez que la actividad fue publicada.
                </p>
              )}

              <div className="mt-2 grid grid-cols-2 gap-3" role="radiogroup" aria-label="Tipo de actividad">
                <button
                  type="button"
                  role="radio"
                  aria-checked={tipoActividad === 'evento'}
                  onClick={() => !tipoActividadBloqueado && setTipoActividad('evento')}
                  disabled={estado === 'cargando' || segundosRestantes !== null || tipoActividadBloqueado}
                  className={`rounded-2xl border px-4 py-3 text-sm font-bold outline-none disabled:cursor-not-allowed disabled:opacity-60 ${
                    tipoActividad === 'evento'
                      ? 'border-[#009444] bg-[#8DC63F]/20 text-[#095540]'
                      : 'border-[#095540]/15 bg-white/80 text-slate-500'
                  }`}
                >
                  Evento
                </button>

                <button
                  type="button"
                  role="radio"
                  aria-checked={tipoActividad === 'capacitacion'}
                  onClick={() => !tipoActividadBloqueado && setTipoActividad('capacitacion')}
                  disabled={estado === 'cargando' || segundosRestantes !== null || tipoActividadBloqueado}
                  className={`rounded-2xl border px-4 py-3 text-sm font-bold outline-none disabled:cursor-not-allowed disabled:opacity-60 ${
                    tipoActividad === 'capacitacion'
                      ? 'border-[#0B7FB0] bg-[#00AEEF]/15 text-[#095540]'
                      : 'border-[#095540]/15 bg-white/80 text-slate-500'
                  }`}
                >
                  Capacitación
                </button>
              </div>
            </div>

            <div className="mt-4 sm:mt-5">
              <span className={LABEL_CLASS}>Época del año</span>
              <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => {
                    setTemporada('seca');
                    limpiarError('temporada');
                  }}
                  disabled={estado === 'cargando' || segundosRestantes !== null}
                  className={`rounded-2xl border px-4 py-3 text-sm font-bold ${
                    temporada === 'seca' ? 'border-[#8DC63F] bg-[#8DC63F]/15' : 'border-[#095540]/15 bg-white/80'
                  }`}
                >
                  Época seca
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTemporada('lluviosa');
                    limpiarError('temporada');
                  }}
                  disabled={estado === 'cargando' || segundosRestantes !== null}
                  className={`rounded-2xl border px-4 py-3 text-sm font-bold ${
                    temporada === 'lluviosa' ? 'border-[#00AEEF] bg-[#00AEEF]/10' : 'border-[#095540]/15 bg-white/80'
                  }`}
                >
                  Época lluviosa
                </button>
              </div>
              {errores.temporada && <span className={ERROR_CLASS} role="alert">{errores.temporada}</span>}
            </div>

            <div className="mt-4 sm:mt-5">
              <label className={LABEL_CLASS} htmlFor="nombre">Nombre</label>
              <input
                id="nombre"
                type="text"
                maxLength={150}
                className={errores.nombre ? `${INPUT_BASE_CLASS} ${INPUT_ERROR_CLASS}` : `${INPUT_BASE_CLASS} ${INPUT_DEFAULT_CLASS}`}
                value={nombre}
                onChange={(e) => {
                  setNombre(e.target.value);
                  limpiarError('nombre');
                }}
                disabled={estado === 'cargando' || segundosRestantes !== null}
              />
              {errores.nombre && <span className={ERROR_CLASS} role="alert">{errores.nombre}</span>}
            </div>

            <div className="mt-4 sm:mt-5">
              <label className={LABEL_CLASS} htmlFor="descripcion">Descripción</label>
              <textarea
                id="descripcion"
                rows={3}
                className={errores.descripcion ? `${INPUT_BASE_CLASS} ${INPUT_ERROR_CLASS} resize-none` : `${INPUT_BASE_CLASS} ${INPUT_DEFAULT_CLASS} resize-none`}
                value={descripcion}
                onChange={(e) => {
                  setDescripcion(e.target.value);
                  limpiarError('descripcion');
                }}
                disabled={estado === 'cargando' || segundosRestantes !== null}
              />
              {errores.descripcion && <span className={ERROR_CLASS} role="alert">{errores.descripcion}</span>}
            </div>

            <div className="mt-4 grid gap-4 sm:mt-5 sm:grid-cols-2 sm:gap-5">
              <div>
                <label className={LABEL_CLASS} htmlFor="fecha">Fecha</label>
                <input
                  id="fecha"
                  type="date"
                  min={obtenerFechaHoy()}
                  className={errores.fecha ? `${INPUT_BASE_CLASS} ${INPUT_ERROR_CLASS}` : `${INPUT_BASE_CLASS} ${INPUT_DEFAULT_CLASS}`}
                  value={fecha}
                  onChange={(e) => {
                    setFecha(e.target.value);
                    limpiarError('fecha');
                  }}
                  disabled={estado === 'cargando' || segundosRestantes !== null}
                />
                {errores.fecha && <span className={ERROR_CLASS} role="alert">{errores.fecha}</span>}
              </div>

              <div>
                <label className={LABEL_CLASS} htmlFor="hora">Hora</label>
                <input
                  id="hora"
                  type="time"
                  className={errores.hora ? `${INPUT_BASE_CLASS} ${INPUT_ERROR_CLASS}` : `${INPUT_BASE_CLASS} ${INPUT_DEFAULT_CLASS}`}
                  value={hora}
                  onChange={(e) => {
                    setHora(e.target.value);
                    limpiarError('hora');
                  }}
                  disabled={estado === 'cargando' || segundosRestantes !== null}
                />
                {errores.hora && <span className={ERROR_CLASS} role="alert">{errores.hora}</span>}
              </div>
            </div>

            <div className="mt-4 grid gap-4 sm:mt-5 sm:grid-cols-[1fr_auto] sm:gap-5">
              <div>
                <label className={LABEL_CLASS} htmlFor="lugar">Lugar</label>
                <input
                  id="lugar"
                  type="text"
                  maxLength={255}
                  className={errores.lugar ? `${INPUT_BASE_CLASS} ${INPUT_ERROR_CLASS}` : `${INPUT_BASE_CLASS} ${INPUT_DEFAULT_CLASS}`}
                  value={lugar}
                  onChange={(e) => {
                    setLugar(e.target.value);
                    limpiarError('lugar');
                  }}
                  disabled={estado === 'cargando' || segundosRestantes !== null}
                />
                {errores.lugar && <span className={ERROR_CLASS} role="alert">{errores.lugar}</span>}
              </div>
            </div>

            <div className="mt-5 rounded-2xl border border-[#095540]/15 bg-emerald-50/50 p-4">
              <label className="flex items-center gap-3 text-sm font-semibold text-[#095540]"><input type="checkbox" checked={esPago} onChange={(e) => setEsPago(e.target.checked)} disabled={estado === 'cargando' || segundosRestantes !== null} /> Es actividad de pago</label>
              {esPago && <div className="mt-3 grid gap-3 sm:grid-cols-2"><label className={LABEL_CLASS}>Precio (₡)<input type="number" min={1} className={`${INPUT_BASE_CLASS} ${INPUT_DEFAULT_CLASS}`} value={precio} onChange={(e) => setPrecio(e.target.value)} /></label><label className={LABEL_CLASS}>Políticas de cancelación<textarea className={`${INPUT_BASE_CLASS} ${INPUT_DEFAULT_CLASS}`} value={politicasCancelacion} onChange={(e) => setPoliticasCancelacion(e.target.value)} /></label></div>}
            </div>

            <div className="mt-4 sm:mt-5">
              <span className={LABEL_CLASS}>Cupos</span>

              <div className="mt-2 grid gap-4 sm:grid-cols-2 sm:gap-5">
                <div>
                  <label className={LABEL_CLASS} htmlFor="cupoMinimo">Cupo mínimo</label>
                  <input
                    id="cupoMinimo"
                    type="number"
                    min={1}
                    step={1}
                    className={errores.cupoMinimo ? `${INPUT_BASE_CLASS} ${INPUT_ERROR_CLASS}` : `${INPUT_BASE_CLASS} ${INPUT_DEFAULT_CLASS}`}
                    value={cupoMinimo}
                    aria-invalid={Boolean(errores.cupoMinimo)}
                    aria-describedby={errores.cupoMinimo ? 'cupoMinimo-error' : undefined}
                    onChange={(e) => {
                      setCupoMinimo(e.target.value);
                      limpiarError('cupoMinimo');
                    }}
                    placeholder="Opcional"
                    disabled={estado === 'cargando' || segundosRestantes !== null}
                  />
                  {errores.cupoMinimo && (
                    <span id="cupoMinimo-error" className={ERROR_CLASS} role="alert">
                      {errores.cupoMinimo}
                    </span>
                  )}
                </div>

                <div>
                  <label className={LABEL_CLASS} htmlFor="cupoMaximo">Cupo máximo</label>
                  <input
                    id="cupoMaximo"
                    type="number"
                    min={1}
                    step={1}
                    className={errores.cupoMaximo ? `${INPUT_BASE_CLASS} ${INPUT_ERROR_CLASS}` : `${INPUT_BASE_CLASS} ${INPUT_DEFAULT_CLASS}`}
                    value={cupoMaximo}
                    aria-invalid={Boolean(errores.cupoMaximo)}
                    aria-describedby={errores.cupoMaximo ? 'cupoMaximo-error' : undefined}
                    onChange={(e) => {
                      setCupoMaximo(e.target.value);
                      limpiarError('cupoMaximo');
                    }}
                    placeholder="Opcional"
                    disabled={estado === 'cargando' || segundosRestantes !== null}
                  />
                  {errores.cupoMaximo && (
                    <span id="cupoMaximo-error" className={ERROR_CLASS} role="alert">
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
                  <label className={LABEL_CLASS} htmlFor="edadMinima">Edad mínima</label>
                  <input
                    id="edadMinima"
                    type="number"
                    min={0}
                    step={1}
                    className={errores.edadMinima ? `${INPUT_BASE_CLASS} ${INPUT_ERROR_CLASS}` : `${INPUT_BASE_CLASS} ${INPUT_DEFAULT_CLASS}`}
                    value={edadMinima}
                    aria-invalid={Boolean(errores.edadMinima)}
                    aria-describedby={errores.edadMinima ? 'edadMinima-error' : undefined}
                    onChange={(e) => {
                      setEdadMinima(e.target.value);
                      limpiarError('edadMinima');
                    }}
                    placeholder="Opcional"
                    disabled={estado === 'cargando' || segundosRestantes !== null}
                  />
                  {errores.edadMinima && (
                    <span id="edadMinima-error" className={ERROR_CLASS} role="alert">
                      {errores.edadMinima}
                    </span>
                  )}
                </div>

                <div>
                  <label className={LABEL_CLASS} htmlFor="edadMaxima">Edad máxima</label>
                  <input
                    id="edadMaxima"
                    type="number"
                    min={0}
                    step={1}
                    className={errores.edadMaxima ? `${INPUT_BASE_CLASS} ${INPUT_ERROR_CLASS}` : `${INPUT_BASE_CLASS} ${INPUT_DEFAULT_CLASS}`}
                    value={edadMaxima}
                    aria-invalid={Boolean(errores.edadMaxima)}
                    aria-describedby={errores.edadMaxima ? 'edadMaxima-error' : undefined}
                    onChange={(e) => {
                      setEdadMaxima(e.target.value);
                      limpiarError('edadMaxima');
                    }}
                    placeholder="Opcional"
                    disabled={estado === 'cargando' || segundosRestantes !== null}
                  />
                  {errores.edadMaxima && (
                    <span id="edadMaxima-error" className={ERROR_CLASS} role="alert">
                      {errores.edadMaxima}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-4 sm:mt-5">
              <span className={LABEL_CLASS}>Imágenes actuales</span>

              {cargandoImagenes && <p className="mt-1 text-xs text-slate-500">Cargando imágenes...</p>}

              {!cargandoImagenes && imagenesExistentes.length === 0 && (
                <p className="mt-1 text-xs text-slate-500">Este registro no tiene imágenes todavía.</p>
              )}

              <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-4">
                {imagenesExistentes.map((img) => (
                  <div key={img.id} className="relative overflow-hidden rounded-xl border border-[#095540]/15">
                    <img
                      src={`${urlBaseApi}/api/eventos-capacitaciones/imagenes/${img.id}`}
                      alt={img.nombreArchivo ?? 'Imagen de la actividad'}
                      className="h-24 w-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => handleEliminarImagenExistente(img.id)}
                      disabled={imagenesEliminando.includes(img.id) || estado === 'cargando'}
                      className="absolute right-1 top-1 inline-flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white disabled:opacity-50"
                      aria-label="Eliminar imagen"
                    >
                      {imagenesEliminando.includes(img.id) ? '…' : '✕'}
                    </button>
                  </div>
                ))}
              </div>

              <div className="mt-3">
                <span className={LABEL_CLASS}>Agregar imágenes nuevas</span>
                <div className="mt-2">
                  <ImageDropzone
                    value={imagenesNuevas}
                    onChange={setImagenesNuevas}
                    disabled={estado === 'cargando' || segundosRestantes !== null}
                  />
                </div>
              </div>
            </div>

          </div>

          <div className="sticky bottom-0 z-10 -mx-6 shrink-0 border-t border-white/20 bg-white/70 p-4 backdrop-blur-md dark:border-white/10 dark:bg-slate-900/70">
            <div className="grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                className="inline-flex items-center justify-center rounded-2xl border border-[#095540]/20 bg-white/90 px-5 py-3 text-sm font-bold text-[#095540] disabled:cursor-not-allowed"
                onClick={handleCancelar}
                disabled={estado === 'cargando' || segundosRestantes !== null}
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={handleGuardar}
                disabled={estado === 'cargando' || segundosRestantes !== null}
                className="inline-flex items-center justify-center rounded-2xl bg-[#8DC63F] px-5 py-3 text-sm font-bold text-[#095540] disabled:cursor-not-allowed disabled:bg-[#8DC63F]/45"
              >
                {estado === 'cargando' ? 'Guardando...' : 'Guardar cambios'}
              </button>
            </div>

            {mensaje && (
              <p
                className={`mt-4 rounded-2xl border px-4 py-3 text-sm font-medium ${
                  estado === 'exito' ? 'border-[#009444]/30 bg-[#009444]/10 text-[#095540]' : 'border-[#D9D823]/70 bg-[#D9D823]/15 text-black'
                }`}
                role={estado === 'error' ? 'alert' : 'status'}
              >
                {mensaje}
              </p>
            )}

            {segundosRestantes !== null && (
              <p className="mt-3 text-center text-xs font-medium text-slate-500">Cerrando en {segundosRestantes}...</p>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
