import { useEffect, useState } from 'react';

import logo from '../../assets/logo.png';

interface NavbarProps {
  onRegistro: () => void;
  onLogin: () => void;
  rolAutenticado: string | null;
  nombreUsuario: string | null;
  onCerrarSesion: () => void;
  onGestionRoles: () => void;
  onCuentasBloqueadas?: () => void;
  onBitacora?: () => void;
  onIrInicio: () => void;
  onIrEmprendimientos: () => void;
   onIrEventos: () => void;
 seccionActiva?: 'inicio' | 'emprendimientos' | 'eventos';  modoAdministracion?: boolean;
}

function Navbar({
  onRegistro,
  onLogin,
  rolAutenticado,
  nombreUsuario,
  onCerrarSesion,
  onGestionRoles,
  onCuentasBloqueadas,
  onBitacora,
  onIrInicio,
  onIrEmprendimientos,
   onIrEventos,
  seccionActiva = 'inicio',
  modoAdministracion = false,
}: NavbarProps) {
  const [scrolled, setScrolled] = useState(false);
  const [menuAbierto, setMenuAbierto] = useState(false);

  useEffect(() => {
    const manejarScroll = () => {
      setScrolled(window.scrollY > 50);
    };

    window.addEventListener('scroll', manejarScroll);

    return () => {
      window.removeEventListener('scroll', manejarScroll);
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

  const irSeccion = (seccion: string) => {
    setMenuAbierto(false);

    const elemento = document.getElementById(seccion);

    if (elemento) {
      elemento.scrollIntoView({
        behavior: 'auto',
      });
    }
  };

  const claseNavegacion =
    'rounded-full border border-transparent px-3 py-2 text-sm font-semibold text-[#17372c] motion-safe:transition-all motion-safe:duration-200 motion-safe:ease-out hover:bg-[#eef7e7]/70 hover:text-[#095540] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8dc63f] focus-visible:ring-offset-2';
  const claseNavegacionActiva =
    'border-white/60 bg-white/65 text-[#095540] shadow-sm backdrop-blur-lg';
  const claseNavegacionMovil =
    'w-full rounded-2xl border border-transparent px-4 py-3 text-left text-sm font-semibold text-[#17372c] motion-safe:transition-all motion-safe:duration-200 motion-safe:ease-out hover:bg-[#eef7e7]/70 hover:text-[#095540] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8dc63f]';
  const claseNavegacionMovilActiva =
    'border-white/60 bg-white/65 text-[#095540] shadow-sm backdrop-blur-lg';

  return (
    <nav
      className="fixed inset-x-0 top-3 z-50 px-3 sm:top-4 sm:px-5"
      aria-label="Navegación principal"
    >
      <div
        className={`mx-auto max-w-7xl overflow-hidden border border-white/70 bg-white/90 backdrop-blur-xl motion-safe:transition-all motion-safe:duration-300 motion-reduce:transition-none ${
          menuAbierto ? 'rounded-[1.75rem] xl:rounded-full' : 'rounded-full'
        } ${
          modoAdministracion || scrolled
            ? 'shadow-[0_16px_45px_rgba(7,63,49,0.16)]'
            : 'shadow-[0_10px_35px_rgba(7,63,49,0.11)]'
        }`}
      >
        <div className="flex min-h-[68px] items-center justify-between gap-3 px-3 sm:px-4 lg:px-5">
          <button
            type="button"
            onClick={irInicio}
            className="group flex min-w-0 shrink-0 items-center gap-2 rounded-full pr-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8dc63f] focus-visible:ring-offset-2"
            aria-label="Ir al inicio"
          >
            <span className="flex h-12 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white p-1 sm:w-16">
              <img
                src={logo}
                alt=""
                className="h-full w-full object-contain motion-safe:transition motion-safe:duration-300 motion-safe:group-hover:scale-105 motion-reduce:transform-none"
              />
            </span>
            <span className="hidden min-w-0 sm:block">
              <span className="block truncate text-sm font-bold leading-tight text-[#095540]">
                Aliados del Parque
              </span>
              <span className="block truncate text-[10px] font-semibold uppercase tracking-[0.15em] text-[#587267]">
                Parque Nacional Diriá
              </span>
            </span>
          </button>

          <div className="hidden items-center gap-0.5 xl:flex xl:gap-1">
            <button type="button" onClick={irInicio} className={`${claseNavegacion} ${seccionActiva === 'inicio' ? claseNavegacionActiva : ''}`} aria-current={seccionActiva === 'inicio' ? 'page' : undefined}>
              Inicio
            </button>
            <button
              type="button"
              onClick={() => irSeccion('sobre-parque')}
              className={claseNavegacion}
            >
              Sobre el parque
            </button>
            <button
              type="button"
              onClick={irEmprendimientos}
              className={`${claseNavegacion} ${seccionActiva === 'emprendimientos' ? claseNavegacionActiva : ''}`}
              aria-current={seccionActiva === 'emprendimientos' ? 'page' : undefined}
            >
              Emprendimientos
            </button>
           <button
  type="button"
  onClick={onIrEventos}
  className={`${claseNavegacion} ${seccionActiva === 'eventos' ? claseNavegacionActiva : ''}`}
  aria-current={seccionActiva === 'eventos' ? 'page' : undefined}
>
  Eventos y Capacitaciones
</button>
          </div>

          <div className="hidden shrink-0 items-center gap-2 xl:flex">
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
                  className="min-h-10 rounded-full bg-[#095540] px-5 py-2 text-sm font-bold text-white shadow-md shadow-[#095540]/20 motion-safe:transition motion-safe:duration-200 hover:bg-[#009444] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8DC63F] focus-visible:ring-offset-2 motion-safe:hover:-translate-y-0.5 motion-reduce:transform-none"
                >
                  Ingresar
                </button>
              </>
            )}

            {rolAutenticado === 'administrador' && (
              <button
                type="button"
                onClick={onGestionRoles}
                className="min-h-10 rounded-full bg-[#d9d823] px-4 py-2 text-sm font-bold text-[#073f31] motion-safe:transition motion-safe:duration-200 hover:bg-[#c7cc22] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8dc63f] focus-visible:ring-offset-2"
              >
                Gestionar roles
              </button>
            )}

            {rolAutenticado === 'super_admin' && onCuentasBloqueadas && (
              <button
                type="button"
                onClick={onCuentasBloqueadas}
                className="min-h-10 rounded-full bg-[#d9d823] px-4 py-2 text-sm font-bold text-[#073f31] motion-safe:transition motion-safe:duration-200 hover:bg-[#c7cc22] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8dc63f] focus-visible:ring-offset-2"
              >
                Cuentas bloqueadas
              </button>
            )}

            {rolAutenticado === 'super_admin' && onBitacora && (
               <button
                type="button"
                onClick={onBitacora}
                className="min-h-10 rounded-full bg-[#d9d823] px-4 py-2 text-sm font-bold text-[#073f31] motion-safe:transition motion-safe:duration-200 hover:bg-[#c7cc22] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8dc63f] focus-visible:ring-offset-2"
               >
                 Bitácora
               </button>
            )}

            {rolAutenticado && (
              <>
                {nombreUsuario && (
                  <span
                    className="max-w-36 truncate rounded-full border border-[#8DC63F]/45 bg-[#8DC63F]/15 px-4 py-2 text-sm font-bold text-[#095540]"
                    title={nombreUsuario}
                  >
                    {nombreUsuario}
                  </span>
                )}
                <button
                  type="button"
                  onClick={onCerrarSesion}
                  className="min-h-10 rounded-full bg-[#095540] px-5 py-2 text-sm font-bold text-white shadow-md shadow-[#095540]/20 motion-safe:transition motion-safe:duration-200 hover:bg-[#009444] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8DC63F] focus-visible:ring-offset-2 motion-safe:hover:-translate-y-0.5 motion-reduce:transform-none"
                >
                  Cerrar sesión
                </button>
              </>
            )}
          </div>

          <button
            type="button"
            onClick={() => setMenuAbierto(!menuAbierto)}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#095540] text-white shadow-sm motion-safe:transition motion-safe:duration-200 hover:bg-[#009444] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8DC63F] focus-visible:ring-offset-2 xl:hidden"
            aria-label={menuAbierto ? 'Cerrar menú' : 'Abrir menú'}
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

        {menuAbierto && (
          <div
            id="menu-principal-movil"
            className="border-t border-[#e2ebe5] px-3 pb-4 pt-3 xl:hidden"
          >
            <div className="flex flex-col gap-1">
              <button type="button" onClick={irInicio} className={`${claseNavegacionMovil} ${seccionActiva === 'inicio' ? claseNavegacionMovilActiva : ''}`} aria-current={seccionActiva === 'inicio' ? 'page' : undefined}>
                Inicio
              </button>
              <button
                type="button"
                onClick={() => irSeccion('sobre-parque')}
                className={claseNavegacionMovil}
              >
                Sobre el parque
              </button>
              <button
                type="button"
                onClick={irEmprendimientos}
                className={`${claseNavegacionMovil} ${seccionActiva === 'emprendimientos' ? claseNavegacionMovilActiva : ''}`}
                aria-current={seccionActiva === 'emprendimientos' ? 'page' : undefined}
              >
                Emprendimientos
              </button>
             <button
  type="button"
  onClick={() => {
    setMenuAbierto(false);
    onIrEventos();
  }}
  className={`${claseNavegacionMovil} ${seccionActiva === 'eventos' ? claseNavegacionMovilActiva : ''}`}
  aria-current={seccionActiva === 'eventos' ? 'page' : undefined}
>
  Eventos y Capacitaciones
</button>
            </div>

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

            {rolAutenticado === 'administrador' && (
              <button
                type="button"
                onClick={() => {
                  setMenuAbierto(false);
                  onGestionRoles();
                }}
                className="mt-3 min-h-12 w-full rounded-full bg-[#d9d823] px-4 py-3 text-sm font-bold text-[#073f31] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8dc63f]"
              >
                Gestionar roles
              </button>
            )}

            {rolAutenticado === 'super_admin' && onCuentasBloqueadas && (
              <button
                type="button"
                onClick={onCuentasBloqueadas}
                className="mt-3 min-h-[42px] w-full cursor-pointer rounded-[9px] border border-[#095540] bg-white px-4 py-0 text-[13px] font-bold text-[#095540] shadow-[0_5px_14px_rgba(23,48,31,0.14)] [font-family:inherit] [transition:0.2s_ease] hover:bg-[#095540] hover:text-white hover:[transform:translateY(-1px)]"
              >
                Cuentas bloqueadas
              </button>
            )}

            {rolAutenticado === 'super_admin' && onBitacora && (
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
