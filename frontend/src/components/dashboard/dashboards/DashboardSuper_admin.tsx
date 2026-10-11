import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { api } from '../../../services/api';
import GestionPreguntasFrecuentes from '../../GestionPreguntasFrecuentes';

import logo from '../../../assets/logo.png';
import imagenParque from '../../../assets/parque-hero.jpg';

interface DashboardSuperAdminProps {
  onIrBitacora: () => void;
  onIrCuentasBloqueadas: () => void;
  onCerrarSesion: () => void;
  onIrComunicados: () => void;
  onIrPreguntasFrecuentes: () => void;
}

interface RegistroBitacoraResumen {
  id: number;
  action: string;
  createdAt: string;
}

interface CuentaBloqueadaResumen {
  id: number;
  nombreUsuario: string;
  correo: string;
}

/* =========================================================
   ICONOS
========================================================= */

const IconoCasa = () => (
  <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="m3 10 9-7 9 7" />
    <path d="M5 9v11h14V9" />
    <path d="M9 20v-6h6v6" />
  </svg>
);

const IconoDashboard = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="4" y="4" width="6" height="6" rx="1.2" />
    <rect x="14" y="4" width="6" height="6" rx="1.2" />
    <rect x="4" y="14" width="6" height="6" rx="1.2" />
    <rect x="14" y="14" width="6" height="6" rx="1.2" />
  </svg>
);

const IconoBitacora = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="6" y="4" width="12" height="16" rx="1.8" />
    <path d="M9 8h6" />
    <path d="M9 12h6" />
    <path d="M9 16h4" />
  </svg>
);

const IconoCuentas = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="5" y="4" width="14" height="16" rx="1.8" />
    <path d="M8.5 9h7" />
    <path d="M8.5 12.5h4" />
    <circle cx="16.5" cy="16.5" r="2.8" />
    <path d="m18.5 18.5 1.2 1.2" />
  </svg>
);

const IconoCerrarSesion = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M10 4H5v16h5" />
    <path d="m14 8 4 4-4 4" />
    <path d="M9 12h9" />
  </svg>
);


/* =========================================================
   COMPONENTE
========================================================= */

