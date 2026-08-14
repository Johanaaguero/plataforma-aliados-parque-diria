import { useEffect, useState } from 'react';
import reactLogo from './assets/react.svg';
import viteLogo from './assets/vite.svg';
import heroImg from './assets/hero.png';
import './App.css';

import Registro from './components/Registro';
import Login from './components/login';
import GestionRoles from './components/GestionRoles';

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
    const payload = JSON.parse(new TextDecoder().decode(bytes)) as {
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
  const [rolAutenticado, setRolAutenticado] = useState<NombreRol | null>(
    obtenerRolDesdeToken
  );

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

  return (
    <>
      {mostrarRegistro ? (
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
      ) : mostrarGestionRoles && rolAutenticado === 'administrador' ? (
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
        <>
          <section id="center">
            <div className="hero">
              <img
                src={heroImg}
                className="base"
                width="170"
                height="179"
                alt=""
              />

              <img
                src={reactLogo}
                className="framework"
                alt="React logo"
              />

              <img
                src={viteLogo}
                className="vite"
                alt="Vite logo"
              />
            </div>

            <div>
              <h1>Get started</h1>

              <p>
                Edit <code>src/App.tsx</code> and save to test{' '}
                <code>HMR</code>
              </p>
            </div>

            <button
              type="button"
              className="counter"
              onClick={() => setMostrarRegistro(true)}
            >
              Registrarse
            </button>

            <button
              type="button"
              className="counter"
              onClick={() => setMostrarLogin(true)}
            >
              Iniciar sesión
            </button>

            {rolAutenticado === 'administrador' && (
              <button
                type="button"
                className="counter"
                onClick={() => setMostrarGestionRoles(true)}
              >
                Gestionar Roles
              </button>
            )}
          </section>

          <div className="ticks"></div>

          <section id="next-steps">
            <div id="docs">
              <svg
                className="icon"
                role="presentation"
                aria-hidden="true"
              >
                <use href="/icons.svg#documentation-icon"></use>
              </svg>

              <h2>Documentation</h2>
              <p>Your questions, answered</p>

              <ul>
                <li>
                  <a
                    href="https://vite.dev/"
                    target="_blank"
                    rel="noreferrer"
                  >
                    <img
                      className="logo"
                      src={viteLogo}
                      alt=""
                    />
                    Explore Vite
                  </a>
                </li>

                <li>
                  <a
                    href="https://react.dev/"
                    target="_blank"
                    rel="noreferrer"
                  >
                    <img
                      className="button-icon"
                      src={reactLogo}
                      alt=""
                    />
                    Learn more
                  </a>
                </li>
              </ul>
            </div>

            <div id="social">
              <svg
                className="icon"
                role="presentation"
                aria-hidden="true"
              >
                <use href="/icons.svg#social-icon"></use>
              </svg>

              <h2>Connect with us</h2>
              <p>Join the Vite community</p>

              <ul>
                <li>
                  <a
                    href="https://github.com/vitejs/vite"
                    target="_blank"
                    rel="noreferrer"
                  >
                    <svg
                      className="button-icon"
                      role="presentation"
                      aria-hidden="true"
                    >
                      <use href="/icons.svg#github-icon"></use>
                    </svg>
                    GitHub
                  </a>
                </li>

                <li>
                  <a
                    href="https://chat.vite.dev/"
                    target="_blank"
                    rel="noreferrer"
                  >
                    <svg
                      className="button-icon"
                      role="presentation"
                      aria-hidden="true"
                    >
                      <use href="/icons.svg#discord-icon"></use>
                    </svg>
                    Discord
                  </a>
                </li>

                <li>
                  <a
                    href="https://x.com/vite_js"
                    target="_blank"
                    rel="noreferrer"
                  >
                    <svg
                      className="button-icon"
                      role="presentation"
                      aria-hidden="true"
                    >
                      <use href="/icons.svg#x-icon"></use>
                    </svg>
                    X.com
                  </a>
                </li>

                <li>
                  <a
                    href="https://bsky.app/profile/vite.dev"
                    target="_blank"
                    rel="noreferrer"
                  >
                    <svg
                      className="button-icon"
                      role="presentation"
                      aria-hidden="true"
                    >
                      <use href="/icons.svg#bluesky-icon"></use>
                    </svg>
                    Bluesky
                  </a>
                </li>
              </ul>
            </div>
          </section>

          <div className="ticks"></div>

          <section id="spacer"></section>
        </>
      )}
    </>
  );
}

export default App;
