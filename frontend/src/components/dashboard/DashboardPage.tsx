import { Link } from 'react-router-dom';

import DashboardAdministrador from './dashboards/DashboardAdministrador';
import AdminLayout from './AdminLayout';

type NombreRol =
  | 'administrador'
  | 'asociado'
  | 'visitante'
  | 'super_admin';

interface DashboardPageProps {
  rolAutenticado: NombreRol | null;
  onIrRoles: () => void;
  onIrEmprendimientos: () => void;
  onIrEventos: () => void;
  onIrInscripciones: () => void;
}

export default function DashboardPage({
  rolAutenticado,
  onIrRoles,
  onIrEmprendimientos,
  onIrEventos,
  onIrInscripciones,
}: DashboardPageProps) {
  switch (rolAutenticado) {
    case 'administrador':
      return (
        <AdminLayout
          onIrRoles={onIrRoles}
          onIrEmprendimientos={onIrEmprendimientos}
          onIrEventos={onIrEventos}
          onIrInscripciones={onIrInscripciones}
        >
          <Link
            to="/"
            aria-label="Volver al inicio"
            title="Volver al inicio"
            className="fixed left-3 top-3 z-[60] flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-gray-100/80 text-gray-800 shadow-[0_10px_30px_rgba(7,63,49,0.12)] backdrop-blur-md transition-all duration-200 hover:bg-gray-200/80 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8dc63f] focus-visible:ring-offset-2 sm:left-5 sm:top-5"
          >
            <svg
              className="h-5 w-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <path d="m15 18-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="sr-only">Volver al inicio</span>
          </Link>

          <DashboardAdministrador
            onIrRoles={onIrRoles}
            onIrEmprendimientos={onIrEmprendimientos}
            onIrEventos={onIrEventos}
            onIrInscripciones={onIrInscripciones}
          />
        </AdminLayout>
      );

    default:
      return (
        <main className="mx-auto flex min-h-screen w-full max-w-3xl items-center justify-center px-4 py-24 text-center">
          <section className="rounded-[1.75rem] border border-[#d9d823]/70 bg-[#fffdf0] p-8 text-[#073f31] shadow-[0_14px_35px_rgba(7,63,49,0.08)]">
            <h1 className="text-2xl font-bold">Dashboard no disponible</h1>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              No tienes permisos para acceder a este dashboard.
            </p>
          </section>
        </main>
      );
  }
}