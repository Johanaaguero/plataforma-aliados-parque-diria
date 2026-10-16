import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';

import {
  formatearCupos,
  obtenerDetalleEvento,
  type EventoCapacitacion,
} from '../../services/eventosCapacitacionesService';

import { consultarReservaEvento } from '../../services/inscripcionService';
import { formatearFechaActividad } from '../../utils/fechas';

import PortadaEventoCapacitacion from './Portadaeventocapacitacion';
import FormularioReserva from './FormularioReserva';

interface DetalleEventoCapacitacionProps {
  eventoId: number;
  urlBaseApi: string;
  eventoAdministrativo?: EventoCapacitacion;
  usuarioAutenticado: boolean;
  puedeInscribirse: boolean;
  onSolicitarLogin: (mensaje?: string) => void;
  onClose: () => void;
  onInscripcionActualizada?: (
    eventoId: number,
    cuposDisponibles: number | null,
  ) => void;
}

/* ---------- Utilidades ---------- */

function esFechaPasada(valor: string | Date | null | undefined): boolean {
  if (!valor) return false;

  let fechaActividad: Date;

  if (valor instanceof Date) {
    if (Number.isNaN(valor.getTime())) return false;

    fechaActividad = new Date(
      valor.getFullYear(),
      valor.getMonth(),
      valor.getDate(),
    );
  } else {
    const texto = String(valor).slice(0, 10);
    const partes = texto.split('-').map(Number);

    if (partes.length !== 3 || partes.some((parte) => Number.isNaN(parte))) {
      return false;
    }

    const [anio, mes, dia] = partes;
    fechaActividad = new Date(anio, mes - 1, dia);
  }

  fechaActividad.setHours(0, 0, 0, 0);

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  return fechaActividad.getTime() < hoy.getTime();
}

/* ---------- Componentes auxiliares ---------- */

const ICONOS = {
  fecha: [
    'M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5',
  ],
  hora: ['M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z'],
  lugar: [
    'M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z',
    'M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z',
  ],
  temporadaSeca: [
    'M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z',
  ],
  temporadaLluviosa: [
    'M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242',
    'M16 14v6',
    'M8 14v6',
    'M12 16v6',
  ],
  temporadaPendiente: [
    'M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z',
  ],
  edad: [
    'M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z',
  ],
} as const;

function Dato({
  icono,
  etiqueta,
  className = '',
  children,
}: {
  icono: keyof typeof ICONOS;
  etiqueta: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={`flex min-w-0 items-start gap-3 rounded-xl border border-[#095540]/10 bg-white p-3.5 dark:border-white/10 dark:bg-slate-900/60 ${className}`}
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#8DC63F]/15 text-[#095540] dark:text-emerald-200">
        <svg
          className="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.6}
          aria-hidden="true"
        >
          {ICONOS[icono].map((d) => (
            <path key={d} strokeLinecap="round" strokeLinejoin="round" d={d} />
          ))}
        </svg>
      </span>

      <div className="min-w-0">
        <dt className="text-xs font-medium text-slate-500">{etiqueta}</dt>
        <dd className="mt-0.5 break-words text-sm font-semibold text-slate-800 dark:text-slate-100">
          {children}
        </dd>
      </div>
    </div>
  );
}

function TituloSeccion({ children }: { children: ReactNode }) {
  return (
    <h3 className="mb-3 flex items-center gap-3 font-brand text-base font-bold text-[#095540] dark:text-emerald-200">
      <span
        className="h-5 w-1.5 rounded-full bg-gradient-to-b from-[#8DC63F] to-[#009444]"
        aria-hidden="true"
      />
      {children}
    </h3>
  );
}

/* ---------- Componente principal ---------- */

