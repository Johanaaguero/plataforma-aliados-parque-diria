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
import EditarEmprendimiento from './components/EditarEmprendimiento';

import Navbar from './components/informativo/Navbar';
import Hero from './components/informativo/Hero';
import Footer from './components/informativo/Footer';
import Informativo from './components/informativo/general';

import type { Emprendimiento } from './services/emprendimientoService';

type NombreRol =
  | 'administrador'
  | 'asociado'
  | 'visitante';

interface ErrorDeAutenticacion {
  code: string;
  message: string;
  status: number;
}

/**
 * Obtiene el token actualmente almacenado.
 */
const obtenerToken = (): string | null => {
  return (
    sessionStorage.getItem('token') ??
    localStorage.getItem('token')
  );
};

/**
 * Decodifica el payload del JWT.
 */
const obtenerPayloadDesdeToken = (): Record<
  string,
  unknown
> | null => {
  const token = obtenerToken();

  if (!token) {
    return null;
  }

  try {
    const partes = token.split('.');

    if (partes.length < 2) {
      return null;
    }

    const payloadCodificado = partes[1];

    const base64 = payloadCodificado
      .replace(/-/g, '+')
      .replace(/_/g, '/')
      .padEnd(
        Math.ceil(
          payloadCodificado.length / 4
        ) * 4,
        '='
      );

    const bytes = Uint8Array.from(
      atob(base64),
      (caracter) =>
        caracter.charCodeAt(0)
    );

    return JSON.parse(
      new TextDecoder().decode(bytes)
    ) as Record<string, unknown>;
  } catch {
    return null;
  }
};

/**
 * Obtiene el rol autenticado decodificando
 * el payload del JWT.
 */
const obtenerRolDesdeToken = (): NombreRol | null => {
  const payload =
    obtenerPayloadDesdeToken();

  if (!payload) {
    return null;
  }

  const rol = payload.rol;

  if (
    rol === 'administrador' ||
    rol === 'asociado' ||
    rol === 'visitante'
  ) {
    return rol;
  }

  return null;
};

/**
 * Obtiene el ID del usuario autenticado
 * desde el JWT.
 *
 * Se soportan las posibles propiedades:
 * usuarioId
 * id
 * sub
 */
const obtenerUsuarioIdDesdeToken = (): number | null => {
  const payload =
    obtenerPayloadDesdeToken();

  if (!payload) {
    return null;
  }

  const posiblesIds = [
    payload.usuarioId,
    payload.id,
    payload.sub,
  ];

  for (const valor of posiblesIds) {
    if (typeof valor === 'number') {
      if (Number.isFinite(valor)) {
        return valor;
      }
    }

    if (typeof valor === 'string') {
      const id = Number(valor);

      if (
        Number.isFinite(id) &&
        id > 0
      ) {
        return id;
      }
    }
  }

  return null;
};

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

