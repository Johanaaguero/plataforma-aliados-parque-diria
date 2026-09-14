import { useEffect, useRef, useState } from 'react';

import { useNavigate } from 'react-router-dom';

import logo from '../../assets/logo.png';

import logoBlanco from '../../../logo-blanco.png';

import TemaInterfaz from '../ui/TemaInterfaz';

interface NavbarProps {
  onRegistro: () => void;
  onLogin: () => void;
  rolAutenticado: string | null;
  nombreUsuario: string | null;
  onCerrarSesion: () => void;
  onGestionRoles: () => void;
  onInscripciones?: () => void;
  onMisInscripciones?: () => void;
  onCuentasBloqueadas?: () => void;
  onBitacora?: () => void;
  onIrInicio: () => void;
  onIrEmprendimientos: () => void;
  onIrEventos: () => void;
  seccionActiva?: 'inicio' | 'emprendimientos' | 'eventos';
  modoAdministracion?: boolean;
}

function Navbar({
  onRegistro,
  onLogin,
  rolAutenticado,
  nombreUsuario,
  onCerrarSesion,
  onGestionRoles,
  onInscripciones,
  onMisInscripciones,
  onCuentasBloqueadas,
  onBitacora,
  onIrInicio,
  onIrEmprendimientos,
  onIrEventos,
  seccionActiva = 'inicio',
  modoAdministracion = false,
}: NavbarProps) {
  const navigate = useNavigate();

  const [scrolled, setScrolled] = useState(false);
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [menuUsuarioAbierto, setMenuUsuarioAbierto] = useState(false);
  const [navbarVisible, setNavbarVisible] = useState(true);

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
      if (evento.key === 'Escape') setMenuUsuarioAbierto(false);
    };

    document.addEventListener('mousedown', cerrarMenuUsuario);
    document.addEventListener('keydown', cerrarConEscape);
    return () => {
      document.removeEventListener('mousedown', cerrarMenuUsuario);
      document.removeEventListener('keydown', cerrarConEscape);
    };
  }, []);

  const irInicio = () => {
    setMenuAbierto(false);
    onIrInicio();
  };

  const irEmprendimientos = () => {
    setMenuAbierto(false);
    onIrEmprendimientos();
  };

  const irGestionRoles = () => {
    setMenuAbierto(false);
    setMenuUsuarioAbierto(false);
    navigate('/admin/roles');
    onGestionRoles();
  };

  const irInscripciones = () => {
    setMenuAbierto(false);
    setMenuUsuarioAbierto(false);
    navigate('/admin/inscripciones');
    onInscripciones?.();
  };

  const irMisInscripciones = () => {
    setMenuAbierto(false);
    setMenuUsuarioAbierto(false);
    navigate('/mis-inscripciones');
    onMisInscripciones?.();
  };

  const irMisEventos = () => {
    setMenuUsuarioAbierto(false);
    onIrEventos();
  };

  const irMisEmprendimientos = () => {
    setMenuUsuarioAbierto(false);
    onIrEmprendimientos();
  };

  const cerrarSesionDesdeMenu = () => {
    setMenuUsuarioAbierto(false);
    onCerrarSesion();
  };

  /*
   * Mis reservas solamente está disponible
   * para visitantes y asociados.
   */
  const puedeVerMisReservas =
    rolAutenticado === 'visitante' ||
    rolAutenticado === 'asociado';

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
          <div className="hidden items-center gap-1.5 xl:flex xl:gap-3">
            <button
              type="button"
              onClick={irInicio}
              className={`${claseNavegacion} ${
                seccionActiva === 'inicio'
                  ? claseNavegacionActiva
                  : ''
              }`}
              aria-current={
                seccionActiva === 'inicio'
                  ? 'page'
                  : undefined
              }
            >
              Inicio
            </button>

            <button
              type="button"
              onClick={() => setMenuAbierto(false)}
              data-sigtad-about
              className={claseNavegacion}
            >
              Sobre Aliados del Parque
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
              Emprendimientos
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
              Eventos y Capacitaciones
            </button>
          </div>

          {/* ACCIONES DE ESCRITORIO */}
          <div className="hidden shrink-0 items-center gap-1 xl:flex">

            {/* USUARIO NO AUTENTICADO */}
            {!rolAutenticado && (
              <>
                <button
                  type="button"
                  onClick={onRegistro}
                  className="min-h-10 rounded-full border border-[#8DC63F] bg-[#8DC63F] px-4 py-2 text-sm font-bold text-[#095540] motion-safe:transition motion-safe:duration-200 hover:border-[#009444] hover:bg-[#009444] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8DC63F] focus-visible:ring-offset-2"
                >
                  Registrarse
                </button>

                <button
                  type="button"
                  onClick={onLogin}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-[#095540] text-white shadow-md shadow-[#095540]/20 motion-safe:transition motion-safe:duration-200 hover:bg-[#009444] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8DC63F] focus-visible:ring-offset-2 motion-safe:hover:-translate-y-0.5 motion-reduce:transform-none"
                  aria-label="Ingresar"
                  title="Ingresar"
                >
                  <svg
                    viewBox="0 0 24 24"
                    className="h-6 w-6"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <circle
                      cx="12"
                      cy="8"
                      r="3.5"
                    />

                    <path d="M5.5 20c.8-3.5 3.2-5.5 6.5-5.5s5.7 2 6.5 5.5" />
                  </svg>
                </button>
              </>
            )}

            {/* USUARIO AUTENTICADO */}
            {rolAutenticado && (
              <div ref={menuUsuarioRef} className="relative">
                <button
                  type="button"
                  onClick={() => setMenuUsuarioAbierto((abierto) => !abierto)}
                  className="flex min-h-10 max-w-52 items-center gap-2 rounded-full border border-[#8DC63F]/45 bg-[#8DC63F]/15 px-4 py-2 text-sm font-bold text-[#095540] transition hover:bg-[#8DC63F]/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8DC63F] focus-visible:ring-offset-2"
                  aria-expanded={menuUsuarioAbierto}
                  aria-controls="menu-usuario"
                >
                  <span className="truncate" title={nombreUsuario ?? undefined}>{nombreUsuario ?? 'Mi cuenta'}</span>
                  <svg viewBox="0 0 24 24" className={`h-4 w-4 shrink-0 transition-transform duration-200 ${menuUsuarioAbierto ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>

                {menuUsuarioAbierto && (
                  <div id="menu-usuario" className="sigtad-menu-reveal absolute right-0 top-full z-50 mt-2 w-56 origin-top-right rounded-2xl border border-white/25 bg-[#073f31]/90 p-2 text-white shadow-[0_18px_45px_rgba(7,63,49,0.32)] backdrop-blur-md">
                    <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-emerald-100/60">{rolAutenticado.replace('_', ' ')}</div>
                    {(rolAutenticado === 'visitante' || rolAutenticado === 'asociado') && <button type="button" onClick={irMisInscripciones} className="w-full rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition hover:bg-white/10">Mis reservas</button>}
                    {rolAutenticado === 'asociado' && <>
                      <button type="button" onClick={irMisEventos} className="w-full rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition hover:bg-white/10">Mis eventos y capacitaciones</button>
                      <button type="button" onClick={irMisEmprendimientos} className="w-full rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition hover:bg-white/10">Mis emprendimientos</button>
                    </>}
                    {(rolAutenticado === 'administrador' || rolAutenticado === 'super_admin') && <>
                      <button type="button" onClick={irGestionRoles} className="w-full rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition hover:bg-white/10">Gestión de roles</button>
                      <button type="button" onClick={irInscripciones} className="w-full rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition hover:bg-white/10">Gestión de inscripciones</button>
                    </>}
                    {rolAutenticado === 'super_admin' && onCuentasBloqueadas && <button type="button" onClick={() => { setMenuUsuarioAbierto(false); onCuentasBloqueadas(); }} className="w-full rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition hover:bg-white/10">Cuentas bloqueadas</button>}
                    {rolAutenticado === 'super_admin' && onBitacora && <button type="button" onClick={() => { setMenuUsuarioAbierto(false); onBitacora(); }} className="w-full rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition hover:bg-white/10">Bitácora</button>}
                    <div className="my-2 border-t border-white/15" />
                    <button type="button" onClick={cerrarSesionDesdeMenu} className="w-full rounded-xl px-3 py-2.5 text-left text-sm font-bold text-[#d9f3bd] transition hover:bg-white/10">Cerrar sesión</button>
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
              onClick={() =>
                setMenuAbierto(!menuAbierto)
              }
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#095540] text-white shadow-sm motion-safe:transition motion-safe:duration-200 hover:bg-[#009444] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8DC63F] focus-visible:ring-offset-2 xl:hidden"
              aria-label={
                menuAbierto
                  ? 'Cerrar menú'
                  : 'Abrir menú'
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
            </button>
          </div>
        </div>

        {/* =========================
            MENÚ MÓVIL
           ========================= */}
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
                  seccionActiva === 'inicio'
                    ? 'page'
                    : undefined
                }
              >
                Inicio
              </button>

              <button
                type="button"
                onClick={() =>
                  setMenuAbierto(false)
                }
                data-sigtad-about
                className={claseNavegacionMovil}
              >
                Sobre Aliados del Parque
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
                Emprendimientos
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
                  seccionActiva === 'eventos'
                    ? 'page'
                    : undefined
                }
              >
                Eventos y Capacitaciones
              </button>

              {/* MIS RESERVAS
                  SOLO VISITANTE Y ASOCIADO */}
              {puedeVerMisReservas && (
                <button
                  type="button"
                  onClick={irMisInscripciones}
                  className={claseNavegacionMovil}
                >
                  Mis reservas
                </button>
              )}
            </div>

            {/* USUARIO NO AUTENTICADO */}
            {!rolAutenticado && (
              <div className="mt-3 grid gap-2 border-t border-[#e2ebe5] pt-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => {
                    setMenuAbierto(false);
                    onRegistro();
                  }}
                  className="min-h-12 rounded-full border border-[#8DC63F] bg-[#8DC63F] px-4 py-3 text-sm font-bold text-[#095540] motion-safe:transition motion-safe:duration-200 hover:border-[#009444] hover:bg-[#009444] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8DC63F]"
                >
                  Registrarse
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setMenuAbierto(false);
                    onLogin();
                  }}
                  className="min-h-12 rounded-full bg-[#095540] px-4 py-3 text-sm font-bold text-white shadow-md motion-safe:transition motion-safe:duration-200 hover:bg-[#009444] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8DC63F]"
                >
                  Ingresar
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
                  Cerrar sesión
                </button>
              </div>
            )}

            {/* ADMINISTRADOR - OPCIONES ADMINISTRATIVAS */}
            {rolAutenticado === 'administrador' && (
              <div className="mt-3 grid gap-2 border-t border-[#e2ebe5] pt-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => {
                    setMenuAbierto(false);
                    irGestionRoles();
                  }}
                  className="min-h-12 w-full rounded-full bg-[#d9d823] px-4 py-3 text-sm font-bold text-[#073f31] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8dc63f]"
                >
                  Gestionar roles
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setMenuAbierto(false);
                    irInscripciones();
                  }}
                  className="min-h-12 w-full rounded-full bg-[#d9d823] px-4 py-3 text-sm font-bold text-[#073f31] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8dc63f]"
                >
                  Inscripciones
                </button>
              </div>
            )}

            {/* SUPER ADMIN - CUENTAS BLOQUEADAS */}
            {rolAutenticado === 'super_admin' &&
              onCuentasBloqueadas && (
                <button
                  type="button"
                  onClick={() => {
                    setMenuAbierto(false);
                    onCuentasBloqueadas();
                  }}
                  className="mt-3 min-h-[42px] w-full cursor-pointer rounded-[9px] border border-[#095540] bg-white px-4 py-0 text-[13px] font-bold text-[#095540] shadow-[0_5px_14px_rgba(23,48,31,0.14)] [font-family:inherit] [transition:0.2s_ease] hover:bg-[#095540] hover:text-white hover:[transform:translateY(-1px)]"
                >
                  Cuentas bloqueadas
                </button>
              )}

            {/* SUPER ADMIN - BITÁCORA */}
            {rolAutenticado === 'super_admin' &&
              onBitacora && (
                <button
                  type="button"
                  onClick={() => {
                    setMenuAbierto(false);
                    onBitacora();
                  }}
                  className="mt-3 min-h-[42px] w-full cursor-pointer rounded-[9px] border border-[#095540] bg-white px-4 py-0 text-[13px] font-bold text-[#095540] shadow-[0_5px_14px_rgba(23,48,31,0.14)] [font-family:inherit] [transition:0.2s_ease] hover:bg-[#095540] hover:text-white hover:[transform:translateY(-1px)]"
                >
                  Bitácora
                </button>
              )}
          </div>
        )}
      </div>
    </nav>
  );
}

export default Navbar;
