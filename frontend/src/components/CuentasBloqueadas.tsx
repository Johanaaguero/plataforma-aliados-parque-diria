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
  if (typeof error !== 'object' || error === null || !('status' in error)) {
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
          },
        );

        if (!Array.isArray(cuentasBloqueadas)) {
          throw new Error(
            'La respuesta de cuentas bloqueadas no es válida.',
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
            : 'No se pudieron cargar las cuentas bloqueadas.',
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
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        );

      if (!elementos || elementos.length === 0) {
        event.preventDefault();
        return;
      }

      const primero = elementos[0];
      const ultimo = elementos[elementos.length - 1];

      if (event.shiftKey && document.activeElement === primero) {
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

    document.addEventListener('keydown', manejarTecladoDelModal);

    return () => {
      document.removeEventListener('keydown', manejarTecladoDelModal);
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
        cuenta.correo.toLowerCase().includes(texto),
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
        },
      );

      setCuentas((cuentasActuales) =>
        cuentasActuales.filter(
          (cuentaActual) => cuentaActual.id !== cuenta.id,
        ),
      );

      setCuentaSeleccionada(null);
      setMensajeExito(
        `La cuenta de ${cuenta.nombreUsuario} fue desbloqueada.`,
      );
    } catch (errorSolicitud: unknown) {
      const status = obtenerEstadoHttp(errorSolicitud);

      if (status === 401) {
        return;
      }

      if (status === 404) {
        setCuentas((cuentasActuales) =>
          cuentasActuales.filter(
            (cuentaActual) => cuentaActual.id !== cuenta.id,
          ),
        );
      }

      setCuentaSeleccionada(null);

      setError(
        status === 403
          ? 'No tienes permisos para realizar esta acción.'
          : status === 404
            ? 'La cuenta ya no existe o ya no está disponible.'
            : 'No se pudo desbloquear la cuenta. Inténtalo nuevamente.',
      );
    } finally {
      setDesbloqueando(false);
    }
  };

  return (
    <main
      className="min-h-[calc(100vh-84px)] px-6 pb-16 pt-6 text-[#17372c]"
      style={{
        background:
          'radial-gradient(circle at top left, rgba(141, 198, 63, 0.12), transparent 28%), linear-gradient(180deg, #fbfdfb 0%, #f6faf7 100%)',
        boxSizing: 'border-box',
        fontFamily: "'Montserrat', sans-serif",
      }}
    >
      <header className="mx-auto mb-7 max-w-[1100px]">
        <span className="mb-2.5 inline-flex rounded-full bg-[#009444]/10 px-3 py-1.5 text-[13px] font-bold uppercase tracking-[0.04em] text-[#009444]">
          Super Admin
        </span>

        <h1 className="m-0 text-[clamp(2rem,5vw,3rem)] font-bold leading-[1.1] tracking-[-0.03em] text-[#095540]">
          Cuentas bloqueadas
        </h1>

        <p className="mt-3 max-w-[700px] text-[15px] font-medium leading-7 text-[#6b7d75]">
          Consulta los bloqueos vigentes y restablece el acceso cuando
          corresponda.
        </p>
      </header>

      <section
        className="mx-auto mb-[22px] flex max-w-[1100px] flex-col gap-2 rounded-2xl border border-[#e2ebe5] bg-white p-[18px] shadow-[0_18px_45px_rgba(9,85,64,0.08)]"
        aria-label="Búsqueda"
      >
        <label
          htmlFor="busqueda-cuentas-bloqueadas"
          className="text-[13px] font-bold text-[#095540]"
        >
          Buscar por usuario o correo
        </label>

        <input
          id="busqueda-cuentas-bloqueadas"
          type="search"
          value={busqueda}
          onChange={(event) => setBusqueda(event.target.value)}
          placeholder="Escribe un nombre de usuario o correo"
          disabled={cargando}
          className="h-11 w-full rounded-[10px] border border-[#e2ebe5] bg-[#fbfdfb] px-3.5 text-sm text-[#17372c] transition duration-200 placeholder:text-[#9aa89b] focus:border-[#009444] focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#009444]/10 disabled:cursor-wait disabled:opacity-65"
        />
      </section>

      {mensajeExito && (
        <p
          className="mx-auto mb-4 mt-4 max-w-[1100px] rounded-xl border border-[#009444]/15 bg-[#009444]/10 px-4 py-3.5 text-center text-sm font-bold text-[#009444]"
          role="status"
        >
          {mensajeExito}
        </p>
      )}

      {error && (
        <p
          className="mx-auto mb-4 mt-4 max-w-[1100px] rounded-xl border border-[#b33a3a]/20 bg-[#b33a3a]/10 px-4 py-3.5 text-center text-sm font-bold text-[#8f2626]"
          role="alert"
        >
          {error}
        </p>
      )}

      {cargando ? (
        <p
          className="mx-auto mb-4 mt-4 max-w-[1100px] rounded-xl border border-dashed border-[#e2ebe5] bg-white px-4 py-3.5 text-center text-sm font-bold text-[#6b7d75]"
          role="status"
        >
          Cargando cuentas bloqueadas...
        </p>
      ) : !error && cuentas.length === 0 ? (
        <p className="mx-auto mb-4 mt-4 max-w-[1100px] rounded-xl border border-dashed border-[#e2ebe5] bg-white px-4 py-3.5 text-center text-sm font-bold text-[#6b7d75]">
          No hay cuentas bloqueadas.
        </p>
      ) : !error && cuentasFiltradas.length === 0 ? (
        <p className="mx-auto mb-4 mt-4 max-w-[1100px] rounded-xl border border-dashed border-[#e2ebe5] bg-white px-4 py-3.5 text-center text-sm font-bold text-[#6b7d75]">
          No hay cuentas que coincidan con la búsqueda.
        </p>
      ) : cuentasFiltradas.length > 0 ? (
        <div className="mx-auto max-w-[1100px] overflow-x-auto rounded-[18px] border border-[#e2ebe5] bg-white shadow-[0_18px_45px_rgba(9,85,64,0.08)]">
          <table className="w-full border-collapse">
            <caption className="sr-only">
              Cuentas actualmente bloqueadas
            </caption>

            <thead className="bg-gradient-to-r from-[#095540] to-[#009444]">
              <tr>
                <th
                  scope="col"
                  className="whitespace-nowrap px-[18px] py-4 text-left text-[12px] font-bold uppercase tracking-[0.04em] text-white"
                >
                  Usuario
                </th>

                <th
                  scope="col"
                  className="whitespace-nowrap px-[18px] py-4 text-left text-[12px] font-bold uppercase tracking-[0.04em] text-white"
                >
                  Correo
                </th>

                <th
                  scope="col"
                  className="whitespace-nowrap px-[18px] py-4 text-left text-[12px] font-bold uppercase tracking-[0.04em] text-white"
                >
                  Intentos fallidos
                </th>

                <th
                  scope="col"
                  className="whitespace-nowrap px-[18px] py-4 text-left text-[12px] font-bold uppercase tracking-[0.04em] text-white"
                >
                  Último intento
                </th>

                <th
                  scope="col"
                  className="whitespace-nowrap px-[18px] py-4 text-left text-[12px] font-bold uppercase tracking-[0.04em] text-white"
                >
                  Bloqueado hasta
                </th>

                <th
                  scope="col"
                  className="whitespace-nowrap px-[18px] py-4 text-left text-[12px] font-bold uppercase tracking-[0.04em] text-white"
                >
                  Acción
                </th>
              </tr>
            </thead>

            <tbody>
              {cuentasFiltradas.map((cuenta) => (
                <tr
                  key={cuenta.id}
                  className="transition-colors duration-200 hover:bg-[#f8fcf9]"
                >
                  <td className="border-b border-[#edf2ee] px-[18px] py-4 align-middle text-sm font-bold text-[#095540]">
                    {cuenta.nombreUsuario}
                  </td>

                  <td className="border-b border-[#edf2ee] px-[18px] py-4 align-middle text-sm font-medium text-[#17372c]">
                    {cuenta.correo}
                  </td>

                  <td className="border-b border-[#edf2ee] px-[18px] py-4 align-middle text-sm font-medium text-[#17372c]">
                    {cuenta.intentosFallidos}
                  </td>

                  <td className="whitespace-nowrap border-b border-[#edf2ee] px-[18px] py-4 align-middle text-sm font-medium text-[#17372c]">
                    {formatearFecha(cuenta.fechaUltimoIntento)}
                  </td>

                  <td className="whitespace-nowrap border-b border-[#edf2ee] px-[18px] py-4 align-middle text-sm font-medium text-[#17372c]">
                    {formatearFecha(cuenta.bloqueadoHasta)}
                  </td>

                  <td className="border-b border-[#edf2ee] px-[18px] py-4 align-middle text-sm font-medium text-[#17372c]">
                    <button
                      type="button"
                      onClick={(event) => {
                        ultimoDisparadorRef.current = event.currentTarget;
                        setError('');
                        setMensajeExito('');
                        setCuentaSeleccionada(cuenta);
                      }}
                      className="min-h-[42px] rounded-[9px] border border-[#009444]/20 bg-[#009444]/10 px-4 text-[13px] font-bold text-[#009444] transition duration-200 hover:-translate-y-0.5 hover:border-[#009444] hover:bg-[#009444] hover:text-white"
                    >
                      Desbloquear
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {cuentaSeleccionada && (
        <div
          className="fixed inset-0 z-[1000] flex items-center justify-center bg-[#095540]/50 p-5 backdrop-blur-[5px]"
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
            className="w-[min(440px,100%)] max-h-[calc(100vh-40px)] overflow-y-auto rounded-[20px] border border-white/50 bg-white p-[30px] shadow-[0_25px_70px_rgba(9,85,64,0.2)]"
            role="dialog"
            aria-modal="true"
            aria-labelledby="titulo-confirmar-desbloqueo"
            aria-describedby="descripcion-confirmar-desbloqueo"
            aria-busy={desbloqueando}
            style={{
              animation: 'cuentasBloqueadasEntrada 0.2s ease-out',
            }}
          >
            <h2
              id="titulo-confirmar-desbloqueo"
              className="m-0 mb-2.5 text-[24px] font-bold text-[#095540]"
            >
              Confirmar desbloqueo
            </h2>

            <p
              id="descripcion-confirmar-desbloqueo"
              className="m-0 text-sm leading-7 text-[#6b7d75]"
            >
              ¿Deseas desbloquear la cuenta de{' '}
              <strong className="text-[#095540]">
                {cuentaSeleccionada.nombreUsuario}
              </strong>
              ?
            </p>

            <div className="mt-6 flex justify-end gap-2.5">
              <button
                ref={botonCancelarRef}
                type="button"
                onClick={() => setCuentaSeleccionada(null)}
                disabled={desbloqueando}
                className="min-h-[42px] rounded-[9px] border border-[#e2ebe5] bg-[#f7faf8] px-4 text-[13px] font-bold text-[#17372c] transition duration-200 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={() => void confirmarDesbloqueo()}
                disabled={desbloqueando}
                className="min-h-[42px] rounded-[9px] border border-[#009444] bg-[#009444] px-4 text-[13px] font-bold text-white transition duration-200 hover:border-[#095540] hover:bg-[#095540] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {desbloqueando
                  ? 'Desbloqueando...'
                  : 'Desbloquear'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}