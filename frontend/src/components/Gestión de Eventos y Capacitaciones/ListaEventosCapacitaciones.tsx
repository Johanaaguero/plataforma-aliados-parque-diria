import { useEffect, useMemo, useRef, useState } from 'react';

import RegistroEventoCapacitacion from './RegistroEventoCapacitacion';

import PortadaEventoCapacitacion from './Portadaeventocapacitacion';

interface EventoCapacitacion {
  id: number;
  nombre: string | null;
  descripcion: string | null;
  fecha: string | null;
  hora: string | null;
  lugar: string | null;
  tipoActividad: 'evento' | 'capacitacion';
  cupoMaximo: number | null;
  estado:
    | 'borrador'
    | 'publicado'
    | 'no_publicado'
    | 'desactivado';
  temporada: 'seca' | 'lluviosa' | null;
  createdAt?: string;
  updatedAt?: string;
}

type NombreRol =
  | 'administrador'
  | 'asociado'
  | 'visitante'
  | 'super_admin';

interface ListaEventosCapacitacionesProps {
  rolAutenticado: NombreRol | null;
}

type FiltroActividad =
  | 'todos'
  | 'evento'
  | 'capacitacion';

type EstadoEvento =
  | 'borrador'
  | 'publicado'
  | 'no_publicado'
  | 'desactivado';

interface RespuestaApi {
  mensaje?: string;
  message?: string;
}

type TipoNotificacion = 'exito' | 'error';

interface Notificacion {
  tipo: TipoNotificacion;
  titulo: string;
  mensaje: string;
}

function obtenerUrlBaseApi(): string {
  const url = import.meta.env.VITE_API_URL?.trim();

  if (!url) {
    throw new Error(
      'No se encontró VITE_API_URL en las variables de entorno.',
    );
  }

  return url.replace(/\/+$/, '');
}

function obtenerToken(): string | null {
  return (
    sessionStorage.getItem('token') ??
    localStorage.getItem('token')
  );
}

