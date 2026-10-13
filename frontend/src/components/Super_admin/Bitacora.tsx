import { useEffect, useMemo, useState } from 'react';
import { api } from '../../services/api';
import LiquidFilterSelect from '../ui/LiquidFilterSelect';

interface UsuarioAuditoria {
  id: number;
  nombreUsuario: string;
  nombre: string;
  apellidos: string;
  correo: string;
}

interface RegistroBitacora {
  id: number;
  usuarioId: number | null;
  action: string;
  description: string | null;
  status: 'success' | 'failure' | 'blocked';
  details: string | null;
  createdAt: string;
  usuario: UsuarioAuditoria | null;
}

const obtenerEstadoHttp = (error: unknown): number | null => {
  if (
    typeof error !== 'object' ||
    error === null ||
    !('status' in error)
  ) {
    return null;
  }

  const status = (error as { status?: unknown }).status;

  return typeof status === 'number' ? status : null;
};

const formatearFecha = (valor: string): string => {
  const fecha = new Date(valor);

  if (Number.isNaN(fecha.getTime())) {
    return 'No disponible';
  }

  return new Intl.DateTimeFormat('es-CR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(fecha);
};

const formatearAccion = (accion: string): string => {
  const acciones: Record<string, string> = {
    LOGIN_SUCCESS: 'Inicio de sesión',
    LOGIN_FAILED: 'Inicio de sesión fallido',
    LOGIN_FAILED_BLOCKED: 'Cuenta bloqueada',
    LOGIN_BLOCKED: 'Acceso bloqueado',
    ACCOUNT_UNLOCKED: 'Desbloqueo de cuenta',
    CAMBIO_ROL: 'Cambio de rol',
    CREAR: 'Creación',
    MODIFICAR: 'Modificación',
    ELIMINAR: 'Eliminación',
    PUBLICAR: 'Publicación',
  };

  return acciones[accion] ?? accion;
};

const obtenerInformacion = (registro: RegistroBitacora): string => {
  if (!registro.details) {
    return registro.description ?? 'Sin información adicional';
  }

  try {
    const detalles = JSON.parse(registro.details) as Record<
      string,
      unknown
    >;

    const partes = Object.entries(detalles)
      .filter(([, valor]) => valor !== null && valor !== undefined)
      .map(([clave, valor]) => {
        const textoClave = clave
          .replace(/([A-Z])/g, ' $1')
          .replace(/^./, (letra) => letra.toUpperCase());

        return `${textoClave}: ${String(valor)}`;
      });

    return partes.length > 0
      ? partes.join(' | ')
      : registro.description ?? 'Sin información adicional';
  } catch {
    return registro.details;
  }
};

export default function Bitacora() {
  const [registros, setRegistros] = useState<RegistroBitacora[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [accion, setAccion] = useState('TODAS');
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let componenteActivo = true;

    const cargarBitacora = async () => {
      setCargando(true);
      setError('');

      try {
        const respuesta = await api.solicitar<RegistroBitacora[]>(
          '/admin/bitacora',
          { method: 'GET' },
          {
            mensajeError: 'No se pudo cargar la bitácora.',
          },
        );

        if (!Array.isArray(respuesta)) {
          throw new Error('La respuesta de la bitácora no es válida.');
        }

        if (componenteActivo) {
          setRegistros(respuesta);
        }
      } catch (errorSolicitud: unknown) {
        if (!componenteActivo) {
          return;
        }

        const status = obtenerEstadoHttp(errorSolicitud);

        setError(
          status === 401
            ? 'Debes iniciar sesión para consultar la bitácora.'
            : status === 403
              ? 'No tienes permisos para consultar la bitácora.'
              : 'No se pudo cargar la bitácora.',
        );
      } finally {
        if (componenteActivo) {
          setCargando(false);
        }
      }
    };

    void cargarBitacora();

    return () => {
      componenteActivo = false;
    };
  }, []);

  const accionesDisponibles = useMemo(() => {
    return Array.from(
      new Set(registros.map((registro) => registro.action)),
    );
  }, [registros]);

  const registrosFiltrados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();

    return registros.filter((registro) => {
      const coincideAccion =
        accion === 'TODAS' || registro.action === accion;

      const responsable = registro.usuario
        ? `${registro.usuario.nombreUsuario} ${registro.usuario.nombre} ${registro.usuario.apellidos} ${registro.usuario.correo}`
        : '';

      const informacion = obtenerInformacion(registro);

      const coincideBusqueda =
        !texto ||
        responsable.toLowerCase().includes(texto) ||
        registro.action.toLowerCase().includes(texto) ||
        (registro.description ?? '').toLowerCase().includes(texto) ||
        informacion.toLowerCase().includes(texto);

      return coincideAccion && coincideBusqueda;
    });
  }, [registros, busqueda, accion]);

  return (
    <main className="min-h-[calc(100vh-84px)] bg-[#f5f7f1] px-4 pb-16 pt-8 text-[#17372c] sm:px-6 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <header className="relative mb-8 overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#095540] via-[#095540] to-[#009444] px-5 py-8 text-white shadow-[0_24px_70px_rgba(9,85,64,0.20)] sm:px-10">
          <div
            className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-[#d9d823]/15 blur-3xl"
            aria-hidden="true"
          />

          <div
            className="pointer-events-none absolute -bottom-16 left-1/3 h-48 w-48 rounded-full bg-[#00AEEF]/10 blur-3xl"
            aria-hidden="true"
          />

          <div className="relative">
            <span className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3.5 py-1.5 text-xs font-bold uppercase tracking-[0.14em] text-emerald-50 backdrop-blur-md">
              <span className="h-2 w-2 rounded-full bg-[#d9d823]" />
              Super Admin
            </span>

            <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl">
              Bitácora administrativa
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-emerald-100/90 sm:text-base">
              Consulta las actividades administrativas realizadas en el sistema.
            </p>
          </div>
        </header>

        <section className="mb-6 rounded-3xl border border-[#095540]/10 bg-white p-4 shadow-[0_12px_35px_rgba(9,85,64,0.07)] sm:p-5">
          <div className="grid gap-4 md:grid-cols-[1fr_220px]">
            <div>
              <label
                htmlFor="busqueda-bitacora"
                className="mb-2 block text-xs font-bold uppercase tracking-[0.12em] text-[#095540]"
              >
                Buscar actividad
              </label>

              <input
                id="busqueda-bitacora"
                type="search"
                value={busqueda}
                onChange={(event) => setBusqueda(event.target.value)}
                placeholder="Usuario, acción o información"
                disabled={cargando}
                className="w-full rounded-2xl border border-[#095540]/15 bg-[#f7faf5] px-4 py-3 text-sm font-medium text-slate-800 outline-none placeholder:text-slate-400 transition focus:border-[#009444] focus:bg-white focus:ring-4 focus:ring-[#009444]/15 disabled:cursor-wait disabled:opacity-60"
              />
            </div>

            <div>
              <label
                htmlFor="filtro-accion"
                className="mb-2 block text-xs font-bold uppercase tracking-[0.12em] text-[#095540]"
              >
                Filtrar por acción
              </label>

              <LiquidFilterSelect
                id="filtro-accion"
                ariaLabel="Filtrar por acción"
                value={accion === 'TODAS' ? '' : accion}
                placeholder="Todas las acciones"
                disabled={cargando}
                onChange={(nextValue) => setAccion(nextValue || 'TODAS')}
                options={accionesDisponibles.map((item) => ({ value: item, label: formatearAccion(item) }))}
              />
            </div>
          </div>
        </section>

        {error && (
          <div
            className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3.5"
            role="alert"
          >
            <p className="text-sm font-bold text-red-800">{error}</p>
          </div>
        )}

        {cargando ? (
          <div className="rounded-3xl bg-white p-10 text-center shadow-[0_12px_35px_rgba(9,85,64,0.07)]">
            <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-emerald-100 border-t-[#009444]" />

            <p className="text-sm font-bold text-[#095540]">
              Cargando bitácora...
            </p>
          </div>
        ) : registrosFiltrados.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-[#009444]/20 bg-white p-10 text-center shadow-[0_12px_35px_rgba(9,85,64,0.07)]">
            <h2 className="text-lg font-extrabold text-[#095540]">
              No se encontraron registros
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              No hay actividades que coincidan con los filtros seleccionados.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-[2rem] border border-[#095540]/10 bg-white shadow-[0_18px_50px_rgba(9,85,64,0.09)]">
            <div className="flex flex-col gap-2 border-b border-slate-100 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-7">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#8dc63f]">
                  Auditoría
                </p>

                <h2 className="mt-1 text-xl font-extrabold tracking-tight text-[#073f31]">
                  Actividad registrada
                </h2>
              </div>

              <span className="inline-flex w-fit rounded-full border border-[#00AEEF]/20 bg-[#00AEEF]/10 px-3 py-1.5 text-xs font-bold text-[#0087BA]">
                {registrosFiltrados.length}{' '}
                {registrosFiltrados.length === 1
                  ? 'registro'
                  : 'registros'}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[1000px] border-collapse">
                <caption className="sr-only">
                  Registro de actividad administrativa
                </caption>

                <thead className="bg-gradient-to-r from-[#073f31] via-[#095540] to-[#08743f]">
                  <tr>
                    <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-[0.1em] text-white">
                      Responsable
                    </th>

                    <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-[0.1em] text-white">
                      Acción
                    </th>

                    <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-[0.1em] text-white">
                      Información
                    </th>

                    <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-[0.1em] text-white">
                      Fecha y hora
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {registrosFiltrados.map((registro) => (
                    <tr
                      key={registro.id}
                      className="transition-colors hover:bg-[#f7faf5]"
                    >
                      <td className="px-5 py-5 align-middle">
                        <p className="font-bold text-[#095540]">
                          {registro.usuario?.nombreUsuario ??
                            'Usuario no disponible'}
                        </p>

                        {registro.usuario && (
                          <p className="mt-1 text-xs text-slate-500">
                            {registro.usuario.nombre}{' '}
                            {registro.usuario.apellidos}
                          </p>
                        )}
                      </td>

                      <td className="px-5 py-5 align-middle">
                        <span className="inline-flex rounded-full border border-[#8dc63f]/30 bg-[#8dc63f]/10 px-3 py-1.5 text-xs font-bold text-[#568000]">
                          {formatearAccion(registro.action)}
                        </span>
                      </td>

                      <td className="max-w-[430px] px-5 py-5 align-middle">
                        <p className="text-sm font-semibold text-slate-700">
                          {registro.description ?? 'Sin descripción'}
                        </p>

                        <p className="mt-1 text-xs leading-5 text-slate-500">
                          {obtenerInformacion(registro)}
                        </p>
                      </td>

                      <td className="whitespace-nowrap px-5 py-5 align-middle text-sm font-medium text-slate-600">
                        {formatearFecha(registro.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
