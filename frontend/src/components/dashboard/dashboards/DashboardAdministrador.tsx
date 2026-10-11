import { useEffect, useState, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import logo from '../../../assets/logo.png';
import imagenParque from '../../../assets/parque-hero.jpg';
import { useConteoEmprendimientos } from '../../../hook/useConteoEmprendimientos';
import { useConteoEventos } from '../../../hook/useConteoEventos';
import { obtenerDashboardAdministrador } from '../../../services/dashboardService';
import {
  contarNoLeidas,
  obtenerMisNotificaciones,
} from '../../../services/notificacionesService';
import useNotificacionToast from '../../../hooks/useNotificacionToast';
import NotificacionToast from '../../Notificaciones/NotificacionToast';
import GestionPreguntasFrecuentes from '../../GestionPreguntasFrecuentes';

interface DashboardAdministradorProps {
  onIrRoles: () => void;
  onIrEmprendimientos: () => void;
  onIrEventos: () => void;
  onIrInscripciones: () => void;
  onIrIncidencias: () => void;
  onIrReportes: () => void;
  onIrComunicados: () => void;
  onIrPreguntasFrecuentes: () => void;
}

type EstadoCarga = 'cargando' | 'listo' | 'error';

/* ───────────── Iconos ───────────── */

function Icono({ children }: { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
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

const iconos = {
  inicio: (
    <Icono>
      <path d="m3 10 9-7 9 7" />
      <path d="M5 9v11h14V9" />
      <path d="M9 20v-6h6v6" />
    </Icono>
  ),
  dashboard: (
    <Icono>
      <rect x="4" y="4" width="6" height="6" rx="1.2" />
      <rect x="14" y="4" width="6" height="6" rx="1.2" />
      <rect x="4" y="14" width="6" height="6" rx="1.2" />
      <rect x="14" y="14" width="6" height="6" rx="1.2" />
    </Icono>
  ),
  roles: (
    <Icono>
      <circle cx="9" cy="8" r="3" />
      <path d="M3.5 20a5.5 5.5 0 0 1 11 0" />
      <path d="M16 8h5M18.5 5.5v5" />
    </Icono>
  ),
  emprendimientos: (
    <Icono>
      <path d="M4 20h16" />
      <path d="M6 20V9l6-5 6 5v11" />
      <path d="M9 20v-5h6v5M9 10h.01M15 10h.01" />
    </Icono>
  ),
  eventos: (
    <Icono>
      <rect x="4" y="5" width="16" height="15" rx="2" />
      <path d="M8 3v4M16 3v4M4 10h16M8 14h3M8 17h6" />
    </Icono>
  ),
  inscripciones: (
    <Icono>
      <rect x="5" y="4" width="14" height="16" rx="2" />
      <path d="M8 8h8M8 12h8M8 16h5" />
    </Icono>
  ),
  incidencias: (
    <Icono>
      <path d="M12 3 2.8 20h18.4L12 3Z" />
      <path d="M12 9v5M12 17h.01" />
    </Icono>
  ),
  comunicados: (
    <Icono>
      <path d="M4 10v4h3l7 4V6l-7 4H4Z" />
      <path d="M17 9a4 4 0 0 1 0 6" />
    </Icono>
  ),
  preguntasFrecuentes: (
    <Icono>
      <path d="M5 5h14v11H9l-4 4V5Z" />
      <path d="M9 9h6M9 12h4" />
    </Icono>
  ),
  reportes: (
    <Icono>
      <path d="M4 19h16" />
      <path d="M7 19v-6M12 19v-10M17 19v-4" />
    </Icono>
  ),
  notificaciones: (
    <Icono>
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
      <path d="M10 21h4" />
    </Icono>
  ),
};

/* ───────────── Utilidades ───────────── */

const obtenerMensajeError = (error: unknown): string => {
  const { status, message } = error as { status?: unknown; message?: unknown };

  if (status === 401) {
    return 'Tu sesión no es válida. Inicia sesión nuevamente para continuar.';
  }
  if (status === 403) {
    return 'No tienes permisos para acceder a este dashboard.';
  }
  if (typeof message === 'string' && message.trim()) {
    return message;
  }
  return 'No fue posible cargar el dashboard. Inténtalo nuevamente.';
};

const claseItemBase =
  'group flex w-full shrink-0 items-center rounded-2xl py-3 text-left ' +
  'text-[#718078] transition-all duration-300 hover:bg-white hover:text-[#0b6849] ' +
  'dark:text-[#a7bdb1] dark:hover:bg-white/[0.06] dark:hover:text-white';

const claseItemActivo =
  'group flex w-full shrink-0 items-center rounded-2xl bg-[#0b6849] py-3 text-white ' +
  'shadow-[0_12px_28px_rgba(11,104,73,0.22)] transition-all duration-300 hover:-translate-y-0.5';

/* ───────────── Componentes ───────────── */

interface ItemMenuProps {
  abierto: boolean;
  icono: ReactNode;
  etiqueta: string;
  activo?: boolean;
  to?: string;
  onClick?: () => void;
  insignia?: number;
}

/** Elemento del menú lateral: es un Link si recibe `to`, o un botón si recibe `onClick`. */
function ItemMenu({ abierto, icono, etiqueta, activo, to, onClick, insignia }: ItemMenuProps) {
  const clase = `${activo ? claseItemActivo : claseItemBase} ${
    abierto ? 'gap-3 px-3' : 'justify-center px-2'
  }`;

  const contenido = (
    <>
      <span className="relative shrink-0">
        {icono}
        {!!insignia && insignia > 0 && !abierto && (
          <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-[#d9d823] ring-2 ring-white dark:ring-[#0d2b20]" />
        )}
      </span>

      {abierto && (
        <>
          <span className="font-brand text-sm font-semibold">{etiqueta}</span>
          {!!insignia && insignia > 0 && (
            <span className="ml-auto rounded-full bg-[#d9d823]/30 px-2 py-0.5 text-[10px] font-bold text-[#777600] dark:text-[#e5e36a]">
              {insignia > 99 ? '99+' : insignia}
            </span>
          )}
        </>
      )}
    </>
  );

  if (to) {
    return (
      <Link to={to} onClick={(e) => e.stopPropagation()} className={clase}>
        {contenido}
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
      className={clase}
    >
      {contenido}
    </button>
  );
}

interface TarjetaResumenProps {
  icono: ReactNode;
  titulo: string;
  valor: number;
  etiqueta: string;
  brillo: string;
  claseIcono: string;
  claseEtiqueta: string;
  onClick?: () => void;
}

/** Tarjeta de resumen. Si recibe `onClick` se comporta como botón. */
function TarjetaResumen({
  icono,
  titulo,
  valor,
  etiqueta,
  brillo,
  claseIcono,
  claseEtiqueta,
  onClick,
}: TarjetaResumenProps) {
  const base =
    'group relative overflow-hidden rounded-3xl border border-white/20 bg-white/70 p-6 ' +
    'shadow-xl backdrop-blur-md dark:border-white/[0.08] dark:bg-slate-900/70';

  const contenido = (
    <>
      <div className={`absolute -right-8 -top-10 h-24 w-24 rounded-full blur-2xl ${brillo}`} />

      <div className="relative flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <span className={`flex h-11 w-11 items-center justify-center rounded-xl ${claseIcono}`}>
            {icono}
          </span>

          <div>
            <p className="font-brand text-xs font-semibold text-[#60746b] dark:text-[#9eb5a9]">
              {titulo}
            </p>
            <p className="mt-1 font-brand text-3xl font-extrabold tracking-[-0.05em] text-[#173d2e] dark:text-[#eaf6ef]">
              {valor}
            </p>
          </div>
        </div>

        <span className={`rounded-full px-3 py-1 text-[10px] font-bold ${claseEtiqueta}`}>
          {etiqueta}
        </span>
      </div>
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`${base} text-left transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl`}
      >
        {contenido}
      </button>
    );
  }

  return <article className={base}>{contenido}</article>;
}

/* ───────────── Página ───────────── */

export default function DashboardAdministrador({
  onIrRoles,
  onIrEmprendimientos,
  onIrEventos,
  onIrInscripciones,
  onIrIncidencias,
  onIrReportes,
  onIrComunicados,
}: DashboardAdministradorProps) {
  const navigate = useNavigate();

  const [sidebarAbierto, setSidebarAbierto] = useState(true);
  const [menuMovilAbierto, setMenuMovilAbierto] = useState(false);
  const [estado, setEstado] = useState<EstadoCarga>('cargando');
  const [mensajeError, setMensajeError] = useState('');
  const [intento, setIntento] = useState(0);
  const [vistaPreguntasFrecuentes, setVistaPreguntasFrecuentes] = useState(false);
  const [noLeidas, setNoLeidas] = useState(0);
  const { notificacionActual, procesarNotificaciones, cerrarActual } =
    useNotificacionToast();

  const { conteo } = useConteoEmprendimientos();
  const { conteo: conteoEventos } = useConteoEventos();

  /* Carga general del dashboard */
  useEffect(() => {
    let activo = true;

    const cargar = async () => {
      setEstado('cargando');
      setMensajeError('');

      try {
        await obtenerDashboardAdministrador();
        if (activo) setEstado('listo');
      } catch (error) {
        if (!activo) return;
        setMensajeError(obtenerMensajeError(error));
        setEstado('error');
      }
    };

    void cargar();

    return () => {
      activo = false;
    };
  }, [intento]);

  /* Notificaciones no leídas: al entrar y luego cada 60 s */
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

  const opciones = [
    { etiqueta: 'Gestión de roles', icono: iconos.roles, accion: onIrRoles },
    { etiqueta: 'Emprendimientos', icono: iconos.emprendimientos, accion: onIrEmprendimientos },
    { etiqueta: 'Eventos y capacitaciones', icono: iconos.eventos, accion: onIrEventos },
    { etiqueta: 'Inscripciones', icono: iconos.inscripciones, accion: onIrInscripciones },
    { etiqueta: 'Incidencias', icono: iconos.incidencias, accion: onIrIncidencias },
    { etiqueta: 'Comunicados', icono: iconos.comunicados, accion: onIrComunicados },
    { etiqueta: 'Preguntas frecuentes', icono: iconos.preguntasFrecuentes, accion: () => setVistaPreguntasFrecuentes(true) },
    { etiqueta: 'Reportes y estadísticas', icono: iconos.reportes, accion: onIrReportes },
  ];

  const irNotificaciones = () => navigate('/notificaciones');

  const anchoContenido = sidebarAbierto
    ? 'lg:pl-[clamp(250px,18vw,318px)]'
    : 'lg:pl-[clamp(96px,7vw,136px)]';

  const claseItemMovil =
    'flex min-h-11 w-full items-center gap-3 rounded-2xl bg-white/60 px-4 py-3 text-left ' +
    'font-brand text-sm font-semibold text-[#21473a] dark:bg-white/[0.05] dark:text-[#e4f3ea]';

  return (
    <main className="relative isolate min-h-[100dvh] overflow-x-hidden bg-[#eef2ef] px-3 py-3 text-[#16382b] transition-colors duration-700 dark:bg-[#071c14] dark:text-[#edf8f1] sm:px-4 sm:py-4 lg:h-[100dvh] lg:overflow-hidden lg:px-7 lg:py-6">
      {/* Fondo */}
      <img
        src={imagenParque}
        alt=""
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 -z-30 h-full w-full scale-110 object-cover opacity-[0.38] blur-[20px] saturate-[0.72] dark:opacity-[0.42] dark:brightness-[0.58]"
      />
      <div className="pointer-events-none fixed inset-0 -z-20 bg-[#eef4ef]/46 backdrop-blur-[3px] dark:bg-[#071c14]/58" />

      {/* Sidebar (escritorio) */}
      <aside
        onClick={() => setSidebarAbierto((actual) => !actual)}
        aria-label="Menú lateral administrativo"
        className={`fixed left-3 top-3 z-50 hidden h-[calc(100dvh-1.5rem)] cursor-pointer flex-col overflow-hidden rounded-[2rem] border border-white/55 bg-white/42 shadow-[0_24px_70px_rgba(11,58,39,0.14)] backdrop-blur-[28px] transition-[width] duration-500 dark:border-white/[0.10] dark:bg-[#0d2b20]/48 lg:left-5 lg:top-5 lg:flex lg:h-[calc(100dvh-2.5rem)] ${
          sidebarAbierto
            ? 'w-[220px] lg:w-[clamp(228px,16vw,280px)]'
            : 'w-[72px] lg:w-[clamp(74px,5vw,84px)]'
        }`}
      >
        <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-[#00AEEF]/50 to-transparent" />

        <div className="flex shrink-0 items-center justify-center px-3 pt-5">
          <Link to="/" onClick={(e) => e.stopPropagation()} className="group rounded-2xl">
            <img
              src={logo}
              alt="Aliados del Parque Nacional Diriá"
              className="h-[82px] w-[82px] object-contain transition-transform group-hover:-translate-y-0.5 dark:brightness-0 dark:invert"
            />
          </Link>
        </div>

        <div className={`${sidebarAbierto ? 'px-5' : 'px-3'} mt-7 shrink-0`}>
          <div
            className={`relative overflow-hidden rounded-2xl border border-white/55 bg-white/28 shadow-[0_10px_30px_rgba(11,58,39,0.06)] backdrop-blur-2xl dark:border-white/[0.12] dark:bg-[#16372b]/78 ${
              sidebarAbierto ? 'p-4' : 'p-2.5'
            }`}
          >
            <span className="absolute -right-8 -top-8 h-20 w-20 rounded-full bg-[#8dc63f]/25 blur-2xl" />

            <div className={`relative flex items-center ${sidebarAbierto ? 'gap-3' : 'justify-center'}`}>
              <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-[#8dc63f] shadow-[0_0_0_5px_rgba(141,198,63,0.12)]" />

              {sidebarAbierto && (
                <div>
                  <p className="font-brand text-[10px] font-semibold uppercase tracking-[0.15em] text-[#708279] dark:text-[#a6beb0]">
                    Estado
                  </p>
                  <p className="font-brand text-sm font-bold text-[#174c38] dark:text-[#e2f3e8]">
                    Administrador
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        <nav
          aria-label="Navegación administrativa"
          className={`${sidebarAbierto ? 'px-4' : 'px-3'} mt-7 flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto overscroll-contain [scrollbar-width:thin] [scrollbar-color:rgba(11,104,73,0.35)_transparent] [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[#0b6849]/30 [&::-webkit-scrollbar-track]:bg-transparent`}
        >
          <ItemMenu abierto={sidebarAbierto} icono={iconos.inicio} etiqueta="Inicio" to="/" />
          <ItemMenu
            abierto={sidebarAbierto}
            icono={iconos.dashboard}
            etiqueta="Dashboard"
            to="/admin/dashboard"
            activo
          />

          {opciones.map((opcion) => (
            <ItemMenu
              key={opcion.etiqueta}
              abierto={sidebarAbierto}
              icono={opcion.icono}
              etiqueta={opcion.etiqueta}
              onClick={opcion.accion}
            />
          ))}

          <ItemMenu
            abierto={sidebarAbierto}
            icono={iconos.notificaciones}
            etiqueta="Notificaciones"
            onClick={irNotificaciones}
            insignia={noLeidas}
          />
        </nav>

        <div className={`${sidebarAbierto ? 'px-5 pb-5' : 'px-3 pb-4'} shrink-0`}>
          <div
            className={`rounded-2xl border border-white/55 bg-white/28 backdrop-blur-xl dark:border-white/[0.10] dark:bg-white/[0.05] ${
              sidebarAbierto ? 'p-3.5' : 'p-2.5'
            }`}
          >
            <div className={`flex items-center ${sidebarAbierto ? 'gap-3' : 'justify-center'}`}>
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#0b6849] text-white">
                {iconos.dashboard}
              </span>

              {sidebarAbierto && (
                <div>
                  <p className="font-brand text-[9px] font-bold uppercase tracking-[0.14em] text-[#009443]">
                    Control del sistema
                  </p>
                  <p className="font-brand text-xs font-semibold text-[#567168] dark:text-[#b8cfc2]">
                    Panel administrativo
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </aside>

      {/* Cabecera móvil */}
      <header className="fixed inset-x-3 top-3 z-40 flex items-center justify-between rounded-[1.45rem] border border-white/60 bg-white/45 px-3 py-2.5 shadow-[0_14px_38px_rgba(11,58,39,0.11)] backdrop-blur-[24px] dark:border-white/[0.10] dark:bg-[#0d2b20]/60 lg:hidden">
        <Link to="/" className="flex items-center gap-2">
          <img
            src={logo}
            alt="Aliados del Parque Nacional Diriá"
            className="h-11 w-11 object-contain dark:brightness-0 dark:invert"
          />
          <span className="font-brand text-sm font-extrabold text-[#0d5f42] dark:text-[#e2f3e8]">
            Administración
          </span>
        </Link>

        <button
          type="button"
          onClick={() => setMenuMovilAbierto((actual) => !actual)}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-white/60 bg-white/55 text-[#0b6849] dark:border-white/[0.10] dark:bg-white/[0.06] dark:text-[#e4f5eb]"
          aria-label={menuMovilAbierto ? 'Cerrar menú' : 'Abrir menú'}
        >
          {menuMovilAbierto ? '×' : iconos.dashboard}
        </button>
      </header>

      {/* Menú móvil */}
      {menuMovilAbierto && (
        <div className="fixed inset-3 z-[60] overflow-y-auto rounded-[1.8rem] border border-white/60 bg-white/55 p-4 shadow-[0_30px_90px_rgba(11,58,39,0.18)] backdrop-blur-[30px] dark:border-white/[0.10] dark:bg-[#0d2b20]/72 lg:hidden">
          <div className="flex items-center justify-between border-b border-black/[0.06] pb-4 dark:border-white/[0.07]">
            <div className="flex items-center gap-3">
              <img
                src={logo}
                alt="Aliados del Parque Nacional Diriá"
                className="h-11 w-11 object-contain dark:brightness-0 dark:invert"
              />
              <div>
                <p className="font-brand text-[9px] font-bold uppercase tracking-[0.16em] text-[#009443]">
                  Control del sistema
                </p>
                <p className="font-brand text-sm font-extrabold text-[#174c38] dark:text-[#e7f5ed]">
                  Administración
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setMenuMovilAbierto(false)}
              aria-label="Cerrar menú"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-[#0b6849] text-lg text-white"
            >
              ×
            </button>
          </div>

          <nav className="mt-4 flex flex-col gap-2">
            <Link to="/" onClick={() => setMenuMovilAbierto(false)} className={claseItemMovil}>
              {iconos.inicio}
              Inicio
            </Link>

            <Link
              to="/admin/dashboard"
              onClick={() => setMenuMovilAbierto(false)}
              className="flex min-h-11 items-center gap-3 rounded-2xl bg-[#0b6849] px-4 py-3 font-brand text-sm font-semibold text-white"
            >
              {iconos.dashboard}
              Dashboard
            </Link>

            {opciones.map((opcion) => (
              <button
                key={opcion.etiqueta}
                type="button"
                onClick={() => {
                  setMenuMovilAbierto(false);
                  opcion.accion();
                }}
                className={claseItemMovil}
              >
                {opcion.icono}
                {opcion.etiqueta}
              </button>
            ))}

            <button
              type="button"
              onClick={() => {
                setMenuMovilAbierto(false);
                irNotificaciones();
              }}
              className={claseItemMovil}
            >
              {iconos.notificaciones}
              Notificaciones
              {noLeidas > 0 && (
                <span className="ml-auto rounded-full bg-[#d9d823]/30 px-2 py-0.5 text-[10px] font-bold text-[#777600] dark:text-[#e5e36a]">
                  {noLeidas > 99 ? '99+' : noLeidas}
                </span>
              )}
            </button>
          </nav>
        </div>
      )}

      {/* Contenido */}
      <div
        className={`relative z-0 pt-[5.5rem] transition-[padding] duration-500 lg:h-full lg:pr-3 lg:pt-0 ${anchoContenido}`}
      >
        {/*
          Corrección del corte inferior:
          la sección es un contenedor flex con altura fija en escritorio y el
          contenido interno usa flex-1 + min-h-0 + overflow-y-auto, así el scroll
          ocurre dentro de la tarjeta en lugar de recortarse.
        */}
        <section className="relative mx-auto flex min-h-[calc(100dvh-7rem)] w-full flex-col overflow-hidden rounded-[1.5rem] border border-white/48 bg-white/30 shadow-[0_30px_90px_rgba(11,58,39,0.10)] backdrop-blur-[30px] dark:border-white/[0.08] dark:bg-[#0b241b]/34 sm:rounded-[2rem] lg:h-full lg:min-h-0 lg:rounded-[2.5rem]">
          <div className="pointer-events-none absolute left-1/2 top-0 h-px w-[65%] -translate-x-1/2 bg-gradient-to-r from-transparent via-white to-transparent opacity-80" />

          <div className="flex flex-1 flex-col p-5 sm:p-7 lg:min-h-0 lg:overflow-y-auto lg:p-[clamp(2rem,3vw,3.5rem)] lg:pt-[clamp(3.75rem,7vh,6rem)]">
            {vistaPreguntasFrecuentes ? (
              <>
                <button
                  type="button"
                  onClick={() => setVistaPreguntasFrecuentes(false)}
                  className="mb-5 w-fit rounded-full border border-[#0b6849]/15 bg-white/60 px-4 py-2 font-brand text-sm font-semibold text-[#0b6849] transition-colors hover:bg-white dark:border-white/10 dark:bg-white/[0.06] dark:text-[#c9ead8] dark:hover:bg-white/10"
                >
                  ← Volver al dashboard
                </button>
                <GestionPreguntasFrecuentes />
              </>
            ) : (
              <>
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div className="max-w-4xl">
                <h1 className="text-5xl font-black tracking-tight text-emerald-950 dark:text-white">
                  Panel de Administración
                </h1>
                <p className="mt-4 max-w-[760px] font-brand text-sm leading-6 text-[#64776e] dark:text-[#b9cbc0] sm:text-base sm:leading-7">
                  Administra y supervisa las funciones clave de la plataforma Aliados del Parque
                  Nacional Diriá.
                </p>
              </div>

              <div className="flex w-fit shrink-0 items-center gap-3 rounded-[1.4rem] border border-white/55 bg-white/30 px-4 py-3 shadow-[0_12px_35px_rgba(0,0,0,0.05)] backdrop-blur-xl dark:border-white/[0.07] dark:bg-white/[0.045]">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-600 text-sm font-bold text-white">
                  A
                </div>
                <div>
                  <p className="font-brand text-[10px] font-semibold text-[#829188] dark:text-[#9fb5a9]">
                    Hola!
                  </p>
                  <p className="font-brand text-sm font-bold text-[#173d2e] dark:text-[#eaf6ef]">
                    Administrador
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-6 flex gap-2">
              <span className="h-1.5 w-16 rounded-full bg-[#009443]" />
              <span className="h-1.5 w-8 rounded-full bg-[#8dc63f]" />
              <span className="h-1.5 w-7 rounded-full bg-[#00AEEF]" />
            </div>

            <section className="mt-10">
              <p className="font-brand text-[15px] font-extrabold uppercase tracking-[0.17em] text-[#00AEEF]">
                Actividad reciente
              </p>

              <div className="mt-4 grid grid-cols-1 gap-4 min-[560px]:grid-cols-2">
                <TarjetaResumen
                  icono={iconos.emprendimientos}
                  titulo="Emprendimientos registrados"
                  valor={conteo.total}
                  etiqueta="Recientes"
                  brillo="bg-[#8dc63f]/15"
                  claseIcono="bg-[#009443]/10 text-[#009443]"
                  claseEtiqueta="bg-[#009443]/10 text-[#009443] dark:bg-[#009443]/15 dark:text-[#76d7b1]"
                />

                <TarjetaResumen
                  icono={iconos.eventos}
                  titulo="Eventos y capacitaciones"
                  valor={conteoEventos.todos}
                  etiqueta="Vigentes"
                  brillo="bg-[#00AEEF]/15"
                  claseIcono="bg-[#00AEEF]/10 text-[#008fbd]"
                  claseEtiqueta="bg-[#00AEEF]/10 text-[#007fae] dark:bg-[#00AEEF]/15 dark:text-[#69d8f7]"
                />

                <TarjetaResumen
                  icono={iconos.notificaciones}
                  titulo="Notificaciones"
                  valor={noLeidas}
                  etiqueta={noLeidas > 0 ? 'Sin leer' : 'Al día'}
                  brillo="bg-[#d9d823]/20"
                  claseIcono="bg-[#d9d823]/15 text-[#8b8a00] dark:text-[#d9d823]"
                  claseEtiqueta={
                    noLeidas > 0
                      ? 'bg-[#d9d823]/20 text-[#777600] dark:bg-[#d9d823]/15 dark:text-[#e5e36a]'
                      : 'bg-[#009443]/10 text-[#009443] dark:bg-[#009443]/15 dark:text-[#76d7b1]'
                  }
                  onClick={irNotificaciones}
                />
              </div>
            </section>

            {estado === 'error' && (
              <section
                role="alert"
                className="mt-6 rounded-3xl border border-[#d9d823]/70 bg-[#fffdf0]/90 p-5 text-[#073f31] shadow-[0_14px_35px_rgba(7,63,49,0.08)]"
              >
                <h2 className="font-bold">Dashboard no disponible</h2>
                <p className="mt-2 text-sm">{mensajeError}</p>
                <button
                  type="button"
                  onClick={() => setIntento((valor) => valor + 1)}
                  className="mt-4 rounded-full bg-[#095540] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#009444]"
                >
                  Reintentar
                </button>
              </section>
            )}

            <footer className="mt-auto border-t border-slate-200/50 pt-6 dark:border-white/10">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="flex items-center gap-2 font-brand text-xs font-semibold text-[#74847c] dark:text-[#a9beb2]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#009443]" />
                  Aliados del Parque Nacional Diriá
                </p>

                <p className="flex flex-wrap items-center gap-x-2 gap-y-1 font-brand text-[9px] font-bold uppercase tracking-[0.15em]">
                  <span className="text-[#009443]">Guanacaste</span>
                  <span className="text-slate-400">|</span>
                  <span className="text-[#00AEEF]">Costa Rica</span>
                  <span className="text-slate-400">|</span>
                  <span className="text-[#d0cf21]">Parque Nacional Diriá</span>
                </p>
              </div>
            </footer>
              </>
            )}
          </div>
        </section>
      </div>
      <NotificacionToast
        notificacion={notificacionActual}
        onClose={cerrarActual}
      />
    </main>
  );
}
