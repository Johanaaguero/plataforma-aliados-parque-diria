import logo from '../../assets/logo.png';
import { useEffect, useState } from 'react';

interface NavbarProps {
  onRegistro: () => void;
  onLogin: () => void;
  rolAutenticado: string | null;
  onGestionRoles: () => void;
  onIrInicio: () => void;
  onIrEmprendimientos: () => void;
}

function Navbar({
  onRegistro,
  onLogin,
  rolAutenticado,
  onGestionRoles,
  onIrInicio,
  onIrEmprendimientos,
}: NavbarProps) {
  // Detectar si el usuario ha hecho scroll
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const manejarScroll = () => {
      setScrolled(window.scrollY > 50);
    };

    window.addEventListener('scroll', manejarScroll);

    return () => {
      window.removeEventListener('scroll', manejarScroll);
    };
  }, []);

  return (
    <nav
      className={`fixed top-0 left-0 w-full z-50 text-white px-8 py-4 flex items-center justify-between transition-all duration-300 ${
        scrolled
          ? 'bg-green-141/40 backdrop-blur-md shadow-md'
          : 'bg-green-70'
      }`}
    >
      {/* Logo */}
      <div>
        <img
          src={logo}
          alt="Logo SIGTAD"
          className="h-12 w-auto cursor-pointer"
          onClick={onIrInicio}
        />
      </div>

      {/* Enlaces */}
      <div className="flex items-center gap-6">
        <button
          type="button"
          onClick={onIrInicio}
          className="hover:text-green-200 transition-colors bg-transparent border-none text-white font-normal text-base cursor-pointer"
        >
          Inicio
        </button>

        <a
          href="#sobre-parque"
          className="hover:text-green-200 transition-colors"
        >
          Sobre el Parque
        </a>

        <button
          type="button"
          onClick={onIrEmprendimientos}
          className="hover:text-green-200 transition-colors bg-transparent border-none text-white font-normal text-base cursor-pointer"
        >
          Emprendimientos
        </button>

        <a
          href="#eventos"
          className="hover:text-green-200 transition-colors"
        >
          Eventos
        </a>
      </div>

      {/* Botones */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onRegistro}
          className="bg-white text-green-800 px-4 py-2 rounded-lg font-medium hover:bg-green-100 transition-colors"
        >
          Registrarse
        </button>

        <button
          type="button"
          onClick={onLogin}
          className="border border-white px-4 py-2 rounded-lg font-medium hover:bg-white hover:text-green-800 transition-colors"
        >
          Iniciar sesión
        </button>

        {rolAutenticado === 'administrador' && (
          <button
            type="button"
            onClick={onGestionRoles}
            className="bg-yellow-500 text-white px-4 py-2 rounded-lg font-medium hover:bg-yellow-600 transition-colors"
          >
            Gestionar Roles
          </button>
        )}
      </div>
    </nav>
  );
}

export default Navbar;