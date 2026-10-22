import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  actualizarEstadoReserva,
  obtenerInscripcionesAdministrativas,
  registrarDevolucionProcesada,
  type InscripcionAdministrativa
} from '../../services/inscripcionesAdminService';
import { obtenerComprobanteReserva } from '../../services/inscripcionService';

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

const formatearMonto = (monto?: number | null) => {
  if (monto == null) return 'No disponible';

  return new Intl.NumberFormat('es-CR', {
    style: 'currency',
    currency: 'CRC',
    maximumFractionDigits: 0,
  }).format(monto);
};

const describirDestinoDevolucion = (datos: InscripcionAdministrativa['datosDevolucion']) => {
  if (!datos) return 'No disponible';
  if (datos.tipo === 'sinpe_movil') return datos.telefono;
  return `${datos.iban} (${datos.banco})`;
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
  const [reservaEnActualizacion, setReservaEnActualizacion] = useState<number | null>(null);
  const [accionEnActualizacion, setAccionEnActualizacion] = useState<'aprobada' | 'rechazada' | null>(null);
  const [mensajeExito, setMensajeExito] = useState('');
  const [reservaARechazar, setReservaARechazar] = useState<InscripcionAdministrativa | null>(null);
  const [motivoRechazo, setMotivoRechazo] = useState('');
  const [reservaConComprobanteAbierto, setReservaConComprobanteAbierto] = useState<number | null>(null);
  const [reservaAProcesarDevolucion, setReservaAProcesarDevolucion] = useState<InscripcionAdministrativa | null>(null);
  const [referenciaDevolucion, setReferenciaDevolucion] = useState('');
  const [procesandoDevolucion, setProcesandoDevolucion] = useState(false);

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

  useEffect(() => {
    if (!mensajeExito) return;

    const temporizador = window.setTimeout(() => {
      setMensajeExito('');
    }, 4000);

    return () => window.clearTimeout(temporizador);
  }, [mensajeExito]);

  const cambiarEstadoReserva = async (id: number, estado: 'aprobada' | 'rechazada', motivo?: string) => {
    if (reservaEnActualizacion !== null) return;

    try {
      setReservaEnActualizacion(id);
      setAccionEnActualizacion(estado);
      setError('');

      const reservaActualizada = await actualizarEstadoReserva(id, estado, motivo);

      setInscripciones((actuales) =>
        actuales.map((inscripcion) =>
          inscripcion.id === id
            ? {
                ...inscripcion,
                estado: reservaActualizada.estado,
                motivoRechazo: estado === 'rechazada' ? motivo?.trim() || null : null,
              }
            : inscripcion
        )
      );

      setMensajeExito(
        estado === 'aprobada'
          ? 'Inscripción aprobada exitosamente.'
          : 'Inscripción rechazada exitosamente.'
      );
      if (estado === 'rechazada') {
        setReservaARechazar(null);
        setMotivoRechazo('');
      }
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
    } finally {
      setReservaEnActualizacion(null);
      setAccionEnActualizacion(null);
    }
  };

  const abrirComprobante = async (reservaId: number) => {
    if (reservaConComprobanteAbierto !== null) return;

    const ventana = window.open('', '_blank');
    if (!ventana) {
      setError('El navegador bloqueó la nueva pestaña. Permite las ventanas emergentes para ver el comprobante.');
      return;
    }

    setReservaConComprobanteAbierto(reservaId);
    try {
      const comprobante = await obtenerComprobanteReserva(reservaId);
      const urlTemporal = URL.createObjectURL(comprobante);
      ventana.location.replace(urlTemporal);
      window.setTimeout(() => URL.revokeObjectURL(urlTemporal), 60_000);
    } catch (err: unknown) {
      ventana.close();
      setError(
        err instanceof Error
          ? err.message
          : 'No se pudo obtener el comprobante de pago.',
      );
    } finally {
      setReservaConComprobanteAbierto(null);
    }
  };

  const confirmarDevolucionProcesada = async () => {
    if (!reservaAProcesarDevolucion || !referenciaDevolucion.trim() || procesandoDevolucion) return;

    try {
      setProcesandoDevolucion(true);
      setError('');
      const actualizada = await registrarDevolucionProcesada(
        reservaAProcesarDevolucion.id,
        referenciaDevolucion.trim(),
      );
      setInscripciones((actuales) => actuales.map((inscripcion) => (
        inscripcion.id === actualizada.id
          ? {
              ...inscripcion,
              devolucionProcesadaEn: actualizada.devolucionProcesadaEn,
              referenciaDevolucion: actualizada.referenciaDevolucion,
            }
          : inscripcion
      )));
      setMensajeExito('La devolución fue registrada como procesada. No se realizó un pago automático.');
      setReservaAProcesarDevolucion(null);
      setReferenciaDevolucion('');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'No se pudo registrar la devolución como procesada.');
    } finally {
      setProcesandoDevolucion(false);
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
        registro.tipoActividad,
        registro.numeroTicket,
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

      return fechaB - fechaA;
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
      {mensajeExito && (
        <div
          className="fixed left-4 right-4 top-4 z-50 flex items-start gap-3 sm:left-auto sm:max-w-sm rounded-2xl border border-emerald-200/80 bg-white/90 px-4 py-3 text-sm text-emerald-800 shadow-xl backdrop-blur-md dark:border-emerald-700/60 dark:bg-emerald-950/90 dark:text-emerald-100"
          role="status"
        >
          <svg className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="m5 12 4 4L19 6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <p className="font-semibold">{mensajeExito}</p>
        </div>
      )}
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
          <div className="flex min-h-[52px] w-full flex-wrap items-center justify-between gap-4">
            <div className="relative min-w-[min(100%,280px)] flex-1">
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
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-base sm:text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder:text-slate-500"
              />
            </div>

              <div className="no-scrollbar grid w-full grid-cols-3 gap-2 py-1 sm:flex sm:w-auto sm:shrink-0 sm:items-center sm:overflow-x-auto sm:overflow-y-hidden sm:whitespace-nowrap">              {[
                { valor: 'todos' as const, texto: 'Todos' },
                { valor: 'proximos' as const, texto: 'Próximos' },
                { valor: 'pasados' as const, texto: 'Pasados' }
              ].map((filtro) => (
                <button
                  key={filtro.valor}
                  type="button"
                  onClick={() => setFiltroTemporal(filtro.valor)}
                  className={`min-w-0 rounded-xl px-2 py-2.5 text-sm font-semibold transition sm:min-w-[140px] sm:shrink-0 sm:px-4 ${
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

        <div className="min-h-[400px]">
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
              const isSubmitting = reservaEnActualizacion === inscripcion.id;
              const rechazando = isSubmitting && accionEnActualizacion === 'rechazada';
              const aprobando = isSubmitting && accionEnActualizacion === 'aprobada';

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

                            <p className="mt-2 w-fit max-w-full break-all rounded-lg border border-sky-500/25 bg-sky-500/10 px-2 py-1 text-xs font-bold text-sky-700 dark:text-sky-300">
                              Nº de ticket: {inscripcion.numeroTicket ?? '#TKT-00000000'}
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

                    {inscripcion.estado === 'cancelada' && inscripcion.esPago && inscripcion.datosDevolucion && (
                      <div className="mt-4 overflow-hidden rounded-2xl border border-sky-200 bg-sky-50/70 dark:border-sky-900/60 dark:bg-sky-950/20">
                        <div className="border-b border-sky-200 px-4 py-3 dark:border-sky-900/60">
                          <h3 className="text-sm font-bold text-sky-900 dark:text-sky-100">Datos de devolución</h3>
                          <p className="mt-1 text-xs text-sky-800 dark:text-sky-200">El registro confirma gestión administrativa; no ejecuta un pago automático.</p>
                        </div>
                        <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
                          <DatoFormulario etiqueta="Método" valor={inscripcion.datosDevolucion.tipo === 'sinpe_movil' ? 'SINPE Móvil' : 'Transferencia bancaria'} icono={<IconoTelefono />} />
                          <DatoFormulario etiqueta="Destino" valor={describirDestinoDevolucion(inscripcion.datosDevolucion)} icono={<IconoIdentificacion />} />
                          <DatoFormulario etiqueta="Monto" valor={formatearMonto(inscripcion.precio)} icono={<IconoActividad />} />
                          <DatoFormulario etiqueta="Fecha de cancelación" valor={formatearFecha(inscripcion.fechaCancelacion)} icono={<IconoCalendario />} />
                        </div>
                        <div className="flex flex-col gap-3 border-t border-sky-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between dark:border-sky-900/60">
                          <div>
                            <p className="text-sm font-semibold text-sky-900 dark:text-sky-100">Estado: {inscripcion.devolucionProcesadaEn ? 'Procesada' : 'Pendiente'}</p>
                            {inscripcion.devolucionProcesadaEn && <p className="text-xs text-sky-800 dark:text-sky-200">Procesada el {formatearFecha(inscripcion.devolucionProcesadaEn)}{inscripcion.referenciaDevolucion ? ` · Referencia: ${inscripcion.referenciaDevolucion}` : ''}</p>}
                          </div>
                          {!inscripcion.devolucionProcesadaEn && (
                            <button type="button" onClick={() => { setReservaAProcesarDevolucion(inscripcion); setReferenciaDevolucion(''); }} className="rounded-xl bg-sky-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-sky-800">Registrar devolución procesada</button>
                          )}
                        </div>
                      </div>
                    )}

                    {puedeGestionar && (
                      <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/50 dark:bg-amber-950/20">
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                          <div>
                            <p className="text-sm font-bold text-amber-800 dark:text-amber-200">Reserva pendiente de aprobación</p>
                            <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">Puede aprobar o rechazar esta solicitud.</p>
                          </div>

                          <div className="flex flex-col gap-2 sm:flex-row">
                            {inscripcion.esPago && inscripcion.comprobanteUrl && (
                              <button
                                type="button"
                                onClick={() => void abrirComprobante(inscripcion.id)}
                                disabled={isSubmitting || reservaConComprobanteAbierto !== null}
                                aria-busy={reservaConComprobanteAbierto === inscripcion.id}
                                className="inline-flex items-center justify-center rounded-xl border border-sky-200 bg-white px-4 py-2.5 text-sm font-semibold text-sky-700 hover:bg-sky-50 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {reservaConComprobanteAbierto === inscripcion.id
                                  ? 'Abriendo comprobante...'
                                  : 'Ver comprobante'}
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => { setReservaARechazar(inscripcion); setMotivoRechazo(''); }}
                              disabled={isSubmitting}
                              aria-busy={isSubmitting}
                              className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 bg-white px-4 py-2.5 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-red-900/60 dark:bg-slate-900 dark:text-red-300 dark:hover:bg-red-950/30"
                            >
                              {rechazando ? (
                                <span className="h-4 w-4 animate-spin rounded-full border-2 border-red-300 border-t-red-700 dark:border-red-800 dark:border-t-red-300" />
                              ) : (
                                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path d="M6 6l12 12M18 6 6 18" />
                                </svg>
                              )}
                              {rechazando ? 'Actualizando...' : 'Rechazar'}
                            </button>

                            <button
                              type="button"
                              onClick={() => void cambiarEstadoReserva(inscripcion.id, 'aprobada')}
                              disabled={isSubmitting}
                              aria-busy={isSubmitting}
                              className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {aprobando ? (
                                <span className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-200 border-t-white" />
                              ) : (
                                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path d="m5 12 4 4L19 6" />
                                </svg>
                              )}
                              {aprobando ? 'Actualizando...' : 'Aprobar'}
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
      </div>

      {reservaARechazar && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="titulo-rechazo" onMouseDown={(event) => { if (event.target === event.currentTarget && reservaEnActualizacion === null) { setReservaARechazar(null); setMotivoRechazo(''); } }}>
<div className="max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-2xl border border-white/20 bg-white/80 p-5 shadow-xl backdrop-blur-md dark:border-white/10 dark:bg-slate-900/80 sm:p-6">
            <h2 id="titulo-rechazo" className="text-xl font-bold text-slate-900 dark:text-white">Rechazar Inscripción</h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">Indica a {reservaARechazar.nombreCompleto} cómo puede corregir su solicitud antes de realizar una nueva reserva.</p>
            <label className="mt-5 block text-sm font-semibold text-slate-800 dark:text-slate-100">
              Ingrese el motivo del rechazo para el usuario...
              <textarea value={motivoRechazo} onChange={(event) => setMotivoRechazo(event.target.value)} disabled={reservaEnActualizacion !== null} required rows={4} className="mt-2 w-full resize-y rounded-xl border border-slate-200 bg-white/70 px-3 py-2.5 text-base sm:text-sm text-slate-800 outline-none focus:border-rose-400 focus:ring-4 focus:ring-rose-500/15 disabled:opacity-60 dark:border-white/10 dark:bg-slate-950/40 dark:text-white" />
            </label>
            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button type="button" onClick={() => { setReservaARechazar(null); setMotivoRechazo(''); }} disabled={reservaEnActualizacion !== null} className="rounded-xl border border-slate-200 bg-white/70 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-60 dark:border-white/10 dark:bg-white/5 dark:text-slate-200">Cancelar</button>
              <button type="button" onClick={() => void cambiarEstadoReserva(reservaARechazar.id, 'rechazada', motivoRechazo)} disabled={!motivoRechazo.trim() || reservaEnActualizacion !== null} className="rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60">{reservaEnActualizacion !== null ? 'Rechazando...' : 'Confirmar Rechazo'}</button>
            </div>
          </div>
        </div>
      )}
      {reservaAProcesarDevolucion && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="titulo-devolucion">
<div className="max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-2xl border border-white/20 bg-white p-5 shadow-xl dark:bg-slate-900 sm:p-6">
            <h2 id="titulo-devolucion" className="text-xl font-bold text-slate-900 dark:text-white">Registrar devolución procesada</h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">Registra la referencia administrativa. Esta acción no envía dinero automáticamente.</p>
            <label className="mt-5 block text-sm font-semibold text-slate-800 dark:text-slate-100">Referencia de la operación
              <input value={referenciaDevolucion} onChange={(event) => setReferenciaDevolucion(event.target.value)} disabled={procesandoDevolucion} maxLength={120} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-base sm:text-sm dark:border-slate-700 dark:bg-slate-950" />
            </label>
            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button type="button" onClick={() => { setReservaAProcesarDevolucion(null); setReferenciaDevolucion(''); }} disabled={procesandoDevolucion} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-200">Cancelar</button>
              <button type="button" onClick={() => void confirmarDevolucionProcesada()} disabled={!referenciaDevolucion.trim() || procesandoDevolucion} className="rounded-xl bg-sky-700 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60">{procesandoDevolucion ? 'Registrando...' : 'Confirmar procesamiento'}</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