export default function ListaEventosCapacitaciones({
  rolAutenticado,
}: ListaEventosCapacitacionesProps) {
  const [eventos, setEventos] = useState<EventoCapacitacion[]>([]);

  const [cargando, setCargando] = useState(true);

  const [error, setError] = useState<string | null>(null);

  const [notificacion, setNotificacion] =
    useState<Notificacion | null>(null);

  const [mostrarRegistro, setMostrarRegistro] =
    useState(false);

  const [filtro, setFiltro] =
    useState<FiltroActividad>('todos');

  const [estadoAbierto, setEstadoAbierto] =
    useState<number | null>(null);

  const [cambiandoEstado, setCambiandoEstado] =
    useState<number | null>(null);

  const [eventoAEliminar, setEventoAEliminar] =
    useState<EventoCapacitacion | null>(null);

  const [eliminando, setEliminando] =
    useState(false);

  const botonCancelarEliminacionRef =
    useRef<HTMLButtonElement | null>(null);

  const botonQueAbrioEliminacionRef =
    useRef<HTMLButtonElement | null>(null);

  const esAdministrador =
    rolAutenticado === 'administrador';

  const urlBaseApi = useMemo(
    () => obtenerUrlBaseApi(),
    [],
  );

  useEffect(() => {
    if (!notificacion) return;

    const temporizador = window.setTimeout(() => {
      setNotificacion(null);
    }, 5000);

    return () => {
      window.clearTimeout(temporizador);
    };
  }, [notificacion]);

  useEffect(() => {
    if (!eventoAEliminar || !esAdministrador) return;

    botonCancelarEliminacionRef.current?.focus();

    return () => {
      const botonQueAbrio = botonQueAbrioEliminacionRef.current;

      if (botonQueAbrio?.isConnected) {
        botonQueAbrio.focus();
      }
    };
  }, [eventoAEliminar, esAdministrador]);

  useEffect(() => {
    if (!eventoAEliminar || !esAdministrador) return;

    function cerrarConEscape(evento: KeyboardEvent) {
      if (evento.key === 'Escape' && !eliminando) {
        setEventoAEliminar(null);
      }
    }

    document.addEventListener('keydown', cerrarConEscape);

    return () => {
      document.removeEventListener('keydown', cerrarConEscape);
    };
  }, [eventoAEliminar, eliminando, esAdministrador]);

  function mostrarNotificacion(
    tipo: TipoNotificacion,
    titulo: string,
    mensaje: string,
  ) {
    setNotificacion({
      tipo,
      titulo,
      mensaje,
    });
  }

  async function cargarDatos() {
    try {
      setCargando(true);
      setError(null);

      const token = obtenerToken();

      const headers: HeadersInit = {
        Accept: 'application/json',
      };

      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const respuesta = await fetch(
        `${urlBaseApi}/api/eventos-capacitaciones`,
        {
          method: 'GET',
          headers,
        },
      );

      if (!respuesta.ok) {
        let mensaje =
          `Error al obtener los eventos. Código: ${respuesta.status}`;

        try {
          const resultado =
            (await respuesta.json()) as RespuestaApi;

          mensaje =
            resultado.mensaje ??
            resultado.message ??
            mensaje;
        } catch {}

        throw new Error(mensaje);
      }

      const datos =
        (await respuesta.json()) as EventoCapacitacion[];

      setEventos(datos);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : 'No se pudieron cargar los eventos.',
      );
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    void cargarDatos();
  }, [urlBaseApi]);

  function formatearFecha(fecha: string | null) {
    if (!fecha) return 'Fecha pendiente';

    const fechaLocal = new Date(`${fecha}T00:00:00`);

    return fechaLocal.toLocaleDateString('es-CR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  }

  function formatearHora(hora: string | null) {
    if (!hora) return 'Hora pendiente';

    const [horas, minutos] = hora.split(':');

    const fecha = new Date();

    fecha.setHours(
      Number(horas),
      Number(minutos),
      0,
      0,
    );

    return fecha.toLocaleTimeString('es-CR', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  }

  function obtenerNombreTipo(
    tipo: EventoCapacitacion['tipoActividad'],
  ) {
    return tipo === 'evento'
      ? 'Evento'
      : 'Capacitación';
  }

  function obtenerColorTipo(
    tipo: EventoCapacitacion['tipoActividad'],
  ) {
    if (tipo === 'evento') {
      return {
        fondo: '#8DC63F',
        texto: '#095540',
      };
    }

    return {
      fondo: '#00AEEF',
      texto: '#ffffff',
    };
  }

  function obtenerNombreEstado(
    estado: EstadoEvento,
  ) {
    switch (estado) {
      case 'borrador':
        return 'Borrador';

      case 'publicado':
        return 'Publicado';

      case 'no_publicado':
        return 'No publicado';

      case 'desactivado':
        return 'Desactivado';

      default:
        return estado;
    }
  }

  function obtenerClaseEstado(
    estado: EstadoEvento,
  ) {
    switch (estado) {
      case 'borrador':
        return 'bg-slate-100 text-slate-700 border-slate-200';

      case 'publicado':
        return 'bg-[#8DC63F]/15 text-[#095540] border-[#8DC63F]/30';

      case 'no_publicado':
        return 'bg-[#D9D823]/15 text-[#6B6900] border-[#D9D823]/40';

      case 'desactivado':
        return 'bg-red-50 text-red-700 border-red-200';

      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  }

  function obtenerEstadosPermitidos(
    estadoActual: EstadoEvento,
  ): EstadoEvento[] {
    switch (estadoActual) {
      case 'borrador':
        return ['no_publicado'];

      case 'no_publicado':
        return [
          'publicado',
          'desactivado',
        ];

      case 'publicado':
        return [
          'no_publicado',
          'desactivado',
        ];

      case 'desactivado':
        return ['no_publicado'];

      default:
        return [];
    }
  }

  function abrirRegistro() {
    if (!esAdministrador) return;

    setMostrarRegistro(true);
  }

  async function cambiarEstado(
    evento: EventoCapacitacion,
    nuevoEstado: EstadoEvento,
  ) {
    if (!esAdministrador) return;

    if (evento.estado === nuevoEstado) {
      setEstadoAbierto(null);
      return;
    }

    const estadosPermitidos =
      obtenerEstadosPermitidos(evento.estado);

    if (!estadosPermitidos.includes(nuevoEstado)) {
      mostrarNotificacion(
        'error',
        'Cambio de estado no permitido',
        `No se puede cambiar el estado de "${obtenerNombreEstado(
          evento.estado,
        )}" a "${obtenerNombreEstado(
          nuevoEstado,
        )}".`,
      );

      setEstadoAbierto(null);
      return;
    }

    const token = obtenerToken();

    if (!token) {
      mostrarNotificacion(
        'error',
        'Sesión no disponible',
        'No se encontró el token de autenticación. Inicia sesión nuevamente.',
      );

      setEstadoAbierto(null);
      return;
    }

    try {
      setCambiandoEstado(evento.id);
      setEstadoAbierto(null);
      setNotificacion(null);

      const respuesta = await fetch(
        `${urlBaseApi}/api/eventos-capacitaciones/${evento.id}/estado`,
        {
          method: 'PATCH',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            estado: nuevoEstado,
          }),
        },
      );

      let resultado: RespuestaApi = {};

      try {
        resultado =
          (await respuesta.json()) as RespuestaApi;
      } catch {}

      if (!respuesta.ok) {
        throw new Error(
          resultado.mensaje ??
            resultado.message ??
            `No se pudo cambiar el estado. Código: ${respuesta.status}`,
        );
      }

      setEventos((prev) =>
        prev.map((item) =>
          item.id === evento.id
            ? {
                ...item,
                estado: nuevoEstado,
              }
            : item,
        ),
      );

      mostrarNotificacion(
        'exito',
        'Estado actualizado',
        `La actividad ahora se encuentra en estado "${obtenerNombreEstado(
          nuevoEstado,
        )}".`,
      );
    } catch (error) {
      mostrarNotificacion(
        'error',
        'No se pudo cambiar el estado',
        error instanceof Error
          ? error.message
          : 'No se pudo cambiar el estado.',
      );
    } finally {
      setCambiandoEstado(null);
    }
  }

  async function eliminarEvento() {
    if (!esAdministrador || !eventoAEliminar || eliminando) {
      return;
    }

    const token = obtenerToken();

    if (!token) {
      mostrarNotificacion(
        'error',
        'Sesión no disponible',
        'No se encontró el token de autenticación. Inicia sesión nuevamente.',
      );
      return;
    }

    const eventoEliminado = eventoAEliminar;
    const nombreEliminado =
      eventoEliminado.nombre ?? 'La actividad';

    try {
      setEliminando(true);

      const respuesta = await fetch(
        `${urlBaseApi}/api/eventos-capacitaciones/${eventoEliminado.id}`,
        {
          method: 'DELETE',
          headers: {
            Accept: 'application/json',
            Authorization: `Bearer ${token}`,
          },
        },
      );

      let resultado: RespuestaApi = {};

      try {
        resultado =
          (await respuesta.json()) as RespuestaApi;
      } catch {}

      if (!respuesta.ok) {
        throw new Error(
          resultado.mensaje ??
            resultado.message ??
            `No se pudo eliminar la actividad. Código: ${respuesta.status}`,
        );
      }

      setEventos((prev) =>
        prev.filter(
          (evento) => evento.id !== eventoEliminado.id,
        ),
      );
      setEventoAEliminar(null);

      mostrarNotificacion(
        'exito',
        'Actividad eliminada',
        `"${nombreEliminado}" fue eliminada correctamente.`,
      );
    } catch (error) {
      mostrarNotificacion(
        'error',
        'No se pudo eliminar la actividad',
        error instanceof Error
          ? error.message
          : 'No se pudo eliminar la actividad.',
      );
    } finally {
      setEliminando(false);
    }
  }

  const eventosVisibles = useMemo(() => {
    if (esAdministrador) {
      return eventos;
    }

    return eventos.filter(
      (evento) => evento.estado === 'publicado',
    );
  }, [eventos, esAdministrador]);

  const eventosFiltrados = useMemo(() => {
    if (filtro === 'todos') {
      return eventosVisibles;
    }

    return eventosVisibles.filter(
      (evento) =>
        evento.tipoActividad === filtro,
    );
  }, [eventosVisibles, filtro]);

  const cantidadEventos =
    eventosVisibles.filter(
      (evento) =>
        evento.tipoActividad === 'evento',
    ).length;

  const cantidadCapacitaciones =
    eventosVisibles.filter(
      (evento) =>
        evento.tipoActividad === 'capacitacion',
    ).length;

  if (mostrarRegistro) {
    return (
      <>
        <section className="min-h-screen bg-[#f5f8f6] px-4 py-10 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="mb-10">
              <div className="h-8 w-72 animate-pulse rounded-lg bg-slate-200" />
            </div>
          </div>
        </section>

        <RegistroEventoCapacitacion
          isOpen={mostrarRegistro}
          onClose={() =>
            setMostrarRegistro(false)
          }
          onRegistrado={async () => {
            setMostrarRegistro(false);
            setFiltro('todos');

            await cargarDatos();

            mostrarNotificacion(
              'exito',
              'Actividad registrada',
              'La actividad fue registrada correctamente.',
            );
          }}
        />
      </>
    );
  }

  return (
    <section className="relative min-h-screen bg-[#f5f8f6] px-4 py-12 sm:px-6 lg:px-8">
      {notificacion && (
        <div
          className="fixed right-5 top-5 z-[9999] w-[calc(100%-2.5rem)] max-w-md"
          role="alert"
          aria-live="polite"
        >
          <div
            className={`overflow-hidden rounded-2xl border bg-white shadow-2xl ${
              notificacion.tipo === 'error'
                ? 'border-red-200'
                : 'border-[#8DC63F]/40'
            }`}
          >
            <div className="flex items-start gap-3 p-4">
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                  notificacion.tipo === 'error'
                    ? 'bg-red-50 text-red-600'
                    : 'bg-[#8DC63F]/10 text-[#095540]'
                }`}
              >
                {notificacion.tipo === 'error' ? (
                  <svg
                    className="h-5 w-5"
                    viewBox="0 0 24 24"
                    fill="none"
                    aria-hidden="true"
                  >
                    <path
                      d="M12 8v5M12 16h.01"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />

                    <path
                      d="M10.3 4.6L3.4 16.5A2 2 0 005.1 19.5h13.8a2 2 0 001.7-3L13.7 4.6a2 2 0 00-3.4 0z"
                      stroke="currentColor"
                      strokeWidth="1.7"
                      strokeLinejoin="round"
                    />
                  </svg>
                ) : (
                  <svg
                    className="h-5 w-5"
                    viewBox="0 0 24 24"
                    fill="none"
                    aria-hidden="true"
                  >
                    <path
                      d="M5 12.5l4 4L19 7"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <p
                  className={`text-sm font-bold ${
                    notificacion.tipo === 'error'
                      ? 'text-red-800'
                      : 'text-[#095540]'
                  }`}
                >
                  {notificacion.titulo}
                </p>

                <p className="mt-1.5 text-sm leading-5 text-slate-600">
                  {notificacion.mensaje}
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setNotificacion(null)
                }
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                aria-label="Cerrar notificación"
              >
                <svg
                  className="h-4 w-4"
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
            </div>

            <div
              className={`h-1 ${
                notificacion.tipo === 'error'
                  ? 'bg-red-500'
                  : 'bg-[#8DC63F]'
              }`}
            />
          </div>
        </div>
      )}

      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#8DC63F]/40 bg-[#8DC63F]/10 px-3 py-1.5">
              <span className="h-2 w-2 rounded-full bg-[#8DC63F]" />

              <span className="text-xs font-bold uppercase tracking-[0.16em] text-[#095540]">
                Agenda
              </span>
            </div>

            <h1 className="font-brand text-3xl font-bold tracking-tight text-[#095540] sm:text-4xl">
              Eventos y capacitaciones
            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
              Consulte las actividades, eventos y
              capacitaciones disponibles en el
              Parque Nacional Diriá.
            </p>
          </div>

          {esAdministrador && (
            <button
              type="button"
              onClick={abrirRegistro}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#095540] px-5 py-3 text-sm font-bold text-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#009444] hover:shadow-md focus:outline-none focus:ring-4 focus:ring-[#009444]/20"
            >
              <svg
                className="h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M12 5v14M5 12h14"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>

              Registrar actividad
            </button>
          )}
        </div>

        {!cargando &&
          !error &&
          eventosVisibles.length > 0 && (
            <div className="mb-8 flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-800">
                  {esAdministrador
                    ? 'Todas las actividades'
                    : 'Actividades disponibles'}
                </p>

                <p className="mt-0.5 text-xs text-slate-500">
                  Filtre el contenido según el tipo
                  de actividad.
                </p>
              </div>

              <div className="flex w-full overflow-x-auto rounded-xl border border-slate-200 bg-slate-50 p-1 sm:w-auto">
                <button
                  type="button"
                  onClick={() =>
                    setFiltro('todos')
                  }
                  className={`flex shrink-0 items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition-all duration-200 ${
                    filtro === 'todos'
                      ? 'bg-white text-[#095540] shadow-sm'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Todos

                  <span
                    className={`rounded-md px-1.5 py-0.5 text-[10px] ${
                      filtro === 'todos'
                        ? 'bg-[#095540]/10 text-[#095540]'
                        : 'bg-slate-200 text-slate-500'
                    }`}
                  >
                    {eventosVisibles.length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setFiltro('evento')
                  }
                  className={`flex shrink-0 items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition-all duration-200 ${
                    filtro === 'evento'
                      ? 'bg-white text-[#095540] shadow-sm'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Eventos

                  <span
                    className={`rounded-md px-1.5 py-0.5 text-[10px] ${
                      filtro === 'evento'
                        ? 'bg-[#8DC63F]/20 text-[#095540]'
                        : 'bg-slate-200 text-slate-500'
                    }`}
                  >
                    {cantidadEventos}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setFiltro('capacitacion')
                  }
                  className={`flex shrink-0 items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition-all duration-200 ${
                    filtro === 'capacitacion'
                      ? 'bg-white text-[#087AA8] shadow-sm'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Capacitaciones

                  <span
                    className={`rounded-md px-1.5 py-0.5 text-[10px] ${
                      filtro === 'capacitacion'
                        ? 'bg-[#00AEEF]/10 text-[#087AA8]'
                        : 'bg-slate-200 text-slate-500'
                    }`}
                  >
                    {cantidadCapacitaciones}
                  </span>
                </button>
              </div>
            </div>
          )}

        {cargando && (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
            {[1, 2, 3].map((item) => (
              <div
                key={item}
                className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
              >
                <div className="h-56 animate-pulse bg-slate-200" />

                <div className="space-y-4 p-5">
                  <div className="h-5 w-24 animate-pulse rounded-md bg-slate-200" />

                  <div className="h-6 w-4/5 animate-pulse rounded-md bg-slate-200" />

                  <div className="space-y-2">
                    <div className="h-3 w-full animate-pulse rounded bg-slate-100" />
                    <div className="h-3 w-4/5 animate-pulse rounded bg-slate-100" />
                  </div>

                  <div className="border-t border-slate-100 pt-5">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="h-8 animate-pulse rounded-lg bg-slate-100" />
                      <div className="h-8 animate-pulse rounded-lg bg-slate-100" />
                    </div>

                    <div className="mt-4 h-8 animate-pulse rounded-lg bg-slate-100" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {!cargando && error && (
          <div className="rounded-2xl border border-red-200 bg-white p-8 text-center shadow-sm">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-red-50 text-red-600">
              <svg
                className="h-6 w-6"
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M12 9v4M12 17h.01"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />

                <path
                  d="M10.3 4.6L3.4 16.5A2 2 0 005.1 19.5h13.8a2 2 0 001.7-3L13.7 4.6a2 2 0 00-3.4 0z"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinejoin="round"
                />
              </svg>
            </div>

            <h2 className="text-lg font-bold text-slate-900">
              No se pudieron cargar las actividades
            </h2>

            <p className="mx-auto mt-2 max-w-lg text-sm text-slate-500">
              {error}
            </p>

            <button
              type="button"
              onClick={() => void cargarDatos()}
              className="mt-5 rounded-xl bg-[#095540] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#009444]"
            >
              Intentar nuevamente
            </button>
          </div>
        )}

        {!cargando &&
          !error &&
          eventosVisibles.length === 0 && (
            <div className="rounded-2xl border border-slate-200 bg-white px-6 py-16 text-center shadow-sm">
              <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-xl bg-[#8DC63F]/10 text-[#095540]">
                <svg
                  className="h-7 w-7"
                  viewBox="0 0 24 24"
                  fill="none"
                  aria-hidden="true"
                >
                  <rect
                    x="3"
                    y="4"
                    width="18"
                    height="17"
                    rx="2"
                    stroke="currentColor"
                    strokeWidth="1.7"
                  />

                  <path
                    d="M7 2v4M17 2v4M3 9h18"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                  />
                </svg>
              </div>

              <h2 className="text-xl font-bold text-[#095540]">
                {esAdministrador
                  ? 'No hay actividades registradas'
                  : 'No hay actividades disponibles'}
              </h2>

              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                {esAdministrador
                  ? 'Actualmente no existen eventos o capacitaciones registrados.'
                  : 'Actualmente no existen eventos o capacitaciones publicados.'}
              </p>
            </div>
          )}

        {!cargando &&
          !error &&
          eventosVisibles.length > 0 &&
          eventosFiltrados.length === 0 && (
            <div className="rounded-2xl border border-slate-200 bg-white px-6 py-14 text-center shadow-sm">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
                <svg
                  className="h-6 w-6"
                  viewBox="0 0 24 24"
                  fill="none"
                  aria-hidden="true"
                >
                  <circle
                    cx="11"
                    cy="11"
                    r="7"
                    stroke="currentColor"
                    strokeWidth="1.7"
                  />

                  <path
                    d="M20 20l-4-4"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                  />
                </svg>
              </div>

              <h2 className="text-lg font-bold text-[#095540]">
                No hay resultados
              </h2>

              <p className="mt-2 text-sm text-slate-500">
                No existen actividades correspondientes
                al filtro seleccionado.
              </p>

              <button
                type="button"
                onClick={() =>
                  setFiltro('todos')
                }
                className="mt-5 text-sm font-bold text-[#009444] transition hover:text-[#095540]"
              >
                Ver todas las actividades
              </button>
            </div>
          )}

        {!cargando &&
          !error &&
          eventosFiltrados.length > 0 && (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
              {eventosFiltrados.map((item) => {
                const colores =
                  obtenerColorTipo(
                    item.tipoActividad,
                  );

                const menuEstadoAbierto =
                  estadoAbierto === item.id;

                const estaCambiando =
                  cambiandoEstado === item.id;

                const estadosPermitidos =
                  obtenerEstadosPermitidos(
                    item.estado,
                  );

                return (
                  <article
                    key={item.id}
                    className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-slate-300 hover:shadow-xl"
                  >
                    <div className="relative">
                      <PortadaEventoCapacitacion
                        eventoId={item.id}
                        urlBaseApi={urlBaseApi}
                        colorAcento={colores.fondo}
                      />

                      <div className="absolute left-4 top-4">
                        <span
                          className="inline-flex items-center rounded-lg px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.12em] shadow-md backdrop-blur-sm"
                          style={{
                            backgroundColor:
                              colores.fondo,
                            color:
                              colores.texto,
                          }}
                        >
                          {obtenerNombreTipo(
                            item.tipoActividad,
                          )}
                        </span>
                      </div>

                      {esAdministrador && (
                        <div className="absolute right-4 top-4">
                          <button
                            type="button"
                            onClick={() =>
                              setEstadoAbierto(
                                menuEstadoAbierto
                                  ? null
                                  : item.id,
                              )
                            }
                            disabled={estaCambiando}
                            className="inline-flex items-center gap-2 rounded-lg border border-white/60 bg-white/95 px-3 py-2 text-[10px] font-bold text-[#095540] shadow-md backdrop-blur-sm transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {estaCambiando ? (
                              <>
                                <span className="h-3 w-3 animate-spin rounded-full border-2 border-[#095540]/30 border-t-[#095540]" />
                                Actualizando
                              </>
                            ) : (
                              <>
                                Cambiar estado

                                <svg
                                  className={`h-3 w-3 transition-transform ${
                                    menuEstadoAbierto
                                      ? 'rotate-180'
                                      : ''
                                  }`}
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  aria-hidden="true"
                                >
                                  <path
                                    d="M6 9l6 6 6-6"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  />
                                </svg>
                              </>
                            )}
                          </button>

                          {menuEstadoAbierto && (
                            <div className="absolute right-0 top-full z-30 mt-2 w-52 overflow-hidden rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl">
                              <div className="border-b border-slate-100 px-3 py-2">
                                <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-slate-400">
                                  Cambiar a
                                </p>
                              </div>

                              {estadosPermitidos.length > 0 ? (
                                estadosPermitidos.map(
                                  (estado) => (
                                    <button
                                      key={estado}
                                      type="button"
                                      onClick={() =>
                                        void cambiarEstado(
                                          item,
                                          estado,
                                        )
                                      }
                                      disabled={
                                        estaCambiando
                                      }
                                      className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-xs font-semibold text-slate-600 transition hover:bg-slate-50 hover:text-[#095540] disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                      <span>
                                        {obtenerNombreEstado(
                                          estado,
                                        )}
                                      </span>

                                      <svg
                                        className="h-4 w-4 text-[#009444]"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        aria-hidden="true"
                                      >
                                        <path
                                          d="M5 13l4 4L19 7"
                                          stroke="currentColor"
                                          strokeWidth="2.5"
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                        />
                                      </svg>
                                    </button>
                                  ),
                                )
                              ) : (
                                <div className="px-3 py-2.5 text-xs text-slate-500">
                                  No hay cambios de estado disponibles.
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="p-5">
                      <div className="mb-3 flex flex-wrap items-center gap-2">
                        <span
                          className={`inline-flex items-center rounded-lg border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.1em] ${obtenerClaseEstado(
                            item.estado,
                          )}`}
                        >
                          {obtenerNombreEstado(
                            item.estado,
                          )}
                        </span>

                        {item.temporada && (
                          <span
                            className={`inline-flex items-center gap-2 rounded-lg border px-2.5 py-1 text-[10px] font-semibold ${
                              item.temporada === 'seca'
                                ? 'border-[#D9D823]/40 bg-[#D9D823]/10 text-[#6B6900]'
                                : 'border-[#00AEEF]/30 bg-[#00AEEF]/10 text-[#087AA8]'
                            }`}
                          >
                            <span
                              className={`h-1.5 w-1.5 rounded-full ${
                                item.temporada === 'seca'
                                  ? 'bg-[#D9D823]'
                                  : 'bg-[#00AEEF]'
                              }`}
                            />

                            {item.temporada === 'seca'
                              ? 'Época seca'
                              : 'Época lluviosa'}
                          </span>
                        )}
                      </div>

                      <h2 className="line-clamp-2 min-h-[3.5rem] text-lg font-bold leading-7 text-[#095540] transition-colors duration-200 group-hover:text-[#009444]">
                        {item.nombre ??
                          'Sin nombre'}
                      </h2>

                      <p className="mt-2.5 line-clamp-2 min-h-[3rem] text-sm leading-6 text-slate-500">
                        {item.descripcion ??
                          'Sin descripción'}
                      </p>

                      <div className="mt-5 border-t border-slate-100 pt-5">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="flex min-w-0 items-start gap-2.5">
                            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#8DC63F]/10 text-[#095540]">
                              <svg
                                className="h-4 w-4"
                                viewBox="0 0 24 24"
                                fill="none"
                                aria-hidden="true"
                              >
                                <rect
                                  x="3"
                                  y="4"
                                  width="18"
                                  height="17"
                                  rx="2"
                                  stroke="currentColor"
                                  strokeWidth="1.7"
                                />

                                <path
                                  d="M7 2v4M17 2v4M3 9h18"
                                  stroke="currentColor"
                                  strokeWidth="1.7"
                                  strokeLinecap="round"
                                />
                              </svg>
                            </div>

                            <div className="min-w-0">
                              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                                Fecha
                              </p>

                              <p className="mt-0.5 text-xs font-semibold leading-5 text-slate-700">
                                {formatearFecha(
                                  item.fecha,
                                )}
                              </p>
                            </div>
                          </div>

                          <div className="flex min-w-0 items-start gap-2.5">
                            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#00AEEF]/10 text-[#087AA8]">
                              <svg
                                className="h-4 w-4"
                                viewBox="0 0 24 24"
                                fill="none"
                                aria-hidden="true"
                              >
                                <circle
                                  cx="12"
                                  cy="12"
                                  r="8.5"
                                  stroke="currentColor"
                                  strokeWidth="1.7"
                                />

                                <path
                                  d="M12 7v5l3 2"
                                  stroke="currentColor"
                                  strokeWidth="1.7"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                              </svg>
                            </div>

                            <div className="min-w-0">
                              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                                Hora
                              </p>

                              <p className="mt-0.5 text-xs font-semibold leading-5 text-slate-700">
                                {formatearHora(
                                  item.hora,
                                )}
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="mt-4 flex items-start gap-2.5">
                          <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#095540]/10 text-[#095540]">
                            <svg
                              className="h-4 w-4"
                              viewBox="0 0 24 24"
                              fill="none"
                              aria-hidden="true"
                            >
                              <path
                                d="M20 10.5c0 5.2-8 10-8 10s-8-4.8-8-10a8 8 0 1116 0z"
                                stroke="currentColor"
                                strokeWidth="1.7"
                              />

                              <circle
                                cx="12"
                                cy="10.5"
                                r="2.5"
                                stroke="currentColor"
                                strokeWidth="1.7"
                              />
                            </svg>
                          </div>

                          <div className="min-w-0">
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                              Lugar
                            </p>

                            <p
                              className="mt-0.5 truncate text-xs font-semibold leading-5 text-slate-700"
                              title={
                                item.lugar ??
                                undefined
                              }
                            >
                              {item.lugar ??
                                'Lugar pendiente'}
                            </p>
                          </div>
                        </div>

                        <div className="mt-4 flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2.5">
                          <div className="flex items-center gap-2.5">
                            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white text-[#095540] shadow-sm">
                              <svg
                                className="h-3.5 w-3.5"
                                viewBox="0 0 24 24"
                                fill="none"
                                aria-hidden="true"
                              >
                                <circle
                                  cx="9"
                                  cy="8"
                                  r="3"
                                  stroke="currentColor"
                                  strokeWidth="1.7"
                                />

                                <path
                                  d="M3.5 19a5.5 5.5 0 0111 0"
                                  stroke="currentColor"
                                  strokeWidth="1.7"
                                  strokeLinecap="round"
                                />

                                <path
                                  d="M16 6.5a3 3 0 010 5.8M17 15a5.2 5.2 0 013.5 4"
                                  stroke="currentColor"
                                  strokeWidth="1.7"
                                  strokeLinecap="round"
                                />
                              </svg>
                            </div>

                            <span className="text-xs font-medium text-slate-500">
                              {item.cupoMaximo !== null
                                ? 'Capacidad máxima'
                                : 'Cupo'}
                            </span>
                          </div>

                          <span className="text-xs font-bold text-[#095540]">
                            {item.cupoMaximo !== null
                              ? `${item.cupoMaximo} personas`
                              : 'Cupo libre'}
                          </span>
                        </div>

                        {esAdministrador && (
                          <div className="mt-5 flex justify-end">
                            <button
                              type="button"
                              onClick={(evento) => {
                                botonQueAbrioEliminacionRef.current =
                                  evento.currentTarget;
                                setEventoAEliminar(item);
                              }}
                              disabled={estaCambiando || eliminando}
                              className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-white px-3 py-2 text-[10px] font-bold text-red-600 shadow-md transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              <svg
                                className="h-3.5 w-3.5"
                                viewBox="0 0 24 24"
                                fill="none"
                                aria-hidden="true"
                              >
                                <path
                                  d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"
                                  stroke="currentColor"
                                  strokeWidth="1.8"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                              </svg>

                              Eliminar
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
      </div>

      {eventoAEliminar && esAdministrador && (
        <div
          className="fixed inset-0 z-[9998] flex items-center justify-center bg-slate-950/65 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="titulo-confirmar-eliminacion"
          aria-describedby="descripcion-confirmar-eliminacion"
          aria-busy={eliminando}
        >
          <div className="w-full max-w-lg rounded-3xl border border-slate-100 bg-white p-6 shadow-2xl sm:p-8">
            <div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-red-600">
                <svg
                  className="h-5 w-5"
                  viewBox="0 0 24 24"
                  fill="none"
                  aria-hidden="true"
                >
                  <path
                    d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <h2
                id="titulo-confirmar-eliminacion"
                className="mt-6 text-2xl font-bold tracking-tight text-slate-900"
              >
                Eliminar actividad
              </h2>

              <p className="mt-3 text-base leading-7 text-slate-600">
                ¿Desea eliminar{' '}
                <span className="font-semibold text-slate-900">
                  "{eventoAEliminar.nombre ?? 'Sin nombre'}"
                </span>
                ?
              </p>

              <p
                id="descripcion-confirmar-eliminacion"
                className="mt-3 text-sm font-semibold leading-6 text-red-600"
              >
                Esta acción es permanente e irreversible.
              </p>
            </div>

            <div className="mt-8 flex flex-row justify-end gap-3">
              <button
                ref={botonCancelarEliminacionRef}
                type="button"
                onClick={() => setEventoAEliminar(null)}
                disabled={eliminando}
                className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={() => void eliminarEvento()}
                disabled={eliminando}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {eliminando && (
                  <span
                    className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
                    aria-hidden="true"
                  />
                )}
                <span aria-live="polite">
                  {eliminando ? 'Eliminando...' : 'Eliminar'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
