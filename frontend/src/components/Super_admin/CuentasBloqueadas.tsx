import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { api } from '../../services/api';
import imagenParque from '../../assets/parque-hero.jpg';



interface CuentaBloqueada {

  id: number;

  nombreUsuario: string;

  correo: string;

  intentosFallidos: number;

  fechaUltimoIntento: string | null;

  bloqueadoHasta: string;

}



const CUENTAS_POR_PAGINA = 10;



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

  const [paginaActual, setPaginaActual] = useState(1);

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



  const totalPaginas = Math.max(

    1,

    Math.ceil(cuentasFiltradas.length / CUENTAS_POR_PAGINA)

  );



  const paginaSegura = Math.min(paginaActual, totalPaginas);

  const indiceInicio = (paginaSegura - 1) * CUENTAS_POR_PAGINA;

  const indiceFin = indiceInicio + CUENTAS_POR_PAGINA;

  const cuentasPaginadas = cuentasFiltradas.slice(

    indiceInicio,

    indiceFin

  );

  const rangoInicio =

    cuentasFiltradas.length === 0 ? 0 : indiceInicio + 1;

  const rangoFin = Math.min(indiceFin, cuentasFiltradas.length);
  const paginasDisponibles = Array.from(
    { length: totalPaginas },
    (_, indice) => indice + 1
  );



  useEffect(() => {

    setPaginaActual(1);

  }, [busqueda]);



  useEffect(() => {

    setPaginaActual((pagina) => Math.min(pagina, totalPaginas));

  }, [totalPaginas]);



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

    <main className="relative isolate min-h-screen w-full overflow-x-clip text-[#17382B] [font-family:'Montserrat',sans-serif] transition-colors duration-500 dark:text-[#EDF8F1]">

      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <img
          src={imagenParque}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full scale-110 object-cover blur-[14px] opacity-[0.32] saturate-[0.65] transition-[filter,opacity] duration-500 dark:opacity-[0.22] dark:brightness-[0.48] dark:saturate-[0.78]"
        />

        <div className="absolute inset-0 bg-[#EEF4EF]/76 backdrop-blur-[4px] transition-colors duration-500 dark:bg-[#071C16]/88" />
        <div className="absolute -left-32 top-0 h-[420px] w-[420px] rounded-full bg-[#8DC63F]/10 blur-[130px] dark:bg-[#8DC63F]/[0.055]" />
        <div className="absolute -right-24 bottom-0 h-[430px] w-[430px] rounded-full bg-[#00AEEF]/7 blur-[130px] dark:bg-[#00AEEF]/[0.04]" />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-[1320px] px-4 pb-10 pt-5 sm:px-7 sm:pt-7 lg:px-10 lg:pt-8">
        <section className="overflow-hidden rounded-[2.4rem] border border-white/45 bg-white/[0.22] shadow-[0_24px_80px_rgba(7,63,49,0.07)] backdrop-blur-[32px] sm:rounded-[2.8rem] dark:border-white/10 dark:bg-[#0B3026]/72 dark:shadow-[0_28px_90px_rgba(0,0,0,0.32)]">

        {/* ENCABEZADO */}

        <header className="relative overflow-hidden px-7 pb-5 pt-8 text-[#123D30] sm:px-10 sm:pb-6 sm:pt-10 lg:px-14 lg:pt-12 dark:text-[#F0FAF4]">



          <div

            className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-[#d9d823]/18 blur-3xl dark:bg-[#D9D823]/[0.08]"

            aria-hidden="true"

          />



          <div

            className="pointer-events-none absolute -bottom-20 left-1/4 h-56 w-56 rounded-full bg-[#00AEEF]/14 blur-3xl dark:bg-[#00AEEF]/[0.07]"

            aria-hidden="true"

          />



          <div className="relative">

            <div>

              <h1 className="text-5xl font-bold leading-[0.96] tracking-[-0.025em] sm:text-6xl lg:text-[4.15rem]">

                Cuentas bloqueadas

              </h1>



              <p className="mt-4 max-w-[800px] text-base font-normal leading-7 text-[#687E74] dark:text-[#A9BCB4] sm:text-lg">

                Consulta los bloqueos vigentes y restablece el acceso cuando corresponda.

              </p>

              <div className="mt-5 flex items-center gap-2" aria-hidden="true">
                <span className="h-[3px] w-12 rounded-full bg-[#009444]" />
                <span className="h-[3px] w-8 rounded-full bg-[#8DC63F]" />
                <span className="h-[3px] w-5 rounded-full bg-[#D9D823]" />
                <span className="h-[3px] w-7 rounded-full bg-[#00AEEF]" />
              </div>

            </div>

          </div>

        </header>



        {/* BUSCADOR */}

        <section

          className="relative z-30 mx-7 mb-7 rounded-[1.8rem] border border-white/45 bg-white/[0.32] p-5 shadow-[0_12px_38px_rgba(7,63,49,0.025)] backdrop-blur-2xl sm:mx-10 sm:p-6 lg:mx-12 lg:p-6 dark:border-white/10 dark:bg-white/[0.045] dark:shadow-[0_12px_38px_rgba(0,0,0,0.18)]"

          aria-label="Búsqueda de cuentas bloqueadas"

        >

          <label

            htmlFor="busqueda-cuentas-bloqueadas"

            className="mb-2 block text-[10px] font-bold uppercase tracking-[0.14em] text-[#5F766B] dark:text-[#A6BAB1]"

          >

            Buscar por usuario o correo

          </label>



          <div className="relative">

            <svg

              className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#829188] dark:text-[#a9beb2]"

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

              className="min-h-12 w-full rounded-[1rem] border border-transparent bg-white/65 py-3 pl-11 pr-4 text-sm font-semibold text-[#304B40] outline-none placeholder:text-[#82938B] shadow-inner shadow-white/40 backdrop-blur-xl transition-[border-color,background-color,box-shadow] duration-200 focus-visible:border-[#009444] focus-visible:bg-white/78 focus-visible:ring-4 focus-visible:ring-[#009444]/15 disabled:cursor-wait disabled:opacity-60 dark:border-white/[0.10] dark:bg-[#09261E]/58 dark:text-[#F0FAF4] dark:placeholder:text-[#8EA69B] dark:shadow-inner dark:shadow-black/20 dark:focus-visible:border-[#8DC63F] dark:focus-visible:bg-[#0F3529]/72"

            />

          </div>

        </section>



        {/* MENSAJE ÉXITO */}

        {mensajeExito && createPortal(

          <div

            className="fixed right-4 top-4 z-[1100] w-[calc(100%-2rem)] max-w-[420px] rounded-[1.35rem] bg-[#eaf7ef]/88 px-4 py-3 shadow-[0_18px_46px_rgba(7,63,49,0.14)] backdrop-blur-2xl sm:right-6 sm:top-6 dark:bg-[#113B2D]/88 dark:shadow-[0_18px_48px_rgba(0,0,0,0.34)]"

            role="status"

          >

            <div className="flex items-center gap-3">

              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#009444]/14 text-sm font-extrabold text-[#08743f] shadow-sm dark:bg-[#8DC63F]/16 dark:text-[#C9F6D8]">

                ✓

              </span>



              <p className="text-sm font-bold leading-5 text-[#095540] dark:text-emerald-100">

                {mensajeExito}

              </p>

            </div>

          </div>,

          document.body

        )}



        {/* MENSAJE ERROR */}

        {error && (

          <div

            className="mb-5 rounded-2xl border border-red-200 bg-red-50/90 px-4 py-3.5 shadow-sm backdrop-blur-xl dark:border-red-400/20 dark:bg-red-950/35 dark:shadow-[0_12px_32px_rgba(0,0,0,0.18)]"

            role="alert"

          >

            <div className="flex items-center gap-3">

              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-100 font-bold text-red-700 dark:bg-red-500/15 dark:text-red-200">

                !

              </span>



              <p className="text-sm font-bold text-red-800 dark:text-red-100">

                {error}

              </p>

            </div>

          </div>

        )}



        {/* CARGANDO */}

        {cargando ? (

          <div className="mx-7 mb-7 rounded-[1.8rem] border border-white/45 bg-white/[0.34] p-10 text-center shadow-[0_18px_50px_rgba(9,85,64,0.035)] backdrop-blur-xl sm:mx-10 lg:mx-14 dark:border-white/10 dark:bg-white/[0.04] dark:shadow-[0_18px_50px_rgba(0,0,0,0.22)]">

            <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-emerald-100 border-t-[#009444] dark:border-emerald-400/15 dark:border-t-[#8DC63F]" />



            <p className="text-sm font-bold text-[#095540] dark:text-emerald-100">

              Cargando cuentas bloqueadas...

            </p>

          </div>

        ) : !error && cuentas.length === 0 ? (

          /* ESTADO VACÍO */

          <div className="mx-7 mb-7 rounded-[1.8rem] border border-white/45 bg-white/[0.24] p-10 text-center shadow-[0_18px_45px_rgba(7,63,49,0.035)] backdrop-blur-2xl sm:mx-10 sm:p-14 lg:mx-14 dark:border-white/10 dark:bg-white/[0.04] dark:shadow-[0_18px_45px_rgba(0,0,0,0.18)]">

            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#8DC63F]/10 text-[#64842F] dark:bg-[#8DC63F]/10 dark:text-[#A8D66D]">

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



            <h2 className="mt-5 text-xl font-extrabold tracking-tight text-[#095540] dark:text-white">

              No hay cuentas bloqueadas

            </h2>



            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#6b7a72] dark:text-emerald-100/72">

              Actualmente no existen cuentas que requieran desbloqueo.

            </p>

          </div>

        ) : !error && cuentasFiltradas.length === 0 ? (

          /* SIN RESULTADOS */

          <div className="mx-7 mb-7 rounded-[1.8rem] border border-white/45 bg-white/[0.24] p-10 text-center shadow-[0_18px_45px_rgba(7,63,49,0.035)] backdrop-blur-2xl sm:mx-10 sm:p-14 lg:mx-14 dark:border-white/10 dark:bg-white/[0.04] dark:shadow-[0_18px_45px_rgba(0,0,0,0.18)]">

            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#00AEEF]/10 text-[#187E9B] dark:bg-[#00AEEF]/10 dark:text-[#69D8F7]">

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



            <h2 className="mt-5 text-xl font-extrabold tracking-tight text-[#095540] dark:text-white">

              No se encontraron cuentas

            </h2>



            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#6b7a72] dark:text-emerald-100/72">

              No hay cuentas que coincidan con tu búsqueda.

            </p>

          </div>

        ) : cuentasFiltradas.length > 0 ? (

          /* RESULTADOS */

          <div className="relative z-10 mx-7 mb-7 overflow-hidden rounded-[1.9rem] border border-white/55 bg-white/25 shadow-[0_18px_45px_rgba(7,63,49,0.045)] backdrop-blur-xl sm:mx-10 lg:mx-14 dark:border-white/10 dark:bg-[#09261E]/42 dark:shadow-[0_18px_50px_rgba(0,0,0,0.24)]">

            <div className="flex flex-col gap-3 border-b border-white/60 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-7 dark:border-white/[0.07]">

              <div>

                <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#8dc63f]">

                  Seguridad

                </p>



                <h2 className="mt-1 text-xl font-extrabold tracking-tight text-[#073f31] dark:text-white">

                  Cuentas bloqueadas

                </h2>

              </div>



              <span className="inline-flex w-fit rounded-full border border-[#00AEEF]/20 bg-[#00AEEF]/10 px-3 py-1.5 text-xs font-bold text-[#0087BA] dark:border-[#00AEEF]/25 dark:bg-[#00AEEF]/12 dark:text-[#BCEEFF]">

                {cuentasFiltradas.length}{' '}

                {cuentasFiltradas.length === 1

                  ? 'cuenta'

                  : 'cuentas'}

              </span>

            </div>



            <div className="custom-scrollbar grid max-h-[calc(100vh-200px)] gap-4 overflow-y-auto p-5 pr-2 sm:p-6 sm:pr-2 lg:p-7 lg:pr-2 dark:[scrollbar-color:rgba(141,198,63,0.35)_transparent]">

              {cuentasPaginadas.map((cuenta) => (

                <article

                  key={cuenta.id}

                  className="group relative overflow-hidden rounded-[1.8rem] border border-white/40 bg-white/[0.34] shadow-[0_14px_38px_rgba(7,63,49,0.035)] backdrop-blur-xl transition-all duration-300 hover:-translate-y-0.5 hover:bg-white/45 hover:shadow-[0_18px_45px_rgba(7,63,49,0.055)] sm:p-6 dark:border-white/[0.08] dark:bg-white/[0.045] dark:shadow-[0_14px_38px_rgba(0,0,0,0.18)] dark:hover:bg-white/[0.07] dark:hover:shadow-[0_18px_48px_rgba(0,0,0,0.24)]"

                >

                  <div className="pointer-events-none absolute -right-10 -top-12 h-28 w-28 rounded-full bg-[#00AEEF]/10 blur-2xl transition-transform duration-500 group-hover:scale-110" />



                  <div className="relative z-10 flex flex-col gap-6 p-5 sm:p-6 lg:flex-row lg:items-start lg:justify-between">

                    <div className="flex min-w-0 items-start gap-4">

                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#d9d823]/24 to-[#8dc63f]/24 text-base font-extrabold text-[#095540] ring-1 ring-[#8dc63f]/24 dark:from-[#D9D823]/12 dark:to-[#8DC63F]/14 dark:text-[#E8F8EC] dark:ring-[#8DC63F]/20">

                        {cuenta.nombreUsuario

                          .charAt(0)

                          .toUpperCase()}

                      </div>



                      <div className="min-w-0">

                        <div className="flex flex-wrap items-center gap-2">

                          <h3 className="break-words text-lg font-extrabold tracking-tight text-[#095540] dark:text-white">

                            {cuenta.nombreUsuario}

                          </h3>



                          <span className="inline-flex rounded-full border border-[#d9d823]/40 bg-[#d9d823]/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[#6e6c00] dark:border-[#D9D823]/25 dark:bg-[#D9D823]/10 dark:text-[#F1EF8B]">

                            Bloqueada

                          </span>

                        </div>



                        <div className="mt-2 flex min-w-0 items-center gap-2 text-sm font-medium text-[#52675e] dark:text-emerald-100/72">

                          <svg className="h-4 w-4 shrink-0 text-[#00AEEF]" fill="none" viewBox="0 0 24 24" strokeWidth="1.8" stroke="currentColor" aria-hidden="true">

                            <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5A2.25 2.25 0 0 1 19.5 19.5h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0-9.75 6.75L2.25 6.75" />

                          </svg>



                          <span className="min-w-0 break-words">

                            {cuenta.correo}

                          </span>

                        </div>

                      </div>

                    </div>



                    <button

                      type="button"

                      onClick={(event) => {

                        ultimoDisparadorRef.current =

                          event.currentTarget;



                        setError('');

                        setMensajeExito('');

                        setCuentaSeleccionada(cuenta);

                      }}

                      className="inline-flex min-h-11 w-full items-center justify-center rounded-2xl border border-[#009444]/20 bg-[#009444]/10 px-4 text-xs font-bold text-[#08743f] shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-[#009444] hover:bg-[#009444] hover:text-white hover:shadow-md focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#009444]/20 disabled:cursor-not-allowed disabled:opacity-60 sm:w-fit dark:border-[#8DC63F]/20 dark:bg-[#009444]/16 dark:text-[#D8F7E3] dark:hover:border-[#8DC63F]/45 dark:hover:bg-[#147A5D] dark:focus-visible:ring-[#8DC63F]/20"

                    >

                      Desbloquear

                    </button>

                  </div>



                  <div className="relative z-10 mx-5 mb-5 grid gap-3 border-t border-white/35 pt-4 sm:mx-6 sm:mb-6 md:grid-cols-3 dark:border-white/10">

                    <div className="rounded-2xl border border-white/60 bg-white/42 p-4 backdrop-blur-xl dark:border-white/[0.08] dark:bg-[#071C16]/36">

                      <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#829188] dark:text-[#a9beb2]">

                        Intentos fallidos

                      </p>

                      <p className="mt-1 text-sm font-extrabold text-[#095540] dark:text-white">

                        {cuenta.intentosFallidos}

                      </p>

                    </div>



                    <div className="rounded-2xl border border-white/60 bg-white/42 p-4 backdrop-blur-xl dark:border-white/[0.08] dark:bg-[#071C16]/36">

                      <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#829188] dark:text-[#a9beb2]">

                        Ultimo intento

                      </p>

                      <p className="mt-1 text-sm font-extrabold text-[#095540] dark:text-white">

                        {formatearFecha(cuenta.fechaUltimoIntento)}

                      </p>

                    </div>



                    <div className="rounded-2xl border border-white/60 bg-white/42 p-4 backdrop-blur-xl dark:border-white/[0.08] dark:bg-[#071C16]/36">

                      <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#829188] dark:text-[#a9beb2]">

                        Bloqueado hasta

                      </p>

                      <p className="mt-1 text-sm font-extrabold text-[#095540] dark:text-white">

                        {formatearFecha(cuenta.bloqueadoHasta)}

                      </p>

                    </div>

                  </div>

                </article>

              ))}

            </div>



            <div className="hidden overflow-x-auto">

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



                <tbody className="divide-y divide-[#095540]/8 dark:divide-white/[0.08]">

                  {cuentasFiltradas.map((cuenta) => (

                    <tr

                      key={cuenta.id}

                      className="transition-colors duration-200 hover:bg-white/58 dark:hover:bg-white/[0.05]"

                    >

                      <td className="px-5 py-5 align-middle">

                        <div className="flex items-center gap-3">

                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#d9d823]/20 to-[#8dc63f]/20 text-sm font-extrabold text-[#095540] ring-1 ring-[#8dc63f]/20 dark:text-[#E8F8EC]">

                            {cuenta.nombreUsuario

                              .charAt(0)

                              .toUpperCase()}

                          </div>



                          <div>

                            <p className="font-bold text-[#095540] dark:text-white">

                              {cuenta.nombreUsuario}

                            </p>



                            <p className="mt-0.5 text-xs text-[#829188] dark:text-[#a9beb2]">

                              ID #{cuenta.id}

                            </p>

                          </div>

                        </div>

                      </td>



                      <td className="px-5 py-5 align-middle">

                        <p className="max-w-[240px] truncate text-sm font-medium text-[#52675e] dark:text-emerald-100/72">

                          {cuenta.correo}

                        </p>

                      </td>



                      <td className="px-5 py-5 align-middle">

                        <span className="inline-flex rounded-full border border-[#d9d823]/40 bg-[#d9d823]/15 px-3 py-1.5 text-xs font-bold text-[#6e6c00] dark:text-[#F1EF8B]">

                          {cuenta.intentosFallidos}

                        </span>

                      </td>



                      <td className="whitespace-nowrap px-5 py-5 align-middle text-sm font-medium text-[#52675e] dark:text-emerald-100/72">

                        {formatearFecha(

                          cuenta.fechaUltimoIntento

                        )}

                      </td>



                      <td className="whitespace-nowrap px-5 py-5 align-middle">

                        <span className="text-sm font-semibold text-[#095540] dark:text-white">

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

                          className="inline-flex min-h-10 items-center justify-center rounded-2xl border border-[#009444]/20 bg-[#009444]/10 px-4 text-xs font-bold text-[#08743f] shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-[#009444] hover:bg-[#009444] hover:text-white hover:shadow-md focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#009444]/20 dark:border-[#8DC63F]/20 dark:bg-[#009444]/16 dark:text-[#D8F7E3] dark:hover:border-[#8DC63F]/45 dark:hover:bg-[#147A5D]"

                        >

                          Desbloquear

                        </button>

                      </td>

                    </tr>

                  ))}

                </tbody>

              </table>

            </div>



            <div className="flex flex-col gap-3 border-t border-white/60 px-5 py-4 text-sm font-semibold text-[#52675e] sm:flex-row sm:items-center sm:justify-between sm:px-7 dark:border-white/[0.08] dark:text-[#B9CBC0]">

              <p>

                Mostrando {rangoInicio}-{rangoFin} de{' '}

                {cuentasFiltradas.length}

              </p>



              {totalPaginas > 1 && (
              <div className="flex flex-wrap items-center gap-3">

                <button

                  type="button"

                  onClick={() =>

                    setPaginaActual((pagina) =>

                      Math.max(1, pagina - 1)

                    )

                  }

                  disabled={paginaSegura === 1}

                  className="inline-flex h-11 min-w-11 items-center justify-center rounded-full border border-white/30 bg-white/80 px-4 text-xs font-bold text-slate-600 shadow-lg backdrop-blur-xl transition-all duration-200 hover:scale-105 hover:bg-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#8DC63F]/20 active:scale-95 disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:scale-100 disabled:hover:bg-white/80 dark:border-white/10 dark:bg-[#071C16]/62 dark:text-[#DDEBE5] dark:shadow-[0_12px_28px_rgba(0,0,0,0.22)] dark:hover:bg-[#12372B] dark:disabled:hover:bg-[#071C16]/62"

                >

                  Anterior

                </button>



                <span className="text-xs font-bold text-[#095540] dark:text-[#E8F8EC]">

                  Pagina {paginaSegura} de {totalPaginas}

                </span>

                <div className="flex items-center justify-center gap-1.5">
                  {paginasDisponibles.map((pagina) => (
                    <button
                      key={pagina}
                      type="button"
                      onClick={() => setPaginaActual(pagina)}
                      aria-label={`Ir a la página ${pagina}`}
                      aria-current={
                        pagina === paginaSegura ? 'page' : undefined
                      }
                      className={`h-2 rounded-full transition-all duration-300 ${
                        pagina === paginaSegura
                          ? 'w-6 bg-[#095540] dark:bg-[#8DC63F]'
                          : 'w-2 bg-slate-300 hover:bg-slate-400 dark:bg-slate-700 dark:hover:bg-slate-500'
                      }`}
                    />
                  ))}
                </div>



                <button

                  type="button"

                  onClick={() =>

                    setPaginaActual((pagina) =>

                      Math.min(totalPaginas, pagina + 1)

                    )

                  }

                  disabled={paginaSegura === totalPaginas}

                  className="inline-flex h-11 min-w-11 items-center justify-center rounded-full border border-white/30 bg-white/80 px-4 text-xs font-bold text-slate-600 shadow-lg backdrop-blur-xl transition-all duration-200 hover:scale-105 hover:bg-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#8DC63F]/20 active:scale-95 disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:scale-100 disabled:hover:bg-white/80 dark:border-white/10 dark:bg-[#071C16]/62 dark:text-[#DDEBE5] dark:shadow-[0_12px_28px_rgba(0,0,0,0.22)] dark:hover:bg-[#12372B] dark:disabled:hover:bg-[#071C16]/62"

                >

                  Siguiente

                </button>

              </div>
              )}

            </div>

          </div>

        ) : null}



        {/* MODAL */}

        {cuentaSeleccionada && createPortal(

          <div

            className="fixed inset-0 z-[1000] flex min-h-dvh items-center justify-center bg-[linear-gradient(135deg,rgba(9,36,28,0.18),rgba(9,85,64,0.12))] p-4 backdrop-blur-[5px] dark:bg-[linear-gradient(135deg,rgba(3,15,12,0.58),rgba(9,42,32,0.48))]"

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

              className="w-full max-w-[28rem] overflow-hidden rounded-[2rem] border border-[#095540]/10 bg-[#f7fbf7]/78 shadow-[0_28px_80px_rgba(7,63,49,0.18)] backdrop-blur-2xl dark:border-white/[0.10] dark:bg-[#0B3026]/88 dark:shadow-[0_30px_88px_rgba(0,0,0,0.42)]"

              role="dialog"

              aria-modal="true"

              aria-labelledby="titulo-confirmar-desbloqueo"

              aria-describedby="descripcion-confirmar-desbloqueo"

              aria-busy={desbloqueando}

            >

              <div className="relative px-6 pb-4 pt-6 text-[#123D30] sm:px-7 sm:pt-7 dark:text-white">

                <div className="flex items-start justify-between gap-4">

                  <div>

                    <p className="inline-flex rounded-full bg-[#009444]/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-[#08743f] dark:bg-[#8DC63F]/10 dark:text-[#A8D66D]">

                      Seguridad

                    </p>



                    <h2

                      id="titulo-confirmar-desbloqueo"

                      className="mt-3 text-2xl font-extrabold tracking-tight text-[#123D30] dark:text-white"

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

                    className="flex h-10 w-10 items-center justify-center rounded-full bg-white/58 text-[#52675e] shadow-sm backdrop-blur-xl transition hover:bg-white hover:text-[#095540] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#8DC63F]/20 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white/[0.08] dark:text-[#DDEBE5] dark:hover:bg-white/[0.14] dark:hover:text-white"

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



              <div className="px-6 pb-6 pt-2 sm:px-7 sm:pb-7">

                <div className="rounded-[1.5rem] border border-white/45 bg-white/46 p-4 shadow-[0_12px_34px_rgba(7,63,49,0.055)] backdrop-blur-xl dark:border-white/[0.08] dark:bg-[#071C16]/38 dark:shadow-[0_12px_34px_rgba(0,0,0,0.18)]">

                  <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#08743f] dark:text-[#A8D66D]">

                    Cuenta bloqueada

                  </p>



                  <p className="mt-2 break-words text-lg font-extrabold text-[#073f31] dark:text-white">

                    {cuentaSeleccionada.nombreUsuario}

                  </p>



                  <p className="mt-1 break-words text-sm font-medium text-[#6F8379] dark:text-slate-300">

                    {cuentaSeleccionada.correo}

                  </p>

                </div>



                <p

                  id="descripcion-confirmar-desbloqueo"

                  className="mt-5 text-sm leading-6 text-[#52675e] dark:text-slate-300"

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

                    className="inline-flex min-h-11 items-center justify-center rounded-2xl bg-white/72 px-5 text-sm font-bold text-[#095540] shadow-[0_8px_24px_rgba(7,63,49,0.08)] backdrop-blur-xl transition hover:-translate-y-0.5 hover:bg-white hover:shadow-[0_12px_30px_rgba(7,63,49,0.12)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#8DC63F]/20 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 sm:min-w-32 dark:border dark:border-white/10 dark:bg-white/[0.075] dark:text-[#DDEBE5] dark:hover:bg-white/[0.12]"

                  >

                    Cancelar

                  </button>



                  <button

                    type="button"

                    onClick={() =>

                      void confirmarDesbloqueo()

                    }

                    disabled={desbloqueando}

                    className="inline-flex min-h-11 items-center justify-center rounded-2xl bg-[#095540] px-5 text-sm font-extrabold text-white shadow-[0_12px_28px_rgba(9,85,64,0.20)] transition hover:-translate-y-0.5 hover:bg-[#08743f] hover:shadow-[0_16px_34px_rgba(9,85,64,0.24)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#8DC63F]/24 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 sm:min-w-36 dark:bg-[#147A5D] dark:hover:bg-[#1A946F] dark:disabled:bg-[#34483F]"

                  >

                    {desbloqueando

                      ? 'Desbloqueando...'

                      : 'Desbloquear'}

                  </button>

                </div>

              </div>

            </div>

          </div>,

          document.body

        )}

          <footer className="border-t border-white/20 px-7 py-5 sm:px-10 lg:px-14 dark:border-white/10">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-[10px] font-semibold text-[#7D9086] dark:text-[#81968D]">
                Seguridad y administración · Aliados del Parque Nacional Diriá
              </p>
              <div className="flex flex-wrap items-center gap-3 text-[9px] font-bold tracking-[0.12em]">
                <span className="text-[#009444]">Guanacaste</span>
                <span className="text-[#00AEEF]">Costa Rica</span>
                <span className="text-[#D9D823]">Parque Nacional Diriá</span>
              </div>
            </div>
          </footer>
        </section>
      </div>
    </main>

  );

}
