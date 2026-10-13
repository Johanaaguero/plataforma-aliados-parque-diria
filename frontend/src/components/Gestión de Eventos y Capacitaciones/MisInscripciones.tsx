import { useEffect, useMemo, useState } from 'react';

import {
  cancelarInscripcion,
  cancelarReserva,
  guardarDatosDevolucion,
  obtenerMisInscripciones,
  type DatosDevolucion,
  type MiInscripcion,
} from '../../services/MisInscripcionesService';

import { mostrarFeedback } from '../ui/FeedbackToast';

import FormularioReserva from './FormularioReserva';

import {
  consultarReservaEvento,
  type DatosReserva,
} from '../../services/inscripcionService';

import type { EventoCapacitacion } from '../../services/eventosCapacitacionesService';
import { formatearFechaActividad } from '../../utils/fechas';

type FiltroTipo = 'todas' | 'evento' | 'capacitacion';

type FiltroTiempo = 'proximas' | 'pasadas' | 'canceladas' | 'todas';

const formatearTipoActividad = (tipo: string): string => {
  if (tipo === 'evento') {
    return 'Evento';
  }

  if (tipo === 'capacitacion') {
    return 'Capacitación';
  }

  return tipo;
};

const obtenerUrlComprobante = (ruta: string): string => {
  if (/^https?:\/\//i.test(ruta)) return ruta;

  const apiUrl = import.meta.env.VITE_API_URL?.trim() || 'http://localhost:3000';
  return `${apiUrl.replace(/\/+$/, '')}${ruta}`;
};

const acentoPorTipo: Record<
  string,
  {
    punto: string;
    texto: string;
    fondo: string;
    borde: string;
    icono: string;
  }
> = {
  evento: {
    punto: 'bg-[#00AEEF]',
    texto: 'text-[#0087BA] dark:text-[#67d5ff]',
    fondo: 'bg-[#00AEEF]/8 dark:bg-[#00AEEF]/15',
    borde: 'border-[#00AEEF]/20 dark:border-[#00AEEF]/30',
    icono:
      'bg-[#00AEEF]/10 text-[#0087BA] dark:bg-[#00AEEF]/15 dark:text-[#67d5ff]',
  },
  capacitacion: {
    punto: 'bg-[#8dc63f]',
    texto: 'text-[#567d16] dark:text-[#b7e86c]',
    fondo: 'bg-[#8dc63f]/10 dark:bg-[#8dc63f]/15',
    borde: 'border-[#8dc63f]/25 dark:border-[#8dc63f]/30',
    icono:
      'bg-[#8dc63f]/12 text-[#567d16] dark:bg-[#8dc63f]/15 dark:text-[#b7e86c]',
  },
};

const obtenerAcentoTipo = (tipo: string) =>
  acentoPorTipo[tipo] ?? {
    punto: 'bg-slate-400',
    texto: 'text-slate-600 dark:text-slate-300',
    fondo: 'bg-slate-100 dark:bg-white/5',
    borde: 'border-slate-200 dark:border-white/10',
    icono:
      'bg-slate-100 text-slate-600 dark:bg-white/5 dark:text-slate-300',
  };

const normalizarEstado = (
  estado: string | null | undefined,
): string => {
  return (estado ?? '').trim().toLowerCase();
};

const esFechaFutura = (
  valor: string | null | undefined,
): boolean => {
  if (!valor) {
    return false;
  }

  const fechaTexto = valor.substring(0, 10);

  const partes = fechaTexto.split('-').map(Number);

  if (
    partes.length !== 3 ||
    partes.some((parte) => Number.isNaN(parte))
  ) {
    return false;
  }

  const [anio, mes, dia] = partes;

  const fechaActividad = new Date(anio, mes - 1, dia);
  fechaActividad.setHours(0, 0, 0, 0);

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  return fechaActividad.getTime() >= hoy.getTime();
};

export default function MisInscripciones() {
  const [inscripciones, setInscripciones] = useState<
    MiInscripcion[]
  >([]);

  const [cargando, setCargando] = useState(true);

  const [error, setError] = useState('');

  const [filtroTipo, setFiltroTipo] =
    useState<FiltroTipo>('todas');

  const [filtroTiempo, setFiltroTiempo] =
    useState<FiltroTiempo>('proximas');

  const [expandidoId, setExpandidoId] =
    useState<number | null>(null);

  const [reservaACancelar, setReservaACancelar] =
    useState<MiInscripcion | null>(null);

  const [cancelando, setCancelando] = useState(false);

  const [tipoDevolucion, setTipoDevolucion] = useState<DatosDevolucion['tipo']>('sinpe_movil');

  const [telefonoDevolucion, setTelefonoDevolucion] = useState('');

  const [ibanDevolucion, setIbanDevolucion] = useState('');

  const [bancoDevolucion, setBancoDevolucion] = useState('');

  const [reservaParaDevolucion, setReservaParaDevolucion] =
    useState<MiInscripcion | null>(null);

  const [guardandoDevolucion, setGuardandoDevolucion] = useState(false);

  const [reservaAEditar, setReservaAEditar] =
    useState<MiInscripcion | null>(null);

  const [datosReservaAEditar, setDatosReservaAEditar] =
    useState<DatosReserva | null>(null);

  const [cargandoEdicion, setCargandoEdicion] =
    useState(false);

  const obtenerDatosDevolucion = (): DatosDevolucion | null => {
    if (tipoDevolucion === 'sinpe_movil') {
      const telefono = telefonoDevolucion.trim();
      return telefono ? { tipo: 'sinpe_movil', telefono } : null;
    }

    const iban = ibanDevolucion.trim();
    const banco = bancoDevolucion.trim();
    return iban && banco
      ? { tipo: 'transferencia_bancaria', iban, banco }
      : null;
  };

  const limpiarDatosDevolucion = () => {
    setTipoDevolucion('sinpe_movil');
    setTelefonoDevolucion('');
    setIbanDevolucion('');
    setBancoDevolucion('');
  };

  const camposDevolucion = () => (
    <>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button type="button" onClick={() => setTipoDevolucion('sinpe_movil')} className={`rounded-xl border px-3 py-2 text-xs font-bold transition ${tipoDevolucion === 'sinpe_movil' ? 'border-emerald-500 bg-emerald-500/15 text-emerald-800 dark:text-emerald-200' : 'border-slate-200 text-slate-600 dark:border-white/10 dark:text-slate-300'}`}>SINPE Móvil</button>
        <button type="button" onClick={() => setTipoDevolucion('transferencia_bancaria')} className={`rounded-xl border px-3 py-2 text-xs font-bold transition ${tipoDevolucion === 'transferencia_bancaria' ? 'border-emerald-500 bg-emerald-500/15 text-emerald-800 dark:text-emerald-200' : 'border-slate-200 text-slate-600 dark:border-white/10 dark:text-slate-300'}`}>Transferencia</button>
      </div>
      {tipoDevolucion === 'sinpe_movil' ? (
        <input value={telefonoDevolucion} onChange={(event) => setTelefonoDevolucion(event.target.value)} placeholder="Número de teléfono SINPE" className="mt-3 w-full rounded-xl border border-slate-200 bg-white/80 px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-emerald-500 dark:border-white/10 dark:bg-slate-950/40 dark:text-white" />
      ) : (
        <div className="mt-3 grid gap-2">
          <input value={ibanDevolucion} onChange={(event) => setIbanDevolucion(event.target.value)} placeholder="Cuenta IBAN" className="w-full rounded-xl border border-slate-200 bg-white/80 px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-emerald-500 dark:border-white/10 dark:bg-slate-950/40 dark:text-white" />
          <input value={bancoDevolucion} onChange={(event) => setBancoDevolucion(event.target.value)} placeholder="Banco o entidad financiera" className="w-full rounded-xl border border-slate-200 bg-white/80 px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-emerald-500 dark:border-white/10 dark:bg-slate-950/40 dark:text-white" />
        </div>
      )}
    </>
  );

  const confirmarCancelacion = async () => {
    if (!reservaACancelar || cancelando) {
      return;
    }

    const estado = normalizarEstado(
      reservaACancelar.estado,
    );

    const actividadPasada = !esFechaFutura(
      reservaACancelar.fechaActividad,
    );

    if (
      actividadPasada ||
      (
        estado !== 'pendiente' &&
        estado !== 'confirmada' &&
        estado !== 'aprobada'
      )
    ) {
      mostrarFeedback(
        'error',
        'Solo se pueden cancelar reservas pendientes, confirmadas o aprobadas de actividades futuras.',
      );

      setReservaACancelar(null);

      return;
    }

    const datosDevolucion = reservaACancelar.esPago && reservaACancelar.origen === 'reserva'
      ? obtenerDatosDevolucion()
      : undefined;

    if (reservaACancelar.esPago && reservaACancelar.origen === 'reserva' && !datosDevolucion) {
      mostrarFeedback('error', 'Completa los datos requeridos para solicitar la devolución.');
      return;
    }

    setCancelando(true);

    try {
      const resultado =
        reservaACancelar.origen === 'reserva'
          ? await cancelarReserva(reservaACancelar.id, datosDevolucion ?? undefined)
          : await cancelarInscripcion(reservaACancelar.id);

      setInscripciones((actuales) =>
        actuales.map((inscripcion) =>
          inscripcion.id === resultado.id
            ? {
                ...inscripcion,
                estado: resultado.estado,
                fechaCancelacion:
                  resultado.fechaCancelacion,
              }
            : inscripcion,
        ),
      );

      setReservaACancelar(null);
      limpiarDatosDevolucion();

      mostrarFeedback(
        'registro',
        'Reserva cancelada correctamente.',
      );
    } catch (errorSolicitud: unknown) {
      mostrarFeedback(
        'error',
        errorSolicitud instanceof Error
          ? errorSolicitud.message
          : 'No se pudo cancelar la reserva.',
      );
    } finally {
      setCancelando(false);
    }
  };

  const guardarDevolucionRechazo = async () => {
    if (!reservaParaDevolucion || guardandoDevolucion) {
      return;
    }

    const datosDevolucion = obtenerDatosDevolucion();
    if (!datosDevolucion) {
      mostrarFeedback('error', 'Completa los datos requeridos para la devolución.');
      return;
    }

    setGuardandoDevolucion(true);
    try {
      const resultado = await guardarDatosDevolucion(
        reservaParaDevolucion.id,
        datosDevolucion,
      );
      setInscripciones((actuales) => actuales.map((inscripcion) =>
        inscripcion.id === resultado.id
          ? { ...inscripcion, datosDevolucion: resultado.datosDevolucion }
          : inscripcion,
      ));
      setReservaParaDevolucion(null);
      limpiarDatosDevolucion();
      mostrarFeedback('registro', 'Tus datos de devolución fueron enviados correctamente.');
    } catch (errorSolicitud: unknown) {
      mostrarFeedback(
        'error',
        errorSolicitud instanceof Error
          ? errorSolicitud.message
          : 'No se pudieron guardar los datos de devolución.',
      );
    } finally {
      setGuardandoDevolucion(false);
    }
  };

  const abrirEdicionReserva = async (
    inscripcion: MiInscripcion,
  ) => {
    const estado = normalizarEstado(inscripcion.estado);

    if (
      inscripcion.origen !== 'reserva' ||
      estado !== 'pendiente' ||
      !esFechaFutura(inscripcion.fechaActividad)
    ) {
      mostrarFeedback(
        'error',
        'Esta reserva ya no se puede editar.',
      );

      return;
    }

    setCargandoEdicion(true);

    try {
      const resultado =
        await consultarReservaEvento(
          inscripcion.eventoCapacitacionId,
        );

      if (!resultado.existe || !resultado.reserva) {
        mostrarFeedback(
          'error',
          'La reserva ya no está disponible para edición.',
        );

        return;
      }

      const estadoReserva = normalizarEstado(
        resultado.reserva.estado,
      );

      if (estadoReserva !== 'pendiente') {
        mostrarFeedback(
          'error',
          'La reserva ya no está disponible para edición.',
        );

        return;
      }

      setDatosReservaAEditar({
        nombreCompleto:
          resultado.reserva.nombreCompleto,

        fechaNacimiento:
          resultado.reserva.fechaNacimiento,

        tipoIdentificacion:
          resultado.reserva.tipoIdentificacion,

        numeroIdentificacion:
          resultado.reserva.numeroIdentificacion,

        correo: resultado.reserva.correo,

        telefono: resultado.reserva.telefono,
      });

      setReservaAEditar(inscripcion);
    } catch (errorSolicitud: unknown) {
      console.error(
        'Error al cargar la reserva para editar:',
        errorSolicitud,
      );

      mostrarFeedback(
        'error',
        errorSolicitud instanceof Error
          ? errorSolicitud.message
          : 'No se pudo cargar la reserva para editar.',
      );
    } finally {
      setCargandoEdicion(false);
    }
  };

  const cargarInscripciones = async () => {
    setCargando(true);
    setError('');

    try {
      const datos = await obtenerMisInscripciones();

      if (!Array.isArray(datos)) {
        throw new Error(
          'La respuesta de inscripciones no es válida.',
        );
      }

      setInscripciones(datos);
    } catch (errorSolicitud: unknown) {
      console.error(
        'Error al cargar mis inscripciones:',
        errorSolicitud,
      );

      const status =
        typeof errorSolicitud === 'object' &&
        errorSolicitud !== null &&
        'status' in errorSolicitud
          ? Number(
              (errorSolicitud as { status?: number }).status,
            )
          : null;

      setError(
        status === 401
          ? 'Debes iniciar sesión para consultar tus inscripciones.'
          : 'No se pudieron cargar tus inscripciones.',
      );
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    void cargarInscripciones();
  }, []);

  const totalProximas = useMemo(
    () =>
      inscripciones.filter(
        (inscripcion) =>
          normalizarEstado(inscripcion.estado) !==
            'cancelada' &&
          esFechaFutura(inscripcion.fechaActividad),
      ).length,
    [inscripciones],
  );

  const totalCanceladas = useMemo(
    () =>
      inscripciones.filter(
        (inscripcion) =>
          normalizarEstado(inscripcion.estado) ===
          'cancelada',
      ).length,
    [inscripciones],
  );

  const totalPasadas = inscripciones.filter(
    (inscripcion) =>
      normalizarEstado(inscripcion.estado) !==
        'cancelada' &&
      !esFechaFutura(inscripcion.fechaActividad),
  ).length;

  const registrosVisibles = useMemo(() => {
    let lista = [...inscripciones];

    if (filtroTiempo === 'todas') {
      lista = lista.filter(
        (inscripcion) =>
          normalizarEstado(inscripcion.estado) !==
          'cancelada',
      );
    }

    if (filtroTiempo === 'proximas') {
      lista = lista.filter(
        (inscripcion) =>
          normalizarEstado(inscripcion.estado) !==
            'cancelada' &&
          esFechaFutura(inscripcion.fechaActividad),
      );
    }

    if (filtroTiempo === 'pasadas') {
      lista = lista.filter(
        (inscripcion) =>
          normalizarEstado(inscripcion.estado) !==
            'cancelada' &&
          !esFechaFutura(inscripcion.fechaActividad),
      );
    }

    if (filtroTiempo === 'canceladas') {
      lista = lista.filter(
        (inscripcion) =>
          normalizarEstado(inscripcion.estado) ===
          'cancelada',
      );
    }

    if (filtroTipo !== 'todas') {
      lista = lista.filter(
        (inscripcion) =>
          inscripcion.tipoActividad === filtroTipo,
      );
    }

    lista.sort((a, b) => {
      const fechaA = a.fechaInscripcion
        ? new Date(a.fechaInscripcion).getTime()
        : 0;

      const fechaB = b.fechaInscripcion
        ? new Date(b.fechaInscripcion).getTime()
        : 0;

      return fechaB - fechaA;
    });

    return lista;
  }, [inscripciones, filtroTipo, filtroTiempo]);

  const claseFiltro = (activo: boolean) =>
    `rounded-xl px-4 py-2 text-sm font-semibold transition-all duration-200 ${
      activo
        ? 'bg-[#095540] text-white shadow-md shadow-[#095540]/15 dark:bg-[#8dc63f] dark:text-[#071c16] dark:shadow-[#8dc63f]/10'
        : 'bg-slate-50 text-slate-600 hover:bg-[#eef7e7] hover:text-[#095540] dark:bg-white/5 dark:text-slate-300 dark:hover:bg-[#8dc63f]/10 dark:hover:text-[#b7e86c]'
    }`;

  return (
    <section className="min-h-screen overflow-x-clip bg-[#f5f7f1] px-4 py-8 font-sans transition-colors duration-300 dark:bg-[#071a15] sm:px-6 lg:px-10">
      <div className="mx-auto max-w-5xl">
        <div className="relative mb-6 overflow-hidden rounded-3xl border border-[#b9d6af] bg-[#fffef9]/95 px-6 py-6 text-[#073f31] shadow-[0_14px_34px_rgba(7,63,49,0.10)] backdrop-blur-md sm:px-8 sm:py-7 dark:border-white/10 dark:bg-emerald-950/40 dark:text-white">
          <div
            className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-[#8dc63f]/[0.12] blur-3xl"
            aria-hidden="true"
          />

          <div
            className="pointer-events-none absolute -bottom-24 -left-16 h-48 w-48 rounded-full bg-[#00AEEF]/[0.06] blur-3xl"
            aria-hidden="true"
          />

          <div className="relative">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#095540]/10 text-[#095540] dark:bg-white/[0.08] dark:text-white">
                <svg
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth="1.6"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 6.75V5.25A2.25 2.25 0 0 1 11.25 3h1.5A2.25 2.25 0 0 1 15 5.25v1.5m-9 0h12A2.25 2.25 0 0 1 20.25 9v9.75A2.25 2.25 0 0 1 18 21H6a2.25 2.25 0 0 1-2.25-2.25V9A2.25 2.25 0 0 1 6 6.75Zm0 4.5h12m-8.25 3h.008v.008H9.75v-.008Zm3 0h.008v.008h-.008v-.008Z"
                  />
                </svg>
              </div>

              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#095540] dark:text-emerald-200/65">
                  Área personal
                </p>

                <h1 className="mt-0.5 text-xl font-semibold tracking-tight text-[#073f31] sm:text-2xl dark:text-white">
                  Mis inscripciones
                </h1>
              </div>
            </div>

            <p className="mt-3 max-w-2xl text-[13px] leading-relaxed text-[#355448] dark:text-emerald-100/70 sm:text-sm">
              Consulta los eventos y capacitaciones en los que
              te has inscrito y revisa sus fechas, horarios y
              detalles.
            </p>

            <div className="mt-5 flex items-center gap-5">
              <div className="flex items-center gap-2.5">
                <span className="flex h-7 min-w-7 items-center justify-center rounded-lg bg-[#dff0c7] px-2 text-sm font-bold text-[#095540] dark:bg-[#8dc63f]/15 dark:text-[#c8ee8d]">
                  {totalProximas}
                </span>

                <div>
                  <p className="text-[11px] font-medium text-[#355448] dark:text-emerald-100/55">
                    Próximas
                  </p>
                </div>
              </div>

              <div className="h-6 w-px bg-[#b9d6af] dark:bg-white/10" />

              <div className="flex items-center gap-2.5">
                <span className="flex h-7 min-w-7 items-center justify-center rounded-lg bg-[#e4eee8] px-2 text-sm font-bold text-[#17372c] dark:bg-white/[0.08] dark:text-white/85">
                  {totalPasadas}
                </span>

                <div>
                  <p className="text-[11px] font-medium text-[#355448] dark:text-emerald-100/55">
                    Pasadas
                  </p>
                </div>
              </div>

              <div className="h-6 w-px bg-[#b9d6af] dark:bg-white/10" />

              <div className="flex items-center gap-2.5">
                <span className="flex h-7 min-w-7 items-center justify-center rounded-lg bg-rose-100 px-2 text-sm font-bold text-rose-700 dark:bg-rose-400/15 dark:text-rose-100">
                  {totalCanceladas}
                </span>

                <div>
                  <p className="text-[11px] font-medium text-[#355448] dark:text-emerald-100/55">
                    Canceladas
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {cargando && (
          <div className="rounded-3xl border border-emerald-100 bg-white p-12 text-center shadow-sm transition-colors dark:border-white/10 dark:bg-[#0d241d]">
            <div className="mx-auto mb-4 h-9 w-9 animate-spin rounded-full border-4 border-emerald-100 border-t-[#095540] dark:border-white/10 dark:border-t-[#8dc63f]" />

            <p className="text-sm font-semibold text-[#095540] dark:text-emerald-200">
              Cargando tus inscripciones…
            </p>

            <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
              Estamos preparando tu información.
            </p>
          </div>
        )}

        {!cargando && error && (
          <div
            className="rounded-3xl border border-rose-200 bg-white p-6 shadow-sm dark:border-rose-400/20 dark:bg-[#241317]"
            role="alert"
          >
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-500 dark:bg-rose-500/10 dark:text-rose-300">
                <svg
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth="1.8"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 9v3.75m0 3.75h.008v.008H12v-.008ZM21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
                  />
                </svg>
              </div>

              <div>
                <p className="text-sm font-bold text-rose-900 dark:text-rose-200">
                  No se pudo cargar la información
                </p>

                <p className="mt-1 text-sm text-rose-700 dark:text-rose-300">
                  {error}
                </p>
              </div>
            </div>
          </div>
        )}

        {!cargando && !error && (
          <div className="overflow-hidden rounded-[28px] border border-[#095540]/10 bg-white shadow-[0_16px_44px_rgba(9,85,64,0.07)] transition-colors dark:border-white/10 dark:bg-[#0d241d] dark:shadow-[0_16px_44px_rgba(0,0,0,0.25)]">
            <div className="border-b border-slate-100 px-5 py-5 dark:border-white/10 sm:px-7">
              <div className="flex flex-col gap-4">
                <div>
                  <h2 className="text-lg font-bold text-[#073f31] dark:text-white">
                    Tus actividades
                  </h2>

                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    Filtra tus inscripciones para encontrar
                    rápidamente una actividad.
                  </p>
                </div>

                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      className={claseFiltro(
                        filtroTiempo === 'proximas',
                      )}
                      onClick={() =>
                        setFiltroTiempo('proximas')
                      }
                    >
                      Próximas
                    </button>

                    <button
                      type="button"
                      className={claseFiltro(
                        filtroTiempo === 'pasadas',
                      )}
                      onClick={() =>
                        setFiltroTiempo('pasadas')
                      }
                    >
                      Pasadas
                    </button>

                    <button
                      type="button"
                      className={claseFiltro(
                        filtroTiempo === 'canceladas',
                      )}
                      onClick={() =>
                        setFiltroTiempo('canceladas')
                      }
                    >
                      Canceladas
                    </button>

                    <button
                      type="button"
                      className={claseFiltro(
                        filtroTiempo === 'todas',
                      )}
                      onClick={() =>
                        setFiltroTiempo('todas')
                      }
                    >
                      Todas
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      className={claseFiltro(
                        filtroTipo === 'todas',
                      )}
                      onClick={() =>
                        setFiltroTipo('todas')
                      }
                    >
                      Todo tipo
                    </button>

                    <button
                      type="button"
                      className={claseFiltro(
                        filtroTipo === 'evento',
                      )}
                      onClick={() =>
                        setFiltroTipo('evento')
                      }
                    >
                      Eventos
                    </button>

                    <button
                      type="button"
                      className={claseFiltro(
                        filtroTipo === 'capacitacion',
                      )}
                      onClick={() =>
                        setFiltroTipo('capacitacion')
                      }
                    >
                      Capacitaciones
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {registrosVisibles.length === 0 ? (
              <div className="px-6 py-16 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#00AEEF]/10 text-[#0087BA] dark:bg-[#00AEEF]/15 dark:text-[#67d5ff]">
                  <svg
                    className="h-7 w-7"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth="1.6"
                    stroke="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0ZM3.75 12h.007v.008H3.75V12Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm-.375 5.25h.007v.008H3.75v-.008Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z"
                    />
                  </svg>
                </div>

                <h3 className="mt-4 text-base font-bold text-slate-800 dark:text-white">
                  {filtroTiempo === 'proximas'
                    ? 'No tienes próximas inscripciones'
                    : filtroTiempo === 'canceladas'
                      ? 'No tienes reservas canceladas'
                      : 'No hay inscripciones para mostrar'}
                </h3>

                <p className="mx-auto mt-1 max-w-md text-sm leading-relaxed text-slate-500 dark:text-slate-400">
                  {filtroTiempo === 'proximas'
                    ? 'Cuando te inscribas a un evento o capacitación, aparecerá aquí.'
                    : filtroTiempo === 'canceladas'
                      ? 'Las reservas que canceles se conservarán en este historial.'
                      : 'Prueba cambiando los filtros para consultar otras actividades.'}
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-slate-100 dark:divide-white/10">
                {registrosVisibles.map((inscripcion) => {
                  const acentoTipo =
                    obtenerAcentoTipo(
                      inscripcion.tipoActividad,
                    );

                  const expandido =
                    expandidoId === inscripcion.id;

                  const tieneDetalle = Boolean(
                    inscripcion.descripcion ||
                      inscripcion.ubicacion ||
                      inscripcion.horaInicio,
                  );

                  const actividadPasada =
                    !esFechaFutura(
                      inscripcion.fechaActividad,
                    );

                  const estadoInscripcion =
                    normalizarEstado(inscripcion.estado);

                  const puedeCancelar =
                    !actividadPasada &&
                    (
                      estadoInscripcion === 'pendiente' ||
                      estadoInscripcion === 'confirmada' ||
                      estadoInscripcion === 'aprobada'
                    );

                  const puedeEditar =
                    !actividadPasada &&
                    estadoInscripcion === 'pendiente' &&
                    inscripcion.origen === 'reserva';

                  const textoEstado =
                    estadoInscripcion === 'cancelada'
                      ? 'Cancelada'
                      : estadoInscripcion === 'pendiente'
                        ? 'Pendiente'
                        : estadoInscripcion === 'aprobada'
                          ? 'Aprobada'
                          : estadoInscripcion === 'rechazada'
                            ? 'Rechazada'
                            : estadoInscripcion === 'confirmada'
                              ? 'Confirmada'
                              : inscripcion.estado ?? 'Estado';

                  return (
                    <li
                      key={inscripcion.id}
                      className="group px-5 py-5 transition-colors duration-200 hover:bg-[#f9fbf7] dark:hover:bg-white/[0.035] sm:px-7"
                    >
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div className="flex min-w-0 gap-4">
                          <div
                            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${acentoTipo.icono}`}
                          >
                            {inscripcion.tipoActividad ===
                            'capacitacion' ? (
                              <svg
                                className="h-5 w-5"
                                fill="none"
                                viewBox="0 0 24 24"
                                strokeWidth="1.7"
                                stroke="currentColor"
                                aria-hidden="true"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="M4.5 19.5h15M6.75 17.25V6.75A2.25 2.25 0 0 1 9 4.5h6a2.25 2.25 0 0 1 2.25 2.25v10.5M9 8.25h6M9 11.25h6M9 14.25h3"
                                />
                              </svg>
                            ) : (
                              <svg
                                className="h-5 w-5"
                                fill="none"
                                viewBox="0 0 24 24"
                                strokeWidth="1.7"
                                stroke="currentColor"
                                aria-hidden="true"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="M6.75 3.75h10.5A2.25 2.25 0 0 1 19.5 6v12a2.25 2.25 0 0 1-2.25 2.25H6.75A2.25 2.25 0 0 1 4.5 18V6a2.25 2.25 0 0 1 2.25-2.25ZM8.25 8.25h7.5M8.25 12h7.5m-7.5 3.75h4.5"
                                />
                              </svg>
                            )}
                          </div>

                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="truncate text-base font-bold text-[#095540] dark:text-emerald-200">
                                {inscripcion.nombreActividad}
                              </h3>

                              <span
                                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${acentoTipo.fondo} ${acentoTipo.borde} ${acentoTipo.texto}`}
                              >
                                <span
                                  className={`h-1.5 w-1.5 rounded-full ${acentoTipo.punto}`}
                                />

                                {formatearTipoActividad(
                                  inscripcion.tipoActividad,
                                )}
                              </span>

                              {inscripcion.estado && (
                                <span
                                  className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${
                                    estadoInscripcion ===
                                    'cancelada'
                                      ? 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-300/20 dark:bg-rose-500/10 dark:text-rose-200'
                                      : estadoInscripcion ===
                                          'rechazada'
                                        ? 'border-red-200 bg-red-50 text-red-700 dark:border-red-300/20 dark:bg-red-500/10 dark:text-red-200'
                                        : estadoInscripcion ===
                                            'pendiente'
                                          ? 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-300/20 dark:bg-amber-500/10 dark:text-amber-200'
                                          : 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-300/20 dark:bg-emerald-500/10 dark:text-emerald-200'
                                  }`}
                                >
                                  {textoEstado}
                                </span>
                              )}
                            </div>

                            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1.5 text-sm text-slate-500 dark:text-slate-400">
                              <span className="rounded-lg border border-sky-500/25 bg-sky-500/10 px-2.5 py-1 text-xs font-bold text-sky-700 dark:text-sky-300">
                                Nº de ticket: {inscripcion.numeroTicket ?? '#TKT-00000000'}
                              </span>
                              <span className="inline-flex items-center gap-1.5">
                                <svg
                                  className="h-4 w-4 text-slate-400 dark:text-slate-500"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  strokeWidth="1.7"
                                  stroke="currentColor"
                                  aria-hidden="true"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M6.75 3.75v2.25m10.5-2.25v2.25M3.75 9h16.5M5.25 5.25h13.5A1.5 1.5 0 0 1 20.25 6.75v11.5a1.5 1.5 0 0 1-1.5 1.5H5.25a1.5 1.5 0 0 1-1.5-1.5V6.75a1.5 1.5 0 0 1 1.5-1.5Z"
                                  />
                                </svg>

                                {formatearFechaActividad(
                                  inscripcion.fechaActividad,
                                )}
                              </span>

                              {inscripcion.horaInicio && (
                                <span className="inline-flex items-center gap-1.5">
                                  <svg
                                    className="h-4 w-4 text-slate-400 dark:text-slate-500"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    strokeWidth="1.7"
                                    stroke="currentColor"
                                    aria-hidden="true"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      d="M12 6v6l4 2.25M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
                                    />
                                  </svg>

                                  {inscripcion.horaInicio}

                                  {inscripcion.horaFin
                                    ? ` – ${inscripcion.horaFin}`
                                    : ''}
                                </span>
                              )}

                              {inscripcion.ubicacion && (
                                <span className="inline-flex items-center gap-1.5">
                                  <svg
                                    className="h-4 w-4 text-slate-400 dark:text-slate-500"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    strokeWidth="1.7"
                                    stroke="currentColor"
                                    aria-hidden="true"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
                                    />

                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      d="M19.5 10.5c0 5.25-7.5 10.5-7.5 10.5S4.5 15.75 4.5 10.5a7.5 7.5 0 1 1 15 0Z"
                                    />
                                  </svg>

                                  {inscripcion.ubicacion}
                                </span>
                              )}
                            </div>

                            <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">
                              Inscrito el{' '}
                              {formatearFechaActividad(
                                inscripcion.fechaInscripcion,
                              )}
                            </p>

                            {estadoInscripcion ===
                              'cancelada' && (
                              <p className="mt-1 text-xs font-medium text-rose-600 dark:text-rose-300">
                                Cancelada el{' '}
                                {formatearFechaActividad(
                                  inscripcion.fechaCancelacion,
                                )}
                              </p>
                            )}

                            {inscripcion.esPago && inscripcion.comprobanteUrl && (
                              <a
                                href={obtenerUrlComprobante(inscripcion.comprobanteUrl)}
                                target="_blank"
                                rel="noreferrer"
                                className="mt-3 inline-flex items-center gap-2 rounded-xl border border-sky-500/25 bg-sky-500/10 px-3 py-2 text-xs font-bold text-sky-800 transition hover:bg-sky-500/20 dark:text-sky-200"
                              >
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5v-9m0 0-3.5 3.5M12 7.5l3.5 3.5M5.25 15.75v2.5A1.75 1.75 0 0 0 7 20h10a1.75 1.75 0 0 0 1.75-1.75v-2.5" />
                                </svg>
                                Ver comprobante de pago
                              </a>
                            )}

                            {estadoInscripcion === 'rechazada' && inscripcion.motivoRechazo && (
                              <div className="mt-3 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2.5 text-sm text-rose-700 dark:text-rose-300">
                                <p><strong>Motivo del rechazo:</strong> {inscripcion.motivoRechazo}</p>
                                <p className="mt-1 text-xs">Puedes realizar una nueva reserva corrigiendo esta indicación.</p>
                              </div>
                            )}

                            {estadoInscripcion === 'rechazada' && inscripcion.esPago && inscripcion.origen === 'reserva' && !inscripcion.datosDevolucion && (
                              <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-400/30 bg-amber-500/10 px-3 py-2.5 text-sm text-amber-800 dark:text-amber-200">
                                <p>Tu pago requiere datos para gestionar la devolución.</p>
                                <button
                                  type="button"
                                  onClick={() => {
                                    limpiarDatosDevolucion();
                                    setReservaParaDevolucion(inscripcion);
                                  }}
                                  className="rounded-lg border border-amber-500/30 bg-white/70 px-3 py-1.5 text-xs font-bold text-amber-800 transition hover:bg-white dark:bg-slate-900/50 dark:text-amber-200"
                                >
                                  Ingresar datos de devolución
                                </button>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex shrink-0 flex-wrap gap-2">
                          {puedeEditar && (
                            <button
                              type="button"
                              onClick={() =>
                                void abrirEdicionReserva(
                                  inscripcion,
                                )
                              }
                              disabled={cargandoEdicion}
                              className="rounded-xl border border-[#095540]/20 bg-[#eef7e7] px-3.5 py-2 text-xs font-bold text-[#095540] transition hover:border-[#095540]/30 hover:bg-[#dff0c7] disabled:cursor-not-allowed disabled:opacity-60 dark:border-[#8dc63f]/20 dark:bg-[#8dc63f]/10 dark:text-[#b7e86c] dark:hover:bg-[#8dc63f]/15"
                            >
                              {cargandoEdicion
                                ? 'Cargando...'
                                : 'Editar reserva'}
                            </button>
                          )}

                          {puedeCancelar && (
                            <button
                              type="button"
                              onClick={() =>
                                setReservaACancelar(
                                  inscripcion,
                                )
                              }
                              className="rounded-xl border border-rose-300/80 bg-rose-50/70 px-3.5 py-2 text-xs font-bold text-rose-700 transition hover:bg-rose-100 dark:border-rose-300/20 dark:bg-rose-500/10 dark:text-rose-200 dark:hover:bg-rose-500/20"
                            >
                              Cancelar reserva
                            </button>
                          )}
                        </div>

                        {tieneDetalle && (
                          <button
                            type="button"
                            onClick={() =>
                              setExpandidoId(
                                expandido
                                  ? null
                                  : inscripcion.id,
                              )
                            }
                            className="flex shrink-0 items-center justify-center gap-2 rounded-xl border border-[#095540]/15 px-3.5 py-2 text-xs font-bold text-[#095540] transition-all duration-200 hover:border-[#095540]/30 hover:bg-[#eef7e7] dark:border-white/15 dark:text-[#b7e86c] dark:hover:border-[#8dc63f]/30 dark:hover:bg-[#8dc63f]/10"
                          >
                            {expandido
                              ? 'Ocultar'
                              : 'Ver detalle'}

                            <svg
                              className={`h-4 w-4 transition-transform duration-200 ${
                                expandido
                                  ? 'rotate-180'
                                  : ''
                              }`}
                              fill="none"
                              viewBox="0 0 24 24"
                              strokeWidth="2"
                              stroke="currentColor"
                              aria-hidden="true"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="m19.5 8.25-7.5 7.5-7.5-7.5"
                              />
                            </svg>
                          </button>
                        )}
                      </div>

                      {expandido && tieneDetalle && (
                        <div className="mt-4 rounded-2xl border border-[#095540]/8 bg-[#f7faf5] p-5 dark:border-white/10 dark:bg-[#091d17]">
                          {inscripcion.descripcion && (
                            <div>
                              <p className="text-xs font-bold uppercase tracking-wider text-[#095540]/60 dark:text-emerald-200/70">
                                Descripción
                              </p>

                              <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                                {inscripcion.descripcion}
                              </p>
                            </div>
                          )}

                          <dl className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-2">
                            {inscripcion.ubicacion && (
                              <div className="rounded-xl bg-white p-3.5 text-center shadow-sm dark:bg-white/[0.04] dark:shadow-none">
                                <dt className="text-xs font-medium text-slate-400 dark:text-slate-500">
                                  Ubicación
                                </dt>

                                <dd className="mt-1 text-sm font-semibold text-slate-700 dark:text-slate-200">
                                  {inscripcion.ubicacion}
                                </dd>
                              </div>
                            )}

                            {inscripcion.horaInicio && (
                              <div className="rounded-xl bg-white p-3.5 text-center shadow-sm dark:bg-white/[0.04] dark:shadow-none">
                                <dt className="text-xs font-medium text-slate-400 dark:text-slate-500">
                                  Horario
                                </dt>

                                <dd className="mt-1 text-sm font-semibold text-slate-700 dark:text-slate-200">
                                  {inscripcion.horaInicio}

                                  {inscripcion.horaFin
                                    ? ` – ${inscripcion.horaFin}`
                                    : ''}
                                </dd>
                              </div>
                            )}
                          </dl>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}

            {registrosVisibles.length > 0 && (
              <div className="border-t border-slate-100 bg-slate-50/60 px-5 py-3.5 dark:border-white/10 dark:bg-black/10 sm:px-7">
                <p className="text-xs font-medium text-slate-400 dark:text-slate-500">
                  Mostrando{' '}
                  <span className="font-bold text-slate-600 dark:text-slate-300">
                    {registrosVisibles.length}
                  </span>{' '}
                  de{' '}
                  <span className="font-bold text-slate-600 dark:text-slate-300">
                    {inscripciones.length}
                  </span>{' '}
                  inscripción
                  {inscripciones.length === 1 ? '' : 'es'}
                </p>
              </div>
            )}
          </div>
        )}

        {reservaAEditar && datosReservaAEditar && (
          <FormularioReserva
            evento={
              {
                id: reservaAEditar.eventoCapacitacionId,
                nombre: reservaAEditar.nombreActividad,
                edadMinima: null,
                edadMaxima: null,
              } as EventoCapacitacion
            }
            reservaInicial={datosReservaAEditar}
            onClose={() => {
              setReservaAEditar(null);
              setDatosReservaAEditar(null);
            }}
            onSuccess={() => {
              void cargarInscripciones();

              mostrarFeedback(
                'registro',
                'Reserva actualizada correctamente.',
              );
            }}
          />
        )}

        {reservaACancelar && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-[#071a15]/45 p-4 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
            aria-labelledby="titulo-cancelacion"
          >
            <div className="w-full max-w-md rounded-[28px] border border-white/60 bg-white/75 p-6 shadow-[0_22px_65px_rgba(7,63,49,0.3)] backdrop-blur-2xl dark:border-white/15 dark:bg-[#0d241d]/85">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-300">
                <svg
                  className="h-5 w-5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  aria-hidden="true"
                >
                  <path
                    d="M12 8v4m0 4h.01M10.3 3.9 2.8 17a2 2 0 0 0 1.7 3h15a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"
                    strokeLinecap="round"
                  />
                </svg>
              </div>

              <h2
                id="titulo-cancelacion"
                className="mt-4 text-lg font-bold text-[#073f31] dark:text-white"
              >
                ¿Está seguro de que desea cancelar esta
                reserva?
              </h2>

              <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                Se liberará un cupo de “
                {reservaACancelar.nombreActividad}”. La
                reserva permanecerá en su historial como
                cancelada.
              </p>
              {reservaACancelar.esPago && (
                <>
                  <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-300/20 dark:bg-amber-500/10 dark:text-amber-100">{reservaACancelar.politicasCancelacion || 'Las actividades de pago solo pueden cancelarse con al menos 48 horas de anticipación.'}</p>
                  {reservaACancelar.origen === 'reserva' && (
                    <div className="mt-3 rounded-2xl border border-white/20 bg-white/60 p-4 backdrop-blur-md dark:border-white/10 dark:bg-slate-900/60">
                      <p className="text-sm font-bold text-slate-800 dark:text-white">Datos para la devolución</p>
                      <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">Indica cómo debe procesarse la devolución si la cancelación cumple el plazo de 48 horas.</p>
                      {camposDevolucion()}
                    </div>
                  )}
                </>
              )}

              <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setReservaACancelar(null);
                    limpiarDatosDevolucion();
                  }}
                  disabled={cancelando}
                  className="rounded-xl px-4 py-2.5 text-sm font-bold text-slate-600 transition hover:bg-slate-100 disabled:opacity-50 dark:text-slate-300 dark:hover:bg-white/10"
                >
                  Volver
                </button>

                <button
                  type="button"
                  onClick={() =>
                    void confirmarCancelacion()
                  }
                  disabled={cancelando}
                  className="rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-rose-600/20 transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {cancelando
                    ? 'Cancelando…'
                    : 'Confirmar cancelación'}
                </button>
              </div>
            </div>
          </div>
        )}

        {reservaParaDevolucion && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="titulo-devolucion">
            <div className="w-full max-w-md rounded-[28px] border border-white/20 bg-white/80 p-6 shadow-xl backdrop-blur-md dark:bg-slate-900/80">
              <h2 id="titulo-devolucion" className="text-lg font-bold text-slate-900 dark:text-white">Datos para devolución</h2>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">Ingresa los datos para procesar la devolución de “{reservaParaDevolucion.nombreActividad}”.</p>
              {camposDevolucion()}
              <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button type="button" onClick={() => { setReservaParaDevolucion(null); limpiarDatosDevolucion(); }} disabled={guardandoDevolucion} className="rounded-xl px-4 py-2.5 text-sm font-bold text-slate-600 transition hover:bg-slate-100 disabled:opacity-50 dark:text-slate-300 dark:hover:bg-white/10">Cancelar</button>
                <button type="button" onClick={() => void guardarDevolucionRechazo()} disabled={guardandoDevolucion} className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-emerald-600/20 transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60">{guardandoDevolucion ? 'Guardando…' : 'Enviar datos'}</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
