import { useEffect, useState, type ReactNode } from 'react';

import AdminModuleCard from '../components/AdminModuleCard';
import {
  obtenerDashboardAdministrador,
  type DashboardAdministradorRespuesta,
  type DashboardModuloAdministradorKey,
} from '../../../services/dashboardService';

interface DashboardAdministradorProps {
  onIrRoles: () => void;
  onIrEmprendimientos: () => void;
  onIrEventos: () => void;
  onIrInscripciones: () => void;
}

type EstadoCarga = 'cargando' | 'listo' | 'error';

const IconoRoles = () => (
  <svg
    viewBox="0 0 24 24"
    className="h-6 w-6"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.9"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <circle cx="9" cy="8" r="3" />
    <path d="M3.5 20c.8-3.6 2.9-5.5 5.5-5.5s4.7 1.9 5.5 5.5" />
    <path d="M16.5 5.5a2.5 2.5 0 0 1 0 5" />
    <path d="M18.5 14.8c1.3.9 2 2.5 2.2 4.2" />
  </svg>
);

const IconoEmprendimientos = () => (
  <svg
    viewBox="0 0 24 24"
    className="h-6 w-6"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.9"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M4 20V9l8-5 8 5v11" />
    <path d="M8 20v-5h8v5" />
    <path d="M9 10h.01M15 10h.01" />
  </svg>
);

const IconoEventos = () => (
  <svg
    viewBox="0 0 24 24"
    className="h-6 w-6"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.9"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <rect x="4" y="5" width="16" height="15" rx="2" />
    <path d="M8 3v4M16 3v4M4 10h16" />
    <path d="M8 14h3M8 17h6" />
  </svg>
);

const IconoInscripciones = () => (
  <svg
    viewBox="0 0 24 24"
    className="h-6 w-6"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.9"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M7 3h8l3 3v15H7z" />
    <path d="M15 3v4h4M10 12h5M10 16h5" />
  </svg>
);

const obtenerMensajeError = (error: unknown): string => {
  const respuesta = error as {
    status?: unknown;
    message?: unknown;
  };

  if (respuesta.status === 401) {
    return 'Tu sesión no es válida. Inicia sesión nuevamente para continuar.';
  }

  if (respuesta.status === 403) {
    return 'No tienes permisos para acceder a este dashboard.';
  }

  if (typeof respuesta.message === 'string' && respuesta.message.trim()) {
    return respuesta.message;
  }

  return 'No fue posible cargar el dashboard. Inténtalo nuevamente.';
};

export default function DashboardAdministrador({
  onIrRoles,
  onIrEmprendimientos,
  onIrEventos,
  onIrInscripciones,
}: DashboardAdministradorProps) {
  const [estado, setEstado] = useState<EstadoCarga>('cargando');
  const [dashboard, setDashboard] = useState<DashboardAdministradorRespuesta | null>(
    null,
  );
  const [mensajeError, setMensajeError] = useState('');
  const [intento, setIntento] = useState(0);

  useEffect(() => {
    let activo = true;

    const cargarDashboard = async () => {
      setEstado('cargando');
      setMensajeError('');

      try {
        const respuesta = await obtenerDashboardAdministrador();

        if (!activo) return;

        setDashboard(respuesta);
        setEstado('listo');
      } catch (error) {
        if (!activo) return;

        setDashboard(null);
        setMensajeError(obtenerMensajeError(error));
        setEstado('error');
      }
    };

    void cargarDashboard();

    return () => {
      activo = false;
    };
  }, [intento]);

  const acciones: Record<DashboardModuloAdministradorKey, () => void> = {
    roles: onIrRoles,
    emprendimientos: onIrEmprendimientos,
    eventos: onIrEventos,
    inscripciones: onIrInscripciones,
  };

  const descripciones: Record<DashboardModuloAdministradorKey, string> = {
    roles: 'Administra los usuarios registrados y sus roles de acceso.',
    emprendimientos: 'Consulta y gestiona los emprendimientos de la plataforma.',
    eventos: 'Organiza los eventos y las capacitaciones disponibles.',
    inscripciones: 'Revisa las inscripciones registradas en las actividades.',
  };

  const iconos: Record<DashboardModuloAdministradorKey, ReactNode> = {
    roles: <IconoRoles />,
    emprendimientos: <IconoEmprendimientos />,
    eventos: <IconoEventos />,
    inscripciones: <IconoInscripciones />,
  };

  return (
    <main className="mx-auto w-full max-w-7xl px-4 pb-12 pt-5 sm:px-6 sm:pt-6 lg:px-8">
      <section className="overflow-hidden rounded-[2rem] border border-white/70 bg-gradient-to-br from-[#095540] via-[#087050] to-[#009444] px-6 py-8 text-white shadow-[0_22px_60px_rgba(7,63,49,0.24)] sm:px-9 sm:py-10">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#d9d823]">
          Panel administrativo
        </p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
          Bienvenido, Administrador
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-white/85 sm:text-base">
          Desde este dashboard puedes acceder a las principales funciones administrativas de la plataforma.
        </p>
      </section>

      {estado === 'cargando' && (
        <section
          className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-4"
          aria-label="Cargando módulos administrativos"
        >
          {[0, 1, 2, 3].map((indice) => (
            <div
              key={indice}
              className="min-h-56 animate-pulse rounded-[1.75rem] border border-[#095540]/10 bg-white p-6 shadow-[0_14px_35px_rgba(7,63,49,0.06)]"
            >
              <div className="h-12 w-12 rounded-2xl bg-[#095540]/10" />
              <div className="mt-6 h-6 w-3/4 rounded bg-[#095540]/10" />
              <div className="mt-3 h-4 w-full rounded bg-[#095540]/10" />
              <div className="mt-2 h-4 w-5/6 rounded bg-[#095540]/10" />
            </div>
          ))}
        </section>
      )}

      {estado === 'error' && (
        <section
          className="mt-8 rounded-[1.75rem] border border-[#d9d823]/70 bg-[#fffdf0] p-6 text-[#073f31] shadow-[0_14px_35px_rgba(7,63,49,0.08)]"
          role="alert"
        >
          <h2 className="text-lg font-bold">Dashboard no disponible</h2>
          <p className="mt-2 text-sm leading-6">{mensajeError}</p>
          <button
            type="button"
            onClick={() => setIntento((valor) => valor + 1)}
            className="mt-5 rounded-full bg-[#095540] px-4 py-2 text-sm font-bold text-white outline-none transition hover:bg-[#009444] focus-visible:ring-4 focus-visible:ring-[#8dc63f]/45 focus-visible:ring-offset-2"
          >
            Reintentar
          </button>
        </section>
      )}

      {estado === 'listo' && dashboard && (
        <section className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {dashboard.modules.map((modulo) => (
            <AdminModuleCard
              key={modulo.key}
              title={modulo.name}
              description={descripciones[modulo.key]}
              icon={iconos[modulo.key]}
              action={acciones[modulo.key]}
            />
          ))}
        </section>
      )}
    </main>
  );
}