function App() {
  const [mostrarRegistro, setMostrarRegistro] =
    useState(false);

  const [mostrarLogin, setMostrarLogin] =
    useState(false);

  const [mostrarGestionRoles, setMostrarGestionRoles] =
    useState(false);

  const [seccionActual, setSeccionActual] = useState<
    | 'inicio'
    | 'emprendimientos'
    | 'registroEmprendimiento'
    | 'registroCategoria'
    | 'editarEmprendimiento'
  >('inicio');

  const [emprendimientoEditar, setEmprendimientoEditar] =
    useState<Emprendimiento | null>(null);

  const [rolAutenticado, setRolAutenticado] =
    useState<NombreRol | null>(
      obtenerRolDesdeToken()
    );

  /**
   * NUEVO:
   * ID del usuario autenticado.
   */
  const [usuarioId, setUsuarioId] =
    useState<number | null>(
      obtenerUsuarioIdDesdeToken()
    );

  const [errorAutenticacion, setErrorAutenticacion] =
    useState<ErrorDeAutenticacion | null>(null);

  const [mostrarErrorModal, setMostrarErrorModal] =
    useState(false);

  /**
   * Sincroniza la sesión entre pestañas
   * y maneja errores 401/403.
   */
  useEffect(() => {
    const sincronizarSesion = () => {
      setRolAutenticado(
        obtenerRolDesdeToken()
      );

      /**
       * NUEVO:
       * También sincronizamos el ID.
       */
      setUsuarioId(
        obtenerUsuarioIdDesdeToken()
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

    const handleUnauthorized = (
      event: Event
    ) => {
      const customEvent =
        event as CustomEvent<ErrorDeAutenticacion>;

      setErrorAutenticacion(
        customEvent.detail
      );

      setMostrarErrorModal(true);

      setRolAutenticado(null);

      /**
       * NUEVO:
       * Limpiamos también el ID.
       */
      setUsuarioId(null);
    };

    const handleForbidden = (
      event: Event
    ) => {
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

  /**
   * Controla el acceso a cada sección
   * según el rol autenticado.
   */
  useEffect(() => {
    if (
      rolAutenticado !==
      'administrador'
    ) {
      setMostrarGestionRoles(false);
    }

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

    if (
      rolAutenticado !== 'administrador' &&
      seccionActual ===
        'registroCategoria'
    ) {
      setSeccionActual(
        'emprendimientos'
      );
    }

    /**
     * Edición:
     * administrador y asociado.
     */
    if (
      rolAutenticado !==
        'administrador' &&
      rolAutenticado !==
        'asociado' &&
      seccionActual ===
        'editarEmprendimiento'
    ) {
      setEmprendimientoEditar(null);

      setSeccionActual(
        'emprendimientos'
      );
    }
  }, [
    rolAutenticado,
    seccionActual,
  ]);

  /**
   * Cerrar sesión.
   */
  const cerrarSesion = async () => {
    try {
      await api.logout();
    } finally {
      setRolAutenticado(null);

      /**
       * NUEVO:
       * Limpiar usuarioId.
       */
      setUsuarioId(null);

      setMostrarGestionRoles(false);

      setMostrarLogin(false);

      setMostrarRegistro(false);

      setEmprendimientoEditar(null);

      setSeccionActual('inicio');
    }
  };

  /**
   * Cerrar sesión por inactividad.
   */
  const cerrarSesionPorInactividad = () => {
    setRolAutenticado(null);

    /**
     * NUEVO:
     * Limpiar usuarioId.
     */
    setUsuarioId(null);

    setMostrarGestionRoles(false);

    setMostrarLogin(false);

    setMostrarRegistro(false);

    setMostrarErrorModal(false);

    setEmprendimientoEditar(null);

    setSeccionActual('inicio');
  };

  useInactividad({
    activo:
      rolAutenticado !== null,

    tiempoInactividad:
      15 * 60 * 1000,

    onLogout:
      cerrarSesionPorInactividad,
  });

  const cerrarErrorModal = () => {
    setMostrarErrorModal(false);

    setErrorAutenticacion(null);
  };

  const rutaActual =
    window.location.pathname.replace(
      /\/+$/,
      ''
    ) || '/';

  /**
   * Recuperar contraseña.
   */
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

  /**
   * Restablecer contraseña.
   */
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

  /**
   * Login mediante ruta directa.
   */
  if (rutaActual === '/login') {
    return (
      <>
        <BotonVolverInicio />

        <Login
          onLogin={(rol) => {
            setRolAutenticado(rol);

            /**
             * NUEVO:
             * Después del login obtenemos
             * el usuarioId desde el JWT.
             */
            setUsuarioId(
              obtenerUsuarioIdDesdeToken()
            );
          }}
        />
      </>
    );
  }

  /**
   * Registro de categoría:
   * solamente administrador.
   */
  if (
    rutaActual ===
      '/registro-categoria' ||
    seccionActual ===
      'registroCategoria'
  ) {
    const esAdministrador =
      rolAutenticado ===
      'administrador';

    if (!esAdministrador) {
      window.location.href = '/';

      return null;
    }

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
              window.location.href =
                '/';
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
             * No cambiamos de sección para
             * permitir registrar otra categoría.
             */
          }}
        />
      </section>
    );
  }

  /**
   * Registro de emprendimiento:
   * administrador y asociado.
   */
  if (
    rutaActual ===
      '/registro-emprendimiento' ||
    seccionActual ===
      'registroEmprendimiento'
  ) {
    const puedeRegistrar =
      rolAutenticado ===
        'administrador' ||
      rolAutenticado ===
        'asociado';

    if (!puedeRegistrar) {
      window.location.href = '/';

      return null;
    }

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
              window.location.href =
                '/';
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

  /**
   * Edición de emprendimiento:
   * administrador y asociado.
   */
  if (
    seccionActual ===
    'editarEmprendimiento'
  ) {
    if (
      (
        rolAutenticado !==
          'administrador' &&
        rolAutenticado !==
          'asociado'
      ) ||
      !emprendimientoEditar
    ) {
      return null;
    }

    return (
      <section className="formulario-contenedor">
        <button
          type="button"
          className="cerrar-formulario"
          onClick={() => {
            setEmprendimientoEditar(
              null
            );

            setSeccionActual(
              'emprendimientos'
            );
          }}
          aria-label="Volver"
          title="Volver"
        >
          ×
        </button>

        <EditarEmprendimiento
          id={
            emprendimientoEditar.id
          }
          onActualizado={() => {
            setEmprendimientoEditar(
              null
            );

            setSeccionActual(
              'emprendimientos'
            );
          }}
          onCancelar={() => {
            setEmprendimientoEditar(
              null
            );

            setSeccionActual(
              'emprendimientos'
            );
          }}
        />
      </section>
    );
  }

  /**
   * Vista de emprendimientos:
   * administrador, asociado y visitante.
   */
  if (
    seccionActual ===
    'emprendimientos'
  ) {
    return (
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

            /**
             * IMPORTANTE:
             * Ahora sí enviamos el ID del usuario.
             */
            usuarioId={usuarioId}

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

            onEditar={(
              emprendimiento
            ) => {
              setEmprendimientoEditar(
                emprendimiento
              );

              setSeccionActual(
                'editarEmprendimiento'
              );
            }}
          />
        </main>

        <Footer />
      </>
    );
  }

  /**
   * Página principal / inicio.
   */
  return (
    <>
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
            onLogin={(rol) => {
              setRolAutenticado(rol);

              /**
               * NUEVO:
               * Obtener también el ID después
               * del login.
               */
              setUsuarioId(
                obtenerUsuarioIdDesdeToken()
              );

              setMostrarLogin(false);
            }}
          />
        </section>
      ) : (
        mostrarGestionRoles &&
        rolAutenticado ===
          'administrador'
      ) ? (
        <section>
          <button
            type="button"
            className="boton-volver"
            onClick={() => {
              setMostrarGestionRoles(
                false
              );

              setRolAutenticado(
                obtenerRolDesdeToken()
              );

              setUsuarioId(
                obtenerUsuarioIdDesdeToken()
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