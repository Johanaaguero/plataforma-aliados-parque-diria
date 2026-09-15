import { useEffect, useMemo, useState } from 'react';
import { obtenerInscripcionesAdministrativas, type InscripcionAdministrativa } from '../../services/inscripcionesAdminService';

type FiltroTemporal = 'todos' | 'proximos' | 'pasados';

const formatearFecha = (valor: string | null | undefined): string => {
  if (!valor) return 'Sin fecha';
  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) return 'Sin fecha';

  return new Intl.DateTimeFormat('es-CR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(fecha);
};

const formatearTipoActividad = (tipo: string): string => {
  if (tipo === 'evento') return 'Evento';
  if (tipo === 'capacitacion') return 'Capacitación';
  return tipo;
};

// Configuración de insignias sobrias por tipo de actividad (claro/oscuro)
const acentoPorTipo: Record<string, { fondo: string; texto: string; borde: string }> = {
  evento: {
    fondo: 'bg-sky-50 dark:bg-sky-950/40',
    texto: 'text-sky-700 dark:text-sky-300',
    borde: 'border-sky-200/60 dark:border-sky-800/60',
  },
  capacitacion: {
    fondo: 'bg-[#8dc63f]/10 dark:bg-[#8dc63f]/15',
    texto: 'text-[#486812] dark:text-[#a3d977]',
    borde: 'border-[#8dc63f]/30 dark:border-[#8dc63f]/25',
  },
};

const obtenerAcento = (tipo: string) =>
  acentoPorTipo[tipo] ?? {
    fondo: 'bg-slate-50 dark:bg-white/5',
    texto: 'text-slate-600 dark:text-emerald-100/70',
    borde: 'border-slate-200 dark:border-white/10',
  };