export default function DetalleEventoCapacitacion({
  eventoId,
  urlBaseApi,
  eventoAdministrativo,
  usuarioAutenticado,
  puedeInscribirse,
  onSolicitarLogin,
  onClose,
  onInscripcionActualizada,
}: DetalleEventoCapacitacionProps) {
  const [evento, setEvento] = useState<EventoCapacitacion | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [intento, setIntento] = useState(0);

  const [mostrarFormularioReserva, setMostrarFormularioReserva] =
    useState(false);
  const [consultandoReserva, setConsultandoReserva] = useState(false);
  const [inscribiendo, setInscribiendo] = useState(false);
  const [mensajeInscripcion, setMensajeInscripcion] = useState<string | null>(
    null,
  );
  const [errorInscripcion, setErrorInscripcion] = useState<string | null>(null);

  const dialogoRef = useRef<HTMLDivElement>(null);
  const cerrarRef = useRef<HTMLButtonElement>(null);

  const actividadPasada = evento ? esFechaPasada(evento.fecha) : false;
  const inscripcionBloqueadaPorRol = usuarioAutenticado && !puedeInscribirse;

  async function manejarInscripcion() {
    if (!evento || inscribiendo || consultandoReserva) return;

    if (esFechaPasada(evento.fecha)) {
      setMensajeInscripcion(null);
      setErrorInscripcion('No puedes inscribirte a una actividad que ya pasó.');
      return;
    }

    if (evento.cuposDisponibles === 0) {
      setMensajeInscripcion(null);
      setErrorInscripcion('No hay cupos disponibles para esta actividad.');
      return;
    }

    setMensajeInscripcion(null);
    setErrorInscripcion(null);

    if (!usuarioAutenticado) {
      onSolicitarLogin('Debes iniciar sesión o registrarte para inscribirte.');
      return;
    }

    if (!puedeInscribirse) {
      setErrorInscripcion('Tu rol no permite solicitar inscripciones.');
      return;
    }

    setInscribiendo(true);
    setConsultandoReserva(true);

    try {
      const reserva = await consultarReservaEvento(evento.id);

      if (reserva?.existe && reserva.estado === 'pendiente') {
        setMensajeInscripcion(
          'Ya tienes una solicitud de inscripción para este evento. Estado: Pendiente.',
        );
        return;
      }

      if (reserva?.existe && reserva.estado === 'aprobada') {
        setMensajeInscripcion('Ya estás inscrito en este evento.');
        return;
      }

      setMostrarFormularioReserva(true);
    } catch {
      // Una consulta fallida no debe impedir iniciar una solicitud nueva. El
      // endpoint vuelve a validar duplicados y cupos al crear la reserva.
      setMostrarFormularioReserva(true);
    } finally {
      setConsultandoReserva(false);
      setInscribiendo(false);
    }
  }

  useEffect(() => {
    const elementoAnterior = document.activeElement;
    const overflowAnterior = document.body.style.overflow;

    document.body.style.overflow = 'hidden';
    cerrarRef.current?.focus();

    return () => {
      document.body.style.overflow = overflowAnterior;

      if (
        elementoAnterior instanceof HTMLElement &&
        elementoAnterior.isConnected
      ) {
        elementoAnterior.focus();
      }
    };
  }, []);

  useEffect(() => {
    const solicitud = new AbortController();

    setError(null);
    setEvento(null);
    setCargando(true);
    setMensajeInscripcion(null);
    setErrorInscripcion(null);

    async function cargarDetalle() {
      try {
        const detalle =
          eventoAdministrativo ??
          (await obtenerDetalleEvento(eventoId, solicitud.signal));

        if (!solicitud.signal.aborted) {
          setEvento(detalle);
        }
      } catch (error) {
        if (!solicitud.signal.aborted) {
          setError(
            error instanceof Error
              ? error.message
              : 'No se pudo cargar el detalle.',
          );
        }
      } finally {
        if (!solicitud.signal.aborted) {
          setCargando(false);
        }
      }
    }

    void cargarDetalle();

    return () => solicitud.abort();
  }, [eventoId, eventoAdministrativo, intento]);

  function manejarTeclado(event: KeyboardEvent<HTMLDivElement>) {
    // El formulario de reserva se renderiza como hijo de este componente
    // (aunque en otro punto del DOM) y sus eventos de teclado llegan hasta
    // aquí. Mientras esté abierto, este diálogo no debe reaccionar.
    if (mostrarFormularioReserva) return;

    if (event.key === 'Escape') {
      event.preventDefault();
      onClose();
      return;
    }

    if (event.key !== 'Tab') return;

    const elementos = dialogoRef.current?.querySelectorAll<HTMLElement>(
      'button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), [tabindex="0"]',
    );

    if (!elementos?.length) return;

    const primero = elementos[0];
    const ultimo = elementos[elementos.length - 1];

    if (event.shiftKey && document.activeElement === primero) {
      event.preventDefault();
      ultimo.focus();
    } else if (!event.shiftKey && document.activeElement === ultimo) {
      event.preventDefault();
      primero.focus();
    }
  }

  const textoEdadPermitida = evento
    ? evento.edadMinima != null && evento.edadMaxima != null
      ? `${evento.edadMinima} a ${evento.edadMaxima} años`
      : evento.edadMinima != null
        ? `Desde ${evento.edadMinima} años`
        : evento.edadMaxima != null
          ? `Hasta ${evento.edadMaxima} años`
          : 'Edad no especificada'
    : 'Edad no especificada';

  const textoBotonInscripcion = actividadPasada
    ? 'Actividad finalizada'
    : consultandoReserva
      ? 'Consultando...'
      : inscribiendo
        ? 'Inscribiendo...'
        : inscripcionBloqueadaPorRol
          ? 'Inscripción no disponible'
          : evento?.cuposDisponibles === 0
            ? 'Sin cupos'
            : 'Inscribirme';

  const hayAvisos =
    actividadPasada || Boolean(mensajeInscripcion) || Boolean(errorInscripcion);

  // Se monta en <body> para quedar por encima del navbar y fijo en pantalla.
  return createPortal(
    <div
      className="fixed inset-0 z-[9000] flex items-end justify-center overscroll-contain bg-[#052f25]/75 backdrop-blur-sm sm:items-center sm:p-6"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
      onKeyDown={manejarTeclado}
    >
      <div
        ref={dialogoRef}
        className="relative flex max-h-[96dvh] w-full max-w-3xl flex-col overflow-hidden rounded-t-3xl border border-white/20 bg-[#f4f8f2] shadow-2xl dark:border-white/10 dark:bg-slate-950 sm:max-h-[calc(100dvh-3rem)] sm:rounded-3xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="titulo-detalle-evento"
        aria-busy={cargando}
      >
        {/* ---------- Encabezado fijo ---------- */}
        <header className="relative shrink-0 overflow-hidden border-b border-[#095540]/10 bg-gradient-to-br from-[#eef6e8] via-[#f6faf3] to-white px-5 py-4 dark:border-white/10 dark:from-slate-900 dark:via-slate-900 dark:to-slate-950 sm:px-7 sm:py-5">
          <div
            className="pointer-events-none absolute -right-12 -top-14 h-44 w-44 rounded-full bg-[#8DC63F]/20 blur-3xl"
            aria-hidden="true"
          />

          <div className="relative flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs font-semibold text-[#009444]">
                {evento
                  ? evento.tipoActividad === 'evento'
                    ? 'Evento'
                    : 'Capacitación'
                  : 'Detalle de la actividad'}
              </p>

              <h2
                id="titulo-detalle-evento"
                className="mt-1 break-words font-brand text-xl font-bold leading-tight text-[#095540] dark:text-emerald-100 sm:text-2xl"
              >
                {evento?.nombre ?? 'Evento o capacitación'}
              </h2>
            </div>

            <button
              ref={cerrarRef}
              type="button"
              onClick={onClose}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xl text-[#095540]/70 transition hover:bg-[#095540]/10 hover:text-[#095540] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#009444] dark:text-emerald-100"
              aria-label="Cerrar detalles"
            >
              ×
            </button>
          </div>
        </header>

        {/* ---------- Cuerpo con scroll ---------- */}
        <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-7">
          {cargando && (
            <p
              role="status"
              className="py-16 text-center text-sm text-slate-500"
            >
              Cargando detalle de la actividad...
            </p>
          )}

          {error && (
            <div className="rounded-2xl border border-red-200 bg-white p-6 text-center">
              <p role="alert" className="text-sm text-red-700">
                {error}
              </p>

              <button
                type="button"
                onClick={() => setIntento((actual) => actual + 1)}
                className="mt-5 rounded-xl bg-[#095540] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#009444] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#009444] focus-visible:ring-offset-2"
              >
                Reintentar
              </button>
            </div>
          )}

          {!cargando && evento && (
            <div className="space-y-6">
              {/* Etiquetas de estado */}
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full border border-[#8DC63F]/40 bg-[#8DC63F]/15 px-3 py-1 text-xs font-bold text-[#095540]">
                  {formatearCupos(evento)}
                </span>

                <span
                  className={`rounded-full px-3 py-1 text-xs font-bold ${
                    evento.esPago
                      ? 'bg-sky-100 text-sky-800'
                      : 'bg-emerald-100 text-emerald-800'
                  }`}
                >
                  {evento.esPago
                    ? `De pago: ₡${(evento.precio ?? 0).toLocaleString('es-CR')}`
                    : 'Gratuito'}
                </span>
              </div>

              {/* Portada */}
              <div className="overflow-hidden rounded-2xl border border-[#095540]/10 shadow-sm">
                <PortadaEventoCapacitacion
                  eventoId={evento.id}
                  urlBaseApi={urlBaseApi}
                />
              </div>

              {/* Descripción */}
              <section>
                <TituloSeccion>Acerca de la actividad</TituloSeccion>

                <p className="whitespace-pre-wrap break-words text-sm leading-6 text-slate-700 dark:text-slate-300">
                  {evento.descripcion || 'Sin descripción disponible.'}
                </p>
              </section>

              {/* Información */}
              <section>
                <TituloSeccion>Información general</TituloSeccion>

                <dl className="grid gap-3 sm:grid-cols-2">
                  <Dato icono="fecha" etiqueta="Fecha">
                    {formatearFechaActividad(evento.fecha)}
                  </Dato>

                  <Dato icono="hora" etiqueta="Hora">
                    {evento.hora
                      ? new Date(`2000-01-01T${evento.hora}`).toLocaleTimeString(
                          'es-CR',
                          {
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: true,
                          },
                        )
                      : 'Hora pendiente'}
                  </Dato>

                  <Dato icono="lugar" etiqueta="Lugar">
                    {evento.lugar || 'Lugar pendiente'}
                  </Dato>

                  <Dato
                    icono={
                      evento.temporada === 'seca'
                        ? 'temporadaSeca'
                        : evento.temporada === 'lluviosa'
                          ? 'temporadaLluviosa'
                          : 'temporadaPendiente'
                    }
                    etiqueta="Temporada"
                  >
                    {evento.temporada === 'seca'
                      ? 'Seca'
                      : evento.temporada === 'lluviosa'
                        ? 'Lluviosa'
                        : 'Por confirmar'}
                  </Dato>

                  <Dato icono="edad" etiqueta="Edad permitida">
                    {textoEdadPermitida}
                  </Dato>
                </dl>
              </section>

              {/* Políticas de cancelación */}
              {evento.esPago && evento.politicasCancelacion && (
                <section className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                  <p className="font-bold">Políticas de cancelación</p>
                  <p className="mt-1 whitespace-pre-wrap break-words leading-6">
                    {evento.politicasCancelacion}
                  </p>
                </section>
              )}
            </div>
          )}
        </div>

        {/* ---------- Pie fijo con avisos y acción principal ---------- */}
        {!cargando && evento && (
          <footer className="shrink-0 border-t border-[#095540]/10 bg-white/90 px-4 py-4 backdrop-blur dark:border-white/10 dark:bg-slate-900/90 sm:px-7">
            {hayAvisos && (
              <div className="mb-3 space-y-2">
                {actividadPasada && (
                  <p
                    role="status"
                    className="rounded-xl border border-slate-200 bg-slate-100 px-4 py-2.5 text-sm font-medium text-slate-600"
                  >
                    Esta actividad ya pasó y no admite nuevas inscripciones.
                  </p>
                )}

                {mensajeInscripcion && (
                  <p
                    role="status"
                    className="rounded-xl border border-[#8DC63F]/40 bg-[#8DC63F]/10 px-4 py-2.5 text-sm font-medium text-[#095540]"
                  >
                    {mensajeInscripcion}
                  </p>
                )}

                {errorInscripcion && (
                  <p
                    role="alert"
                    className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-medium text-red-700"
                  >
                    {errorInscripcion}
                  </p>
                )}
              </div>
            )}

            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-[#095540]/20 px-5 py-3 text-sm font-bold text-[#095540] transition hover:bg-[#095540]/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#009444] dark:text-emerald-100"
              >
                Cerrar
              </button>

              <button
                type="button"
                onClick={manejarInscripcion}
                disabled={
                  consultandoReserva ||
                  inscribiendo ||
                  inscripcionBloqueadaPorRol ||
                  evento.cuposDisponibles === 0 ||
                  actividadPasada
                }
                className={`rounded-xl px-6 py-3 text-sm font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#009444] focus-visible:ring-offset-2 ${
                  inscripcionBloqueadaPorRol
                    ? 'border border-[#095540]/15 bg-[#095540]/10 text-[#095540] disabled:cursor-not-allowed'
                    : 'bg-[#095540] text-white shadow-lg shadow-[#095540]/20 hover:bg-[#009444] disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none'
                }`}
              >
                {textoBotonInscripcion}
              </button>
            </div>
          </footer>
        )}
      </div>

      {mostrarFormularioReserva && evento && (
        <FormularioReserva
          evento={evento}
          onClose={() => setMostrarFormularioReserva(false)}
          onSuccess={(cuposDisponibles) => {
            setEvento((actual) =>
              actual ? { ...actual, cuposDisponibles } : actual,
            );
            onInscripcionActualizada?.(evento.id, cuposDisponibles);
          }}
        />
      )}
    </div>,
    document.body,
  );
}