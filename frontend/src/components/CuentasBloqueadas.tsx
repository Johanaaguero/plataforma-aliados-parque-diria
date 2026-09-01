import { useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../services/api';

interface CuentaBloqueada {
  id: number;
  nombreUsuario: string;
  correo: string;
  intentosFallidos: number;
  fechaUltimoIntento: string | null;
  bloqueadoHasta: string;
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

const formatearFecha = (valor: string | null): string => {
  if (!valor) {
    return 'Sin registro';
  }

  const fecha = new Date(valor);

  if (Number.isNaN(fecha.getTime())) {
    return 'No disponible';
  }

  return new Intl.DateTimeFormat('es-CR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(fecha);
};

export default function CuentasBloqueadas() {
  const [cuentas, setCuentas] = useState<CuentaBloqueada[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [mensajeExito, setMensajeExito] = useState('');

  const [cuentaSeleccionada, setCuentaSeleccionada] =
    useState<CuentaBloqueada | null>(null);

  const [desbloqueando, setDesbloqueando] = useState(false);

  const botonCancelarRef = useRef<HTMLButtonElement>(null);
  const modalContenidoRef = useRef<HTMLDivElement>(null);
  const ultimoDisparadorRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    let componenteActivo = true;

    const cargarCuentas = async () => {
      setCargando(true);
      setError('');

      try {
        const cuentasBloqueadas = await api.solicitar<CuentaBloqueada[]>(
          '/admin/cuentas-bloqueadas',
          { method: 'GET' },
          {
            mensajeError:
              'No se pudieron cargar las cuentas bloqueadas.',
          }
        );

        if (!Array.isArray(cuentasBloqueadas)) {
          throw new Error(
            'La respuesta de cuentas bloqueadas no es válida.'
          );
        }

        if (componenteActivo) {
          setCuentas(cuentasBloqueadas);
        }
      } catch (errorSolicitud: unknown) {
        if (!componenteActivo) {
          return;
        }

        const status = obtenerEstadoHttp(errorSolicitud);

        if (status === 401) {
          return;
        }

        setError(
          status === 403
            ? 'No tienes permisos para realizar esta acción.'
            : 'No se pudieron cargar las cuentas bloqueadas.'
        );
      } finally {
        if (componenteActivo) {
          setCargando(false);
        }
      }
    };

    void cargarCuentas();

    return () => {
      componenteActivo = false;
    };
  }, []);

  useEffect(() => {
    if (!cuentaSeleccionada) {
      return;
    }

    const ultimoDisparador = ultimoDisparadorRef.current;

    const animacion = window.requestAnimationFrame(() => {
      botonCancelarRef.current?.focus();
    });

    return () => {
      window.cancelAnimationFrame(animacion);

      window.requestAnimationFrame(() => {
        if (ultimoDisparador?.isConnected) {
          ultimoDisparador.focus();
        }
      });
    };
  }, [cuentaSeleccionada]);

  useEffect(() => {
    if (!cuentaSeleccionada) {
      return;
    }

    const manejarTecladoDelModal = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !desbloqueando) {
        setCuentaSeleccionada(null);
        return;
      }

      if (event.key !== 'Tab') {
        return;
      }

      const elementos =
        modalContenidoRef.current?.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );

      if (!elementos || elementos.length === 0) {
        event.preventDefault();
        return;
      }

      const primero = elementos[0];
      const ultimo = elementos[elementos.length - 1];

      if (
        event.shiftKey &&
        document.activeElement === primero
      ) {
        event.preventDefault();
        ultimo?.focus();
      } else if (
        !event.shiftKey &&
        document.activeElement === ultimo
      ) {
        event.preventDefault();
        primero?.focus();
      }
    };

    document.addEventListener(
      'keydown',
      manejarTecladoDelModal
    );

    return () => {
      document.removeEventListener(
        'keydown',
        manejarTecladoDelModal
      );
    };
  }, [cuentaSeleccionada, desbloqueando]);

  const cuentasFiltradas = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();

    if (!texto) {
      return cuentas;
    }

    return cuentas.filter(
      (cuenta) =>
        cuenta.nombreUsuario.toLowerCase().includes(texto) ||
        cuenta.correo.toLowerCase().includes(texto)
    );
  }, [busqueda, cuentas]);

  const confirmarDesbloqueo = async () => {
    if (!cuentaSeleccionada || desbloqueando) {
      return;
    }

    const cuenta = cuentaSeleccionada;

    setDesbloqueando(true);
    setError('');
    setMensajeExito('');

    try {
      await api.solicitar<unknown>(
        `/admin/usuarios/${cuenta.id}/desbloquear`,
        { method: 'POST' },
        {
          mensajeError: 'No se pudo desbloquear la cuenta.',
        }
      );

      setCuentas((cuentasActuales) =>
        cuentasActuales.filter(
          (cuentaActual) =>
            cuentaActual.id !== cuenta.id
        )
      );

      setCuentaSeleccionada(null);

      setMensajeExito(
        `La cuenta de ${cuenta.nombreUsuario} fue desbloqueada.`
      );
    } catch (errorSolicitud: unknown) {
      const status = obtenerEstadoHttp(errorSolicitud);

      if (status === 401) {
        return;
      }

      if (status === 404) {
        setCuentas((cuentasActuales) =>
          cuentasActuales.filter(
            (cuentaActual) =>
              cuentaActual.id !== cuenta.id
          )
        );
      }

      setCuentaSeleccionada(null);

      setError(
        status === 403
          ? 'No tienes permisos para realizar esta acción.'
          : status === 404
            ? 'La cuenta ya no existe o ya no está disponible.'
            : 'No se pudo desbloquear la cuenta. Inténtalo nuevamente.'
      );
    } finally {
      setDesbloqueando(false);
    }
  };

  return (
    <main className="min-h-[calc(100vh-84px)] bg-[#f5f7f1] px-4 pb-16 pt-8 text-[#17372c] sm:px-6 lg:px-10">
      <div className="mx-auto max-w-7xl">
        {/* ENCABEZADO */}
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
              Cuentas bloqueadas
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-emerald-100/90 sm:text-base">
              Consulta los bloqueos vigentes y restablece el acceso cuando corresponda.
            </p>
          </div>
        </header>

        {/* BUSCADOR */}
        <section
          className="mb-6 rounded-3xl border border-[#095540]/10 bg-white p-4 shadow-[0_12px_35px_rgba(9,85,64,0.07)] sm:p-5"
          aria-label="Búsqueda de cuentas bloqueadas"
        >
          <label
            htmlFor="busqueda-cuentas-bloqueadas"
            className="mb-2 block text-xs font-bold uppercase tracking-[0.12em] text-[#095540]"
          >
            Buscar por usuario o correo
          </label>

          <div className="relative">
            <svg
              className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="2"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607z"
              />
            </svg>

            <input
              id="busqueda-cuentas-bloqueadas"
              type="search"
              value={busqueda}
              onChange={(event) =>
                setBusqueda(event.target.value)
              }
              placeholder="Escribe un nombre de usuario o correo"
              disabled={cargando}
              className="w-full rounded-2xl border border-[#095540]/15 bg-[#f7faf5] py-3 pl-10 pr-4 text-sm font-medium text-slate-800 outline-none placeholder:text-slate-400 transition-[border-color,background-color,box-shadow] duration-200 focus-visible:border-[#009444] focus-visible:bg-white focus-visible:ring-4 focus-visible:ring-[#009444]/15 disabled:cursor-wait disabled:opacity-60"
            />
          </div>
        </section>

        {/* MENSAJE ÉXITO */}
        {mensajeExito && (
          <div
            className="mb-5 rounded-2xl border border-[#009444]/20 bg-[#009444]/10 px-4 py-3.5 shadow-sm"
            role="status"
          >
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#009444]/15 font-bold text-[#009444]">
                ✓
              </span>

              <p className="text-sm font-bold text-[#095540]">
                {mensajeExito}
              </p>
            </div>
          </div>
        )}

        {/* MENSAJE ERROR */}
        {error && (
          <div
            className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3.5 shadow-sm"
            role="alert"
          >
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-100 font-bold text-red-700">
                !
              </span>

              <p className="text-sm font-bold text-red-800">
                {error}
              </p>
            </div>
          </div>
        )}

        {/* CARGANDO */}
        {cargando ? (
          <div className="rounded-3xl border border-[#095540]/10 bg-white p-10 text-center shadow-[0_12px_35px_rgba(9,85,64,0.07)]">
            <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-emerald-100 border-t-[#009444]" />

            <p className="text-sm font-bold text-[#095540]">
              Cargando cuentas bloqueadas...
            </p>
          </div>
        ) : !error && cuentas.length === 0 ? (
          /* ESTADO VACÍO */
          <div className="rounded-3xl border border-dashed border-[#009444]/20 bg-white p-10 text-center shadow-[0_12px_35px_rgba(9,85,64,0.07)]">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#009444]/10 text-[#009444]">
              <svg
                className="h-8 w-8"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="1.7"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 12.75 11.25 15 15 9.75m6.75 2.25a9.75 9.75 0 1 1-19.5 0 9.75 9.75 0 0 1 19.5 0z"
                />
              </svg>
            </div>

            <h2 className="mt-5 text-lg font-extrabold text-[#095540]">
              No hay cuentas bloqueadas
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Actualmente no existen cuentas que requieran desbloqueo.
            </p>
          </div>
        ) : !error && cuentasFiltradas.length === 0 ? (
          /* SIN RESULTADOS */
          <div className="rounded-3xl border border-dashed border-[#00AEEF]/20 bg-white p-10 text-center shadow-[0_12px_35px_rgba(9,85,64,0.07)]">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#00AEEF]/10 text-[#0087BA]">
              <svg
                className="h-8 w-8"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="1.7"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="m21 21-4.35-4.35m0 0A7.5 7.5 0 1 0 6.046 6.046a7.5 7.5 0 0 0 10.604 10.604z"
                />
              </svg>
            </div>

            <h2 className="mt-5 text-lg font-extrabold text-[#095540]">
              No se encontraron cuentas
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              No hay cuentas que coincidan con tu búsqueda.
            </p>
          </div>
        ) : cuentasFiltradas.length > 0 ? (
          /* TABLA */
          <div className="overflow-hidden rounded-[2rem] border border-[#095540]/10 bg-white shadow-[0_18px_50px_rgba(9,85,64,0.09)]">
            <div className="flex flex-col gap-2 border-b border-slate-100 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-7">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#8dc63f]">
                  Seguridad
                </p>

                <h2 className="mt-1 text-xl font-extrabold tracking-tight text-[#073f31]">
                  Cuentas bloqueadas
                </h2>
              </div>

              <span className="inline-flex w-fit rounded-full border border-[#00AEEF]/20 bg-[#00AEEF]/10 px-3 py-1.5 text-xs font-bold text-[#0087BA]">
                {cuentasFiltradas.length}{' '}
                {cuentasFiltradas.length === 1
                  ? 'cuenta'
                  : 'cuentas'}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] border-collapse">
                <caption className="sr-only">
                  Cuentas actualmente bloqueadas
                </caption>

                <thead className="bg-gradient-to-r from-[#073f31] via-[#095540] to-[#08743f]">
                  <tr>
                    <th
                      scope="col"
                      className="whitespace-nowrap px-5 py-4 text-left text-xs font-bold uppercase tracking-[0.1em] text-white"
                    >
                      Usuario
                    </th>

                    <th
                      scope="col"
                      className="whitespace-nowrap px-5 py-4 text-left text-xs font-bold uppercase tracking-[0.1em] text-white"
                    >
                      Correo
                    </th>

                    <th
                      scope="col"
                      className="whitespace-nowrap px-5 py-4 text-left text-xs font-bold uppercase tracking-[0.1em] text-white"
                    >
                      Intentos fallidos
                    </th>

                    <th
                      scope="col"
                      className="whitespace-nowrap px-5 py-4 text-left text-xs font-bold uppercase tracking-[0.1em] text-white"
                    >
                      Último intento
                    </th>

                    <th
                      scope="col"
                      className="whitespace-nowrap px-5 py-4 text-left text-xs font-bold uppercase tracking-[0.1em] text-white"
                    >
                      Bloqueado hasta
                    </th>

                    <th
                      scope="col"
                      className="whitespace-nowrap px-5 py-4 text-left text-xs font-bold uppercase tracking-[0.1em] text-white"
                    >
                      Acción
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {cuentasFiltradas.map((cuenta) => (
                    <tr
                      key={cuenta.id}
                      className="transition-colors duration-200 hover:bg-[#f7faf5]"
                    >
                      <td className="px-5 py-5 align-middle">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#d9d823]/20 to-[#8dc63f]/20 text-sm font-extrabold text-[#095540] ring-1 ring-[#8dc63f]/20">
                            {cuenta.nombreUsuario
                              .charAt(0)
                              .toUpperCase()}
                          </div>

                          <div>
                            <p className="font-bold text-[#095540]">
                              {cuenta.nombreUsuario}
                            </p>

                            <p className="mt-0.5 text-xs text-slate-400">
                              ID #{cuenta.id}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-5 align-middle">
                        <p className="max-w-[240px] truncate text-sm font-medium text-slate-600">
                          {cuenta.correo}
                        </p>
                      </td>

                      <td className="px-5 py-5 align-middle">
                        <span className="inline-flex rounded-full border border-[#d9d823]/40 bg-[#d9d823]/15 px-3 py-1.5 text-xs font-bold text-[#6e6c00]">
                          {cuenta.intentosFallidos}
                        </span>
                      </td>

                      <td className="whitespace-nowrap px-5 py-5 align-middle text-sm font-medium text-slate-600">
                        {formatearFecha(
                          cuenta.fechaUltimoIntento
                        )}
                      </td>

                      <td className="whitespace-nowrap px-5 py-5 align-middle">
                        <span className="text-sm font-semibold text-[#095540]">
                          {formatearFecha(
                            cuenta.bloqueadoHasta
                          )}
                        </span>
                      </td>

                      <td className="px-5 py-5 align-middle">
                        <button
                          type="button"
                          onClick={(event) => {
                            ultimoDisparadorRef.current =
                              event.currentTarget;

                            setError('');
                            setMensajeExito('');
                            setCuentaSeleccionada(cuenta);
                          }}
                          className="inline-flex min-h-10 items-center justify-center rounded-2xl border border-[#009444]/20 bg-[#009444]/10 px-4 text-xs font-bold text-[#08743f] shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-[#009444] hover:bg-[#009444] hover:text-white hover:shadow-md focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#009444]/20"
                        >
                          Desbloquear
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}

        {/* MODAL */}
        {cuentaSeleccionada && (
          <div
            className="fixed inset-0 z-[1000] flex items-center justify-center bg-[#062e25]/65 p-4 backdrop-blur-sm"
            onMouseDown={(event) => {
              if (
                event.target === event.currentTarget &&
                !desbloqueando
              ) {
                setCuentaSeleccionada(null);
              }
            }}
          >
            <div
              ref={modalContenidoRef}
              className="w-full max-w-md overflow-hidden rounded-[2rem] border border-white/70 bg-white shadow-[0_30px_80px_rgba(9,85,64,0.28)]"
              role="dialog"
              aria-modal="true"
              aria-labelledby="titulo-confirmar-desbloqueo"
              aria-describedby="descripcion-confirmar-desbloqueo"
              aria-busy={desbloqueando}
            >
              <div className="bg-gradient-to-br from-[#095540] to-[#009444] px-6 py-6 text-white sm:px-8">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-100">
                      Seguridad
                    </p>

                    <h2
                      id="titulo-confirmar-desbloqueo"
                      className="mt-1 text-2xl font-extrabold tracking-tight"
                    >
                      Confirmar desbloqueo
                    </h2>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setCuentaSeleccionada(null)
                    }
                    disabled={desbloqueando}
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20 disabled:opacity-50"
                    aria-label="Cerrar"
                  >
                    <svg
                      className="h-4 w-4"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M6 6l12 12M18 6L6 18"
                      />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="p-6 sm:p-8">
                <div className="rounded-2xl border border-[#d9d823]/40 bg-[#d9d823]/10 p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#6e6c00]">
                    Cuenta bloqueada
                  </p>

                  <p className="mt-1 text-base font-extrabold text-[#073f31]">
                    {cuentaSeleccionada.nombreUsuario}
                  </p>

                  <p className="mt-1 text-sm text-slate-500">
                    {cuentaSeleccionada.correo}
                  </p>
                </div>

                <p
                  id="descripcion-confirmar-desbloqueo"
                  className="mt-5 text-sm leading-6 text-slate-600"
                >
                  ¿Deseas desbloquear esta cuenta y permitir
                  nuevamente su acceso?
                </p>

                <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                  <button
                    ref={botonCancelarRef}
                    type="button"
                    onClick={() =>
                      setCuentaSeleccionada(null)
                    }
                    disabled={desbloqueando}
                    className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Cancelar
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      void confirmarDesbloqueo()
                    }
                    disabled={desbloqueando}
                    className="inline-flex min-h-11 items-center justify-center rounded-2xl bg-[#009444] px-5 text-sm font-extrabold text-white shadow-sm transition hover:bg-[#095540] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {desbloqueando
                      ? 'Desbloqueando...'
                      : 'Desbloquear'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}