import { useEffect, useRef, useState } from 'react';

import { useNavigate } from 'react-router-dom';

import logo from '../../assets/logo.png';

import logoBlanco from '../../../logo-blanco.png';

import TemaInterfaz from '../ui/TemaInterfaz';

import {
  contarNoLeidas,
  obtenerMisNotificaciones,
} from '../../services/notificacionesService';
import useNotificacionToast from '../../hooks/useNotificacionToast';
import NotificacionToast from '../Notificaciones/NotificacionToast';
import { useLanguage } from '../../i18n/LanguageContext';

interface NavbarProps {
  onRegistro: () => void;
  onLogin: () => void;
  rolAutenticado: string | null;
  nombreUsuario: string | null;
  onCerrarSesion: () => void;
  onMisInscripciones?: () => void;
  onCuentasBloqueadas?: () => void;
  onBitacora?: () => void;
  onIrInicio: () => void;
  onIrEmprendimientos: () => void;
  onIrEventos: () => void;
  onRegistrarIncidencia?: () => void;
  seccionActiva?: 'inicio' | 'emprendimientos' | 'eventos' | 'incidencias';
  modoAdministracion?: boolean;
}

function Navbar({
  onRegistro: _onRegistro,
  onLogin,
  rolAutenticado,
  nombreUsuario,
  onCerrarSesion,
  onMisInscripciones,
  onCuentasBloqueadas: _onCuentasBloqueadas,
  onBitacora: _onBitacora,
  onIrInicio,
  onIrEmprendimientos,
  onIrEventos,
  onRegistrarIncidencia,
  seccionActiva = 'inicio',
  modoAdministracion = false,
}: NavbarProps) {
  const navigate = useNavigate();
  const { t } = useLanguage();

  const [scrolled, setScrolled] = useState(false);
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [menuUsuarioAbierto, setMenuUsuarioAbierto] = useState(false);
  const [navbarVisible, setNavbarVisible] = useState(true);

  const [noLeidas, setNoLeidas] = useState(0);
  const { notificacionActual, procesarNotificaciones, cerrarActual } =
    useNotificacionToast();

  const ultimoScrollY = useRef(0);
  const menuUsuarioRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const manejarScroll = () => {
      const scrollActual = window.scrollY;

      if (scrollActual < 50) {
        setNavbarVisible(true);
      } else if (scrollActual > ultimoScrollY.current) {
        setNavbarVisible(false);
      } else if (scrollActual < ultimoScrollY.current) {
        setNavbarVisible(true);
      }

      setScrolled(scrollActual > 50);
      ultimoScrollY.current = scrollActual;
    };

    window.addEventListener('scroll', manejarScroll);

    return () => {
      window.removeEventListener('scroll', manejarScroll);
    };
  }, []);

  useEffect(() => {
    const cerrarMenuUsuario = (evento: MouseEvent) => {
      if (
        menuUsuarioRef.current &&
        !menuUsuarioRef.current.contains(evento.target as Node)
      ) {
        setMenuUsuarioAbierto(false);
      }
    };

    const cerrarConEscape = (evento: KeyboardEvent) => {
      if (evento.key === 'Escape') {
        setMenuUsuarioAbierto(false);
      }
    };

    document.addEventListener('mousedown', cerrarMenuUsuario);
    document.addEventListener('keydown', cerrarConEscape);

    return () => {
      document.removeEventListener('mousedown', cerrarMenuUsuario);
      document.removeEventListener('keydown', cerrarConEscape);
    };
  }, []);

  // Las notificaciones del administrador se muestran en su dashboard.
  // Visitante, asociado y super_admin mantienen las notificaciones en el Navbar.
  useEffect(() => {
    if (!rolAutenticado || rolAutenticado === 'administrador') {
      setNoLeidas(0);
      return;
    }

    const controlador = new AbortController();

    const actualizar = () => {
      contarNoLeidas(controlador.signal)
        .then((respuesta) => {
          if (!controlador.signal.aborted) {
            setNoLeidas(respuesta.cantidad);
          }
        })
        .catch(() => {
          // Se conserva el valor anterior si ocurre un error.
        });

      obtenerMisNotificaciones(controlador.signal)
        .then(procesarNotificaciones)
        .catch(() => {
          // Un error al consultar la lista no afecta el contador existente.
        });
    };

    actualizar();

    const intervalo = window.setInterval(actualizar, 60_000);

    return () => {
      controlador.abort();
      window.clearInterval(intervalo);
    };
  }, [rolAutenticado, procesarNotificaciones]);

  const irInicio = () => {
    setMenuAbierto(false);
    onIrInicio();
  };

  const irEmprendimientos = () => {
    setMenuAbierto(false);
    onIrEmprendimientos();
  };

  const irDashboard = () => {
    setMenuAbierto(false);
    setMenuUsuarioAbierto(false);
    navigate('/admin/dashboard');
  };

  const irDashboardSuperAdmin = () => {
    setMenuAbierto(false);
    setMenuUsuarioAbierto(false);
    navigate('/super-admin/dashboard');
  };

  const irMisInscripciones = () => {
    setMenuAbierto(false);
    setMenuUsuarioAbierto(false);
    navigate('/mis-inscripciones');
    onMisInscripciones?.();
  };

  const irMisIncidencias = () => {
    setMenuAbierto(false);
    setMenuUsuarioAbierto(false);
    navigate('/mis-incidencias');
  };

  const irMisEmprendimientos = () => {
    setMenuUsuarioAbierto(false);
    onIrEmprendimientos();
  };

  const irNotificaciones = () => {
    setMenuAbierto(false);
    setMenuUsuarioAbierto(false);
    navigate('/notificaciones');
  };

  const cerrarSesionDesdeMenu = () => {
    setMenuUsuarioAbierto(false);
    onCerrarSesion();
  };

  const claseNavegacion =
    'rounded-full border border-transparent px-3.5 py-2 text-sm font-semibold text-[#17372c] motion-safe:transition-all motion-safe:duration-200 motion-safe:ease-out hover:bg-[#eef7e7]/70 hover:text-[#095540] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8dc63f] focus-visible:ring-offset-2';

  const claseNavegacionActiva =
    'border-white/60 bg-white/65 text-[#095540] shadow-sm backdrop-blur-lg';

  const claseNavegacionMovil =
    'w-full rounded-2xl border border-transparent px-4 py-3 text-left text-sm font-semibold text-[#17372c] motion-safe:transition-all motion-safe:duration-200 motion-safe:ease-out hover:bg-[#eef7e7]/70 hover:text-[#095540] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8dc63f]';

  const claseNavegacionMovilActiva =
    'border-white/60 bg-white/65 text-[#095540] shadow-sm backdrop-blur-lg';

  return (
    <nav
      className={`fixed inset-x-0 top-3 z-50 px-3 sm:top-4 sm:px-5
        transition-transform duration-300 ease-in-out
        ${
          navbarVisible || menuAbierto
            ? 'translate-y-0'
            : '-translate-y-[150%]'
        }`}
      aria-label="Navegación principal"
    >
      <div
        className={`mx-auto max-w-7xl overflow-visible border border-white/70 bg-white/90 backdrop-blur-xl motion-safe:transition-all motion-safe:duration-300 motion-reduce:transition-none ${
          menuAbierto
            ? 'rounded-[1.75rem] xl:rounded-full'
            : 'rounded-full'
        } ${
          modoAdministracion || scrolled
            ? 'shadow-[0_16px_45px_rgba(7,63,49,0.16)]'
            : 'shadow-[0_10px_35px_rgba(7,63,49,0.11)]'
        }`}
      >
        <div className="flex min-h-[82px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-7">
          {/* LOGO */}
          <button
            type="button"
            onClick={irInicio}
            className="group flex min-w-0 shrink-0 items-center gap-2 rounded-full pr-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8dc63f] focus-visible:ring-offset-2"
            aria-label="Ir al inicio"
          >
            <span className="sigtad-navbar-logo flex h-16 w-[4.5rem] shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-transparent sm:h-[4.5rem] sm:w-20">
              <img
                src={logo}
                alt=""
                className="sigtad-logo-claro h-full w-full object-contain motion-safe:transition motion-safe:duration-300 motion-safe:group-hover:scale-105 motion-reduce:transform-none"
              />

              <img
                src={logoBlanco}
                alt=""
                className="sigtad-logo-oscuro hidden h-full w-full object-contain motion-safe:transition motion-safe:duration-300 motion-safe:group-hover:scale-105 motion-reduce:transform-none"
              />
            </span>
          </button>

          {/* NAVEGACIÓN PRINCIPAL */}
          <div className="hidden items-center gap-2 xl:flex xl:gap-4">
            <button
              type="button"
              onClick={irInicio}
              className={`${claseNavegacion} ${
                seccionActiva === 'inicio'
                  ? claseNavegacionActiva
                  : ''
              }`}
              aria-current={
                seccionActiva === 'inicio' ? 'page' : undefined
              }
            >
              {t('nav.home')}
            </button>

            <button
              type="button"
              onClick={irEmprendimientos}
              className={`${claseNavegacion} ${
                seccionActiva === 'emprendimientos'
                  ? claseNavegacionActiva
                  : ''
              }`}
              aria-current={
                seccionActiva === 'emprendimientos'
                  ? 'page'
                  : undefined
              }
            >
              {t('nav.businesses')}
            </button>

            <button
              type="button"
              onClick={onIrEventos}
              className={`${claseNavegacion} ${
                seccionActiva === 'eventos'
                  ? claseNavegacionActiva
                  : ''
              }`}
              aria-current={
                seccionActiva === 'eventos'
                  ? 'page'
                  : undefined
              }
            >
              {t('nav.events')}
            </button>

            {onRegistrarIncidencia && (
              <button
                type="button"
                onClick={onRegistrarIncidencia}
                className={`${claseNavegacion} ${
                  seccionActiva === 'incidencias'
                    ? claseNavegacionActiva
                    : ''
                }`}
                aria-current={
                  seccionActiva === 'incidencias'
                    ? 'page'
                    : undefined
                }
              >
                {t('nav.reportIncident')}
              </button>
            )}
          </div>

          {/* PERFIL, TEMA Y MENÚ */}
          <div className="flex shrink-0 items-center gap-1.5">
            {/* ACCIONES DE ESCRITORIO */}
            <div className="hidden items-center gap-1 xl:flex">
              {!rolAutenticado && (
                <button
                  type="button"
                  onClick={onLogin}
                  className="min-h-10 rounded-full bg-[#095540] px-4 py-2 text-sm font-bold text-white shadow-md shadow-[#095540]/20 motion-safe:transition motion-safe:duration-200 hover:bg-[#009444] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8DC63F] focus-visible:ring-offset-2 motion-safe:hover:-translate-y-0.5 motion-reduce:transform-none"
                >
                  {t('nav.login')}
                </button>
              )}

              {/* NOTIFICACIONES:
                  Visitante, asociado y super_admin: SÍ
                  Administrador: NO
              */}
              {rolAutenticado && rolAutenticado !== 'administrador' && (
                <button
                  type="button"
                  onClick={irNotificaciones}
                  className="relative flex h-10 w-10 items-center justify-center rounded-full text-[#095540] transition hover:bg-[#eef7e7]/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8DC63F] focus-visible:ring-offset-2"
                  aria-label={
                    noLeidas > 0
                      ? `Notificaciones, ${noLeidas} sin leer`
                      : t('nav.notifications')
                  }
                  title={t('nav.notifications')}
                >
                  <svg
                    viewBox="0 0 24 24"
                    className="h-5 w-5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    aria-hidden="true"
                  >
                    <path
                      d="M18 8a6 6 0 1 0-12 0c0 7-3 8-3 8h18s-3-1-3-8M13.7 20a2 2 0 0 1-3.4 0"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>

                  {noLeidas > 0 && (
                    <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">
                      {noLeidas > 99 ? '99+' : noLeidas}
                    </span>
                  )}
                </button>
              )}

              {/* USUARIO AUTENTICADO */}
              {rolAutenticado && (
                <div ref={menuUsuarioRef} className="relative">
                  <button
                    type="button"
                    onClick={() =>
                      setMenuUsuarioAbierto((abierto) => !abierto)
                    }
                    className="flex min-h-10 max-w-52 items-center gap-2 rounded-full border border-[#8DC63F]/45 bg-[#8DC63F]/15 px-4 py-2 text-sm font-bold text-[#095540] transition hover:bg-[#8DC63F]/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8DC63F] focus-visible:ring-offset-2"
                    aria-expanded={menuUsuarioAbierto}
                    aria-controls="menu-usuario"
                  >
                    <span
                      className="truncate"
                      title={nombreUsuario ?? undefined}
                    >
                      {nombreUsuario ?? 'Mi cuenta'}
                    </span>

                    <svg
                      viewBox="0 0 24 24"
                      className={`h-4 w-4 shrink-0 transition-transform duration-200 ${
                        menuUsuarioAbierto ? 'rotate-180' : ''
                      }`}
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      aria-hidden="true"
                    >
                      <path
                        d="m6 9 6 6 6-6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </button>

                  {menuUsuarioAbierto && (
                    <div
                      id="menu-usuario"
                      className="sigtad-menu-reveal absolute right-0 top-full z-50 mt-2 w-56 origin-top-right rounded-2xl border border-white/25 bg-[#073f31]/90 p-2 text-white shadow-[0_18px_45px_rgba(7,63,49,0.32)] backdrop-blur-md"
                    >
                      <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-emerald-100/60">
                        {rolAutenticado.replace('_', ' ')}
                      </div>

                      {rolAutenticado === 'visitante' && (
                        <>
                          <button
                            type="button"
                            onClick={irMisInscripciones}
                            className="w-full rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition hover:bg-white/10"
                          >
                            {t('nav.myBookings')}
                          </button>

                          <button
                            type="button"
                            onClick={irMisIncidencias}
                            className="w-full rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition hover:bg-white/10"
                          >
                            {t('nav.myIncidents')}
                          </button>
                        </>
                      )}

                      {rolAutenticado === 'asociado' && (
                        <>
                          <button
                            type="button"
                            onClick={irMisInscripciones}
                            className="w-full rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition hover:bg-white/10"
                          >
                            {t('nav.myEvents')}
                          </button>

                          <button
                            type="button"
                            onClick={irMisEmprendimientos}
                            className="w-full rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition hover:bg-white/10"
                          >
                            {t('nav.myBusinesses')}
                          </button>

                          <button
                            type="button"
                            onClick={irMisIncidencias}
                            className="w-full rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition hover:bg-white/10"
                          >
                            {t('nav.myIncidents')}
                          </button>
                        </>
                      )}

                      {(rolAutenticado === 'administrador' ||
                        rolAutenticado === 'super_admin') && (
                        <button
                          type="button"
                          onClick={
                            rolAutenticado === 'super_admin'
                              ? irDashboardSuperAdmin
                              : irDashboard
                          }
                          className="w-full rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition hover:bg-white/10"
                        >
                          {t('nav.controlPanel')}
                        </button>
                      )}

                      <div className="my-2 border-t border-white/15" />

                      <button
                        type="button"
                        onClick={cerrarSesionDesdeMenu}
                        className="w-full rounded-xl px-3 py-2.5 text-left text-sm font-bold text-[#d9f3bd] transition hover:bg-white/10"
                      >
                        {t('nav.logout')}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* TEMA + MENÚ MÓVIL */}
            <div className="flex shrink-0 items-center gap-0.5">
              <TemaInterfaz enNavbar />

              <button
                type="button"
                onClick={() => setMenuAbierto(!menuAbierto)}
                className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#095540] text-white shadow-sm motion-safe:transition motion-safe:duration-200 hover:bg-[#009444] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8DC63F] focus-visible:ring-offset-2 xl:hidden"
                aria-label={
                  menuAbierto ? 'Cerrar menú' : 'Abrir menú'
                }
                aria-expanded={menuAbierto}
                aria-controls="menu-principal-movil"
              >
                {menuAbierto ? (
                  <svg
                    viewBox="0 0 24 24"
                    className="h-5 w-5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    aria-hidden="true"
                  >
                    <path d="M6 6l12 12M18 6 6 18" />
                  </svg>
                ) : (
                  <svg
                    viewBox="0 0 24 24"
                    className="h-5 w-5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    aria-hidden="true"
                  >
                    <path d="M4 7h16M4 12h16M4 17h16" />
                  </svg>
                )}

                {/* Indicador móvil:
                    no aparece para administrador */}
                {!menuAbierto &&
                  rolAutenticado !== 'administrador' &&
                  noLeidas > 0 && (
                    <span
                      className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-white bg-red-600"
                      aria-hidden="true"
                    />
                  )}
              </button>
            </div>
          </div>
        </div>

        {/* MENÚ MÓVIL */}
        {menuAbierto && (
          <div
            id="menu-principal-movil"
            className="sigtad-menu-reveal border-t border-[#e2ebe5] px-3 pb-4 pt-3 xl:hidden"
          >
            <div className="flex flex-col gap-1">
              <button
                type="button"
                onClick={irInicio}
                className={`${claseNavegacionMovil} ${
                  seccionActiva === 'inicio'
                    ? claseNavegacionMovilActiva
                    : ''
                }`}
                aria-current={
                  seccionActiva === 'inicio' ? 'page' : undefined
                }
              >
                {t('nav.home')}
              </button>

              <button
                type="button"
                onClick={irEmprendimientos}
                className={`${claseNavegacionMovil} ${
                  seccionActiva === 'emprendimientos'
                    ? claseNavegacionMovilActiva
                    : ''
                }`}
                aria-current={
                  seccionActiva === 'emprendimientos'
                    ? 'page'
                    : undefined
                }
              >
                {t('nav.businesses')}
              </button>

              <button
                type="button"
                onClick={() => {
                  setMenuAbierto(false);
                  onIrEventos();
                }}
                className={`${claseNavegacionMovil} ${
                  seccionActiva === 'eventos'
                    ? claseNavegacionMovilActiva
                    : ''
                }`}
                aria-current={
                  seccionActiva === 'eventos' ? 'page' : undefined
                }
              >
                {t('nav.events')}
              </button>

              {/* NOTIFICACIONES MÓVIL
                  Visitante, asociado y super_admin: SÍ
                  Administrador: NO */}
              {rolAutenticado &&
                rolAutenticado !== 'administrador' && (
                  <button
                    type="button"
                    onClick={irNotificaciones}
                    className={`${claseNavegacionMovil} flex items-center justify-between`}
                  >
                    <span>Notificaciones</span>

                    {noLeidas > 0 && (
                      <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1.5 text-[10px] font-bold text-white">
                        {noLeidas > 99 ? '99+' : noLeidas}
                      </span>
                    )}
                  </button>
                )}

              {/* VISITANTE */}
              {rolAutenticado === 'visitante' && (
                <>
                  <button
                    type="button"
                    onClick={irMisInscripciones}
                    className={claseNavegacionMovil}
                  >
                    {t('nav.myBookings')}
                  </button>

                  <button
                    type="button"
                    onClick={irMisIncidencias}
                    className={claseNavegacionMovil}
                  >
                    {t('nav.myIncidents')}
                  </button>
                </>
              )}

              {/* ASOCIADO */}
              {rolAutenticado === 'asociado' && (
                <>
                  <button
                    type="button"
                    onClick={irMisInscripciones}
                    className={claseNavegacionMovil}
                  >
                    {t('nav.myEvents')}
                  </button>

                  <button
                    type="button"
                    onClick={irMisEmprendimientos}
                    className={claseNavegacionMovil}
                  >
                    {t('nav.myBusinesses')}
                  </button>

                  <button
                    type="button"
                    onClick={irMisIncidencias}
                    className={claseNavegacionMovil}
                  >
                    {t('nav.myIncidents')}
                  </button>
                </>
              )}

              {onRegistrarIncidencia && (
                <button
                  type="button"
                  onClick={() => {
                    setMenuAbierto(false);
                    onRegistrarIncidencia();
                  }}
                  className={`${claseNavegacionMovil} ${
                    seccionActiva === 'incidencias'
                      ? claseNavegacionMovilActiva
                      : ''
                  }`}
                  aria-current={
                    seccionActiva === 'incidencias'
                      ? 'page'
                      : undefined
                  }
                >
                  {t('nav.reportIncident')}
                </button>
              )}
            </div>

            {/* USUARIO NO AUTENTICADO */}
            {!rolAutenticado && (
              <div className="mt-3 border-t border-[#e2ebe5] pt-3">
                <button
                  type="button"
                  onClick={() => {
                    setMenuAbierto(false);
                    onLogin();
                  }}
                  className="min-h-12 rounded-full bg-[#095540] px-4 py-3 text-sm font-bold text-white shadow-md motion-safe:transition motion-safe:duration-200 hover:bg-[#009444] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8DC63F]"
                >
                  {t('nav.login')}
                </button>
              </div>
            )}

            {/* USUARIO AUTENTICADO */}
            {rolAutenticado && (
              <div className="mt-3 grid min-w-0 gap-2 border-t border-[#e2ebe5] pt-3 sm:grid-cols-2">
                {nombreUsuario && (
                  <span
                    className="min-w-0 truncate rounded-full border border-[#8DC63F]/45 bg-[#8DC63F]/15 px-4 py-3 text-center text-sm font-bold text-[#095540]"
                    title={nombreUsuario}
                  >
                    {nombreUsuario}
                  </span>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setMenuAbierto(false);
                    onCerrarSesion();
                  }}
                  className="min-h-12 rounded-full bg-[#095540] px-4 py-3 text-sm font-bold text-white shadow-md motion-safe:transition motion-safe:duration-200 hover:bg-[#009444] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8DC63F]"
                >
                  {t('nav.logout')}
                </button>
              </div>
            )}

            {/* ADMINISTRADOR */}
            {rolAutenticado === 'administrador' && (
              <div className="mt-3 border-t border-[#e2ebe5] pt-3">
                <button
                  type="button"
                  onClick={irDashboard}
                  className="min-h-12 w-full rounded-full bg-[#095540] px-4 py-3 text-sm font-bold text-white shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8dc63f]"
                >
                  {t('nav.controlPanel')}
                </button>
              </div>
            )}

            {/* SUPER ADMIN */}
            {rolAutenticado === 'super_admin' && (
              <div className="mt-3 border-t border-[#e2ebe5] pt-3">
                <button
                  type="button"
                  onClick={irDashboardSuperAdmin}
                  className="min-h-12 w-full rounded-full bg-[#095540] px-4 py-3 text-sm font-bold text-white shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8dc63f]"
                >
                  {t('nav.controlPanel')}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
      <NotificacionToast
        notificacion={notificacionActual}
        onClose={cerrarActual}
      />
    </nav>
  );
}

export default Navbar;
