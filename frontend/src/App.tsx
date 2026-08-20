import { useEffect, useState } from 'react';
import './App.css';

import Registro from './components/Registro';
import Login from './components/login';
import GestionRoles from './components/GestionRoles';
import RecuperarContrasena from './components/RecuperarContrasena';
import RestablecerContrasena from './components/RestablecerContrasena';
import { api } from './services/api';
import { useInactividad } from './services/useInactividad';
import RegistroEmprendimiento from './components/RegistroEmprendimiento';
import ListaEmprendimientos from './components/ListaEmprendimientos';
import RegistroCategoria from './components/RegistroCategoria';

import Navbar from './components/informativo/Navbar';
import Hero from './components/informativo/Hero';
import Footer from './components/informativo/Footer';
import Informativo from './components/informativo/general';

type NombreRol =
  | 'administrador'
  | 'asociado'
  | 'visitante';

interface ErrorDeAutenticacion {
  code: string;
  message: string;
  status: number;
}

// ============================================================
// OBTENER ROL DESDE EL TOKEN
// ============================================================

const obtenerRolDesdeToken = (): NombreRol | null => {
  const token =
    sessionStorage.getItem('token') ??
    localStorage.getItem('token');

  if (!token) {
    return null;
  }

  try {
    const payloadCodificado = token.split('.')[1];

    if (!payloadCodificado) {
      return null;
    }

    const base64 = payloadCodificado
      .replace(/-/g, '+')
      .replace(/_/g, '/')
      .padEnd(
        Math.ceil(payloadCodificado.length / 4) * 4,
        '='
      );

    const bytes = Uint8Array.from(
      atob(base64),
      (caracter) => caracter.charCodeAt(0)
    );

    const payload = JSON.parse(
      new TextDecoder().decode(bytes)
    ) as {
      rol?: unknown;
    };

    if (
      payload.rol === 'administrador' ||
      payload.rol === 'asociado' ||
      payload.rol === 'visitante'
    ) {
      return payload.rol;
    }

    return null;
  } catch {
    return null;
  }
};

// ============================================================
// BOTÓN VOLVER AL INICIO
// ============================================================

function BotonVolverInicio({
  onClick,
}: {
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      className="boton-volver-inicio"
      onClick={() => {
        if (onClick) {
          onClick();
        } else {
          window.location.href = '/';
        }
      }}
    >
      <span className="boton-volver-inicio-icono">
        ←
      </span>

      <span>Volver al inicio</span>
    </button>
  );
}

// ============================================================
// APP
// ============================================================

