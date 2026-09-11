import { useEffect, useMemo, useState } from 'react';
import { obtenerInscripcionesAdministrativas, type InscripcionAdministrativa } from '../../services/inscripcionesAdminService';

const formatearFecha = (valor: string | null | undefined): string => {
  if (!valor) {
    return 'Sin fecha';
  }

  const fecha = new Date(valor);

  if (Number.isNaN(fecha.getTime())) {
    return 'Sin fecha';
  }

  return new Intl.DateTimeFormat('es-CR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(fecha);
};

const formatearTipoActividad = (tipo: string): string => {
  if (tipo === 'evento') {
    return 'Evento';
  }

  if (tipo === 'capacitacion') {
    return 'Capacitación';
  }

  return tipo;
};

export default function InscripcionesAdmin() {
  const [inscripciones, setInscripciones] = useState<InscripcionAdministrativa[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let activo = true;

    const cargarInscripciones = async () => {
      setCargando(true);
      setError('');

      try {
        const datos = await obtenerInscripcionesAdministrativas();

        if (!Array.isArray(datos)) {
          throw new Error('La respuesta de inscripciones no es válida.');
        }

        if (activo) {
          setInscripciones(datos);
        }
      } catch (errorSolicitud: unknown) {
        if (!activo) {
          return;
        }

        const status =
          typeof errorSolicitud === 'object' &&
          errorSolicitud !== null &&
          'status' in errorSolicitud
            ? Number((errorSolicitud as { status?: number }).status)
            : null;

        setError(
          status === 403
            ? 'No tienes permisos para realizar esta acción.'
            : 'No se pudieron cargar las inscripciones.',
        );
      } finally {
        if (activo) {
          setCargando(false);
        }
      }
    };

    void cargarInscripciones();

    return () => {
      activo = false;
    };
  }, []);

  const totalInscripciones = inscripciones.length;

  const registros = useMemo(
    () =>
      inscripciones.map((inscripcion) => ({
        ...inscripcion,
        fechaActividadFormateada: formatearFecha(inscripcion.fechaActividad),
        fechaInscripcionFormateada: formatearFecha(inscripcion.fechaInscripcion),
      })),
    [inscripciones],
  );

  return (
    <section className="min-h-screen overflow-x-clip bg-[#f5f7f1] px-4 py-8 font-sans sm:px-6 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <div className="relative mb-8 overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#095540] via-[#095540] to-[#009444] px-5 py-8 text-white shadow-[0_24px_70px_rgba(9,85,64,0.20)] sm:px-10">
          <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-[#d9d823]/15 blur-3xl" aria-hidden="true" />
          <div className="pointer-events-none absolute -bottom-16 left-1/3 h-48 w-48 rounded-full bg-[#00AEEF]/10 blur-3xl" aria-hidden="true" />

          <div className="relative">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-emerald-50 backdrop-blur-md">
              <span className="h-2 w-2 rounded-full bg-[#d9d823]" />
              Inscripciones
            </div>

            <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl">
              Personas inscritas
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-emerald-100/90 sm:text-base">
              Consulta todas las personas inscritas en eventos y capacitaciones del sistema.
            </p>
          </div>
        </div>

        {cargando && (
          <div className="mb-6 rounded-3xl border border-emerald-100 bg-white p-8 text-center shadow-sm">
            <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-emerald-100 border-t-emerald-800" />
            <p className="text-sm font-semibold text-emerald-900">
              Cargando inscripciones...
            </p>
          </div>
        )}

        {!cargando && error && (
          <div className="mb-6 rounded-3xl border border-rose-200 bg-rose-50 p-4 shadow-sm" role="alert">
            <p className="text-sm font-semibold text-rose-900">{error}</p>
          </div>
        )}

        {!cargando && !error && (
          <div className="overflow-hidden rounded-[2rem] border border-[#095540]/10 bg-white shadow-[0_18px_50px_rgba(9,85,64,0.09)]">
            <div className="flex flex-col gap-2 border-b border-slate-100 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-7">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#8dc63f]">
                  Registro administrativo
                </p>
                <h2 className="mt-1 text-xl font-extrabold tracking-tight text-[#073f31]">
                  Inscripciones realizadas
                </h2>
              </div>

              <span className="inline-flex w-fit rounded-full border border-[#00AEEF]/20 bg-[#00AEEF]/10 px-3 py-1.5 text-xs font-bold text-[#0087BA]">
                {totalInscripciones} registro{totalInscripciones === 1 ? '' : 's'}
              </span>
            </div>

            {registros.length === 0 ? (
              <div className="px-6 py-16 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#00AEEF]/10 text-[#0087BA]">
                  <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" strokeWidth="1.6" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15L15 9.75M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" />
                  </svg>
                </div>
                <h3 className="mt-4 text-base font-bold text-slate-800">No hay inscripciones registradas</h3>
                <p className="mt-1 text-sm text-slate-500">Todavía no existen registros para mostrar en esta vista.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1100px] border-collapse">
                  <caption className="sr-only">Listado de inscripciones</caption>
                  <thead className="bg-gradient-to-r from-[#073f31] via-[#095540] to-[#08743f]">
                    <tr className="text-left text-xs font-bold uppercase tracking-[0.1em] text-white">
                      <th className="px-5 py-4 sm:px-6">Usuario</th>
                      <th className="px-5 py-4 sm:px-6">Usuario</th>
                      <th className="px-5 py-4 sm:px-6">Correo</th>
                      <th className="px-5 py-4 sm:px-6">Actividad</th>
                      <th className="px-5 py-4 sm:px-6">Tipo</th>
                      <th className="px-5 py-4 sm:px-6">Fecha actividad</th>
                      <th className="px-5 py-4 sm:px-6">Fecha inscripción</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {registros.map((inscripcion) => (
                      <tr key={inscripcion.id} className="group transition-colors duration-200 hover:bg-[#f7faf5]">
                        <td className="px-5 py-5 sm:px-6">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#009444]/10 to-[#8dc63f]/20 text-sm font-extrabold text-[#095540] ring-1 ring-emerald-100">
                              {inscripcion.nombreCompleto?.charAt(0)?.toUpperCase() ?? '?'}
                            </div>
                            <div>
                              <p className="font-bold text-[#095540]">{inscripcion.nombreCompleto || 'Sin nombre'}</p>
                              <p className="mt-0.5 text-xs text-slate-400">ID #{inscripcion.usuarioId}</p>
                            </div>
                          </div>
                        </td>

                        <td className="px-5 py-5 sm:px-6">
                          <p className="text-sm font-semibold text-slate-700">{inscripcion.nombreUsuario}</p>
                        </td>

                        <td className="px-5 py-5 sm:px-6">
                          <p className="max-w-[240px] truncate text-sm text-slate-600" title={inscripcion.correo}>
                            {inscripcion.correo}
                          </p>
                        </td>

                        <td className="px-5 py-5 sm:px-6">
                          <p className="max-w-[240px] truncate text-sm font-semibold text-slate-700" title={inscripcion.nombreActividad}>
                            {inscripcion.nombreActividad}
                          </p>
                        </td>

                        <td className="px-5 py-5 sm:px-6">
                          <span className="inline-flex items-center gap-2 rounded-full border border-[#8dc63f]/25 bg-[#8dc63f]/10 px-3 py-1.5 text-xs font-bold text-[#567d16]">
                            <span className="h-2 w-2 rounded-full bg-[#8dc63f]" />
                            {formatearTipoActividad(inscripcion.tipoActividad)}
                          </span>
                        </td>

                        <td className="px-5 py-5 sm:px-6">
                          <p className="text-sm font-medium text-slate-700">{inscripcion.fechaActividadFormateada}</p>
                        </td>

                        <td className="px-5 py-5 sm:px-6">
                          <p className="text-sm font-medium text-slate-700">{inscripcion.fechaInscripcionFormateada}</p>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
