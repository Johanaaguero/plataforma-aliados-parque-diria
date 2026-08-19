import { useEffect, useState } from 'react';
import './App.css';

import Registro from './components/Registro';
import Login from './components/login';
import GestionRoles from './components/GestionRoles';
import RecuperarContrasena from './components/RecuperarContrasena';
import RestablecerContrasena from './components/RestablecerContrasena';
import { api } from './services/api';
import { useInactividad } from './services/useInactividad';

import Navbar from './components/informativo/Navbar';
import Hero from './components/informativo/Hero';
import Footer from './components/informativo/Footer';
import Informativo from './components/informativo/general';

type NombreRol = 'administrador' | 'asociado' | 'visitante';

interface ErrorDeAutenticacion {
  code: string;
  message: string;
  status: number;
}

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

  const [errorAutenticacion, setErrorAutenticacion] =
    useState<ErrorDeAutenticacion | null>(null);

  const [mostrarErrorModal, setMostrarErrorModal] = useState(false);

  useEffect(() => {
    const sincronizarSesion = () => {
      setRolAutenticado(obtenerRolDesdeToken());
    };

    window.addEventListener('storage', sincronizarSesion);
    window.addEventListener('focus', sincronizarSesion);

    // Listener para errores de autenticación
    const handleUnauthorized = (event: Event) => {
      const customEvent = event as CustomEvent<ErrorDeAutenticacion>;

      setErrorAutenticacion(customEvent.detail);
      setMostrarErrorModal(true);
      setRolAutenticado(null);
    };

    const handleForbidden = (event: Event) => {
      const customEvent = event as CustomEvent<ErrorDeAutenticacion>;

      setErrorAutenticacion(customEvent.detail);
      setMostrarErrorModal(true);
    };

    window.addEventListener('auth:unauthorized', handleUnauthorized);
    window.addEventListener('auth:forbidden', handleForbidden);

    return () => {
      window.removeEventListener('storage', sincronizarSesion);
      window.removeEventListener('focus', sincronizarSesion);
      window.removeEventListener(
        'auth:unauthorized',
        handleUnauthorized
      );
      window.removeEventListener(
        'auth:forbidden',
        handleForbidden
      );
    };
  }, []);

  useEffect(() => {
    if (rolAutenticado !== 'administrador') {
      setMostrarGestionRoles(false);
    }
  }, [rolAutenticado]);

  const cerrarSesion = async () => {
    try {
      await api.logout();
    } finally {
      setRolAutenticado(null);
      setMostrarGestionRoles(false);
      setMostrarLogin(false);
      setMostrarRegistro(false);
    }
  };

  const cerrarSesionPorInactividad = () => {
    setRolAutenticado(null);
    setMostrarGestionRoles(false);
    setMostrarLogin(false);
    setMostrarRegistro(false);
    setMostrarErrorModal(false);
  };
  useInactividad({
  activo: rolAutenticado !== null,
  tiempoInactividad: 15* 60* 1000,
  onLogout: cerrarSesionPorInactividad,
});

  const cerrarErrorModal = () => {
    setMostrarErrorModal(false);
    setErrorAutenticacion(null);
  };

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
            onIrLogin={() => {
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

          {rolAutenticado && (
            <button
              type="button"
              className="counter"
              onClick={() => {
                void cerrarSesion();
              }}
            >
              Cerrar sesión
            </button>
          )}

          {mostrarErrorModal && errorAutenticacion && (
            <div
              style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1000,
              }}
            >
              <div
                style={{
                  backgroundColor: 'white',
                  padding: '20px',
                  borderRadius: '8px',
                  maxWidth: '400px',
                  boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)',
                }}
              >
                <h2 style={{ marginTop: 0 }}>
                  {errorAutenticacion.status === 401
                    ? 'Sesión expirada'
                    : 'Acceso denegado'}
                </h2>

                <p>{errorAutenticacion.message}</p>

                {errorAutenticacion.code && (
                  <p style={{ fontSize: '12px', color: '#666' }}>
                    Código: {errorAutenticacion.code}
                  </p>
                )}

                <button
                  type="button"
                  onClick={cerrarErrorModal}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#007bff',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                  }}
                >
                  Aceptar
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </>
  );
}

export default App;