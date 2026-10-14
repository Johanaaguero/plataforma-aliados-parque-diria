import DashboardAdministrador from './dashboards/DashboardAdministrador';
import DashboardSuperAdmin from './dashboards/DashboardSuper_admin';

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
  onIrIncidencias: () => void;
  onIrReportes: () => void;
  onIrComunicados: () => void;
  onIrPreguntasFrecuentes: () => void;
  onIrBitacora?: () => void;
  onIrCuentasBloqueadas?: () => void;
  onCerrarSesion?: () => void;
}

export default function DashboardPage({
  rolAutenticado,
  onIrRoles,
  onIrEmprendimientos,
  onIrEventos,
  onIrInscripciones,
  onIrIncidencias,
  onIrReportes,
  onIrComunicados,
  onIrPreguntasFrecuentes,
  onIrBitacora,
  onIrCuentasBloqueadas,
  onCerrarSesion,
}: DashboardPageProps) {
  switch (rolAutenticado) {
    case 'administrador':
      return (
        <DashboardAdministrador
          onIrRoles={onIrRoles}
          onIrEmprendimientos={onIrEmprendimientos}
          onIrEventos={onIrEventos}
          onIrInscripciones={onIrInscripciones}
          onIrIncidencias={onIrIncidencias}
          onIrReportes={onIrReportes}
          onIrComunicados={onIrComunicados}
          onIrPreguntasFrecuentes={onIrPreguntasFrecuentes}
          onCerrarSesion={onCerrarSesion ?? (() => {})}
        />
      );

    case 'super_admin':
      return (
        <DashboardSuperAdmin
          onIrBitacora={onIrBitacora ?? (() => {})}
          onIrCuentasBloqueadas={onIrCuentasBloqueadas ?? (() => {})}
          onCerrarSesion={onCerrarSesion ?? (() => {})}
          onIrComunicados={onIrComunicados}
          onIrPreguntasFrecuentes={onIrPreguntasFrecuentes}
        />
      );

    default:
      return (
        <main className="mx-auto flex min-h-screen w-full max-w-3xl items-center justify-center px-4 py-24 text-center">
          <section className="rounded-[1.75rem] border border-[#d9d823]/70 bg-[#fffdf0] p-8 text-[#073f31] shadow-[0_14px_35px_rgba(7,63,49,0.08)]">
            <h1 className="text-2xl font-bold">
              Dashboard no disponible
            </h1>

            <p className="mt-3 text-sm leading-6 text-slate-600">
              No tienes permisos para acceder a este dashboard.
            </p>
          </section>
        </main>
      );
  }
}
