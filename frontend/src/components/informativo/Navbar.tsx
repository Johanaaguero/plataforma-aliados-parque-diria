import { useEffect, useState } from 'react';

import logo from '../../assets/logo.png';

interface NavbarProps {
  onRegistro: () => void;
  onLogin: () => void;
  rolAutenticado: string | null;
  onGestionRoles: () => void;
  onIrInicio: () => void;
  onIrEmprendimientos: () => void;
  modoAdministracion?: boolean;
}

function Navbar({
  onRegistro,
  onLogin,
  rolAutenticado,
  onGestionRoles,
  onIrInicio,
  onIrEmprendimientos,
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
    'rounded-full px-3 py-2 text-sm font-semibold text-[#17372c] motion-safe:transition motion-safe:duration-200 hover:bg-[#eef7e7] hover:text-[#095540] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8dc63f] focus-visible:ring-offset-2';
  const claseNavegacionMovil =
    'w-full rounded-2xl px-4 py-3 text-left text-sm font-semibold text-[#17372c] motion-safe:transition motion-safe:duration-200 hover:bg-[#eef7e7] hover:text-[#095540] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8dc63f]';

  return (
    <nav
      className="fixed inset-x-0 top-3 z-50 px-3 sm:top-4 sm:px-5"
      aria-label="Navegación principal"
    >
      <div
        className={`mx-auto max-w-7xl overflow-hidden border border-white/70 bg-white/90 backdrop-blur-xl motion-safe:transition-all motion-safe:duration-300 motion-reduce:transition-none ${
          menuAbierto ? 'rounded-[1.75rem] lg:rounded-full' : 'rounded-full'
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
            <span className="flex h-11 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white sm:w-16">
              <img
                src={logo}
                alt=""
                className="h-full w-full object-cover object-[center_18%] motion-safe:transition motion-safe:duration-300 motion-safe:group-hover:scale-105 motion-reduce:transform-none"
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

          <div className="hidden items-center gap-0.5 lg:flex xl:gap-1">
            <button type="button" onClick={irInicio} className={claseNavegacion}>
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
              className={claseNavegacion}
            >
              Emprendimientos
            </button>
            <button
              type="button"
              onClick={() => irSeccion('eventos')}
              className={claseNavegacion}
            >
              Eventos
            </button>
          </div>

          <div className="hidden shrink-0 items-center gap-2 lg:flex">
            {!rolAutenticado && (
              <>
                <button
                  type="button"
                  onClick={onRegistro}
                  className="min-h-10 rounded-full border border-[#dce9d7] bg-[#f8fbf4] px-4 py-2 text-sm font-bold text-[#095540] motion-safe:transition motion-safe:duration-200 hover:border-[#8dc63f] hover:bg-[#eef7e7] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8dc63f] focus-visible:ring-offset-2"
                >
                  Registrarse
                </button>
                <button
                  type="button"
                  onClick={onLogin}
                  className="min-h-10 rounded-full bg-[#095540] px-5 py-2 text-sm font-bold text-white shadow-md shadow-[#095540]/20 motion-safe:transition motion-safe:duration-200 hover:bg-[#073f31] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8dc63f] focus-visible:ring-offset-2 motion-safe:hover:-translate-y-0.5 motion-reduce:transform-none"
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
          </div>

          <button
            type="button"
            onClick={() => setMenuAbierto(!menuAbierto)}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#095540] text-white shadow-sm motion-safe:transition motion-safe:duration-200 hover:bg-[#073f31] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8dc63f] focus-visible:ring-offset-2 lg:hidden"
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
            className="border-t border-[#e2ebe5] px-3 pb-4 pt-3 lg:hidden"
          >
            <div className="flex flex-col gap-1">
              <button type="button" onClick={irInicio} className={claseNavegacionMovil}>
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
                className={claseNavegacionMovil}
              >
                Emprendimientos
              </button>
              <button
                type="button"
                onClick={() => irSeccion('eventos')}
                className={claseNavegacionMovil}
              >
                Eventos
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
                  className="min-h-12 rounded-full border border-[#b9d6af] bg-[#f8fbf4] px-4 py-3 text-sm font-bold text-[#095540] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8dc63f]"
                >
                  Registrarse
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMenuAbierto(false);
                    onLogin();
                  }}
                  className="min-h-12 rounded-full bg-[#095540] px-4 py-3 text-sm font-bold text-white shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8dc63f]"
                >
                  Ingresar
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
          </div>
        )}
      </div>
    </nav>
  );
}

export default Navbar;
