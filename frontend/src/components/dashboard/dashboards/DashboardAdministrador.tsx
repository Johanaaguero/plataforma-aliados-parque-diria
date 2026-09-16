import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

import { useConteoEmprendimientos } from '../../../hook/useConteoEmprendimientos';
import { useConteoEventos } from '../../../hook/useConteoEventos';
import {
  obtenerDashboardAdministrador,
  type DashboardAdministradorRespuesta,
} from '../../../services/dashboardService';

interface DashboardAdministradorProps {
  onIrRoles: () => void;
  onIrEmprendimientos: () => void;
  onIrEventos: () => void;
  onIrInscripciones: () => void;
}

type EstadoCarga = 'cargando' | 'listo' | 'error';

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
  onIrRoles: _onIrRoles,
  onIrEmprendimientos: _onIrEmprendimientos,
  onIrEventos: _onIrEventos,
  onIrInscripciones: _onIrInscripciones,
}: DashboardAdministradorProps) {
  const [estado, setEstado] = useState<EstadoCarga>('cargando');
  const [, setDashboard] = useState<DashboardAdministradorRespuesta | null>(
    null,
  );
  const [mensajeError, setMensajeError] = useState('');
  const [intento, setIntento] = useState(0);
  const { conteo } = useConteoEmprendimientos();
  const { conteo: conteoEventos } = useConteoEventos();

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

      <section className="mt-6 grid gap-5 sm:grid-cols-2">
        <div className="rounded-2xl bg-white p-5 shadow-sm border border-[#095540]/10">
          <p className="text-sm font-semibold text-slate-600 mb-3">Emprendimientos por estado</p>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart
              data={[
                { estado: "Publicados", cantidad: conteo.publicados },
                { estado: "Sin publicar", cantidad: conteo.noPublicados },
                { estado: "Borradores", cantidad: conteo.borradores },
              ]}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="estado" tick={{ fontSize: 12 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="cantidad" fill="#095540" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <p className="mt-2 text-xs text-slate-400">Total: {conteo.total} emprendimientos</p>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow-sm border border-[#095540]/10">
          <p className="text-sm font-semibold text-slate-600 mb-3">Eventos y capacitaciones</p>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart
              data={[
                { tipo: "Eventos", cantidad: conteoEventos.eventos },
                { tipo: "Capacitaciones", cantidad: conteoEventos.capacitaciones },
              ]}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="tipo" tick={{ fontSize: 12 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="cantidad" fill="#009444" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <p className="mt-2 text-xs text-slate-400">Total: {conteoEventos.todos} actividades</p>
        </div>
      </section>

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
    </main>
  );
}