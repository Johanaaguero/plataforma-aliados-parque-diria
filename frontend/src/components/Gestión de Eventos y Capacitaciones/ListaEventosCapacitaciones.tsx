import { useEffect, useMemo, useState } from 'react';
import RegistroEventoCapacitacion from './RegistroEventoCapacitacion';
import PortadaEventoCapacitacion from './Portadaeventocapacitacion';

interface EventoCapacitacion {
  id: number;
  nombre: string;
  descripcion: string;
  fecha: string;
  hora: string;
  lugar: string;
  tipoActividad: 'evento' | 'capacitacion';
  cupoMaximo: number | null;
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

type FiltroActividad = 'todos' | 'evento' | 'capacitacion';

function obtenerUrlBaseApi(): string {
  const url = import.meta.env.VITE_API_URL?.trim();

  if (!url) {
    throw new Error(
      'No se encontró VITE_API_URL en las variables de entorno.',
    );
  }

  return url.replace(/\/+$/, '');
}

export default function ListaEventosCapacitaciones({
  rolAutenticado,
}: ListaEventosCapacitacionesProps) {
  const [eventos, setEventos] = useState<EventoCapacitacion[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [mostrarRegistro, setMostrarRegistro] = useState(false);

  const [filtro, setFiltro] =
    useState<FiltroActividad>('todos');


  const esAdministrador =
    rolAutenticado === 'administrador';

  const urlBaseApi = obtenerUrlBaseApi();

  /*
   * ============================================================
   * CARGAR EVENTOS Y CAPACITACIONES
   * ============================================================
   */
 async function cargarDatos() {
  try {
    setCargando(true);
    setError(null);

    const respuesta = await fetch(
      `${urlBaseApi}/api/eventos-capacitaciones`,
      {
        headers: {
          Accept: 'application/json',
        },
      },
    );

    if (!respuesta.ok) {
      throw new Error(
        `Error al obtener los eventos. Código: ${respuesta.status}`,
      );
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
  /*
   * ============================================================
   * FORMATEAR FECHA
   * ============================================================
   */
  function formatearFecha(fecha: string) {
    const fechaLocal =
      new Date(`${fecha}T00:00:00`);

    return fechaLocal.toLocaleDateString(
      'es-CR',
      {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      },
    );
  }

  /*
   * ============================================================
   * FORMATEAR HORA
   * ============================================================
   */
  function formatearHora(hora: string) {
    if (!hora) return '';

    const [horas, minutos] =
      hora.split(':');

    const fecha = new Date();

    fecha.setHours(
      Number(horas),
      Number(minutos),
      0,
      0,
    );

    return fecha.toLocaleTimeString(
      'es-CR',
      {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      },
    );
  }

  /*
   * ============================================================
   * NOMBRE DEL TIPO
   * ============================================================
   */
  function obtenerNombreTipo(
    tipo: EventoCapacitacion['tipoActividad'],
  ) {
    return tipo === 'evento'
      ? 'Evento'
      : 'Capacitación';
  }

  /*
   * ============================================================
   * COLORES DEL TIPO
   * ============================================================
   */
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

  /*
   * ============================================================
   * ABRIR FORMULARIO
   * ============================================================
   *
   * Aunque el botón solamente se muestra al administrador,
   * también verificamos el rol antes de abrir el formulario.
   */
  function abrirRegistro() {
    if (!esAdministrador) {
      return;
    }

    setMostrarRegistro(true);
  }

  /*
   * ============================================================
   * FILTRADO
   * ============================================================
   */
  const eventosFiltrados = useMemo(() => {
    if (filtro === 'todos') {
      return eventos;
    }

    return eventos.filter(
      (evento) =>
        evento.tipoActividad === filtro,
    );
  }, [eventos, filtro]);

  /*
   * ============================================================
   * CANTIDADES
   * ============================================================
   */
  const cantidadEventos =
    eventos.filter(
      (evento) =>
        evento.tipoActividad === 'evento',
    ).length;

  const cantidadCapacitaciones =
    eventos.filter(
      (evento) =>
        evento.tipoActividad ===
        'capacitacion',
    ).length;

  /*
   * ============================================================
   * FORMULARIO DE REGISTRO
   * ============================================================
   */
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
  onClose={() => setMostrarRegistro(false)}
  onRegistrado={async () => {
    setMostrarRegistro(false);
    setFiltro('todos');
    await cargarDatos();
  }}
/>
      </>
    );
  }

  /*
   * ============================================================
   * VISTA PRINCIPAL
   * ============================================================
   */
  return (
    <section className="min-h-screen bg-[#f5f8f6] px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">

        {/* ======================================================
            ENCABEZADO
            ====================================================== */}

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
              Consulte las actividades, eventos y capacitaciones
              disponibles en el Parque Nacional Diriá.
            </p>
          </div>

          {/* ====================================================
              BOTÓN SOLO PARA ADMINISTRADOR
              ==================================================== */}

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

        {/* ======================================================
            FILTROS
            ====================================================== */}

        {!cargando &&
          !error &&
          eventos.length > 0 && (
            <div className="mb-8 flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">

              <div>
                <p className="text-sm font-semibold text-slate-800">
                  Actividades disponibles
                </p>

                <p className="mt-0.5 text-xs text-slate-500">
                  Filtre el contenido según el tipo de actividad.
                </p>
              </div>

              <div className="flex w-full overflow-x-auto rounded-xl border border-slate-200 bg-slate-50 p-1 sm:w-auto">

                {/* TODOS */}

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
                    {eventos.length}
                  </span>
                </button>

                {/* EVENTOS */}

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

                {/* CAPACITACIONES */}

                <button
                  type="button"
                  onClick={() =>
                    setFiltro(
                      'capacitacion',
                    )
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
                      filtro ===
                      'capacitacion'
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

        {/* ======================================================
            CARGANDO
            ====================================================== */}

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

        {/* ======================================================
            ERROR
            ====================================================== */}

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
              onClick={() =>
                window.location.reload()
              }
              className="mt-5 rounded-xl bg-[#095540] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#009444]"
            >
              Intentar nuevamente
            </button>
          </div>
        )}

        {/* ======================================================
            SIN REGISTROS
            ====================================================== */}

        {!cargando &&
          !error &&
          eventos.length === 0 && (
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
                No hay actividades registradas
              </h2>

              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                Actualmente no existen eventos o capacitaciones disponibles.
              </p>
            </div>
          )}

        {/* ======================================================
            SIN RESULTADOS DEL FILTRO
            ====================================================== */}

        {!cargando &&
          !error &&
          eventos.length > 0 &&
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
                No existen actividades correspondientes al filtro seleccionado.
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

        {/* ======================================================
            TARJETAS
            ====================================================== */}

        {!cargando &&
          !error &&
          eventosFiltrados.length > 0 && (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
              {eventosFiltrados.map((item) => {
                const colores =
                  obtenerColorTipo(
                    item.tipoActividad,
                  );

                return (
                  <article
                    key={item.id}
                    className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-slate-300 hover:shadow-xl"
                  >
                    {/* IMAGEN */}

                    <div className="relative">
                      <PortadaEventoCapacitacion
                        eventoId={item.id}
                        urlBaseApi={urlBaseApi}
                        colorAcento={
                          colores.fondo
                        }
                      />

                      {/* TIPO */}

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
                    </div>

                    {/* CONTENIDO */}

                    <div className="p-5">

                      {/* TÍTULO */}

                      <h2 className="line-clamp-2 min-h-[3.5rem] text-lg font-bold leading-7 text-[#095540] transition-colors duration-200 group-hover:text-[#009444]">
                        {item.nombre}
                      </h2>

                      {/* DESCRIPCIÓN */}

                      <p className="mt-2.5 line-clamp-2 min-h-[3rem] text-sm leading-6 text-slate-500">
                        {item.descripcion}
                      </p>

                      {/* INFORMACIÓN */}

                      <div className="mt-5 border-t border-slate-100 pt-5">

                        {/* FECHA + HORA */}

                        <div className="grid grid-cols-2 gap-4">

                          {/* FECHA */}

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

                          {/* HORA */}

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

                        {/* LUGAR */}

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
                              title={item.lugar}
                            >
                              {item.lugar}
                            </p>
                          </div>
                        </div>

                        {/* CAPACIDAD */}

                        {item.cupoMaximo !== null && (
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
                                Capacidad máxima
                              </span>
                            </div>

                            <span className="text-xs font-bold text-[#095540]">
                              {item.cupoMaximo}{' '}
                              personas
                            </span>
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
    </section>
  );
}