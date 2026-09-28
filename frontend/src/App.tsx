import { useEffect, useState } from 'react';

import { useLocation, useNavigate } from 'react-router-dom';

import Registro from './components/Registro';

import Login from './components/login';

import GestionRoles from './components/GestionRoles';

import CuentasBloqueadas from './components/Super_admin/CuentasBloqueadas';

import RecuperarContrasena from './components/RecuperarContrasena';

import RestablecerContrasena from './components/RestablecerContrasena';

import ListaEventosCapacitaciones from './components/Gestión de Eventos y Capacitaciones/ListaEventosCapacitaciones';

import InscripcionesAdmin from './components/Gestión de Eventos y Capacitaciones/InscripcionesAdmin';

import MisInscripciones from './components/Gestión de Eventos y Capacitaciones/MisInscripciones';

import Bitacora from './components/Super_admin/Bitacora';

import { mostrarFeedback } from './components/ui/FeedbackToast';

import { mostrarBienvenidaLogin } from './components/ui/LoginWelcomeOverlay';

import RegistroIncidencia from './components/Gestión de incidencias/RegistroIncidencia';

import IncidenciasAdmin from './components/Gestión de incidencias/admin/IncidenciasAdmin';

import MisIncidencias from './components/Gestión de incidencias/MisIncidencias';

import { api } from './services/api';

import { useInactividad } from './services/useInactividad';

import RegistroEmprendimiento from './components/RegistroEmprendimiento';

import ListaEmprendimientos from './components/ListaEmprendimientos';

import RegistroCategoria from './components/RegistroCategoria';

import EditarEmprendimiento from './components/EditarEmprendimiento';

import DashboardPage from './components/dashboard/DashboardPage';

import Navbar from './components/informativo/Navbar';

import Hero from './components/informativo/Hero';
import ModalNovedades from './components/informativo/ModalNovedades';
import SeccionResenas from './components/informativo/SeccionResenas';

import Footer from './components/informativo/Footer';

import Informativo from './components/informativo/general';

import MapaParque from './components/informativo/MapaParque';


import type { Emprendimiento } from './services/emprendimientoService';
import ReportesPage from './components/Reportes y Estatisticas/ReportesPage';
import GestionComunicados from './components/GestionComunicados';

type NombreRol =
  | 'administrador'
  | 'asociado'
  | 'visitante'
  | 'super_admin';

interface ErrorDeAutenticacion {
  code: string;
  message: string;
  status: number;
}

const obtenerToken = (): string | null => {
  return (
    sessionStorage.getItem('token') ??
    localStorage.getItem('token')
  );
};

const obtenerPayloadDesdeToken = (): Record<string, unknown> | null => {
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
      .replace(/\_/g, '/')
      .padEnd(
        Math.ceil(payloadCodificado.length / 4) * 4,
        '='
      );

    const bytes = Uint8Array.from(
      atob(base64),
      (caracter) => caracter.charCodeAt(0)
    );

    return JSON.parse(
      new TextDecoder().decode(bytes)
    ) as Record<string, unknown>;
  } catch {
    return null;
  }
};

const obtenerRolDesdeToken = (): NombreRol | null => {
  const payload = obtenerPayloadDesdeToken();

  if (!payload) {
    return null;
  }

  const rol = payload.rol;

  if (
    rol === 'administrador' ||
    rol === 'asociado' ||
    rol === 'visitante' ||
    rol === 'super_admin'
  ) {
    return rol;
  }

  return null;
};

const obtenerNombreUsuarioDesdeToken = (): string | null => {
  const payload = obtenerPayloadDesdeToken();

  if (
    !payload ||
    typeof payload.nombreUsuario !== 'string'
  ) {
    return null;
  }

  const nombreUsuario = payload.nombreUsuario.trim();

  return nombreUsuario || null;
};

const obtenerUsuarioIdDesdeToken = (): number | null => {
  const payload = obtenerPayloadDesdeToken();

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
  texto = 'Volver al inicio',
}: {
  onClick?: () => void;
  texto?: string;
}) {
  return (
    <button
      type="button"
      className="fixed left-3 top-3 z-[60] flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-gray-100/80 text-gray-800 shadow-[0_10px_30px_rgba(7,63,49,0.12)] backdrop-blur-md transition-all duration-200 hover:bg-gray-200/80 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8dc63f] focus-visible:ring-offset-2 dark:border-white/15 dark:bg-white/10 dark:text-white dark:hover:bg-white/20 sm:left-5 sm:top-5"
      onClick={() => {
        if (onClick) {
          onClick();
        } else {
          window.location.href = '/';
        }
      }}
      aria-label={texto}
      title={texto}
    >
      <svg
        className="h-5 w-5"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        aria-hidden="true"
      >
        <path
          d="m15 18-6-6 6-6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>

      <span className="sr-only">{texto}</span>
    </button>
  );
}

