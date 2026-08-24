import logo from '../../assets/logo.png';
import { useEffect, useState } from 'react';

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
        behavior: 'smooth',
      });
    }
  };

  return (
    <nav
      className={`
        fixed top-0 left-0 right-0 z-50
        transition-all duration-300
        ${
          modoAdministracion
            ? 'bg-green-900/80 backdrop-blur-md shadow-md'
            : scrolled
              ? 'bg-green-900/60 backdrop-blur-lg shadow-md'
              : 'bg-green-900/40 backdrop-blur-md'
        }
      `}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between min-h-[72px]">

          {/* LOGO */}
          <button
            type="button"
            onClick={irInicio}
            className="
              flex
              items-center
              bg-transparent
              border-none
              cursor-pointer
              shrink-0
            "
            aria-label="Ir al inicio"
          >
            <img
              src={logo}
              alt="Aliados del Parque"
              className="h-11 sm:h-12 w-auto object-contain"
            />
          </button>

          {/* NAVEGACIÓN DESKTOP */}
          <div className="hidden lg:flex items-center gap-6 xl:gap-8">

            <button
              type="button"
              onClick={irInicio}
              className="
                bg-transparent
                border-none
                text-white
                font-medium
                text-sm
                cursor-pointer
                transition-colors
                hover:text-green-200
                whitespace-nowrap
              "
            >
              Inicio
            </button>

            <button
              type="button"
              onClick={() => irSeccion('sobre-parque')}
              className="
                bg-transparent
                border-none
                text-white
                font-medium
                text-sm
                cursor-pointer
                transition-colors
                hover:text-green-200
                whitespace-nowrap
              "
            >
              Sobre el Parque
            </button>

            <button
              type="button"
              onClick={irEmprendimientos}
              className="
                bg-transparent
                border-none
                text-white
                font-medium
                text-sm
                cursor-pointer
                transition-colors
                hover:text-green-200
                whitespace-nowrap
              "
            >
              Emprendimientos
            </button>

            <button
              type="button"
              onClick={() => irSeccion('eventos')}
              className="
                bg-transparent
                border-none
                text-white
                font-medium
                text-sm
                cursor-pointer
                transition-colors
                hover:text-green-200
                whitespace-nowrap
              "
            >
              Eventos
            </button>

          </div>

          {/* BOTONES DESKTOP */}
          <div className="hidden lg:flex items-center gap-2 xl:gap-3">

            {!rolAutenticado && (
              <>
                <button
                  type="button"
                  onClick={onRegistro}
                  className="
                    bg-white
                    text-green-900
                    px-3
                    xl:px-4
                    py-2
                    rounded-lg
                    font-semibold
                    text-sm
                    border
                    border-white
                    cursor-pointer
                    transition-all
                    hover:bg-green-50
                    whitespace-nowrap
                  "
                >
                  Registrarse
                </button>

                <button
                  type="button"
                  onClick={onLogin}
                  className="
                    bg-transparent
                    text-white
                    px-3
                    xl:px-4
                    py-2
                    rounded-lg
                    font-semibold
                    text-sm
                    border
                    border-white
                    cursor-pointer
                    transition-all
                    hover:bg-white
                    hover:text-green-900
                    whitespace-nowrap
                  "
                >
                  Iniciar sesión
                </button>
              </>
            )}

            {rolAutenticado === 'administrador' && (
              <button
                type="button"
                onClick={onGestionRoles}
                className="
                  bg-yellow-500
                  text-white
                  px-3
                  xl:px-4
                  py-2
                  rounded-lg
                  font-semibold
                  text-sm
                  border-none
                  cursor-pointer
                  transition-all
                  hover:bg-yellow-600
                  whitespace-nowrap
                "
              >
                Gestionar Roles
              </button>
            )}

          </div>

          {/* BOTÓN MENÚ MÓVIL */}
          <button
            type="button"
            onClick={() => setMenuAbierto(!menuAbierto)}
            className="
              lg:hidden
              flex
              items-center
              justify-center
              w-10
              h-10
              rounded-lg
              border
              border-white/40
              bg-white/10
              text-white
              cursor-pointer
              hover:bg-white/20
              transition-all
            "
            aria-label={
              menuAbierto
                ? 'Cerrar menú'
                : 'Abrir menú'
            }
            aria-expanded={menuAbierto}
          >
            {menuAbierto ? (
              <span className="text-2xl leading-none">
                ×
              </span>
            ) : (
              <span className="text-2xl leading-none">
                ☰
              </span>
            )}
          </button>

        </div>

        {/* MENÚ MÓVIL */}
        {menuAbierto && (
          <div
            className="
              lg:hidden
              border-t
              border-white/20
              py-4
            "
          >
            <div className="flex flex-col gap-1">

              <button
                type="button"
                onClick={irInicio}
                className="
                  w-full
                  text-left
                  px-4
                  py-3
                  rounded-lg
                  bg-transparent
                  border-none
                  text-white
                  font-medium
                  cursor-pointer
                  hover:bg-white/10
                  transition-all
                "
              >
                Inicio
              </button>

              <button
                type="button"
                onClick={() =>
                  irSeccion('sobre-parque')
                }
                className="
                  w-full
                  text-left
                  px-4
                  py-3
                  rounded-lg
                  bg-transparent
                  border-none
                  text-white
                  font-medium
                  cursor-pointer
                  hover:bg-white/10
                  transition-all
                "
              >
                Sobre el Parque
              </button>

              <button
                type="button"
                onClick={irEmprendimientos}
                className="
                  w-full
                  text-left
                  px-4
                  py-3
                  rounded-lg
                  bg-transparent
                  border-none
                  text-white
                  font-medium
                  cursor-pointer
                  hover:bg-white/10
                  transition-all
                "
              >
                Emprendimientos
              </button>

              <button
                type="button"
                onClick={() =>
                  irSeccion('eventos')
                }
                className="
                  w-full
                  text-left
                  px-4
                  py-3
                  rounded-lg
                  bg-transparent
                  border-none
                  text-white
                  font-medium
                  cursor-pointer
                  hover:bg-white/10
                  transition-all
                "
              >
                Eventos
              </button>

              {/* SEPARADOR */}
              <div className="border-t border-white/20 my-3" />

              {/* BOTONES */}
              {!rolAutenticado && (
                <div className="flex flex-col gap-2 px-2">

                  <button
                    type="button"
                    onClick={() => {
                      setMenuAbierto(false);
                      onRegistro();
                    }}
                    className="
                      w-full
                      bg-white
                      text-green-900
                      px-4
                      py-3
                      rounded-lg
                      font-semibold
                      text-sm
                      border
                      border-white
                      cursor-pointer
                      transition-all
                      hover:bg-green-50
                    "
                  >
                    Registrarse
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setMenuAbierto(false);
                      onLogin();
                    }}
                    className="
                      w-full
                      bg-transparent
                      text-white
                      px-4
                      py-3
                      rounded-lg
                      font-semibold
                      text-sm
                      border
                      border-white
                      cursor-pointer
                      transition-all
                      hover:bg-white
                      hover:text-green-900
                    "
                  >
                    Iniciar sesión
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
                  className="
                    w-full
                    bg-yellow-500
                    text-white
                    px-4
                    py-3
                    rounded-lg
                    font-semibold
                    text-sm
                    border-none
                    cursor-pointer
                    transition-all
                    hover:bg-yellow-600
                  "
                >
                  Gestionar Roles
                </button>
              )}

            </div>
          </div>
        )}
      </div>
    </nav>
  );
}

export default Navbar;