export default function DashboardSuper_admin({
  onIrBitacora,
  onIrCuentasBloqueadas,
  onCerrarSesion,
  onIrComunicados,
}: DashboardSuperAdminProps) {
  const [sidebarAbierto, setSidebarAbierto] = useState(true);
  const [menuMovilAbierto, setMenuMovilAbierto] = useState(false);
  const [movimientosRecientes, setMovimientosRecientes] = useState<number | null>(null);
  const [cuentasBloqueadas, setCuentasBloqueadas] = useState<number | null>(null);
  const [cargandoActividad, setCargandoActividad] = useState(true);
  const [errorActividad, setErrorActividad] = useState<string | null>(null);
  const [vistaPreguntasFrecuentes, setVistaPreguntasFrecuentes] = useState(false);

  useEffect(() => {
    let componenteActivo = true;

    const cargarResumen = async () => {
      setCargandoActividad(true);
      setErrorActividad(null);

      try {
        const [bitacora, cuentas] = await Promise.all([
          api.solicitar<RegistroBitacoraResumen[]>(
            '/admin/bitacora',
            { method: 'GET' },
            { mensajeError: 'No se pudo cargar la actividad reciente.' },
          ),
          api.solicitar<CuentaBloqueadaResumen[]>(
            '/admin/cuentas-bloqueadas',
            { method: 'GET' },
            { mensajeError: 'No se pudieron cargar las cuentas bloqueadas.' },
          ),
        ]);

        if (!Array.isArray(bitacora) || !Array.isArray(cuentas)) {
          throw new Error('La respuesta del resumen no es válida.');
        }

        if (componenteActivo) {
          setMovimientosRecientes(bitacora.length);
          setCuentasBloqueadas(cuentas.length);
        }
      } catch (errorSolicitud: unknown) {
        if (!componenteActivo) return;

        const status =
          typeof errorSolicitud === 'object' &&
          errorSolicitud !== null &&
          'status' in errorSolicitud
            ? (errorSolicitud as { status?: unknown }).status
            : null;

        setErrorActividad(
          status === 401 || status === 403
            ? 'No se pudo consultar el resumen.'
            : 'No se pudo cargar el resumen.',
        );
      } finally {
        if (componenteActivo) {
          setCargandoActividad(false);
        }
      }
    };

    void cargarResumen();

    return () => {
      componenteActivo = false;
    };
  }, []);

  const anchoContenido = sidebarAbierto
    ? 'lg:pl-[clamp(250px,18vw,318px)]'
    : 'lg:pl-[clamp(96px,7vw,136px)]';

  return (
    <main
      className="
        relative isolate min-h-[100dvh] overflow-x-hidden
        lg:h-[100dvh] lg:overflow-y-hidden
        bg-[#eef2ef] px-2.5 py-2.5 text-[#16382b]
        transition-colors duration-700
        dark:bg-[#071c14] dark:text-[#edf8f1]
        min-[360px]:px-3 min-[360px]:py-3
        sm:px-4 sm:py-4 md:px-5 md:py-5 lg:px-7 lg:py-6
      "
    >
      <div className="absolute right-5 top-5 z-[70] flex gap-2">
        <button type="button" onClick={onIrComunicados} className="rounded-full border border-white/50 bg-white/55 px-4 py-2 text-xs font-bold text-emerald-800 shadow-lg backdrop-blur-md transition hover:bg-white dark:border-white/10 dark:bg-white/10 dark:text-emerald-100">Comunicados</button>
        <button type="button" onClick={() => setVistaPreguntasFrecuentes(true)} className="rounded-full border border-white/50 bg-white/55 px-4 py-2 text-xs font-bold text-emerald-800 shadow-lg backdrop-blur-md transition hover:bg-white dark:border-white/10 dark:bg-white/10 dark:text-emerald-100">Preguntas frecuentes</button>
      </div>
      {/* =====================================================
          FONDO SUTIL — conserva la fotografía del proyecto,
          pero deja de dominar el dashboard.
      ===================================================== */}
      <img
        src={imagenParque}
        alt=""
        aria-hidden="true"
        className="
          pointer-events-none fixed inset-0 -z-30 h-full w-full
          scale-110 object-cover opacity-[0.38] blur-[20px]
          saturate-[0.72] brightness-[1.02] transition-all duration-700
          dark:opacity-[0.42] dark:brightness-[0.58] dark:saturate-[0.82]
        "
      />

      <div
        className="
          pointer-events-none fixed inset-0 -z-20
          bg-[#eef4ef]/46 backdrop-blur-[3px] transition-colors duration-700
          dark:bg-[#071c14]/58
        "
      />

      {/* =====================================================
          SIDEBAR FLOTANTE
          No está pegado a la pantalla ni al contenedor central.
      ===================================================== */}
      <aside
        onClick={() => setSidebarAbierto((actual) => !actual)}
        aria-label={sidebarAbierto ? 'Menú lateral. Haz clic en el panel para contraerlo.' : 'Menú lateral. Haz clic para expandirlo.'}
        className={`
          fixed left-3 top-3 z-50
          hidden h-[calc(100dvh-1.5rem)] max-h-[calc(100dvh-1.5rem)] flex-col
          cursor-pointer rounded-[2rem] border border-white/55
          bg-white/42 shadow-[0_24px_70px_rgba(11,58,39,0.14)]
          backdrop-blur-[28px] transition-[width] duration-500 ease-[cubic-bezier(.22,1,.36,1)]
          dark:border-white/[0.10] dark:bg-[#0d2b20]/48
          lg:flex lg:left-5 lg:top-5 lg:h-[calc(100dvh-2.5rem)]
          xl:left-6 xl:top-6 xl:h-[calc(100dvh-3rem)]
          ${sidebarAbierto ? 'w-[220px] lg:w-[clamp(228px,16vw,280px)]' : 'w-[72px] lg:w-[clamp(74px,5vw,84px)]'}
        `}
      >
        {/* borde luminoso */}
        <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-[#00AEEF]/50 to-transparent" />

        {/* LOGO */}
        <div className="flex items-center justify-center px-3 pt-5">
          <Link
            to="/"
            onClick={(event) => event.stopPropagation()}
            aria-label="Ir al inicio"
            title={sidebarAbierto ? undefined : 'Inicio'}
            className="group flex items-center justify-center rounded-2xl outline-none transition-all duration-300 focus-visible:ring-2 focus-visible:ring-[#00AEEF]/50"
          >
            <img
              src={logo}
              alt="Aliados del Parque Nacional Diriá"
              className="h-[82px] w-[82px] object-contain transition-transform duration-300 group-hover:-translate-y-0.5 dark:brightness-0 dark:invert"
            />
          </Link>
        </div>

        {/* MARCA / ESTADO VISUAL */}
        <div className={`${sidebarAbierto ? 'px-5' : 'px-3'} mt-7`}>
          <div
            className={`
              relative overflow-hidden rounded-2xl border
              border-white/55 bg-white/28 backdrop-blur-2xl
              shadow-[0_10px_30px_rgba(11,58,39,0.06)]
              transition-all duration-500 dark:border-white/[0.12]
              dark:bg-[#16372b]/78 dark:shadow-[0_14px_34px_rgba(0,0,0,0.24)]
              ${sidebarAbierto ? 'p-4' : 'p-2.5'}
            `}
          >
            <span
              className="
                absolute -right-8 -top-8 h-20 w-20 rounded-full
                bg-[#8dc63f]/25 blur-2xl
              "
            />
            <div className={`relative z-10 flex items-center ${sidebarAbierto ? 'gap-3' : 'justify-center'}`}>
              <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-[#8dc63f] shadow-[0_0_0_5px_rgba(141,198,63,0.12)]" />
              {sidebarAbierto && (
                <div>
                  <p className="font-brand text-[10px] font-semibold uppercase tracking-[0.15em] text-[#708279] dark:text-[#a6beb0]">
                    Estado
                  </p>
                  <p className="font-brand text-sm font-bold text-[#174c38] dark:text-[#e2f3e8]">
                    Super admin
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* NAVEGACIÓN */}
        <nav
          className={`${sidebarAbierto ? 'px-4' : 'px-3'} mt-7 flex flex-1 flex-col gap-2`}
          aria-label="Navegación administrativa"
        >
          <Link
            to="/"
            onClick={(event) => event.stopPropagation()}
            title={!sidebarAbierto ? 'Inicio' : undefined}
            className={`
              group flex items-center rounded-2xl py-3
              text-[#718078] transition-all duration-300
              hover:bg-white hover:text-[#0b6849]
              dark:text-[#a7bdb1] dark:hover:bg-white/[0.06] dark:hover:text-white
              ${sidebarAbierto ? 'gap-3 px-3' : 'justify-center px-2'}
            `}
          >
            <span className="transition-transform duration-300 group-hover:-translate-y-0.5">
              <IconoCasa />
            </span>
            {sidebarAbierto && (
              <span className="font-brand text-sm font-semibold">
                Inicio
              </span>
            )}
          </Link>

          <Link
            to="/super-admin/dashboard"
            onClick={(event) => event.stopPropagation()}
            title={!sidebarAbierto ? 'Dashboard' : undefined}
            className={`
              group relative flex items-center rounded-2xl py-3
              bg-[#0b6849] text-white
              shadow-[0_12px_28px_rgba(11,104,73,0.22)]
              transition-all duration-300
              hover:-translate-y-0.5 hover:bg-[#095b40]
              ${sidebarAbierto ? 'gap-3 px-3' : 'justify-center px-2'}
            `}
          >
            <span className="transition-transform duration-300 group-hover:scale-105">
              <IconoDashboard />
            </span>
            {sidebarAbierto && (
              <span className="font-brand text-sm font-semibold">
                Dashboard
              </span>
            )}
          </Link>

          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onIrBitacora();
            }}
            title={!sidebarAbierto ? 'Bitácora' : undefined}
            className={`
              group flex w-full items-center rounded-2xl py-3
              text-[#718078] transition-all duration-300
              hover:bg-white hover:text-[#0b6849]
              dark:text-[#a7bdb1] dark:hover:bg-white/[0.06] dark:hover:text-white
              ${sidebarAbierto ? 'gap-3 px-3' : 'justify-center px-2'}
            `}
          >
            <span className="transition-transform duration-300 group-hover:-translate-y-0.5">
              <IconoBitacora />
            </span>
            {sidebarAbierto && (
              <span className="font-brand text-sm font-semibold">
                Bitácora
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onIrCuentasBloqueadas();
            }}
            title={!sidebarAbierto ? 'Cuentas bloqueadas' : undefined}
            className={`
              group flex w-full items-center rounded-2xl py-3
              text-[#718078] transition-all duration-300
              hover:bg-white hover:text-[#0b6849]
              dark:text-[#a7bdb1] dark:hover:bg-white/[0.06] dark:hover:text-white
              ${sidebarAbierto ? 'gap-3 px-3' : 'justify-center px-2'}
            `}
          >
            <span className="transition-transform duration-300 group-hover:-translate-y-0.5">
              <IconoCuentas />
            </span>
            {sidebarAbierto && (
              <span className="font-brand text-sm font-semibold">
                Cuentas bloqueadas
              </span>
            )}
          </button>

          {/* separador */}
          <div className="mx-3 mb-3 mt-auto h-px bg-black/[0.06] dark:bg-white/[0.06]" />

          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onCerrarSesion();
            }}
            title={!sidebarAbierto ? 'Cerrar sesión' : undefined}
            className={`
              group flex w-full items-center rounded-2xl py-3
              text-[#877870] transition-all duration-300
              hover:bg-red-50 hover:text-red-600
              dark:text-[#c6aaa1] dark:hover:bg-red-950/30 dark:hover:text-red-300
              ${sidebarAbierto ? 'gap-3 px-3' : 'justify-center px-2'}
            `}
          >
            <span className="transition-transform duration-300 group-hover:translate-x-0.5">
              <IconoCerrarSesion />
            </span>
            {sidebarAbierto && (
              <span className="font-brand text-sm font-semibold">
                Cerrar sesión
              </span>
            )}
          </button>
        </nav>

        {/* PIE DE SIDEBAR */}
<div className={`${sidebarAbierto ? 'px-5' : 'px-3'} pb-5 pt-4`}>
  <div className="rounded-2xl border border-white/55 bg-white/24 p-3 backdrop-blur-xl dark:border-white/[0.06] dark:bg-white/[0.025]">
    <div
      className={`flex items-center ${
        sidebarAbierto ? 'justify-between' : 'justify-center'
      }`}
    >
      {sidebarAbierto ? (
        <span className="font-brand text-[9px] font-bold uppercase tracking-[0.16em] text-[#829188] dark:text-[#a9beb2]">
          Control del sistema
        </span>
      ) : (
        <span
          className="flex h-8 w-8 items-center justify-center text-[#829188] dark:text-[#a9beb2]"
          title="Control del sistema"
          aria-label="Control del sistema"
        >
          <svg
            viewBox="0 0 24 24"
            className="h-[20px] w-[20px]"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M4 7h16" />
            <circle cx="9" cy="7" r="2" fill="currentColor" stroke="none" />

            <path d="M4 12h16" />
            <circle cx="15" cy="12" r="2" fill="currentColor" stroke="none" />

            <path d="M4 17h16" />
            <circle cx="11" cy="17" r="2" fill="currentColor" stroke="none" />
          </svg>
        </span>
      )}

      {sidebarAbierto && (
        <span className="h-1.5 w-1.5 rounded-full bg-[#00AEEF]" />
      )}
    </div>
  </div>
</div>
      </aside>

      {/* =====================================================
          MENÚ MÓVIL / TABLET
      ===================================================== */}
      <div className="fixed inset-x-2.5 top-2.5 z-50 flex min-h-[4rem] items-center justify-between rounded-[1.5rem] border border-white/55 bg-white/42 px-3 py-2.5 sm:px-4 sm:py-3 shadow-[0_18px_50px_rgba(11,58,39,0.10)] backdrop-blur-[26px] lg:hidden dark:border-white/[0.08] dark:bg-[#0d2b20]/48">
        <Link to="/" className="flex min-w-0 items-center gap-3" aria-label="Ir al inicio">
          <img
            src={logo}
            alt="Aliados del Parque Nacional Diriá"
            className="h-10 w-10 shrink-0 object-contain dark:brightness-0 dark:invert"
          />
          <div className="min-w-0">
            <p className="hidden font-brand text-[9px] font-bold uppercase tracking-[0.16em] text-[#009443] min-[420px]:block">
              Panel de
            </p>
            <p className="hidden truncate font-brand text-sm font-extrabold text-[#0d5f42] dark:text-[#e2f3e8] min-[420px]:block sm:text-base">
              Super administración
            </p>
          </div>
        </Link>

        <button
          type="button"
          onClick={() => setMenuMovilAbierto((actual) => !actual)}
          className="flex h-10 w-10 shrink-0 items-center justify-center min-[360px]:h-11 min-[360px]:w-11 rounded-full border border-white/60 bg-white/55 text-[#0b6849] shadow-[0_10px_25px_rgba(11,58,39,0.08)] backdrop-blur-xl transition-transform duration-300 active:scale-95 dark:border-white/[0.10] dark:bg-white/[0.06] dark:text-[#e4f5eb]"
          aria-label={menuMovilAbierto ? 'Cerrar menú' : 'Abrir menú'}
          aria-expanded={menuMovilAbierto}
        >
          {menuMovilAbierto ? <IconoCerrarSesion /> : <IconoDashboard />}
        </button>
      </div>

      {menuMovilAbierto && (
        <div className="fixed inset-3 z-[60] flex flex-col overflow-y-auto rounded-[1.8rem] border border-white/60 bg-white/55 p-4 shadow-[0_30px_90px_rgba(11,58,39,0.18)] backdrop-blur-[30px] lg:hidden dark:border-white/[0.10] dark:bg-[#0d2b20]/72">
          <div className="flex items-center justify-between border-b border-black/[0.06] pb-4 dark:border-white/[0.07]">
            <div className="flex min-w-0 items-center gap-3">
              <img
                src={logo}
                alt="Aliados del Parque Nacional Diriá"
                className="h-11 w-11 shrink-0 object-contain dark:brightness-0 dark:invert"
              />
              <div className="min-w-0">
                <p className="font-brand text-[9px] font-bold uppercase tracking-[0.16em] text-[#009443]">
                  Control del sistema
                </p>
                <p className="truncate font-brand text-sm font-extrabold text-[#174c38] dark:text-[#e7f5ed]">
                  Super administración
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setMenuMovilAbierto(false)}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#0b6849] text-white shadow-[0_10px_25px_rgba(11,104,73,0.20)]"
              aria-label="Cerrar menú"
            >
              <span className="text-lg leading-none">×</span>
            </button>
          </div>

          <nav className="mt-4 flex flex-col gap-2" aria-label="Navegación móvil administrativa">
            <Link
              to="/"
              onClick={() => setMenuMovilAbierto(false)}
              className="flex min-h-11 items-center gap-3 rounded-2xl bg-white/60 px-4 py-3 font-brand text-sm font-semibold text-[#21473a] transition-colors hover:bg-white dark:bg-white/[0.05] dark:text-[#e4f3ea] dark:hover:bg-white/[0.08]"
            >
              <IconoCasa />
              Inicio
            </Link>

            <Link
              to="/super-admin/dashboard"
              onClick={() => setMenuMovilAbierto(false)}
              className="flex min-h-11 items-center gap-3 rounded-2xl bg-[#0b6849] px-4 py-3 font-brand text-sm font-semibold text-white shadow-[0_12px_28px_rgba(11,104,73,0.18)]"
            >
              <IconoDashboard />
              Dashboard
            </Link>

            <button
              type="button"
              onClick={() => {
                setMenuMovilAbierto(false);
                onIrBitacora();
              }}
              className="flex min-h-11 items-center gap-3 rounded-2xl bg-white/60 px-4 py-3 text-left font-brand text-sm font-semibold text-[#21473a] transition-colors hover:bg-white dark:bg-white/[0.05] dark:text-[#e4f3ea] dark:hover:bg-white/[0.08]"
            >
              <IconoBitacora />
              Bitácora
            </button>

            <button
              type="button"
              onClick={() => {
                setMenuMovilAbierto(false);
                onIrCuentasBloqueadas();
              }}
              className="flex min-h-11 items-center gap-3 rounded-2xl bg-white/60 px-4 py-3 text-left font-brand text-sm font-semibold text-[#21473a] transition-colors hover:bg-white dark:bg-white/[0.05] dark:text-[#e4f3ea] dark:hover:bg-white/[0.08]"
            >
              <IconoCuentas />
              Cuentas bloqueadas
            </button>
          </nav>

          <div className="mt-auto border-t border-black/[0.06] pt-4 dark:border-white/[0.07]">
            <button
              type="button"
              onClick={() => {
                setMenuMovilAbierto(false);
                onCerrarSesion();
              }}
              className="flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl bg-[#0b6849] px-4 py-3 font-brand text-sm font-semibold text-white shadow-[0_12px_28px_rgba(11,104,73,0.18)]"
            >
              <IconoCerrarSesion />
              Cerrar sesión
            </button>
          </div>
        </div>
      )}

      {/* =====================================================
          CONTENIDO PRINCIPAL
      ===================================================== */}
      <div
        className={`
          relative z-0 min-h-0
          min-h-screen pt-[5.5rem] transition-[padding] duration-500
          sm:pt-[5.75rem] lg:h-full lg:min-h-0 lg:pt-0 lg:pr-3 xl:pr-6 ${anchoContenido}
        `}
      >
        <section
          className={`
            mx-auto w-full min-h-[calc(100dvh-7rem)]
            sm:min-h-[calc(100dvh-7.5rem)] md:min-h-[calc(100dvh-8rem)]
            lg:h-[calc(100dvh-3rem)] lg:min-h-0
            overflow-hidden rounded-[1.25rem] min-[420px]:rounded-[1.5rem] sm:rounded-[2rem] lg:rounded-[2.5rem]
            border border-white/48 bg-white/30
            shadow-[0_30px_90px_rgba(11,58,39,0.10)]
            backdrop-blur-[30px] transition-[width,min-height,box-shadow,background-color] duration-700
            dark:border-white/[0.08] dark:bg-[#0b241b]/34
            dark:shadow-[0_30px_90px_rgba(0,0,0,0.30)]
            lg:max-w-[2200px]
          `}
        >
          {/* reflejo superior */}
          <div className="pointer-events-none absolute left-1/2 top-0 h-px w-[65%] -translate-x-1/2 bg-gradient-to-r from-transparent via-white to-transparent opacity-80" />

          {vistaPreguntasFrecuentes ? (
            <div className="flex h-full min-h-0 flex-col overflow-y-auto p-4 sm:p-6 lg:p-8">
              <button
                type="button"
                onClick={() => setVistaPreguntasFrecuentes(false)}
                className="mb-5 w-fit rounded-full border border-[#0b6849]/15 bg-white/60 px-4 py-2 font-brand text-sm font-semibold text-[#0b6849] transition-colors hover:bg-white dark:border-white/10 dark:bg-white/[0.06] dark:text-[#c9ead8] dark:hover:bg-white/10"
              >
                ← Volver al dashboard
              </button>
              <GestionPreguntasFrecuentes />
            </div>
          ) : (
          <div className="flex min-h-[calc(100dvh-7rem)] flex-col p-3.5 min-[360px]:p-4 sm:min-h-[calc(100dvh-7.5rem)] sm:p-6 md:p-7 lg:min-h-0 lg:p-[clamp(2rem,3vw,3.5rem)] lg:pt-[clamp(3.75rem,7vh,6rem)]">
            {/* CABECERA */}
            <div className="flex flex-col gap-4 sm:gap-5 lg:flex-row lg:items-start lg:justify-between lg:gap-[clamp(1.5rem,3vw,3rem)]">
              <div className="min-w-0 max-w-4xl flex-1">
                
                <h1
                  className="
                    max-w-[10ch] font-brand text-[clamp(2.05rem,9.5vw,3.75rem)] font-extrabold leading-[0.96]
                    tracking-[-0.055em] text-[#143d2e]
                    dark:text-[#eff9f3]
                    sm:max-w-[14ch] sm:text-[clamp(2.35rem,7vw,3.75rem)]
                    md:max-w-[18ch] md:text-[clamp(2.5rem,6vw,3.3rem)]
                    lg:max-w-[17ch] lg:text-[clamp(3rem,4.2vw,4.15rem)]
                    2xl:max-w-[18ch] 2xl:text-[clamp(3.35rem,3.1vw,4.35rem)]
                  "
                >
                  Panel de Super Administración
                </h1>

                <p className="mt-3 max-w-[760px] font-brand text-[13px] leading-5 text-[#64776e] dark:text-[#b9cbc0] min-[360px]:text-sm sm:mt-4 sm:text-base sm:leading-7 lg:text-[17px] 2xl:text-[18px]">
                  Administra y supervisa las funciones clave de la plataforma
                  Aliados del Parque Nacional Diriá.
                </p>
              </div>

              {/* USUARIO */}
              <div className="w-full max-w-full min-[420px]:max-w-[240px] sm:w-fit sm:min-w-[205px] lg:w-[clamp(205px,17vw,250px)] lg:shrink-0 self-start lg:self-auto flex items-center gap-3 rounded-[1.4rem] border border-white/55 bg-white/30 px-4 py-3 shadow-[0_12px_35px_rgba(0,0,0,0.05)] backdrop-blur-xl dark:border-white/[0.07] dark:bg-white/[0.045]">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-[#8dc63f] to-[#009443] text-sm font-bold text-white shadow-sm">
                  SA
                </div>
                <div>
                  <p className="font-brand text-[10px] font-semibold text-[#829188] dark:text-[#9fb5a9]">
                    Hola!
                  </p>
                  <p className="font-brand text-sm font-bold text-[#173d2e] dark:text-[#eaf6ef]">
                    Super admin
                  </p>
                </div>
              </div>
            </div>

            {/* LÍNEA DE MARCA */}
            <div className="mt-6 flex items-center gap-1.5 sm:mt-8 sm:gap-2">
              <span className="h-1.5 w-10 rounded-full bg-[#009443] sm:w-16" />
              <span className="h-1.5 w-6 rounded-full bg-[#8dc63f] sm:w-8" />
              <span className="h-1.5 w-4 rounded-full bg-[#d9d823] sm:w-5" />
              <span className="h-1.5 w-5 rounded-full bg-[#00AEEF] sm:w-7" />
            </div>

            {/* ACTIVIDAD RECIENTE */}
            <section className="mt-7 min-[360px]:mt-8 sm:mt-10 lg:mt-[clamp(2rem,4vh,3.25rem)]">
              <div className="mb-4">
                <p className="font-brand text-[14px] font-extrabold uppercase leading-none tracking-[0.15em] text-[#00AEEF] sm:text-[15px] sm:tracking-[0.17em]">
                  Actividad reciente
                </p>
              </div>

              <div className="grid grid-cols-1 gap-3 min-[560px]:grid-cols-2 sm:gap-4 lg:gap-[clamp(1rem,1.5vw,1.5rem)]">
                {/* MOVIMIENTOS RECIENTES */}
                <div className="group relative min-w-0 overflow-hidden rounded-[1.35rem] border border-white/65 bg-white/48 px-3.5 py-3.5 min-[360px]:rounded-[1.55rem] min-[360px]:px-4 min-[360px]:py-4 shadow-[0_12px_34px_rgba(11,58,39,0.07)] backdrop-blur-xl transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_42px_rgba(11,58,39,0.10)] sm:px-5 dark:border-white/[0.08] dark:bg-[#102a20]/42">
                  <div className="absolute -right-8 -top-10 h-20 w-20 min-[360px]:h-24 min-[360px]:w-24 rounded-full bg-[#8dc63f]/12 blur-2xl transition-transform duration-500 group-hover:scale-110" />
                  <div className="relative z-10 flex min-w-0 items-center justify-between gap-3 sm:gap-4">
                    <div className="flex min-w-0 items-center gap-3 sm:gap-4">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#009443]/10 text-[#009443] dark:bg-[#009443]/15 dark:text-[#65cda7]">
                        <IconoBitacora />
                      </div>
                      <div className="min-w-0">
                        <p className="font-brand text-xs font-semibold text-[#60746b] dark:text-[#9eb5a9]">
                          Movimientos recientes
                        </p>
                        <div className="mt-0.5 flex flex-wrap items-baseline gap-x-2 gap-y-1">
                          <span className="font-brand text-[clamp(1.45rem,8vw,2rem)] font-extrabold leading-none tracking-[-0.05em] text-[#173d2e] dark:text-[#eaf6ef]">
                            {cargandoActividad ? '—' : movimientosRecientes ?? '—'}
                          </span>
                          <span className="font-brand text-xs font-semibold text-[#899891] dark:text-[#91a99d]">
                            registros
                          </span>
                        </div>
                      </div>
                    </div>

                    <span className="hidden shrink-0 rounded-full bg-[#009443]/8 px-2.5 py-1 font-brand text-[10px] font-bold text-[#009443] dark:bg-[#009443]/15 dark:text-[#76d7b1] sm:inline-flex">
                      Recientes
                    </span>
                  </div>
                </div>

                {/* CUENTAS BLOQUEADAS */}
                <div className="group relative overflow-hidden rounded-[1.35rem] border border-white/65 bg-white/48 px-3.5 py-3.5 min-[360px]:rounded-[1.55rem] min-[360px]:px-5 min-[360px]:py-4 shadow-[0_12px_34px_rgba(11,58,39,0.07)] backdrop-blur-xl transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_42px_rgba(11,58,39,0.10)] dark:border-white/[0.08] dark:bg-[#102a20]/42">
                  <div className="absolute -right-8 -top-10 h-20 w-20 min-[360px]:h-24 min-[360px]:w-24 rounded-full bg-[#00AEEF]/10 blur-2xl transition-transform duration-500 group-hover:scale-110" />
                  <div className="relative z-10 flex items-center justify-between gap-4">
                    <div className="flex min-w-0 items-center gap-4">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#00AEEF]/10 text-[#008fbd] dark:bg-[#00AEEF]/15 dark:text-[#69d8f7]">
                        <IconoCuentas />
                      </div>
                      <div className="min-w-0">
                        <p className="font-brand text-xs font-semibold text-[#60746b] dark:text-[#9eb5a9]">
                          Cuentas bloqueadas
                        </p>
                        <div className="mt-0.5 flex items-baseline gap-2">
                          <span className="font-brand text-[clamp(1.45rem,8vw,2rem)] font-extrabold leading-none tracking-[-0.05em] text-[#173d2e] dark:text-[#eaf6ef]">
                            {cargandoActividad ? '—' : cuentasBloqueadas ?? '—'}
                          </span>
                          <span className="font-brand text-xs font-semibold text-[#899891] dark:text-[#91a99d]">
                            cuentas
                          </span>
                        </div>
                      </div>
                    </div>

                    <span className="hidden shrink-0 rounded-full bg-[#00AEEF]/8 px-2.5 py-1 font-brand text-[10px] font-bold text-[#007fae] dark:bg-[#00AEEF]/15 dark:text-[#69d8f7] sm:inline-flex">
                      Vigentes
                    </span>
                  </div>
                </div>
              </div>

              {errorActividad && (
                <p className="mt-2 text-left font-brand text-[10px] sm:text-right font-medium text-[#9a5b4f] dark:text-[#d5a79c]">
                  {errorActividad}
                </p>
              )}
            </section>

           {/* PIE */}
          <footer className="relative mt-8 border-t-0 pt-5 dark:border-white/[0.06] sm:mt-auto sm:pt-6 lg:translate-y-[clamp(8px,3vh,36px)] before:absolute before:left-0 before:right-0 before:top-[100px] before:h-px before:bg-black/[0.05] dark:before:bg-white/[0.06] sm:before:top-[110px] lg:before:top-[115px]">
            <div className="relative top-[120px] flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">

              <div className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-[#009443]" />
                <p className="font-brand text-xs font-semibold text-[#74847c] dark:text-[#a9beb2]">
                  Aliados del Parque Nacional Diriá
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-brand text-[8px] font-bold uppercase tracking-[0.12em] sm:gap-x-4 sm:text-[9px] sm:tracking-[0.15em]">
                <span className="text-[#009443]">Guanacaste</span>
                <span className="text-[#00AEEF]">Costa Rica</span>
                <span className="text-[#d0cf21]">Parque Nacional Diriá</span>
              </div>

            </div>
          </footer>
          </div>
          )}
        </section>
      </div>
    </main>
  );
}