function App() {
  const location = useLocation();
  const navigate = useNavigate();

  const [mostrarRegistro, setMostrarRegistro] =
    useState(() => new URLSearchParams(window.location.search).get('registro') === '1');

  const [mostrarLogin, setMostrarLogin] =
    useState(false);

  const [mostrarNovedades, setMostrarNovedades] =
    useState(false);

  const [mostrarGestionRoles, setMostrarGestionRoles] =
    useState(false);

  const [mostrarCuentasBloqueadas, setMostrarCuentasBloqueadas] =
    useState(false);

  const [seccionActual, setSeccionActual] = useState<
    | 'inicio'
    | 'emprendimientos'
    | 'eventos'
    | 'incidencias'
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

  const [nombreUsuario, setNombreUsuario] =
    useState<string | null>(
      obtenerNombreUsuarioDesdeToken()
    );

  const [usuarioId, setUsuarioId] =
    useState<number | null>(
      obtenerUsuarioIdDesdeToken()
    );

  const [errorAutenticacion, setErrorAutenticacion] =
    useState<ErrorDeAutenticacion | null>(null);

  const [mostrarErrorModal, setMostrarErrorModal] =
    useState(false);

  const [incidenciasAdminEnEdicion, setIncidenciasAdminEnEdicion] =
    useState(false);

  const [incidenciasAdminKey, setIncidenciasAdminKey] =
    useState(0);

  useEffect(() => {
    const sincronizarSesion = () => {
      setRolAutenticado(
        obtenerRolDesdeToken()
      );

      setNombreUsuario(
        obtenerNombreUsuarioDesdeToken()
      );

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

      const error = customEvent.detail;

      if (error?.code === 'INVALID_CREDENTIALS') {
        return;
      }

      setErrorAutenticacion(error);
      setMostrarErrorModal(true);
      setRolAutenticado(null);
      setNombreUsuario(null);
      setMostrarCuentasBloqueadas(false);
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

  useEffect(() => {
    if (rolAutenticado !== 'super_admin') {
      setMostrarCuentasBloqueadas(false);
    }

    if (rolAutenticado !== 'administrador') {
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

    if (
      rolAutenticado !== 'administrador' &&
      rolAutenticado !== 'asociado' &&
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

  useEffect(() => {
    if (
      mostrarCuentasBloqueadas &&
      errorAutenticacion?.status === 403
    ) {
      setMostrarErrorModal(false);
      setErrorAutenticacion(null);
    }
  }, [
    mostrarCuentasBloqueadas,
    errorAutenticacion,
  ]);

  useEffect(() => {
    if (window.location.pathname === '/login' || mostrarLogin) {
      document.title = 'Iniciar sesión | Aliados Diriá';
      return;
    }

    if (mostrarRegistro) {
      document.title = 'Registrarse | Aliados Diriá';
      return;
    }

    const titulos: Record<string, string> = {
      inicio: 'Inicio | Aliados Diriá',
      emprendimientos: 'Emprendimientos | Aliados Diriá',
      eventos: 'Eventos | Aliados Diriá',
      registroEmprendimiento: 'Registrar emprendimiento | Aliados Diriá',
      registroCategoria: 'Registrar categoría | Aliados Diriá',
      editarEmprendimiento: 'Editar emprendimiento | Aliados Diriá',
      incidencias: 'Incidencias | Aliados Diriá',
    };

    document.title =
      titulos[seccionActual] ?? 'Aliados Diriá';
  }, [
    mostrarLogin,
    mostrarRegistro,
    seccionActual,
  ]);

  const cerrarSesion = async () => {
    mostrarFeedback(
      'despedida',
      '¡Gracias por visitarnos! Vuelve pronto a Aliados Diriá.'
    );

    await new Promise((resolver) =>
      window.setTimeout(resolver, 2000)
    );

    try {
      await api.logout();
    } finally {
      setRolAutenticado(null);
      setNombreUsuario(null);
      setUsuarioId(null);
      setMostrarGestionRoles(false);
      setMostrarCuentasBloqueadas(false);
      setMostrarLogin(false);
      setMostrarRegistro(false);
      setMostrarErrorModal(false);
      setErrorAutenticacion(null);
      setEmprendimientoEditar(null);
      setSeccionActual('inicio');
    }
  };

  const cerrarSesionPorInactividad = () => {
    setRolAutenticado(null);
    setNombreUsuario(null);
    setUsuarioId(null);
    setMostrarGestionRoles(false);
    setMostrarCuentasBloqueadas(false);
    setMostrarLogin(false);
    setMostrarRegistro(false);
    setMostrarErrorModal(false);
    setErrorAutenticacion(null);
    setEmprendimientoEditar(null);
    setSeccionActual('inicio');
  };

  useInactividad({
    activo: rolAutenticado !== null,
    tiempoInactividad: 15 * 60 * 1000,
    onLogout: cerrarSesionPorInactividad,
  });

  const cerrarErrorModal = () => {
    setMostrarErrorModal(false);
    setErrorAutenticacion(null);
  };

  const rutaActual =
    location.pathname.replace(
      /\/+$/,
      ''
    ) || '/';

  const estadoNavegacion = location.state as {
    fromDashboard?: boolean;
    seccionPublica?: 'emprendimientos' | 'eventos';
  } | null;

  const seccionPublicaSolicitada =
    estadoNavegacion?.seccionPublica;

  useEffect(() => {
    if (rutaActual === '/') {
      setSeccionActual(
        seccionPublicaSolicitada ?? 'inicio'
      );

      window.scrollTo({
        top: 0,
        left: 0,
        behavior: 'auto',
      });
    }
  }, [
    rutaActual,
    seccionPublicaSolicitada,
  ]);

  const vieneDelDashboard =
    estadoNavegacion?.fromDashboard === true;

  const esModuloAdministrativoDesdeDashboard =
    rolAutenticado === 'administrador' &&
    vieneDelDashboard &&
    (
      seccionActual === 'emprendimientos' ||
      seccionActual === 'eventos'
    );

  const volverDesdeModuloAdministrativo = () => {
    setSeccionActual('inicio');

    navigate(
      vieneDelDashboard
        ? '/admin/dashboard'
        : '/',
    );
  };

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

  if (rutaActual === '/super-admin/dashboard') {
    if (rolAutenticado !== 'super_admin') {
      navigate('/');
      return null;
    }

    if (mostrarCuentasBloqueadas) {
      return (
        <section className="relative min-h-screen overflow-x-hidden bg-[#f5f7ef] pt-20 sm:pt-24">
          <BotonVolverInicio
            texto="Volver al Dashboard"
            onClick={() => setMostrarCuentasBloqueadas(false)}
          />

          <CuentasBloqueadas />
        </section>
      );
    }

   return (
  <section className="relative min-h-screen overflow-x-hidden bg-[#f5f7ef]">
    <DashboardPage
      rolAutenticado={rolAutenticado}
      onIrRoles={() => {}}
      onIrEmprendimientos={() => {}}
      onIrEventos={() => {}}
      onIrInscripciones={() => {}}
      onIrIncidencias={() => {}}
      onIrReportes={() => navigate('/admin/reportes')}
      onIrComunicados={() => navigate('/admin/comunicados')}
      onIrBitacora={() => navigate('/bitacora')}
      onIrCuentasBloqueadas={() => setMostrarCuentasBloqueadas(true)}
      onCerrarSesion={() => {
        void cerrarSesion();
      }}
    />
  </section>
);
  }

  if (rutaActual === '/admin/dashboard') {
    if (rolAutenticado !== 'administrador') {
      navigate('/');
      return null;
    }

    return (
  <section className="relative min-h-screen overflow-x-hidden bg-[#f5f7ef]">
    <DashboardPage
      rolAutenticado={rolAutenticado}
      onIrRoles={() =>
        navigate('/admin/roles', {
          state: { fromDashboard: true },
        })
      }
      onIrEmprendimientos={() => {
        navigate('/', {
          state: {
            fromDashboard: true,
            seccionPublica: 'emprendimientos',
          },
        });
      }}
      onIrEventos={() => {
        navigate('/', {
          state: {
            fromDashboard: true,
            seccionPublica: 'eventos',
          },
        });
      }}
      onIrInscripciones={() =>
        navigate('/admin/inscripciones', {
          state: { fromDashboard: true },
        })
      }
      onIrIncidencias={() =>
        navigate('/admin/incidencias', {
          state: { fromDashboard: true },
        })
      }
      onIrReportes={() =>
        navigate('/admin/reportes', {
          state: { fromDashboard: true },
        })
      }
      onIrComunicados={() => navigate('/admin/comunicados')}
    />
  </section>
);
  }

  if (rutaActual === '/admin/roles') {
    if (rolAutenticado !== 'administrador') {
      navigate('/');
      return null;
    }

    return (
      <section className="relative min-h-screen overflow-x-hidden bg-[#f5f7ef] pt-20 sm:pt-24">
        <BotonVolverInicio
          texto={
            vieneDelDashboard
              ? 'Volver al Dashboard'
              : 'Volver al inicio'
          }
          onClick={volverDesdeModuloAdministrativo}
        />

        <GestionRoles />
      </section>
    );
  }

  if (rutaActual === '/admin/inscripciones') {
    if (rolAutenticado !== 'administrador') {
      navigate('/');
      return null;
    }

    return (
      <section className="relative min-h-screen overflow-x-hidden bg-[#f5f7ef] pt-20 sm:pt-24">
        <BotonVolverInicio
          texto={
            vieneDelDashboard
              ? 'Volver al Dashboard'
              : 'Volver al inicio'
          }
          onClick={volverDesdeModuloAdministrativo}
        />

        <InscripcionesAdmin />
      </section>
    );
  }

  if (rutaActual === '/admin/reportes') {
  if (rolAutenticado !== 'administrador') {
    navigate('/');
    return null;
  }

  return (
    <section className="relative min-h-screen overflow-x-hidden bg-[#f5f7ef] pt-20 sm:pt-24">
      <BotonVolverInicio
        texto={
          vieneDelDashboard
            ? 'Volver al Dashboard'
            : 'Volver al inicio'
        }
        onClick={volverDesdeModuloAdministrativo}
      />

      <ReportesPage />
    </section>
  );
}
  if (rutaActual === '/admin/incidencias') {
    if (rolAutenticado !== 'administrador') {
      navigate('/');
      return null;
    }

    return (
      <section className="relative min-h-screen w-full overflow-x-hidden bg-transparent p-0 m-0">
        <BotonVolverInicio
          texto="Volver al Dashboard"
          onClick={() => {
            if (incidenciasAdminEnEdicion) {
              setIncidenciasAdminKey((key) => key + 1);
              setIncidenciasAdminEnEdicion(false);
              navigate('/admin/incidencias');
              return;
            }

            navigate('/admin/dashboard');
          }}
        />

        <IncidenciasAdmin
          key={incidenciasAdminKey}
          onModoEdicionChange={setIncidenciasAdminEnEdicion}
        />
      </section>
    );
  }

  if (rutaActual === '/mis-inscripciones') {
    if (!rolAutenticado) {
      navigate('/');
      return null;
    }

    return (
      <section className="relative min-h-screen overflow-x-hidden bg-[#f5f7ef] pt-20 sm:pt-24">
        <BotonVolverInicio
          onClick={() => navigate('/')}
        />

        <MisInscripciones />
      </section>
    );
  }

  if (rutaActual === '/admin/comunicados') {
    if (rolAutenticado !== 'administrador' && rolAutenticado !== 'super_admin') {
      navigate('/');
      return null;
    }

    return (
      <section className="relative min-h-screen overflow-x-hidden bg-[#f5f7ef] pt-20 sm:pt-24">
        <BotonVolverInicio texto="Volver al Dashboard" onClick={() => navigate(rolAutenticado === 'super_admin' ? '/super-admin/dashboard' : '/admin/dashboard')} />
        <GestionComunicados />
      </section>
    );
  }

  if (rutaActual === '/mis-incidencias') {
    if (
      rolAutenticado !== 'visitante' &&
      rolAutenticado !== 'asociado'
    ) {
      navigate('/');
      return null;
    }

    return <MisIncidencias />;
  }

  /*
   * =========================================================
   * BITÁCORA
   * =========================================================
   */

  if (
    rutaActual === '/bitacora' &&
    rolAutenticado === 'super_admin'
  ) {
    return (
      <section className="relative min-h-screen overflow-x-hidden bg-[#f5f7ef] pt-20 sm:pt-24">
        <BotonVolverInicio
          texto="Volver al Dashboard"
          onClick={() => navigate('/super-admin/dashboard')}
        />

        <Bitacora />
      </section>
    );
  }

  /*
   * =========================================================
   * LOGIN
   * =========================================================
   */

  if (rutaActual === '/login') {
    return (
      <>
        <BotonVolverInicio />

        <Login
          onIrRegistro={() => {
            window.location.href = '/?registro=1';
          }}
          onLogin={(rol) => {
            mostrarFeedback(
              'bienvenida',
              '¡Bienvenido de nuevo a Aliados del Parque Diriá!'
            );

            setRolAutenticado(rol);

            const nombre =
              obtenerNombreUsuarioDesdeToken();

            setNombreUsuario(nombre);

            setUsuarioId(
              obtenerUsuarioIdDesdeToken()
            );

            mostrarBienvenidaLogin(nombre);

            if (rol === 'administrador') {
              navigate('/admin/dashboard');
            } else if (rol === 'super_admin') {
              navigate('/super-admin/dashboard');
            }
          }}
        />
      </>
    );
  }

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
      <section className="relative min-h-screen overflow-x-hidden bg-[#f5f7ef] px-4 pb-12 pt-24 sm:px-6 sm:pt-28">
        <button
          type="button"
          className="fixed left-3 top-3 z-[60] flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-gray-100/80 text-gray-800 shadow-[0_10px_30px_rgba(7,63,49,0.12)] backdrop-blur-md transition-all duration-200 hover:bg-gray-200/80 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8dc63f] focus-visible:ring-offset-2 dark:border-white/15 dark:bg-white/10 dark:text-white dark:hover:bg-white/20 sm:left-5 sm:top-5"
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
          <svg
            className="h-5 w-5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            <path
              d="m15 18-6-6 6-6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>

        <RegistroCategoria
          onCategoriaCreada={() => {}}
        />
      </section>
    );
  }

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
      <section className="relative min-h-screen overflow-x-hidden bg-[#f5f7ef] px-4 pb-12 pt-24 sm:px-6 sm:pt-28">
        <button
          type="button"
          className="fixed left-3 top-3 z-[60] flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-gray-100/80 text-gray-800 shadow-[0_10px_30px_rgba(7,63,49,0.12)] backdrop-blur-md transition-all duration-200 hover:bg-gray-200/80 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8dc63f] focus-visible:ring-offset-2 dark:border-white/15 dark:bg-white/10 dark:text-white dark:hover:bg-white/20 sm:left-5 sm:top-5"
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
          <svg
            className="h-5 w-5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            <path
              d="m15 18-6-6 6-6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>

        <RegistroEmprendimiento
          onExito={() => {
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
        />
      </section>
    );
  }

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
      <section className="relative min-h-screen overflow-x-hidden bg-[#f5f7ef] px-4 pb-12 pt-24 sm:px-6 sm:pt-28">
        <button
          type="button"
          className="fixed left-3 top-3 z-[60] flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-gray-100/80 text-gray-800 shadow-[0_10px_30px_rgba(7,63,49,0.12)] backdrop-blur-md transition-all duration-200 hover:bg-gray-200/80 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8dc63f] focus-visible:ring-offset-2 dark:border-white/15 dark:bg-white/10 dark:text-white dark:hover:bg-white/20 sm:left-5 sm:top-5"
          onClick={() => {
            setEmprendimientoEditar(null);
            setSeccionActual(
              'emprendimientos'
            );
          }}
          aria-label="Volver"
          title="Volver"
        >
          <svg
            className="h-5 w-5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            <path
              d="m15 18-6-6 6-6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
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

  /*
   * =========================================================
   * INCIDENCIAS
   * =========================================================
   */

  if (
    seccionActual === 'incidencias' &&
    !mostrarLogin &&
    !mostrarRegistro
  ) {
    return (
      <>
        <Navbar
          modoAdministracion
          seccionActiva="incidencias"
          onRegistro={() =>
            setMostrarRegistro(true)
          }
          onLogin={() =>
            setMostrarLogin(true)
          }
          rolAutenticado={
            rolAutenticado
          }
          nombreUsuario={
            nombreUsuario
          }
          onCerrarSesion={() => {
            void cerrarSesion();
          }}
          onCuentasBloqueadas={() =>
            setMostrarCuentasBloqueadas(
              true
            )
          }
          onBitacora={() =>
            navigate('/bitacora')
          }
          onIrInicio={() =>
            setSeccionActual('inicio')
          }
          onIrEmprendimientos={() =>
            setSeccionActual(
              'emprendimientos'
            )
          }
          onIrEventos={() =>
            setSeccionActual('eventos')
          }
          onRegistrarIncidencia={() =>
            setSeccionActual('incidencias')
          }
        />

<main className="min-h-[80vh] overflow-x-hidden bg-[#f5f7ef] pt-24 sm:pt-28 dark:bg-[#0b241b]">

  <RegistroIncidencia
    onClose={() =>
      setSeccionActual('inicio')
    }
  />

</main>

        <Footer />
      </>
    );
  }

  if (
    seccionActual === 'eventos' &&
    !mostrarLogin &&
    !mostrarRegistro
  ) {
    return (
      <>
        {!esModuloAdministrativoDesdeDashboard && (
          <Navbar
            modoAdministracion
            seccionActiva="eventos"
            onRegistro={() =>
              setMostrarRegistro(true)
            }
            onLogin={() =>
              setMostrarLogin(true)
            }
            rolAutenticado={
              rolAutenticado
            }
            nombreUsuario={
              nombreUsuario
            }
            onCerrarSesion={() => {
              void cerrarSesion();
            }}
            onIrInicio={() =>
              setSeccionActual('inicio')
            }
            onIrEmprendimientos={() =>
              setSeccionActual(
                'emprendimientos'
              )
            }
            onIrEventos={() =>
              setSeccionActual('eventos')
            }
            onRegistrarIncidencia={() =>
              setSeccionActual('incidencias')
            }
          />
        )}

        {esModuloAdministrativoDesdeDashboard && (
          <BotonVolverInicio
            texto="Volver al Dashboard"
            onClick={
              volverDesdeModuloAdministrativo
            }
          />
        )}

        <main
          className={`sigtad-catalogo min-h-[80vh] overflow-x-hidden bg-[#f5f7ef] ${
            esModuloAdministrativoDesdeDashboard
              ? 'pt-20 sm:pt-24'
              : 'pt-24 sm:pt-28'
          }`}
        >
          <ListaEventosCapacitaciones
            rolAutenticado={
              rolAutenticado
            }
            onSolicitarLogin={(mensaje) => {
              if (mensaje) {
                mostrarFeedback(
                  'error',
                  mensaje
                );
              }

              setMostrarLogin(true);
            }}
            contexto={
              esModuloAdministrativoDesdeDashboard
                ? 'administrativo'
                : 'publico'
            }
          />
        </main>

        <Footer />
      </>
    );
  }

  if (
    seccionActual === 'emprendimientos' &&
    !mostrarLogin &&
    !mostrarRegistro
  ) {
    return (
      <>
        {!esModuloAdministrativoDesdeDashboard && (
          <Navbar
            modoAdministracion
            seccionActiva="emprendimientos"
            onRegistro={() =>
              setMostrarRegistro(true)
            }
            onLogin={() =>
              setMostrarLogin(true)
            }
            rolAutenticado={
              rolAutenticado
            }
            nombreUsuario={
              nombreUsuario
            }
            onCerrarSesion={() => {
              void cerrarSesion();
            }}
            onIrInicio={() =>
              setSeccionActual('inicio')
            }
            onIrEmprendimientos={() =>
              setSeccionActual(
                'emprendimientos'
              )
            }
            onIrEventos={() =>
              setSeccionActual('eventos')
            }
            onRegistrarIncidencia={() =>
              setSeccionActual('incidencias')
            }
          />
        )}

        {esModuloAdministrativoDesdeDashboard && (
          <BotonVolverInicio
            texto="Volver al Dashboard"
            onClick={
              volverDesdeModuloAdministrativo
            }
          />
        )}

        <main
          className={`sigtad-catalogo min-h-[80vh] overflow-x-hidden bg-[#f5f7ef] ${
            esModuloAdministrativoDesdeDashboard
              ? 'pt-20 sm:pt-24'
              : 'pt-24 sm:pt-28'
          }`}
        >
          <ListaEmprendimientos
            rolAutenticado={
              rolAutenticado ===
              'super_admin'
                ? null
                : rolAutenticado
            }
            usuarioId={usuarioId}
            contexto={
              esModuloAdministrativoDesdeDashboard
                ? 'administrativo'
                : 'publico'
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
            onEditar={(emprendimiento) => {
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

  return (
    <>
      {mostrarRegistro ? (
        <section className="relative min-h-screen overflow-x-hidden">
          <button
            type="button"
            className="fixed right-3 top-3 z-[60] flex h-11 w-11 items-center justify-center rounded-full border border-gray-200 bg-gray-100/80 text-2xl font-light leading-none text-gray-800 shadow-[0_10px_30px_rgba(7,63,49,0.12)] backdrop-blur-md transition-all duration-200 hover:bg-gray-200/80 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8dc63f] focus-visible:ring-offset-2 dark:border-white/15 dark:bg-white/10 dark:text-white dark:hover:bg-white/20 sm:right-5 sm:top-5"
            onClick={() =>
              setMostrarRegistro(false)
            }
            aria-label="Cerrar formulario"
            title="Cerrar"
          >
            ×
          </button>

          <Registro
            onRegistroExitoso={() => {
              mostrarFeedback(
                'registro',
                '¡Registro completado con éxito! Bienvenido a la comunidad.'
              );
            }}
            onIrLogin={() => {
              setMostrarRegistro(
                false
              );

              setMostrarLogin(true);
            }}
          />
        </section>
      ) : mostrarLogin ? (
        <section className="relative min-h-screen overflow-x-hidden">
          <button
            type="button"
            className="fixed right-3 top-3 z-[60] flex h-11 w-11 items-center justify-center rounded-full border border-gray-200 bg-gray-100/80 text-2xl font-light leading-none text-gray-800 shadow-[0_10px_30px_rgba(7,63,49,0.12)] backdrop-blur-md transition-all duration-200 hover:bg-gray-200/80 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8dc63f] focus-visible:ring-offset-2 dark:border-white/15 dark:bg-white/10 dark:text-white dark:hover:bg-white/20 sm:right-5 sm:top-5"
            onClick={() =>
              setMostrarLogin(false)
            }
            aria-label="Cerrar formulario"
            title="Cerrar"
          >
            ×
          </button>

          <Login
            onIrRegistro={() => {
              setMostrarLogin(false);
              setMostrarRegistro(true);
            }}
            onLogin={(rol) => {
              mostrarFeedback(
                'bienvenida',
                '¡Bienvenido de nuevo a Aliados del Parque Diriá!'
              );

              setRolAutenticado(rol);

              const nombre =
                obtenerNombreUsuarioDesdeToken();

              setNombreUsuario(nombre);

              setUsuarioId(
                obtenerUsuarioIdDesdeToken()
              );

              mostrarBienvenidaLogin(nombre);

              setMostrarLogin(false);

              if (rol === 'administrador') {
                navigate('/admin/dashboard');
              } else if (rol === 'super_admin') {
                navigate('/super-admin/dashboard');
              }
            }}
          />
        </section>
      ) : mostrarCuentasBloqueadas &&
        rolAutenticado ===
          'super_admin' ? (
        <section>
          <button
            type="button"
            className="fixed left-3 top-3 z-[60] flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-gray-100/80 text-gray-800 shadow-[0_10px_30px_rgba(7,63,49,0.12)] backdrop-blur-md transition-all duration-200 hover:bg-gray-200/80 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8dc63f] focus-visible:ring-offset-2 dark:border-white/15 dark:bg-white/10 dark:text-white dark:hover:bg-white/20 sm:left-5 sm:top-5"
            onClick={() => {
              setMostrarCuentasBloqueadas(
                false
              );

              setRolAutenticado(
                obtenerRolDesdeToken()
              );

              setNombreUsuario(
                obtenerNombreUsuarioDesdeToken()
              );

              setUsuarioId(
                obtenerUsuarioIdDesdeToken()
              );
            }}
            aria-label="Volver"
            title="Volver"
          >
            <svg
              className="h-5 w-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <path
                d="m15 18-6-6 6-6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>

          <CuentasBloqueadas />
        </section>
      ) : mostrarGestionRoles &&
        rolAutenticado ===
          'administrador' ? (
        <section className="relative min-h-screen overflow-x-hidden bg-[#f5f7ef] pt-20 sm:pt-24">
          <button
            type="button"
            className="fixed left-3 top-3 z-[60] flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-gray-100/80 text-gray-800 shadow-[0_10px_30px_rgba(7,63,49,0.12)] backdrop-blur-md transition-all duration-200 hover:bg-gray-200/80 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8dc63f] focus-visible:ring-offset-2 dark:border-white/15 dark:bg-white/10 dark:text-white dark:hover:bg-white/20 sm:left-5 sm:top-5"
            onClick={() => {
              setMostrarGestionRoles(
                false
              );

              setRolAutenticado(
                obtenerRolDesdeToken()
              );

              setNombreUsuario(
                obtenerNombreUsuarioDesdeToken()
              );

              setUsuarioId(
                obtenerUsuarioIdDesdeToken()
              );
            }}
            aria-label="Volver"
            title="Volver"
          >
            <svg
              className="h-5 w-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <path
                d="m15 18-6-6 6-6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>

          <GestionRoles />
        </section>
      ) : (
        <>
          <Navbar
            seccionActiva="inicio"
            onRegistro={() =>
              setMostrarRegistro(true)
            }
            onLogin={() =>
              setMostrarLogin(true)
            }
            rolAutenticado={
              rolAutenticado
            }
            nombreUsuario={
              nombreUsuario
            }
            onCerrarSesion={() => {
              void cerrarSesion();
            }}
            onCuentasBloqueadas={() => {
              setMostrarGestionRoles(
                false
              );

              setMostrarCuentasBloqueadas(
                true
              );
            }}
            onBitacora={() => {
              window.location.href =
                '/bitacora';
            }}
            onIrInicio={() =>
              setSeccionActual('inicio')
            }
            onIrEmprendimientos={() =>
              setSeccionActual(
                'emprendimientos'
              )
            }
            onIrEventos={() =>
              setSeccionActual('eventos')
            }
            onRegistrarIncidencia={() =>
              setSeccionActual('incidencias')
            }
          />

          <main>
            <Hero />
            <Informativo />
            <section className="bg-[#f7fbe9] px-4 py-14 sm:px-6 dark:bg-[#0b241b]">
              <div className="mx-auto max-w-5xl rounded-[2rem] border border-white/60 bg-white/65 p-7 text-center shadow-[0_20px_50px_rgba(5,84,64,.12)] backdrop-blur-md dark:border-white/10 dark:bg-white/10 sm:p-10">
                <p className="text-xs font-bold uppercase tracking-[.22em] text-emerald-700 dark:text-emerald-300">Actualidad del Diriá</p>
                <h2 className="mt-2 text-3xl font-bold tracking-tight text-emerald-950 dark:text-white">Novedades y Noticias del Parque</h2>
                <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-emerald-900/75 dark:text-emerald-100/75">Consulta incidencias de afectación pública, emprendimientos, actividades y comunicados oficiales.</p>
                <button type="button" onClick={() => setMostrarNovedades(true)} className="mt-6 rounded-full bg-emerald-700 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-900/20 transition hover:-translate-y-0.5 hover:bg-emerald-800">Ver novedades</button>
              </div>
            </section>
            <SeccionResenas nombreUsuario={nombreUsuario} />
            <MapaParque />
          </main>

          <Footer />
          <ModalNovedades abierto={mostrarNovedades} onCerrar={() => setMostrarNovedades(false)} />

          {mostrarErrorModal &&
            errorAutenticacion && (
              <div
                className="fixed inset-0 z-[70] flex items-center justify-center bg-[#052f25]/70 p-4 backdrop-blur-sm"
                role="dialog"
                aria-modal="true"
                aria-labelledby="titulo-error-autenticacion"
              >
                <div className="w-full max-w-md rounded-[1.75rem] border border-white/70 bg-[#fffef9] p-6 shadow-[0_24px_70px_rgba(5,47,37,0.3)] motion-safe:transition motion-safe:duration-200 starting:scale-[0.98] starting:opacity-0 motion-reduce:transform-none motion-reduce:transition-none sm:p-8">
                  <h2
                    id="titulo-error-autenticacion"
                    className="text-xl font-bold tracking-[-0.015em] text-[#17372c] sm:text-2xl"
                  >
                    {errorAutenticacion.status ===
                    401
                      ? 'Sesión expirada'
                      : 'Acceso denegado'}
                  </h2>

                  <p className="mt-3 text-sm leading-6 text-[#587267] sm:text-base">
                    {
                      errorAutenticacion.message
                    }
                  </p>

                  <button
                    type="button"
                    autoFocus
                    onClick={
                      cerrarErrorModal
                    }
                    className="mt-6 inline-flex min-h-11 w-full items-center justify-center rounded-full bg-[#095540] px-5 py-2.5 text-sm font-bold text-white shadow-md motion-safe:transition motion-safe:duration-200 hover:bg-[#073f31] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8dc63f] focus-visible:ring-offset-2 sm:w-auto"
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