export default function InscripcionesAdmin() {
  const [inscripciones, setInscripciones] = useState<InscripcionAdministrativa[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [filtroTemporal, setFiltroTemporal] = useState<FiltroTemporal>('todos');

  useEffect(() => {
    let activo = true;

    const cargarInscripciones = async () => {
      setCargando(true);
      setError('');

      try {
        const datos = await obtenerInscripcionesAdministrativas();
        if (!Array.isArray(datos)) throw new Error('La respuesta de inscripciones no es válida.');

        if (activo) setInscripciones(datos);
      } catch (errorSolicitud: unknown) {
        if (!activo) return;

        const status =
          typeof errorSolicitud === 'object' &&
          errorSolicitud !== null &&
          'status' in errorSolicitud
            ? Number((errorSolicitud as { status?: number }).status)
            : null;

        setError(
          status === 403
            ? 'No tienes permisos para consultar la información.'
            : 'No se pudieron obtener las inscripciones.',
        );
      } finally {
        if (activo) setCargando(false);
      }
    };

    void cargarInscripciones();

    return () => {
      activo = false;
    };
  }, []);

  const registros = useMemo(
    () =>
      inscripciones.map((inscripcion) => {
        let esProximo = false;

        if (inscripcion.fechaActividad) {
          const fechaAct = new Date(inscripcion.fechaActividad);
          const hoy = new Date();
          hoy.setHours(0, 0, 0, 0);
          esProximo = fechaAct.getTime() >= hoy.getTime();
        }

        return {
          ...inscripcion,
          esProximo,
          fechaActividadFormateada: formatearFecha(inscripcion.fechaActividad),
          fechaInscripcionFormateada: formatearFecha(inscripcion.fechaInscripcion),
        };
      }),
    [inscripciones],
  );

  const registrosFiltrados = useMemo(() => {
    const termino = busqueda.trim().toLowerCase();

    return registros.filter((registro) => {
      if (filtroTemporal === 'proximos' && !registro.esProximo) return false;
      if (filtroTemporal === 'pasados' && registro.esProximo) return false;

      if (!termino) return true;

      return [registro.nombreCompleto, registro.nombreUsuario, registro.correo, registro.nombreActividad]
        .filter(Boolean)
        .some((campo) => campo!.toLowerCase().includes(termino));
    });
  }, [registros, busqueda, filtroTemporal]);

  const totalInscripciones = registros.length;
  const totalEventos = useMemo(() => registros.filter((r) => r.tipoActividad === 'evento').length, [registros]);
  const totalCapacitaciones = useMemo(() => registros.filter((r) => r.tipoActividad === 'capacitacion').length, [registros]);
  const totalProximos = useMemo(() => registros.filter((r) => r.esProximo).length, [registros]);
  const totalPasados = useMemo(() => registros.filter((r) => !r.esProximo).length, [registros]);

  return (
    <section className="min-h-screen bg-[#F8FAFC] dark:bg-[#070d0a] px-4 py-8 font-sans text-slate-800 dark:text-emerald-50/90 sm:px-6 lg:px-10 transition-colors">
      <div className="mx-auto max-w-7xl">

        {/* Encabezado elegante con gradiente suave */}
        <header className="relative mb-8 overflow-hidden rounded-3xl border border-white/20 bg-white/70 p-6 text-[#073f31] shadow-lg shadow-black/5 backdrop-blur-md dark:border-white/10 dark:bg-emerald-950/40 dark:text-white sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-xl">
              <span className="inline-block rounded-full border border-[#8dc63f]/35 bg-[#8dc63f]/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-[#095540] backdrop-blur-md dark:text-[#c8ee8d]">
                Panel de Administración
              </span>
              <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
                Gestión de Inscritos
              </h1>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                Supervisa y filtra las inscripciones registradas en capacitaciones y eventos.
              </p>
            </div>

            {/* Módulo de Resumen Breve */}
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-xl border border-[#095540]/10 bg-white/50 px-4 py-3 text-center backdrop-blur-md dark:border-white/10 dark:bg-white/[0.06]">
                <span className="block text-xs font-medium text-slate-500 dark:text-emerald-100/70">Total</span>
                <span className="text-xl font-bold tracking-tight text-[#095540] dark:text-white">{totalInscripciones}</span>
              </div>
              <div className="rounded-xl border border-[#095540]/10 bg-white/50 px-4 py-3 text-center backdrop-blur-md dark:border-white/10 dark:bg-white/[0.06]">
                <span className="block text-xs font-medium text-slate-500 dark:text-emerald-100/70">Eventos</span>
                <span className="text-xl font-bold tracking-tight text-[#095540] dark:text-white">{totalEventos}</span>
              </div>
              <div className="rounded-xl border border-[#095540]/10 bg-white/50 px-4 py-3 text-center backdrop-blur-md dark:border-white/10 dark:bg-white/[0.06]">
                <span className="block text-xs font-medium text-slate-500 dark:text-emerald-100/70">Capacitaciones</span>
                <span className="text-xl font-bold tracking-tight text-[#095540] dark:text-white">{totalCapacitaciones}</span>
              </div>
            </div>
          </div>
        </header>

        {/* Estado: Cargando */}
        {cargando && (
          <div className="mb-6 flex flex-col items-center justify-center rounded-2xl border border-slate-200 dark:border-emerald-900/40 bg-white dark:bg-[#0b1512] p-12 text-center shadow-sm">
            <div className="h-8 w-8 animate-spin rounded-full border-3 border-slate-200 dark:border-emerald-900/50 border-t-[#073f31] dark:border-t-[#8dc63f]" />
            <p className="mt-3 text-sm font-medium text-slate-600 dark:text-emerald-100/70">Cargando registros…</p>
          </div>
        )}

        {/* Estado: Error */}
        {!cargando && error && (
          <div className="mb-6 flex items-center gap-3 rounded-xl border border-rose-200 dark:border-rose-900/50 bg-rose-50/70 dark:bg-rose-950/30 p-4 text-rose-800 dark:text-rose-300 shadow-sm" role="alert">
            <svg className="h-5 w-5 shrink-0 text-rose-500 dark:text-rose-400" fill="none" viewBox="0 0 24 24" strokeWidth="1.8" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m0 3.75h.008v.008H12v-.008ZM21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
            <p className="text-sm font-medium">{error}</p>
          </div>
        )}

        {/* Tabla y Controles */}
        {!cargando && !error && (
          <div className="rounded-2xl border border-slate-200/80 dark:border-emerald-900/40 bg-white dark:bg-[#0b1512] shadow-sm">

            {/* Barra de Herramientas (Filtros + Buscador) */}
            <div className="flex flex-col gap-4 border-b border-slate-100 dark:border-emerald-900/30 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">

              {/* Selector tipo Píldora */}
              <div className="inline-flex rounded-lg border border-slate-200/80 dark:border-emerald-900/40 bg-slate-50 dark:bg-[#0d1a16] p-1">
                {(['todos', 'proximos', 'pasados'] as const).map((tipo) => {
                  const titulos = { todos: `Todos (${totalInscripciones})`, proximos: `Próximos (${totalProximos})`, pasados: `Pasados (${totalPasados})` };
                  const activo = filtroTemporal === tipo;
                  return (
                    <button
                      key={tipo}
                      type="button"
                      onClick={() => setFiltroTemporal(tipo)}
                      className={`rounded-md px-3.5 py-1.5 text-xs font-medium transition-all ${
                        activo
                          ? 'bg-white dark:bg-[#123024] text-slate-900 dark:text-[#b6e26a] shadow-sm'
                          : 'text-slate-500 dark:text-emerald-100/50 hover:text-slate-700 dark:hover:text-emerald-100/80'
                      }`}
                    >
                      {titulos[tipo]}
                    </button>
                  );
                })}
              </div>

              {/* Caja de Búsqueda estilizada */}
              <div className="relative w-full sm:w-72">
                <svg className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-emerald-700" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                </svg>
                <input
                  type="text"
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  placeholder="Buscar participante o actividad..."
                  className="w-full rounded-lg border border-slate-200 dark:border-emerald-900/40 bg-white dark:bg-[#0d1a16] py-2 pl-9 pr-3 text-xs text-slate-700 dark:text-emerald-50 placeholder:text-slate-400 dark:placeholder:text-emerald-800 focus:border-[#073f31] dark:focus:border-[#8dc63f] focus:outline-none focus:ring-1 focus:ring-[#073f31] dark:focus:ring-[#8dc63f]/60"
                />
              </div>
            </div>

            {/* Estado Vacío */}
            {registrosFiltrados.length === 0 ? (
              <div className="p-12 text-center">
                <p className="text-sm font-medium text-slate-700 dark:text-emerald-100/80">No se encontraron resultados</p>
                <p className="mt-1 text-xs text-slate-400 dark:text-emerald-800">Intenta ajustar la búsqueda o los criterios de filtrado.</p>
              </div>
            ) : (
              /* Tabla limpia */
              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px] border-collapse text-left">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-emerald-900/30 bg-slate-50/50 dark:bg-[#0d1a16]/60 text-[11px] font-semibold tracking-wider text-slate-400 dark:text-emerald-700 uppercase">
                      <th className="py-3 px-5">Participante</th>
                      <th className="py-3 px-5">Usuario</th>
                      <th className="py-3 px-5">Correo</th>
                      <th className="py-3 px-5">Actividad</th>
                      <th className="py-3 px-5">Tipo</th>
                      <th className="py-3 px-5">Fecha Actividad</th>
                      <th className="py-3 px-5">Fecha Inscripción</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100 dark:divide-emerald-900/20 text-xs text-slate-600 dark:text-emerald-100/70">
                    {registrosFiltrados.map((inscripcion) => {
                      const acento = obtenerAcento(inscripcion.tipoActividad);

                      return (
                        <tr key={inscripcion.id} className="hover:bg-slate-50/60 dark:hover:bg-emerald-950/30 transition-colors">
                          {/* Columna Participante + Avatar Suave */}
                          <td className="py-3.5 px-5">
                            <div className="flex items-center gap-3">
                              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 dark:bg-[#123024] text-xs font-semibold text-slate-600 dark:text-[#b6e26a]">
                                {inscripcion.nombreCompleto?.charAt(0)?.toUpperCase() ?? '?'}
                              </div>
                              <div className="min-w-0">
                                <p className="font-medium text-slate-900 dark:text-emerald-50 truncate">{inscripcion.nombreCompleto || 'Sin nombre'}</p>
                              </div>
                            </div>
                          </td>

                          <td className="py-3.5 px-5 font-mono text-[11px] text-slate-500 dark:text-emerald-100/50">{inscripcion.nombreUsuario}</td>

                          <td className="py-3.5 px-5">
                            <span className="block max-w-[180px] truncate text-slate-600 dark:text-emerald-100/60" title={inscripcion.correo}>
                              {inscripcion.correo}
                            </span>
                          </td>

                          <td className="py-3.5 px-5">
                            <span className="block max-w-[200px] truncate font-medium text-slate-700 dark:text-emerald-100/80" title={inscripcion.nombreActividad}>
                              {inscripcion.nombreActividad}
                            </span>
                          </td>

                          {/* Tipo de Actividad Badge */}
                          <td className="py-3.5 px-5">
                            <span className={`inline-block rounded-md border px-2.5 py-0.5 text-[11px] font-medium ${acento.fondo} ${acento.borde} ${acento.texto}`}>
                              {formatearTipoActividad(inscripcion.tipoActividad)}
                            </span>
                          </td>

                          {/* Fecha Actividad + Pill Próximo/Pasado */}
                          <td className="py-3.5 px-5">
                            <div className="flex items-center gap-2">
                              <span>{inscripcion.fechaActividadFormateada}</span>
                              {inscripcion.fechaActividad && (
                                <span
                                  className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                                    inscripcion.esProximo
                                      ? 'bg-emerald-50 dark:bg-[#123024] text-emerald-700 dark:text-[#b6e26a] border border-emerald-200/60 dark:border-[#8dc63f]/20'
                                      : 'bg-slate-100 dark:bg-white/5 text-slate-400 dark:text-emerald-100/40 border border-slate-200/60 dark:border-white/10'
                                  }`}
                                >
                                  {inscripcion.esProximo ? 'Próximo' : 'Pasado'}
                                </span>
                              )}
                            </div>
                          </td>

                          <td className="py-3.5 px-5 text-slate-400 dark:text-emerald-100/40">{inscripcion.fechaInscripcionFormateada}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pie de tabla */}
            {registrosFiltrados.length > 0 && (
              <div className="border-t border-slate-100 dark:border-emerald-900/30 bg-slate-50/40 dark:bg-[#0d1a16]/50 px-5 py-3 text-[11px] text-slate-400 dark:text-emerald-800">
                Mostrando {registrosFiltrados.length} de {totalInscripciones} registros
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
