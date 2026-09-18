import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  actualizarEstadoReserva,
  obtenerInscripcionesAdministrativas,
  type InscripcionAdministrativa
} from '../../services/inscripcionesAdminService';

type FiltroTemporal = 'todos' | 'proximos' | 'pasados';

type InscripcionConDatosReserva = InscripcionAdministrativa & {
  fechaNacimiento?: string | null;
  tipoIdentificacion?: string | null;
  numeroIdentificacion?: string | null;
  telefono?: string | null;
};

const formatearFecha = (fecha?: string | null) => {
  if (!fecha) return 'No disponible';

  const valor = new Date(fecha);

  if (Number.isNaN(valor.getTime())) {
    return fecha;
  }

  return valor.toLocaleDateString('es-CR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
};

const formatearTipoActividad = (tipo?: string | null) => {
  if (!tipo) return 'Actividad';

  if (tipo === 'evento') {
    return 'Evento';
  }

  if (tipo === 'capacitacion') {
    return 'Capacitación';
  }

  return tipo;
};

const formatearTipoIdentificacion = (tipo?: string | null) => {
  if (!tipo) return 'No disponible';

  if (tipo === 'cedula') {
    return 'Cédula de identidad';
  }

  if (tipo === 'dimex') {
    return 'DIMEX';
  }

  if (tipo === 'pasaporte') {
    return 'Pasaporte';
  }

  return tipo;
};

const acentoPorTipo = (tipo?: string | null) => {
  if (tipo === 'capacitacion') {
    return {
      contenedor:
        'border-blue-200 bg-blue-50 dark:border-blue-900/60 dark:bg-blue-950/30',
      texto: 'text-blue-700 dark:text-blue-300',
      icono: 'bg-blue-100 dark:bg-blue-900/50'
    };
  }

  return {
    contenedor:
      'border-emerald-200 bg-emerald-50 dark:border-emerald-900/60 dark:bg-emerald-950/30',
    texto: 'text-emerald-700 dark:text-emerald-300',
    icono: 'bg-emerald-100 dark:bg-emerald-900/50'
  };
};

const estadoClasses = (estado?: string | null) => {
  switch (estado) {
    case 'pendiente':
      return 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300';

    case 'aprobada':
    case 'confirmada':
      return 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300';

    case 'rechazada':
    case 'cancelada':
      return 'border-red-200 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300';

    default:
      return 'border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-300';
  }
};

const formatearEstado = (estado?: string | null) => {
  if (!estado) return 'Sin estado';

  if (estado === 'pendiente') return 'Pendiente';
  if (estado === 'aprobada') return 'Aprobada';
  if (estado === 'confirmada') return 'Confirmada';
  if (estado === 'rechazada') return 'Rechazada';
  if (estado === 'cancelada') return 'Cancelada';

  return estado;
};

const obtenerIniciales = (nombre?: string | null) => {
  if (!nombre) return '?';

  const partes = nombre
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (partes.length === 1) {
    return partes[0].substring(0, 2).toUpperCase();
  }

  return `${partes[0][0]}${partes[1][0]}`.toUpperCase();
};

const esFechaFutura = (fecha?: string | null) => {
  if (!fecha) return false;

  const fechaActividad = new Date(fecha);

  if (Number.isNaN(fechaActividad.getTime())) {
    return false;
  }

  fechaActividad.setHours(0, 0, 0, 0);

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  return fechaActividad.getTime() >= hoy.getTime();
};

const DatoFormulario = ({
  etiqueta,
  valor,
  icono
}: {
  etiqueta: string;
  valor?: string | null;
  icono: ReactNode;
}) => {
  return (
    <div className="min-w-0 rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
          {icono}
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            {etiqueta}
          </p>

          <p className="mt-1 break-words text-sm font-medium text-slate-800 dark:text-slate-100">
            {valor || 'No disponible'}
          </p>
        </div>
      </div>
    </div>
  );
};

const IconoPersona = () => (
  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21a8 8 0 0 1 16 0" />
  </svg>
);

const IconoCalendario = () => (
  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="4" width="18" height="17" rx="2" />
    <path d="M16 2v4M8 2v4M3 10h18" />
  </svg>
);

const IconoIdentificacion = () => (
  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <circle cx="8" cy="12" r="2" />
    <path d="M13 10h5M13 14h4" />
  </svg>
);

const IconoCorreo = () => (
  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <path d="m3 7 9 6 9-6" />
  </svg>
);

const IconoTelefono = () => (
  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M6.6 3.5 9 3l2 5-2.2 1.8a16 16 0 0 0 5.4 5.4L16 13l5 2-.5 2.4c-.3 1.4-1.6 2.4-3 2.3C10.7 19.1 4.9 13.3 4.3 6.5c-.1-1.4.9-2.7 2.3-3Z" />
  </svg>
);

const IconoUsuario = () => (
  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="7" r="4" />
    <path d="M5 21a7 7 0 0 1 14 0" />
  </svg>
);

const IconoActividad = () => (
  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M4 19h16M6 17V9M10 17V5M14 17v-7M18 17V7" />
  </svg>
);

const IconoReloj = () => (
  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </svg>
);

const IconoFlecha = () => (
  <svg
    className="h-5 w-5 transition-transform duration-200 group-open:rotate-180"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <path d="m6 9 6 6 6-6" />
  </svg>
);

export default function InscripcionesAdmin() {
  const [inscripciones, setInscripciones] = useState<InscripcionAdministrativa[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [filtroTemporal, setFiltroTemporal] = useState<FiltroTemporal>('todos');

  const cargarInscripciones = async () => {
    try {
      setCargando(true);
      setError('');

      const datos = await obtenerInscripcionesAdministrativas();

      setInscripciones(datos);
    } catch (err: unknown) {
      const errorConRespuesta = err as {
        response?: { status?: number; data?: { message?: string } };
        message?: string;
      };

      if (errorConRespuesta?.response?.status === 403) {
        setError('No tiene permisos para visualizar las inscripciones.');
      } else {
        setError(
          errorConRespuesta?.response?.data?.message ||
            errorConRespuesta?.message ||
            'No se pudieron cargar las inscripciones.'
        );
      }
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    void cargarInscripciones();
  }, []);

  const cambiarEstadoReserva = async (id: number, estado: 'aprobada' | 'rechazada') => {
    try {
      await actualizarEstadoReserva(id, estado);

      setInscripciones((actuales) =>
        actuales.map((inscripcion) =>
          inscripcion.id === id
            ? {
                ...inscripcion,
                estado
              }
            : inscripcion
        )
      );
    } catch (err: unknown) {
      const errorConRespuesta = err as {
        response?: { data?: { message?: string } };
        message?: string;
      };

      setError(
        errorConRespuesta?.response?.data?.message ||
          errorConRespuesta?.message ||
          'No se pudo actualizar el estado de la reserva.'
      );
    }
  };

  const registros = useMemo(() => {
    return inscripciones.map((inscripcion) => {
      const registro = inscripcion as InscripcionConDatosReserva;

      return {
        ...registro,
        esProximo: esFechaFutura(registro.fechaActividad),
        fechaActividadFormateada: formatearFecha(registro.fechaActividad),
        fechaInscripcionFormateada: formatearFecha(registro.fechaInscripcion),
        fechaNacimientoFormateada: formatearFecha(registro.fechaNacimiento),
        tipoActividadFormateado: formatearTipoActividad(registro.tipoActividad),
        tipoIdentificacionFormateado: formatearTipoIdentificacion(registro.tipoIdentificacion)
      };
    });
  }, [inscripciones]);


const registrosFiltrados = useMemo(() => {
  const texto = busqueda.trim().toLowerCase();

  return [...registros]
    .filter((registro) => {
      const coincideTemporal =
        filtroTemporal === 'todos' ||
        (filtroTemporal === 'proximos' && registro.esProximo) ||
        (filtroTemporal === 'pasados' && !registro.esProximo);

      if (!coincideTemporal) {
        return false;
      }

      if (!texto) {
        return true;
      }

      const contenido = [
        registro.nombreCompleto,
        registro.nombreUsuario,
        registro.correo,
        registro.nombreActividad,
        registro.numeroIdentificacion,
        registro.telefono,
        registro.tipoActividad
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return contenido.includes(texto);
    })
    .sort((a, b) => {
      if (a.estado === 'pendiente' && b.estado !== 'pendiente') {
        return -1;
      }

      if (a.estado !== 'pendiente' && b.estado === 'pendiente') {
        return 1;
      }

      const fechaA = a.fechaInscripcion
        ? new Date(a.fechaInscripcion).getTime()
        : 0;

      const fechaB = b.fechaInscripcion
        ? new Date(b.fechaInscripcion).getTime()
        : 0;

      return fechaA - fechaB;
    });
}, [registros, busqueda, filtroTemporal]);




  
  const resumen = useMemo(() => {
    const total = registros.length;
    const eventos = registros.filter((registro) => registro.tipoActividad === 'evento').length;
    const capacitaciones = registros.filter((registro) => registro.tipoActividad === 'capacitacion').length;
    const proximos = registros.filter((registro) => registro.esProximo).length;
    const pasados = registros.filter((registro) => !registro.esProximo).length;
    const pendientes = registros.filter((registro) => registro.estado === 'pendiente').length;

    return { total, eventos, capacitaciones, proximos, pasados, pendientes };
  }, [registros]);

  return (
    <section className="min-h-screen bg-slate-50 px-3 py-5 dark:bg-[#07100b] sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-7xl">
        <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                  <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                </div>

                <div className="min-w-0">
                  <h1 className="truncate text-xl font-bold text-slate-900 dark:text-white sm:text-2xl">
                    Gestión de inscripciones
                  </h1>

                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    Consulte y gestione las personas inscritas en las actividades.
                  </p>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => void cargarInscripciones()}
              disabled={cargando}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 sm:w-auto"
            >
              <svg
                className={`h-4 w-4 ${cargando ? 'animate-spin' : ''}`}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M20 11a8.1 8.1 0 0 0-15.5-2M4 5v4h4M4 13a8.1 8.1 0 0 0 15.5 2M20 19v-4h-4" />
              </svg>
              Actualizar
            </button>
          </div>
        </div>

        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Total</p>
            <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">{resumen.total}</p>
          </div>

          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900/50 dark:bg-emerald-950/20">
            <p className="text-xs font-medium text-emerald-700 dark:text-emerald-300">Eventos</p>
            <p className="mt-1 text-2xl font-bold text-emerald-800 dark:text-emerald-200">{resumen.eventos}</p>
          </div>

          <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-900/50 dark:bg-blue-950/20">
            <p className="text-xs font-medium text-blue-700 dark:text-blue-300">Capacitaciones</p>
            <p className="mt-1 text-2xl font-bold text-blue-800 dark:text-blue-200">{resumen.capacitaciones}</p>
          </div>

          <div className="rounded-2xl border border-indigo-200 bg-indigo-50 p-4 dark:border-indigo-900/50 dark:bg-indigo-950/20">
            <p className="text-xs font-medium text-indigo-700 dark:text-indigo-300">Próximos</p>
            <p className="mt-1 text-2xl font-bold text-indigo-800 dark:text-indigo-200">{resumen.proximos}</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-100 p-4 dark:border-slate-700 dark:bg-slate-800">
            <p className="text-xs font-medium text-slate-600 dark:text-slate-300">Pasados</p>
            <p className="mt-1 text-2xl font-bold text-slate-800 dark:text-slate-100">{resumen.pasados}</p>
          </div>

          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/50 dark:bg-amber-950/20">
            <p className="text-xs font-medium text-amber-700 dark:text-amber-300">Pendientes</p>
            <p className="mt-1 text-2xl font-bold text-amber-800 dark:text-amber-200">{resumen.pendientes}</p>
          </div>
        </div>

        <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
            <div className="relative min-w-0 flex-1">
              <svg
                className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-4-4" />
              </svg>

              <input
                type="text"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar por nombre, usuario, correo, identificación o actividad..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder:text-slate-500"
              />
            </div>

            <div className="flex min-w-0 gap-2 overflow-x-auto pb-1 lg:pb-0">
              {[
                { valor: 'todos' as const, texto: 'Todos' },
                { valor: 'proximos' as const, texto: 'Próximos' },
                { valor: 'pasados' as const, texto: 'Pasados' }
              ].map((filtro) => (
                <button
                  key={filtro.valor}
                  type="button"
                  onClick={() => setFiltroTemporal(filtro.valor)}
                  className={`shrink-0 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                    filtroTemporal === filtro.valor
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                  }`}
                >
                  {filtro.texto}
                </button>
              ))}
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/20 dark:text-red-300 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <svg className="mt-0.5 h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="9" />
                <path d="M12 8v5M12 16h.01" />
              </svg>

              <span>{error}</span>
            </div>

            <button
              type="button"
              onClick={() => void cargarInscripciones()}
              className="rounded-lg border border-red-200 px-3 py-2 font-semibold hover:bg-red-100 dark:border-red-800 dark:hover:bg-red-950/40"
            >
              Reintentar
            </button>
          </div>
        )}

        {cargando ? (
          <div className="rounded-2xl border border-slate-200 bg-white px-6 py-16 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-emerald-600 dark:border-slate-700 dark:border-t-emerald-400" />
            <p className="mt-4 text-sm font-medium text-slate-600 dark:text-slate-300">Cargando inscripciones...</p>
          </div>
        ) : registrosFiltrados.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center dark:border-slate-700 dark:bg-slate-900">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500">
              <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-4-4" />
              </svg>
            </div>

            <h2 className="mt-4 text-base font-semibold text-slate-800 dark:text-white">No se encontraron inscripciones</h2>

            <p className="mx-auto mt-1 max-w-md text-sm text-slate-500 dark:text-slate-400">
              Intente cambiar los filtros o utilizar otro término de búsqueda.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {registrosFiltrados.map((inscripcion) => {
              const tipo = acentoPorTipo(inscripcion.tipoActividad);
              const puedeGestionar = inscripcion.origen === 'reserva' && inscripcion.estado === 'pendiente';

              return (
                <details
                  key={inscripcion.id}
                  className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
                >
                  <summary className="cursor-pointer list-none px-4 py-4 outline-none [&::-webkit-details-marker]:hidden sm:px-5">
                    <div className="grid min-w-0 grid-cols-[1fr_auto] items-center gap-4">
                      <div className="min-w-0">
                        <div className="flex min-w-0 items-start gap-3">
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                            {obtenerIniciales(inscripcion.nombreCompleto)}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                              <h2 className="truncate text-base font-bold text-slate-900 dark:text-white">
                                {inscripcion.nombreCompleto || 'Sin nombre'}
                              </h2>

                              <span
                                className={`w-fit rounded-full border px-2.5 py-1 text-[11px] font-bold ${estadoClasses(
                                  inscripcion.estado
                                )}`}
                              >
                                {formatearEstado(inscripcion.estado)}
                              </span>
                            </div>

                            <p className="mt-1 truncate text-sm text-slate-500 dark:text-slate-400">
                              {inscripcion.nombreActividad || 'Actividad sin nombre'}
                            </p>

                            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                              <span className="inline-flex items-center gap-1.5">
                                <IconoCalendario />
                                {inscripcion.fechaActividadFormateada}
                              </span>

                              <span className="inline-flex items-center gap-1.5">
                                <IconoUsuario />
                                {inscripcion.nombreUsuario || 'Sin usuario'}
                              </span>

                              <span className={`rounded-full border px-2 py-0.5 font-semibold ${tipo.contenedor} ${tipo.texto}`}>
                                {inscripcion.tipoActividadFormateado}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                        <IconoFlecha />
                      </div>
                    </div>
                  </summary>

                  <div className="border-t border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-950/30 sm:p-5">
                    <div className="grid gap-4 xl:grid-cols-2">
                      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
                        <div className="border-b border-slate-200 px-4 py-4 dark:border-slate-800">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                              <IconoPersona />
                            </div>

                            <div>
                              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Datos del formulario</h3>
                              <p className="text-xs text-slate-500 dark:text-slate-400">
                                Información proporcionada por el usuario.
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="grid gap-3 p-4 sm:grid-cols-2">
                          <DatoFormulario etiqueta="Nombre completo" valor={inscripcion.nombreCompleto} icono={<IconoPersona />} />
                          <DatoFormulario
                            etiqueta="Fecha de nacimiento"
                            valor={inscripcion.fechaNacimientoFormateada}
                            icono={<IconoCalendario />}
                          />
                          <DatoFormulario
                            etiqueta="Tipo de identificación"
                            valor={inscripcion.tipoIdentificacionFormateado}
                            icono={<IconoIdentificacion />}
                          />
                          <DatoFormulario
                            etiqueta="Número de identificación"
                            valor={inscripcion.numeroIdentificacion}
                            icono={<IconoIdentificacion />}
                          />
                          <DatoFormulario etiqueta="Correo electrónico" valor={inscripcion.correo} icono={<IconoCorreo />} />
                          <DatoFormulario etiqueta="Teléfono" valor={inscripcion.telefono} icono={<IconoTelefono />} />
                        </div>
                      </div>

                      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
                        <div className="border-b border-slate-200 px-4 py-4 dark:border-slate-800">
                          <div className="flex items-center gap-3">
                            <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${tipo.icono} ${tipo.texto}`}>
                              <IconoActividad />
                            </div>

                            <div>
                              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Información de la inscripción</h3>
                              <p className="text-xs text-slate-500 dark:text-slate-400">Detalles de la actividad y registro.</p>
                            </div>
                          </div>
                        </div>

                        <div className="grid gap-3 p-4 sm:grid-cols-2">
                          <DatoFormulario etiqueta="Actividad" valor={inscripcion.nombreActividad} icono={<IconoActividad />} />
                          <DatoFormulario
                            etiqueta="Tipo de actividad"
                            valor={inscripcion.tipoActividadFormateado}
                            icono={<IconoActividad />}
                          />
                          <DatoFormulario
                            etiqueta="Fecha de actividad"
                            valor={inscripcion.fechaActividadFormateada}
                            icono={<IconoCalendario />}
                          />
                          <DatoFormulario
                            etiqueta="Fecha de inscripción"
                            valor={inscripcion.fechaInscripcionFormateada}
                            icono={<IconoReloj />}
                          />
                          <DatoFormulario
                            etiqueta="Usuario"
                            valor={inscripcion.nombreUsuario || 'No disponible'}
                            icono={<IconoUsuario />}
                          />
                          <DatoFormulario etiqueta="Estado" valor={formatearEstado(inscripcion.estado)} icono={<IconoReloj />} />
                        </div>
                      </div>
                    </div>

                    {puedeGestionar && (
                      <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/50 dark:bg-amber-950/20">
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                          <div>
                            <p className="text-sm font-bold text-amber-800 dark:text-amber-200">Reserva pendiente de aprobación</p>
                            <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">Puede aprobar o rechazar esta solicitud.</p>
                          </div>

                          <div className="flex flex-col gap-2 sm:flex-row">
                            <button
                              type="button"
                              onClick={() => void cambiarEstadoReserva(inscripcion.id, 'rechazada')}
                              className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 bg-white px-4 py-2.5 text-sm font-semibold text-red-700 transition hover:bg-red-50 dark:border-red-900/60 dark:bg-slate-900 dark:text-red-300 dark:hover:bg-red-950/30"
                            >
                              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M6 6l12 12M18 6 6 18" />
                              </svg>
                              Rechazar
                            </button>

                            <button
                              type="button"
                              onClick={() => void cambiarEstadoReserva(inscripcion.id, 'aprobada')}
                              className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700"
                            >
                              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="m5 12 4 4L19 6" />
                              </svg>
                              Aprobar
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </details>
              );
            })}
          </div>
        )}

        {!cargando && registrosFiltrados.length > 0 && (
          <div className="mt-4 text-center text-xs text-slate-500 dark:text-slate-400">
            Mostrando {registrosFiltrados.length} de {registros.length} inscripciones
          </div>
        )}
      </div>
    </section>
  );
}