function App() {
  const [mostrarRegistro, setMostrarRegistro] =
    useState(false);

  const [mostrarLogin, setMostrarLogin] =
    useState(false);

  const [mostrarGestionRoles, setMostrarGestionRoles] =
    useState(false);

  // ==========================================================
  // SECCIÓN ACTUAL
  //
  // inicio
  // emprendimientos
  // registroEmprendimiento
  // registroCategoria
  // ==========================================================

  const [seccionActual, setSeccionActual] = useState<
    | 'inicio'
    | 'emprendimientos'
    | 'registroEmprendimiento'
    | 'registroCategoria'
  >('inicio');

  // ==========================================================
  // ROL AUTENTICADO
  // ==========================================================

  const [rolAutenticado, setRolAutenticado] =
    useState<NombreRol | null>(
      obtenerRolDesdeToken
    );

  // ==========================================================
  // ERRORES DE AUTENTICACIÓN
  // ==========================================================

  const [errorAutenticacion, setErrorAutenticacion] =
    useState<ErrorDeAutenticacion | null>(null);

  const [mostrarErrorModal, setMostrarErrorModal] =
    useState(false);

  // ============================================================
  // SINCRONIZAR SESIÓN
  // ============================================================

  useEffect(() => {
    const sincronizarSesion = () => {
      setRolAutenticado(
        obtenerRolDesdeToken()
      );
    };

    window.addEventListener(
      'storage',
      sincronizarSesion
    );

    window.addEventListener(
      'focus',
      sincronizarSesion
    );

    // ==========================================================
    // 401 - SESIÓN NO AUTORIZADA
    // ==========================================================

    const handleUnauthorized = (event: Event) => {
      const customEvent =
        event as CustomEvent<ErrorDeAutenticacion>;

      setErrorAutenticacion(
        customEvent.detail
      );

      setMostrarErrorModal(true);

      setRolAutenticado(null);
    };

    // ==========================================================
    // 403 - ACCESO DENEGADO
    // ==========================================================

    const handleForbidden = (event: Event) => {
      const customEvent =
        event as CustomEvent<ErrorDeAutenticacion>;

      setErrorAutenticacion(
        customEvent.detail
      );

      setMostrarErrorModal(true);
    };

    window.addEventListener(
      'auth:unauthorized',
      handleUnauthorized
    );

    window.addEventListener(
      'auth:forbidden',
      handleForbidden
    );

    // ==========================================================
    // LIMPIEZA
    // ==========================================================

    return () => {
      window.removeEventListener(
        'storage',
        sincronizarSesion
      );

      window.removeEventListener(
        'focus',
        sincronizarSesion
      );

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

  // ============================================================
  // CONTROL DE PERMISOS SEGÚN ROL
  // ============================================================

  useEffect(() => {
    /*
     * GESTIÓN DE ROLES:
     *
     * Solo el administrador puede acceder.
     */

    if (rolAutenticado !== 'administrador') {
      setMostrarGestionRoles(false);
    }

    /*
     * REGISTRO DE EMPRENDIMIENTO:
     *
     * Administrador y asociado pueden registrar.
     *
     * Visitante y usuario sin sesión no pueden.
     */

    if (
      rolAutenticado !== 'administrador' &&
      rolAutenticado !== 'asociado'
    ) {
      if (
        seccionActual ===
        'registroEmprendimiento'
      ) {
        setSeccionActual(
          'emprendimientos'
        );
      }
    }

    /*
     * REGISTRO DE CATEGORÍA:
     *
     * SOLO el administrador puede registrar categorías.
     */

    if (
      rolAutenticado !== 'administrador' &&
      seccionActual === 'registroCategoria'
    ) {
      setSeccionActual(
        'emprendimientos'
      );
    }
  }, [
    rolAutenticado,
    seccionActual,
  ]);

  // ============================================================
  // CERRAR SESIÓN
  // ============================================================

  const cerrarSesion = async () => {
    try {
      await api.logout();
    } finally {
      setRolAutenticado(null);

      setMostrarGestionRoles(false);

      setMostrarLogin(false);

      setMostrarRegistro(false);

      setSeccionActual('inicio');
    }
  };

  // ============================================================
  // CERRAR SESIÓN POR INACTIVIDAD
  // ============================================================

  const cerrarSesionPorInactividad = () => {
    setRolAutenticado(null);

    setMostrarGestionRoles(false);

    setMostrarLogin(false);

    setMostrarRegistro(false);

    setMostrarErrorModal(false);

    setSeccionActual('inicio');
  };

  useInactividad({
    activo: rolAutenticado !== null,
    tiempoInactividad: 15 * 60 * 1000,
    onLogout: cerrarSesionPorInactividad,
  });

  // ============================================================
  // CERRAR MODAL DE ERROR
  // ============================================================

  const cerrarErrorModal = () => {
    setMostrarErrorModal(false);

    setErrorAutenticacion(null);
  };

  // ============================================================
  // RUTA ACTUAL
  // ============================================================

  const rutaActual =
    window.location.pathname.replace(
      /\/+$/,
      ''
    ) || '/';

  // ============================================================
  // RECUPERAR CONTRASEÑA
  // ============================================================

  if (
    rutaActual ===
    '/recuperar-contrasena'
  ) {
    return (
      <>
        <BotonVolverInicio />

        <RecuperarContrasena />
      </>
    );
  }

  // ============================================================
  // RESTABLECER CONTRASEÑA
  // ============================================================

  if (
    rutaActual ===
    '/restablecer-contrasena'
  ) {
    return (
      <>
        <BotonVolverInicio />

        <RestablecerContrasena />
      </>
    );
  }

  // ============================================================
  // LOGIN MEDIANTE RUTA
  // ============================================================

  if (rutaActual === '/login') {
    return (
      <>
        <BotonVolverInicio />

        <Login
          onLogin={setRolAutenticado}
        />
      </>
    );
  }

  // ============================================================
  // REGISTRO DE CATEGORÍA
  //
  // PERMITIDO ÚNICAMENTE PARA:
  //
  // administrador
  //
  // NO PERMITIDO PARA:
  //
  // asociado
  // visitante
  // sin sesión
  // ============================================================

  if (
    rutaActual === '/registro-categoria' ||
    seccionActual === 'registroCategoria'
  ) {
    const esAdministrador =
      rolAutenticado === 'administrador';

    // ----------------------------------------------------------
    // SI NO ES ADMINISTRADOR
    // ----------------------------------------------------------

    if (!esAdministrador) {
      window.location.href = '/';

      return null;
    }

    // ----------------------------------------------------------
    // FORMULARIO DE CATEGORÍA
    // ----------------------------------------------------------

    return (
      <section className="formulario-contenedor">

        <button
          type="button"
          className="cerrar-formulario"
          onClick={() => {
            setSeccionActual(
              'emprendimientos'
            );

            if (
              rutaActual ===
              '/registro-categoria'
            ) {
              window.location.href = '/';
            }
          }}
          aria-label="Volver"
          title="Volver"
        >
          × 
        </button>

        <RegistroCategoria
          onCategoriaCreada={() => {
            /*
             * NO cambiamos de sección.
             *
             * Esto permite que el administrador
             * pueda registrar otra categoría
             * inmediatamente.
             */
          }}
        />

      </section>
    );
  }

  // ============================================================
  // REGISTRO DE EMPRENDIMIENTO
  //
  // PERMITIDO PARA:
  //
  // administrador
  // asociado
  //
  // NO PERMITIDO PARA:
  //
  // visitante
  // sin sesión
  // ============================================================

  if (
    rutaActual ===
      '/registro-emprendimiento' ||
    seccionActual ===
      'registroEmprendimiento'
  ) {
    const puedeRegistrar =
      rolAutenticado === 'administrador' ||
      rolAutenticado === 'asociado';

    // ----------------------------------------------------------
    // SI NO TIENE PERMISOS
    // ----------------------------------------------------------

    if (!puedeRegistrar) {
      window.location.href = '/';

      return null;
    }

    // ----------------------------------------------------------
    // FORMULARIO
    // ----------------------------------------------------------

    return (
      <section className="formulario-contenedor">

        <button
          type="button"
          className="cerrar-formulario"
          onClick={() => {
            setSeccionActual(
              'emprendimientos'
            );

            if (
              rutaActual ===
              '/registro-emprendimiento'
            ) {
              window.location.href = '/';
            }
          }}
          aria-label="Volver"
          title="Volver"
        >
          × 
        </button>

        <RegistroEmprendimiento />

      </section>
    );
  }

  // ============================================================
  // VISTA DE EMPRENDIMIENTOS
  //
  // ADMINISTRADOR:
  // - ve todos
  // - registra emprendimientos
  // - registra categorías
  // - cambia estados
  //
  // ASOCIADO:
  // - ve todos
  // - registra emprendimientos
  // - NO registra categorías
  // - NO cambia estados
  //
  // VISITANTE:
  // - solo ve publicados
  // - no registra
  // - no cambia estados
  //
  // SIN SESIÓN:
  // - solo ve publicados
  // ============================================================

  if (
    seccionActual ===
    'emprendimientos'
  ) {
    return (
      <>
        {/* ======================================================
            NAVBAR
        ====================================================== */}

        <Navbar
          onRegistro={() =>
            setMostrarRegistro(true)
          }

          onLogin={() =>
            setMostrarLogin(true)
          }

          rolAutenticado={
            rolAutenticado
          }

          onGestionRoles={() =>
            setMostrarGestionRoles(true)
          }

          onIrInicio={() =>
            setSeccionActual('inicio')
          }

          onIrEmprendimientos={() =>
            setSeccionActual(
              'emprendimientos'
            )
          }
        />

        {/* ======================================================
            LISTA
        ====================================================== */}

        <main
          style={{
            minHeight: '80vh',
            paddingTop: '20px',
          }}
        >
          <ListaEmprendimientos
            rolAutenticado={
              rolAutenticado
            }

            onRegistrar={() =>
              setSeccionActual(
                'registroEmprendimiento'
              )
            }

            onRegistrarCategoria={() =>
              setSeccionActual(
                'registroCategoria'
              )
            }
          />
        </main>

        {/* ======================================================
            FOOTER
        ====================================================== */}

        <Footer />
      </>
    );
  }

  // ============================================================
  // PÁGINA PRINCIPAL / INICIO
  // ============================================================

  return (
    <>
      {/* ========================================================
          REGISTRO DE USUARIO
      ======================================================== */}

      {mostrarRegistro ? (

        <section className="formulario-contenedor">

          <button
            type="button"
            className="cerrar-formulario"
            onClick={() =>
              setMostrarRegistro(false)
            }
            aria-label="Cerrar formulario"
            title="Cerrar"
          >
            ×
          </button>

          <Registro
            onIrLogin={() => {
              setMostrarRegistro(
                false
              );

              setMostrarLogin(true);
            }}
          />

        </section>

      ) : mostrarLogin ? (

        /* ======================================================
           LOGIN
        ====================================================== */

        <section className="formulario-contenedor">

          <button
            type="button"
            className="cerrar-formulario"
            onClick={() =>
              setMostrarLogin(false)
            }
            aria-label="Cerrar formulario"
            title="Cerrar"
          >
            ×
          </button>

          <Login
            onLogin={
              setRolAutenticado
            }
          />

        </section>

      ) : mostrarGestionRoles &&
        rolAutenticado ===
          'administrador' ? (

        /* ======================================================
           GESTIÓN DE ROLES
        ====================================================== */

        <section>

          <button
            type="button"
            className="boton-volver"
            onClick={() => {
              setMostrarGestionRoles(false);

              setRolAutenticado(
                obtenerRolDesdeToken()
              );
            }}
          >
            <span className="boton-volver-icono">
              ←
            </span>

            <span>Volver</span>
          </button>

          <GestionRoles />

        </section>

      ) : (

        /* ======================================================
           INICIO
        ====================================================== */

        <>

          <Navbar
            onRegistro={() =>
              setMostrarRegistro(true)
            }

            onLogin={() =>
              setMostrarLogin(true)
            }

            rolAutenticado={
              rolAutenticado
            }

            onGestionRoles={() =>
              setMostrarGestionRoles(
                true
              )
            }

            onIrInicio={() =>
              setSeccionActual(
                'inicio'
              )
            }

            onIrEmprendimientos={() =>
              setSeccionActual(
                'emprendimientos'
              )
            }
          />

          <Hero />

          <Informativo />

          <Footer />

          {/* ==================================================
              CERRAR SESIÓN
          ================================================== */}

          {rolAutenticado && (
            <button
              type="button"
              className="boton-cerrar-sesion"
              onClick={() => {
                void cerrarSesion();
              }}
            >
              <span className="boton-cerrar-icono">
                ↪
              </span>

              <span>
                Cerrar sesión
              </span>
            </button>
          )}

          {/* ==================================================
              MODAL DE ERROR
          ================================================== */}

          {mostrarErrorModal &&
            errorAutenticacion && (

              <div
                style={{
                  position: 'fixed',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundColor:
                    'rgba(0, 0, 0, 0.5)',
                  display: 'flex',
                  alignItems:
                    'center',
                  justifyContent:
                    'center',
                  zIndex: 1000,
                  padding: '20px',
                }}
              >

                <div
                  style={{
                    backgroundColor:
                      'white',
                    padding: '24px',
                    borderRadius:
                      '12px',
                    maxWidth:
                      '400px',
                    width: '100%',
                    boxShadow:
                      '0 10px 30px rgba(0, 0, 0, 0.2)',
                  }}
                >

                  <h2
                    style={{
                      marginTop: 0,
                      marginBottom:
                        '12px',
                      fontSize:
                        '20px',
                      fontWeight:
                        '700',
                    }}
                  >
                    {errorAutenticacion.status ===
                    401
                      ? 'Sesión expirada'
                      : 'Acceso denegado'}
                  </h2>

                  <p
                    style={{
                      marginBottom:
                        '12px',
                      color:
                        '#444',
                    }}
                  >
                    {
                      errorAutenticacion.message
                    }
                  </p>

                  {errorAutenticacion.code && (
                    <p
                      style={{
                        fontSize:
                          '12px',
                        color:
                          '#666',
                        marginBottom:
                          '18px',
                      }}
                    >
                      Código:{' '}
                      {
                        errorAutenticacion.code
                      }
                    </p>
                  )}

                  <button
                    type="button"
                    onClick={
                      cerrarErrorModal
                    }
                    style={{
                      padding:
                        '9px 18px',
                      backgroundColor:
                        '#007bff',
                      color:
                        'white',
                      border:
                        'none',
                      borderRadius:
                        '6px',
                      cursor:
                        'pointer',
                      fontWeight:
                        '600',
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