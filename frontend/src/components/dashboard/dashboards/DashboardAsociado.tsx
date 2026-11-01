import { useEffect, useState, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import logo from '../../../assets/logo.png';
import imagenParque from '../../../assets/parque-hero.jpg';
import {
  contarNoLeidas,
  obtenerMisNotificaciones,
} from '../../../services/notificacionesService';
import useNotificacionToast from '../../../hooks/useNotificacionToast';
import NotificacionToast from '../../Notificaciones/NotificacionToast';

interface DashboardAsociadoProps {
  nombreUsuario?: string;
  onIrMiEmprendimiento: () => void;
  onIrActividades: () => void;
  onIrMisIncidencias: () => void;
  onIrMisInscripciones: () => void;
  onIrCatalogo: () => void;
  onCerrarSesion: () => void;
}

interface TarjetaAccesoProps {
  icono: ReactNode;
  titulo: string;
  color: string;
  onClick: () => void;
  descripcion?: string;
  insignia?: number;
}

interface AccesoNavegacion {
  titulo: string;
  icono: ReactNode;
  onClick: () => void;
  insignia?: number;
}

function Icono({
  children,
  className = 'h-5 w-5',
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

function IconoCasa() {
  return (
    <Icono className="h-[18px] w-[18px]">
      <path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8" />
      <path d="M3 10a2 2 0 0 1 .7-1.5l7-6a2 2 0 0 1 2.6 0l7 6A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    </Icono>
  );
}

function IconoDashboard() {
  return (
    <Icono>
      <rect width="7" height="9" x="3" y="3" rx="1" />
      <rect width="7" height="5" x="14" y="3" rx="1" />
      <rect width="7" height="9" x="14" y="12" rx="1" />
      <rect width="7" height="5" x="3" y="16" rx="1" />
    </Icono>
  );
}

function IconoEmprendimiento() {
  return (
    <Icono>
      <path d="M3.5 10 12 3.8 20.5 10" />
      <path d="M5.5 9.5v10h13v-10M9 19.5v-6h6v6" />
    </Icono>
  );
}

function IconoInscripciones() {
  return (
    <Icono>
      <path d="M7 3.8h8l4 4v12.4H7a2 2 0 0 1-2-2V5.8a2 2 0 0 1 2-2Z" />
      <path d="M15 3.8v4h4M9 12h6M9 16h6" />
    </Icono>
  );
}

function IconoIncidencias() {
  return (
    <Icono>
      <path d="M12 3 2.8 20h18.4L12 3Z" />
      <path d="M12 9v5M12 17h.01" />
    </Icono>
  );
}

function IconoNotificaciones() {
  return (
    <Icono>
      <path d="M18 8a6 6 0 1 0-12 0c0 7-3 8-3 8h18s-3-1-3-8" />
      <path d="M13.7 20a2 2 0 0 1-3.4 0" />
    </Icono>
  );
}

function IconoCerrarSesion() {
  return (
    <Icono>
      <path d="m16 17 5-5-5-5" />
      <path d="M21 12H9" />
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    </Icono>
  );
}

function IconoMenu({ abierto }: { abierto: boolean }) {
  return abierto ? (
    <Icono>
      <path d="m6 6 12 12M18 6 6 18" />
    </Icono>
  ) : (
    <Icono>
      <path d="M4 7h16M4 12h16M4 17h16" />
    </Icono>
  );
}

function TarjetaAcceso({
  icono,
  titulo,
  color,
  onClick,
  descripcion,
  insignia,
}: TarjetaAccesoProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative flex min-h-[126px] w-full flex-col justify-between overflow-hidden rounded-[1.35rem] border border-white/65 bg-white/48 px-4 py-3.5 text-left shadow-[0_12px_34px_rgba(11,58,39,0.07)] backdrop-blur-xl transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_42px_rgba(11,58,39,0.10)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00AEEF] dark:border-white/[0.08] dark:bg-[#102a20]/42 sm:min-h-[136px] sm:rounded-[1.55rem] sm:px-5 sm:py-4"
    >
      <div className="absolute -right-8 -top-10 h-24 w-24 rounded-full bg-[#8dc63f]/10 blur-2xl transition-transform duration-500 group-hover:scale-110" />
      <div className="relative z-10 flex w-full items-start justify-between gap-4">
        <span className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${color}`} aria-hidden="true">
          {icono}
        </span>
        {typeof insignia === 'number' && insignia > 0 && (
          <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-red-600 px-1.5 text-[10px] font-bold text-white shadow-sm">
            {insignia > 99 ? '99+' : insignia}
          </span>
        )}
      </div>
      <div className="relative z-10 mt-3">
        <h2 className="font-brand text-base font-extrabold tracking-tight text-[#173d2e] dark:text-[#eaf6ef] sm:text-lg">
          {titulo}
        </h2>
        {descripcion && (
          <p className="mt-1 font-brand text-xs font-semibold text-[#718078] dark:text-[#b9cbc0]">
            {descripcion}
          </p>
        )}
      </div>
    </button>
  );
}

export default function DashboardAsociado({
  nombreUsuario = 'Asociado',
  onIrMiEmprendimiento,
  onIrMisIncidencias,
  onIrMisInscripciones,
  onCerrarSesion,
}: DashboardAsociadoProps) {
  const navigate = useNavigate();
  const [sidebarAbierto, setSidebarAbierto] = useState(true);
  const [menuMovilAbierto, setMenuMovilAbierto] = useState(false);
  const [noLeidas, setNoLeidas] = useState(0);
  const { notificacionesToast, procesarNotificaciones, cerrarTodas } =
    useNotificacionToast();

  const iniciales = nombreUsuario
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((parte) => parte.charAt(0).toUpperCase())
    .join('') || 'AS';

  const irNotificaciones = () => {
    navigate('/notificaciones', {
      state: {
        fromDashboard: true,
        returnTo: '/asociado/dashboard',
      },
    });
  };

  const accesos: AccesoNavegacion[] = [
    { titulo: 'Mi emprendimiento', icono: <IconoEmprendimiento />, onClick: onIrMiEmprendimiento },
    { titulo: 'Mis incidencias', icono: <IconoIncidencias />, onClick: onIrMisIncidencias },
    { titulo: 'Mis inscripciones', icono: <IconoInscripciones />, onClick: onIrMisInscripciones },
    { titulo: 'Notificaciones', icono: <IconoNotificaciones />, onClick: irNotificaciones, insignia: noLeidas },
  ];

  useEffect(() => {
    const controlador = new AbortController();

    const actualizar = () => {
      contarNoLeidas(controlador.signal)
        .then((respuesta) => {
          if (!controlador.signal.aborted) setNoLeidas(respuesta.cantidad);
        })
        .catch(() => {
          /* Si falla, se conserva el valor anterior. */
        });

      obtenerMisNotificaciones(controlador.signal)
        .then(procesarNotificaciones)
        .catch(() => {
          /* La consulta del Toast no altera el contador del dashboard. */
        });
    };

    actualizar();
    const intervalo = window.setInterval(actualizar, 60_000);

    return () => {
      controlador.abort();
      window.clearInterval(intervalo);
    };
  }, [procesarNotificaciones]);

  const anchoContenido = sidebarAbierto
    ? 'lg:pl-[calc(clamp(240px,17vw,280px)+clamp(0.75rem,1.25vw,1.25rem))]'
    : 'lg:pl-[calc(clamp(74px,5vw,84px)+clamp(0.75rem,1.25vw,1.25rem))]';

  const ejecutarAcceso = (accion: () => void, movil: boolean) => {
    if (movil) setMenuMovilAbierto(false);
    accion();
  };

  const enlacesNavegacion = (movil = false) => (
    <>
      <Link
        to="/"
        onClick={(evento) => {
          evento.stopPropagation();
          if (movil) setMenuMovilAbierto(false);
        }}
        title={!movil && !sidebarAbierto ? 'Inicio' : undefined}
        className={`group flex items-center rounded-2xl py-3 text-[#718078] transition-all duration-300 hover:bg-white hover:text-[#0b6849] dark:text-[#a7bdb1] dark:hover:bg-white/[0.06] dark:hover:text-white ${movil || sidebarAbierto ? 'gap-3 px-3' : 'justify-center px-2'}`}
      >
        <span className="shrink-0 transition-transform duration-300 group-hover:-translate-y-0.5"><IconoCasa /></span>
        {(movil || sidebarAbierto) && <span className="font-brand text-sm font-semibold">Inicio</span>}
      </Link>

      <Link
        to="/asociado/dashboard"
        onClick={(evento) => {
          evento.stopPropagation();
          if (movil) setMenuMovilAbierto(false);
        }}
        title={!movil && !sidebarAbierto ? 'Panel de control' : undefined}
        aria-current="page"
        className={`group relative flex items-center rounded-2xl bg-[#0b6849] py-3 text-white shadow-[0_12px_28px_rgba(11,104,73,0.22)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#095b40] ${movil || sidebarAbierto ? 'gap-3 px-3' : 'justify-center px-2'}`}
      >
        <span className="shrink-0 transition-transform duration-300 group-hover:scale-105"><IconoDashboard /></span>
        {(movil || sidebarAbierto) && <span className="font-brand text-sm font-semibold">Panel de control</span>}
      </Link>

      {accesos.map((acceso) => (
        <button
          key={acceso.titulo}
          type="button"
          onClick={(evento) => {
            evento.stopPropagation();
            ejecutarAcceso(acceso.onClick, movil);
          }}
          title={!movil && !sidebarAbierto ? acceso.titulo : undefined}
          className={`group flex min-h-11 w-full items-center rounded-2xl py-3 text-left text-[#718078] transition-all duration-300 hover:bg-white hover:text-[#0b6849] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00AEEF] dark:text-[#a7bdb1] dark:hover:bg-white/[0.06] dark:hover:text-white ${movil || sidebarAbierto ? 'gap-3 px-3' : 'justify-center px-2'}`}
        >
          <span className="shrink-0 transition-transform duration-300 group-hover:-translate-y-0.5">{acceso.icono}</span>
          {(movil || sidebarAbierto) && <span className="min-w-0 flex-1 font-brand text-sm font-semibold leading-5">{acceso.titulo}</span>}
          {typeof acceso.insignia === 'number' && acceso.insignia > 0 && (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1.5 text-[10px] font-bold text-white">
              {acceso.insignia > 99 ? '99+' : acceso.insignia}
            </span>
          )}
        </button>
      ))}
    </>
  );

  const botonCerrarSesion = (movil = false) => (
    <button
      type="button"
      onClick={(evento) => {
        evento.preventDefault();
        evento.stopPropagation();
        if (movil) setMenuMovilAbierto(false);
        onCerrarSesion();
      }}
      title={!movil && !sidebarAbierto ? 'Cerrar sesión' : undefined}
      className={`group flex min-h-11 w-full items-center rounded-2xl py-3 text-left text-[#877870] transition-all duration-300 hover:bg-red-50 hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 disabled:cursor-not-allowed disabled:opacity-50 dark:text-[#c6aaa1] dark:hover:bg-red-950/30 dark:hover:text-red-300 ${movil || sidebarAbierto ? 'gap-3 px-3' : 'justify-center px-2'}`}
    >
      <span className="shrink-0 transition-transform duration-300 group-hover:translate-x-0.5"><IconoCerrarSesion /></span>
      {(movil || sidebarAbierto) && <span className="font-brand text-sm font-semibold">Cerrar sesión</span>}
    </button>
  );

  return (
    <main
      className="relative isolate min-h-[100dvh] overflow-x-hidden bg-[#eef2ef] px-2.5 py-2.5 text-[#16382b] transition-colors duration-700 dark:bg-[#071c14] dark:text-[#edf8f1] min-[360px]:px-3 min-[360px]:py-3 sm:px-4 sm:py-4 md:px-5 md:py-5 lg:px-7 lg:py-6"
    >
      {/* Fondo ambiental con el mismo tratamiento del panel Super Admin. */}
      <img
        src={imagenParque}
        alt=""
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 -z-30 h-full w-full scale-110 object-cover opacity-[0.38] blur-[20px] saturate-[0.72] brightness-[1.02] transition-all duration-700 dark:opacity-[0.42] dark:brightness-[0.58] dark:saturate-[0.82]"
      />
      <div className="pointer-events-none fixed inset-0 -z-20 bg-[#eef4ef]/46 backdrop-blur-[3px] transition-colors duration-700 dark:bg-[#071c14]/58" />

      {/* Barra superior para móvil y tableta. */}
      <header className="fixed inset-x-2.5 top-2.5 z-50 flex min-h-[4rem] items-center justify-between rounded-[1.5rem] border border-white/55 bg-white/42 px-3 py-2.5 shadow-[0_18px_50px_rgba(11,58,39,0.10)] backdrop-blur-[26px] sm:px-4 sm:py-3 lg:hidden dark:border-white/[0.08] dark:bg-[#0d2b20]/48">
        <Link to="/" className="flex min-w-0 items-center gap-3" aria-label="Ir al inicio">
          <img src={logo} alt="Aliados del Parque Nacional Diriá" className="h-10 w-10 shrink-0 object-contain dark:brightness-0 dark:invert" />
          <div className="min-w-0">
            <p className="font-brand text-[9px] font-bold uppercase tracking-[0.16em] text-[#009443]">Panel de</p>
            <p className="truncate font-brand text-sm font-extrabold text-[#0d5f42] dark:text-[#e2f3e8]">Asociado</p>
          </div>
        </Link>
        <button
          type="button"
          onClick={() => setMenuMovilAbierto((actual) => !actual)}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/60 bg-white/55 text-[#0b6849] shadow-[0_10px_25px_rgba(11,58,39,0.08)] backdrop-blur-xl transition-transform duration-300 active:scale-95 dark:border-white/[0.10] dark:bg-white/[0.06] dark:text-[#e4f5eb]"
          aria-label={menuMovilAbierto ? 'Cerrar menú' : 'Abrir menú'}
          aria-expanded={menuMovilAbierto}
        >
          <IconoMenu abierto={menuMovilAbierto} />
        </button>
      </header>

      {menuMovilAbierto && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-[55] bg-[#08271c]/30 backdrop-blur-sm lg:hidden"
            aria-label="Cerrar menú"
            onClick={() => setMenuMovilAbierto(false)}
          />
          <aside className="fixed inset-x-3 bottom-3 top-[5.25rem] z-[60] flex min-h-0 flex-col overflow-hidden rounded-[1.8rem] border border-white/60 bg-white/55 p-4 shadow-[0_30px_90px_rgba(11,58,39,0.18)] backdrop-blur-[30px] lg:hidden dark:border-white/[0.10] dark:bg-[#0d2b20]/72">
            <div className="flex shrink-0 items-center justify-between border-b border-black/[0.06] pb-4 dark:border-white/[0.07]">
              <div className="flex min-w-0 items-center gap-3">
                <img src={logo} alt="Aliados del Parque Nacional Diriá" className="h-11 w-11 shrink-0 object-contain dark:brightness-0 dark:invert" />
                <div className="min-w-0">
                  <p className="font-brand text-[9px] font-bold uppercase tracking-[0.16em] text-[#009443]">Espacio del asociado</p>
                  <p className="truncate font-brand text-sm font-extrabold text-[#174c38] dark:text-[#e7f5ed]">{nombreUsuario}</p>
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
            <nav className="mt-4 flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto overscroll-contain pr-1 [scrollbar-color:rgba(11,104,73,0.32)_transparent] [scrollbar-width:thin]" aria-label="Navegación móvil del asociado">
              {enlacesNavegacion(true)}
            </nav>
            <div className="shrink-0 border-t border-black/[0.06] pt-4 dark:border-white/[0.07]">
              {botonCerrarSesion(true)}
            </div>
            <div className="mt-3 shrink-0 rounded-xl border border-white/60 bg-white/35 px-3 py-3 font-brand text-[9px] font-bold uppercase tracking-[0.14em] text-[#829188] dark:border-white/[0.07] dark:text-[#a9beb2]">
              Espacio del asociado <span className="float-right mt-1 h-1.5 w-1.5 rounded-full bg-[#00AEEF]" />
            </div>
          </aside>
        </>
      )}

      {/* Sidebar fija. Su ancho y el desplazamiento del contenido se animan juntos. */}
      <aside
        onClick={() => setSidebarAbierto((actual) => !actual)}
        aria-label={sidebarAbierto ? 'Menú lateral. Haz clic en un espacio vacío para contraerlo.' : 'Menú lateral. Haz clic para expandirlo.'}
        className={`fixed left-3 top-3 z-40 hidden h-[calc(100dvh-1.5rem)] max-h-[calc(100dvh-1.5rem)] min-h-0 cursor-pointer flex-col overflow-hidden rounded-[2rem] border border-white/55 bg-white/42 shadow-[0_24px_70px_rgba(11,58,39,0.14)] backdrop-blur-[28px] transition-[width] duration-500 ease-[cubic-bezier(.22,1,.36,1)] dark:border-white/[0.10] dark:bg-[#0d2b20]/48 lg:flex lg:left-5 lg:top-5 lg:h-[calc(100dvh-2.5rem)] xl:left-6 xl:top-6 xl:h-[calc(100dvh-3rem)] ${sidebarAbierto ? 'w-[232px] lg:w-[clamp(240px,17vw,280px)]' : 'w-[72px] lg:w-[clamp(74px,5vw,84px)]'}`}
      >
        <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-[#00AEEF]/50 to-transparent" />

        {/* Logo */}
        <div className="shrink-0 px-3 pt-4 sm:pt-5">
          <Link
            to="/"
            onClick={(evento) => evento.stopPropagation()}
            aria-label="Ir al inicio"
            title={!sidebarAbierto ? 'Inicio' : undefined}
            className="group flex items-center justify-center rounded-2xl outline-none transition-all duration-300 focus-visible:ring-2 focus-visible:ring-[#00AEEF]/50"
          >
            <img
              src={logo}
              alt="Aliados del Parque Nacional Diriá"
              className={`object-contain transition-all duration-300 group-hover:-translate-y-0.5 dark:brightness-0 dark:invert ${sidebarAbierto ? 'h-[72px] w-[72px] xl:h-[82px] xl:w-[82px]' : 'h-11 w-11 xl:h-12 xl:w-12'}`}
            />
          </Link>
        </div>

        {/* Estado de la cuenta */}
        <div className={`${sidebarAbierto ? 'px-5' : 'px-3'} mt-4 shrink-0 xl:mt-6`}>
          <div
            className={`relative overflow-hidden rounded-2xl border border-white/55 bg-white/28 shadow-[0_10px_30px_rgba(11,58,39,0.06)] backdrop-blur-2xl transition-all duration-500 dark:border-white/[0.12] dark:bg-[#16372b]/78 dark:shadow-[0_14px_34px_rgba(0,0,0,0.24)] ${sidebarAbierto ? 'p-3.5 xl:p-4' : 'p-2.5'}`}
            title={!sidebarAbierto ? 'Estado: Asociado' : undefined}
          >
            <span className="absolute -right-8 -top-8 h-20 w-20 rounded-full bg-[#8dc63f]/25 blur-2xl" />
            <div className={`relative z-10 flex items-center ${sidebarAbierto ? 'gap-3' : 'justify-center'}`}>
              <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-[#8dc63f] shadow-[0_0_0_5px_rgba(141,198,63,0.12)]" />
              {sidebarAbierto && (
                <div className="min-w-0 flex-1">
                  <p className="font-brand text-[10px] font-semibold uppercase tracking-[0.15em] text-[#708279] dark:text-[#a6beb0]">Estado</p>
                  <p className="font-brand text-sm font-bold text-[#174c38] dark:text-[#e2f3e8]">Asociado</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <nav
          className={`${sidebarAbierto ? 'px-4' : 'px-3'} mt-4 flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto overscroll-contain pb-3 pr-1 [scrollbar-color:rgba(11,104,73,0.32)_transparent] [scrollbar-width:thin] xl:mt-6`}
          aria-label="Navegación del asociado"
        >
          <Link
            to="/"
            onClick={(evento) => evento.stopPropagation()}
            title={!sidebarAbierto ? 'Inicio' : undefined}
            className={`group flex shrink-0 items-center rounded-2xl py-3 text-[#718078] transition-all duration-300 hover:bg-white hover:text-[#0b6849] dark:text-[#a7bdb1] dark:hover:bg-white/[0.06] dark:hover:text-white ${sidebarAbierto ? 'gap-3 px-3' : 'justify-center px-2'}`}
          >
            <span className="transition-transform duration-300 group-hover:-translate-y-0.5"><IconoCasa /></span>
            {sidebarAbierto && <span className="font-brand text-sm font-semibold">Inicio</span>}
          </Link>

          <Link
            to="/asociado/dashboard"
            onClick={(evento) => evento.stopPropagation()}
            title={!sidebarAbierto ? 'Panel de control' : undefined}
            aria-current="page"
            className={`group flex shrink-0 items-center rounded-2xl bg-[#0b6849] py-3 text-white shadow-[0_12px_28px_rgba(11,104,73,0.22)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#095b40] ${sidebarAbierto ? 'gap-3 px-3' : 'justify-center px-2'}`}
          >
            <span className="transition-transform duration-300 group-hover:scale-105"><IconoDashboard /></span>
            {sidebarAbierto && <span className="font-brand text-sm font-semibold">Panel de control</span>}
          </Link>

          {accesos.map((acceso) => (
            <button
              key={acceso.titulo}
              type="button"
              onClick={(evento) => {
                evento.stopPropagation();
                acceso.onClick();
              }}
              title={!sidebarAbierto ? acceso.titulo : undefined}
              className={`group flex min-h-11 w-full shrink-0 items-center rounded-2xl py-3 text-left text-[#718078] transition-all duration-300 hover:bg-white hover:text-[#0b6849] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00AEEF] dark:text-[#a7bdb1] dark:hover:bg-white/[0.06] dark:hover:text-white ${sidebarAbierto ? 'gap-3 px-3' : 'justify-center px-2'}`}
            >
              <span className="shrink-0 transition-transform duration-300 group-hover:-translate-y-0.5">{acceso.icono}</span>
              {sidebarAbierto && <span className="min-w-0 flex-1 font-brand text-sm font-semibold leading-5">{acceso.titulo}</span>}
              {typeof acceso.insignia === 'number' && acceso.insignia > 0 && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1.5 text-[10px] font-bold text-white">
                  {acceso.insignia > 99 ? '99+' : acceso.insignia}
                </span>
              )}
            </button>
          ))}

          <div className="mx-3 mb-1 mt-auto h-px shrink-0 bg-black/[0.06] dark:bg-white/[0.06]" />
          {botonCerrarSesion(false)}

          <div className={`${sidebarAbierto ? 'px-1' : 'px-0'} shrink-0 pb-1 pt-2`}>
            <div className={`rounded-2xl border border-white/55 bg-white/24 p-3 backdrop-blur-xl transition-all duration-300 dark:border-white/[0.06] dark:bg-white/[0.025] ${sidebarAbierto ? '' : 'flex justify-center p-2'}`} title={!sidebarAbierto ? 'Espacio del asociado' : undefined}>
              {sidebarAbierto ? (
                <div className="flex items-center justify-between">
                  <span className="font-brand text-[9px] font-bold uppercase tracking-[0.16em] text-[#829188] dark:text-[#a9beb2]">Espacio del asociado</span>
                  <span className="h-1.5 w-1.5 rounded-full bg-[#00AEEF]" />
                </div>
              ) : (
                <Icono className="h-5 w-5 text-[#829188] dark:text-[#a9beb2]">
                  <path d="M4 7h16M4 12h16M4 17h16" />
                  <circle cx="9" cy="7" r="1.5" fill="currentColor" />
                  <circle cx="15" cy="12" r="1.5" fill="currentColor" />
                  <circle cx="11" cy="17" r="1.5" fill="currentColor" />
                </Icono>
              )}
            </div>
          </div>
        </nav>
      </aside>

      {/* Contenido principal: el padding cambia con una transición, igual que Super Admin. */}
      <div className={`relative z-0 pt-[5.25rem] transition-[padding] duration-500 sm:pt-[5.75rem] lg:pt-0 lg:pr-3 xl:pr-6 ${anchoContenido}`}>
        <section className="relative mx-auto flex min-h-[calc(100dvh-7rem)] w-full flex-col overflow-hidden rounded-[1.25rem] border border-white/48 bg-white/30 shadow-[0_30px_90px_rgba(11,58,39,0.10)] backdrop-blur-[30px] transition-[min-height,box-shadow,background-color] duration-700 min-[420px]:rounded-[1.5rem] sm:min-h-[calc(100dvh-7.5rem)] sm:rounded-[2rem] md:min-h-[calc(100dvh-8rem)] lg:min-h-[calc(100dvh-3rem)] lg:rounded-[2.5rem] dark:border-white/[0.08] dark:bg-[#0b241b]/34 dark:shadow-[0_30px_90px_rgba(0,0,0,0.30)]">
          <div className="pointer-events-none absolute left-1/2 top-0 h-px w-[65%] -translate-x-1/2 bg-gradient-to-r from-transparent via-white to-transparent opacity-80" />
          <div className="flex flex-1 flex-col px-3.5 py-3.5 min-[360px]:px-4 min-[360px]:py-4 sm:px-6 sm:py-6 md:px-7 md:py-7 lg:px-[clamp(2rem,3vw,3.5rem)] lg:pb-[clamp(2rem,3vw,3.5rem)] lg:pt-[clamp(1.5rem,2vw,2rem)]">
            <header className="flex flex-col gap-4 sm:gap-5 xl:flex-row xl:items-start xl:justify-between xl:gap-[clamp(1.5rem,3vw,3rem)]">
              <div className="min-w-0 max-w-4xl flex-1">
                <h1 className="max-w-[10ch] font-brand text-[clamp(2.05rem,9.5vw,3.75rem)] font-extrabold leading-[0.96] tracking-[-0.055em] text-[#143d2e] dark:text-[#eff9f3] sm:max-w-[14ch] sm:text-[clamp(2.35rem,7vw,3.75rem)] md:max-w-[18ch] md:text-[clamp(2.5rem,6vw,3.3rem)] lg:max-w-[17ch] lg:text-[clamp(3rem,4.2vw,4.15rem)] 2xl:max-w-[18ch] 2xl:text-[clamp(3.35rem,3.1vw,4.35rem)]">
                  Panel de asociado
                </h1>
                <p className="mt-3 max-w-[760px] font-brand text-[13px] leading-5 text-[#64776e] dark:text-[#b9cbc0] min-[360px]:text-sm sm:mt-4 sm:text-base sm:leading-7 lg:text-[17px]">
                  Gestiona tu emprendimiento, consulta las actividades y mantente al día con tus inscripciones desde un solo lugar.
                </p>
              </div>

              <div className="flex w-full max-w-full items-center gap-3 rounded-[1.4rem] border border-white/55 bg-white/30 px-4 py-3 shadow-[0_12px_35px_rgba(0,0,0,0.05)] backdrop-blur-xl sm:w-fit sm:min-w-[205px] sm:max-w-[240px] dark:border-white/[0.07] dark:bg-white/[0.045]">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#8dc63f] to-[#009443] text-sm font-bold text-white shadow-sm">
                  {iniciales}
                </div>
                <div className="min-w-0">
                  <p className="font-brand text-[10px] font-semibold text-[#829188] dark:text-[#9fb5a9]">¡Hola!</p>
                  <p className="truncate font-brand text-sm font-bold text-[#173d2e] dark:text-[#eaf6ef]">{nombreUsuario}</p>
                </div>
              </div>
            </header>

            <div className="mt-6 flex items-center gap-1.5 sm:mt-8 sm:gap-2" aria-hidden="true">
              <span className="h-1.5 w-10 rounded-full bg-[#009443] sm:w-16" />
              <span className="h-1.5 w-6 rounded-full bg-[#8dc63f] sm:w-8" />
              <span className="h-1.5 w-4 rounded-full bg-[#d9d823] sm:w-5" />
              <span className="h-1.5 w-5 rounded-full bg-[#00AEEF] sm:w-7" />
            </div>

            <section className="mt-6 min-[360px]:mt-7 sm:mt-8 lg:mt-[clamp(1.5rem,3vh,2.25rem)]" aria-labelledby="titulo-herramientas-asociado">
              <div className="mb-3 sm:mb-4">
                <h2 id="titulo-herramientas-asociado" className="font-brand text-2xl font-extrabold tracking-tight text-[#173d2e] dark:text-[#eaf6ef] sm:text-3xl">Tus herramientas</h2>
                <p className="mt-2 max-w-2xl font-brand text-sm leading-6 text-[#64776e] dark:text-[#b9cbc0]">
                  Selecciona una opción para continuar con tus gestiones en la asociación.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-3 min-[560px]:grid-cols-2 sm:gap-4 lg:gap-[clamp(0.9rem,1.25vw,1.25rem)] xl:grid-cols-3">
                <TarjetaAcceso
                  icono={<IconoEmprendimiento />}
                  titulo="Mi emprendimiento"
                  color="bg-[#dff1e7] text-[#15834d] dark:bg-emerald-300/[0.12] dark:text-[#83ddb0]"
                  onClick={onIrMiEmprendimiento}
                />
                <TarjetaAcceso
                  icono={<IconoIncidencias />}
                  titulo="Mis incidencias"
                  color="bg-[#f6e7df] text-[#b65b37] dark:bg-orange-300/[0.12] dark:text-[#f0ae8c]"
                  onClick={onIrMisIncidencias}
                />
                <TarjetaAcceso
                  icono={<IconoInscripciones />}
                  titulo="Mis inscripciones"
                  color="bg-[#e8f1dc] text-[#658b30] dark:bg-lime-300/[0.10] dark:text-[#c1dc83]"
                  onClick={onIrMisInscripciones}
                />
                <TarjetaAcceso
                  icono={<IconoNotificaciones />}
                  titulo="Notificaciones"
                  descripcion={noLeidas > 0 ? 'Sin leer' : 'Al día'}
                  insignia={noLeidas}
                  color="bg-[#e2eff8] text-[#1679a6] dark:bg-sky-300/[0.12] dark:text-[#7bcbed]"
                  onClick={irNotificaciones}
                />
              </div>
            </section>

            <footer className="relative mt-8 border-t border-black/[0.05] pt-5 dark:border-white/[0.06] sm:mt-10 sm:pt-6 lg:mt-auto">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#009443]" />
                  <p className="font-brand text-xs font-semibold text-[#74847c] dark:text-[#a9beb2]">Aliados del Parque Nacional Diriá</p>
                </div>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-brand text-[8px] font-bold uppercase tracking-[0.12em] sm:gap-x-4 sm:text-[9px] sm:tracking-[0.15em]">
                  <span className="text-[#009443]">Guanacaste</span>
                  <span className="text-[#00AEEF]">Costa Rica</span>
                  <span className="text-[#d0cf21]">Parque Nacional Diriá</span>
                </div>
              </div>
            </footer>
          </div>
        </section>
      </div>
      <NotificacionToast
        notificaciones={notificacionesToast}
        onClose={cerrarTodas}
      />
    </main>
  );
}
