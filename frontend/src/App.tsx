import { useEffect, useState } from 'react';
import './App.css';

import Registro from './components/Registro';
import Login from './components/login';
import GestionRoles from './components/GestionRoles';
import RecuperarContrasena from './components/RecuperarContrasena';
import RestablecerContrasena from './components/RestablecerContrasena';

import Navbar from './components/informativo/Navbar';
import Hero from './components/informativo/Hero';
import Footer from './components/informativo/Footer';
import Informativo from './components/informativo/general';

type NombreRol = 'administrador' | 'asociado' | 'visitante';

const obtenerRolDesdeToken = (): NombreRol | null => {
  const token =
    sessionStorage.getItem('token') ?? localStorage.getItem('token');

  if (!token) return null;

  try {
    const payloadCodificado = token.split('.')[1];

    if (!payloadCodificado) return null;

    const base64 = payloadCodificado
      .replace(/-/g, '+')
      .replace(/_/g, '/')
      .padEnd(Math.ceil(payloadCodificado.length / 4) * 4, '=');

    const bytes = Uint8Array.from(atob(base64), (caracter) =>
      caracter.charCodeAt(0)
    );

    const payload = JSON.parse(
      new TextDecoder().decode(bytes)
    ) as {
      rol?: unknown;
    };

    return payload.rol === 'administrador' ||
      payload.rol === 'asociado' ||
      payload.rol === 'visitante'
      ? payload.rol
      : null;
  } catch {
    return null;
  }
};

function App() {
  const [mostrarRegistro, setMostrarRegistro] = useState(false);
  const [mostrarLogin, setMostrarLogin] = useState(false);
  const [mostrarGestionRoles, setMostrarGestionRoles] = useState(false);

  const [rolAutenticado, setRolAutenticado] =
    useState<NombreRol | null>(obtenerRolDesdeToken);

  useEffect(() => {
    const sincronizarSesion = () => {
      setRolAutenticado(obtenerRolDesdeToken());
    };

    window.addEventListener('storage', sincronizarSesion);
    window.addEventListener('focus', sincronizarSesion);

    return () => {
      window.removeEventListener('storage', sincronizarSesion);
      window.removeEventListener('focus', sincronizarSesion);
    };
  }, []);

  useEffect(() => {
    if (rolAutenticado !== 'administrador') {
      setMostrarGestionRoles(false);
    }
  }, [rolAutenticado]);

  const rutaActual =
    window.location.pathname.replace(/\/+$/, '') || '/';

  // Recuperar contraseña
  if (rutaActual === '/recuperar-contrasena') {
    return <RecuperarContrasena />;
  }

  // Restablecer contraseña
  if (rutaActual === '/restablecer-contrasena') {
    return <RestablecerContrasena />;
  }

  // Login mediante ruta
  if (rutaActual === '/login') {
    return <Login onLogin={setRolAutenticado} />;
  }

  return (
    <>
      {mostrarRegistro ? (
        // FORMULARIO DE REGISTRO
        <section className="formulario-contenedor">
          <button
            type="button"
            className="cerrar-formulario"
            onClick={() => setMostrarRegistro(false)}
            aria-label="Cerrar formulario"
            title="Cerrar"
          >
            ×
          </button>

          <Registro
            onIrALogin={() => {
              setMostrarRegistro(false);
              setMostrarLogin(true);
            }}
          />
        </section>
      ) : mostrarLogin ? (
        // FORMULARIO DE LOGIN
        <section className="formulario-contenedor">
          <button
            type="button"
            className="cerrar-formulario"
            onClick={() => setMostrarLogin(false)}
            aria-label="Cerrar formulario"
            title="Cerrar"
          >
            ×
          </button>

          <Login onLogin={setRolAutenticado} />
        </section>
      ) : mostrarGestionRoles &&
        rolAutenticado === 'administrador' ? (
        // GESTIÓN DE ROLES
        <section>
          <button
            type="button"
            onClick={() => {
              setMostrarGestionRoles(false);
              setRolAutenticado(obtenerRolDesdeToken());
            }}
          >
            ← Volver
          </button>

          <GestionRoles />
        </section>
     ) : (
  // PÁGINA PRINCIPAL
  <>
    <Navbar 
      onRegistro={() => setMostrarRegistro(true)} 
      onLogin={() => setMostrarLogin(true)} 
      rolAutenticado={rolAutenticado} 
      onGestionRoles={() => setMostrarGestionRoles(true)} 
    />

    <Hero />

    <Informativo />
    <Footer />
  </>
)}
    </>
  );
}

export default App;