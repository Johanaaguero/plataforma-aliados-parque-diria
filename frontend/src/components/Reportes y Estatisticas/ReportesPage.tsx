import { useState, type ReactNode } from 'react';

import ReporteUsuarios from './ReporteUsuarios';
import ReporteReservas from './ReporteReservas';
import ReporteEmprendimientos from './ReporteEmprendimientos';
import ReporteEventos from './ReporteEvenCap';
import ReporteIncidencias from './ReporteIncidencias';

type TipoReporte =
  | 'usuarios'
  | 'reservas'
  | 'emprendimientos'
  | 'eventos'
  | 'incidencias';

interface ReportesPageProps {
  onVolver?: () => void;
}

/* =========================================================
 * Iconografía
 * ========================================================= */

function Icono({ children }: { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-6 w-6"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

const iconos = {
  reportes: (
    <Icono>
      <path d="M4 19h16" />
      <path d="M7 19v-6M12 19v-10M17 19v-4" />
    </Icono>
  ),

  volver: (
    <Icono>
      <path d="m15 18-6-6 6-6" />
    </Icono>
  ),

  usuarios: (
    <Icono>
      <circle cx="9" cy="8" r="3" />
      <path d="M3.5 20a5.5 5.5 0 0 1 11 0" />
      <path d="M16 8h5M18.5 5.5v5" />
    </Icono>
  ),

  reservas: (
    <Icono>
      <rect x="5" y="4" width="14" height="16" rx="2" />
      <path d="M8 8h8M8 12h8M8 16h5" />
    </Icono>
  ),

  emprendimientos: (
    <Icono>
      <path d="M4 20h16" />
      <path d="M6 20V9l6-5 6 5v11" />
      <path d="M9 20v-5h6v5M9 10h.01M15 10h.01" />
    </Icono>
  ),

  eventos: (
    <Icono>
      <path d="M22 10 12 5 2 10l10 5 10-5Z" />
      <path d="M6 12v5c0 1.1 2.7 2 6 2s6-.9 6-2v-5" />
    </Icono>
  ),

  incidencias: (
    <Icono>
      <path d="M12 3 2.8 20h18.4L12 3Z" />
      <path d="M12 9v5M12 17h.01" />
    </Icono>
  ),

  pdf: (
    <Icono>
      <path d="M7 3h7l4 4v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" />
      <path d="M14 3v4h4" />
      <path d="M9.5 12.5h1a1 1 0 0 1 0 2h-1v2m0-4v4M13 12.5h1.2a1 1 0 0 1 1 1v1a1 1 0 0 1-1 1H13v-3Zm5 0h-1.6v4M16.4 14.3H18" />
    </Icono>
  ),

  excel: (
    <Icono>
      <path d="M7 3h7l4 4v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" />
      <path d="M14 3v4h4" />
      <path d="m9.5 12.5 4.5 5m0-5-4.5 5" />
    </Icono>
  ),
};

/* =========================================================
 * Reportes disponibles
 * ========================================================= */

const reportes: Array<{
  id: TipoReporte;
  titulo: string;
  descripcion: string;
  icono: ReactNode;
}> = [
  {
    id: 'usuarios',
    titulo: 'Usuarios',
    descripcion: 'Registros, roles y actividad de usuarios.',
    icono: iconos.usuarios,
  },
  {
    id: 'reservas',
    titulo: 'Reservas',
    descripcion: 'Reservas de eventos y capacitaciones.',
    icono: iconos.reservas,
  },
  {
    id: 'emprendimientos',
    titulo: 'Emprendimientos',
    descripcion: 'Publicaciones, consultas y reservas.',
    icono: iconos.emprendimientos,
  },
  {
    id: 'eventos',
    titulo: 'Eventos y capacitaciones',
    descripcion: 'Actividades, cupos e inscripciones.',
    icono: iconos.eventos,
  },
  {
    id: 'incidencias',
    titulo: 'Incidencias',
    descripcion: 'Categorías, estados y prioridades.',
    icono: iconos.incidencias,
  },
];

/* =========================================================
 * Botones de exportar (por ahora solo visuales, sin lógica)
 * ========================================================= */

function BotonesExportar({ compacto = false }: { compacto?: boolean }) {
  return (
    <div className="flex flex-wrap items-center gap-2 print:hidden">
      <button
        type="button"
        title="Próximamente"
        className={`
          inline-flex
          items-center
          gap-2
          rounded-xl
          border
          border-red-200
          bg-red-50
          font-bold
          text-red-700
          transition
          hover:bg-red-100
          dark:border-red-900/40
          dark:bg-red-950/20
          dark:text-red-300
          ${compacto ? 'px-3 py-2 text-xs' : 'px-3.5 py-2.5 text-xs'}
        `}
      >
        {iconos.pdf}
        Exportar PDF
      </button>

      <button
        type="button"
        title="Próximamente"
        className={`
          inline-flex
          items-center
          gap-2
          rounded-xl
          border
          border-emerald-200
          bg-emerald-50
          font-bold
          text-emerald-700
          transition
          hover:bg-emerald-100
          dark:border-emerald-900/40
          dark:bg-emerald-950/20
          dark:text-emerald-300
          ${compacto ? 'px-3 py-2 text-xs' : 'px-3.5 py-2.5 text-xs'}
        `}
      >
        {iconos.excel}
        Exportar Excel
      </button>
    </div>
  );
}

/* =========================================================
 * Página principal de reportes
 * ========================================================= */

export default function ReportesPage({
  onVolver,
}: ReportesPageProps) {
  const [tipoReporte, setTipoReporte] =
    useState<TipoReporte>('usuarios');

  const reporteSeleccionado = reportes.find(
    (reporte) => reporte.id === tipoReporte,
  );

  return (
    <main
      className="
        min-h-screen
        bg-[#eef2ef]
        px-4
        py-6
        text-[#16382b]
        transition-colors
        duration-700
        dark:bg-[#071c14]
        dark:text-[#edf8f1]
        sm:px-6
        lg:px-8
        print:bg-white
        print:px-0
        print:py-0
      "
    >
      <div className="mx-auto max-w-7xl">

        {/* =====================================================
         * ENCABEZADO
         * ===================================================== */}

        <header
          className="
            relative
            mb-7
            overflow-hidden
            rounded-3xl
            border
            border-white/30
            bg-gradient-to-r
            from-[#0b6849]/95
            to-[#0d8a5f]/90
            p-6
            shadow-xl
            print:hidden
            sm:p-8
          "
        >
          <div
            className="
              pointer-events-none
              absolute
              -right-12
              -top-12
              h-40
              w-40
              rounded-full
              bg-white/10
              blur-2xl
            "
          />

          <div
            className="
              pointer-events-none
              absolute
              -left-10
              bottom-0
              h-32
              w-32
              rounded-full
              bg-[#8dc63f]/20
              blur-2xl
            "
          />

          <div
            className="
              relative
              flex
              flex-col
              gap-5
              sm:flex-row
              sm:items-start
              sm:justify-between
            "
          >
            <div>
              <span
                className="
                  inline-flex
                  items-center
                  gap-2
                  rounded-full
                  bg-white/15
                  px-3.5
                  py-1.5
                  text-xs
                  font-bold
                  uppercase
                  tracking-[0.12em]
                  text-white/80
                  backdrop-blur-sm
                "
              >
                {iconos.reportes}
                Administración
              </span>

              <h1
                className="
                  mt-4
                  text-3xl
                  font-extrabold
                  tracking-tight
                  text-white
                  sm:text-4xl
                "
              >
                Reportes y estadísticas
              </h1>

              <p
                className="
                  mt-3
                  max-w-2xl
                  text-sm
                  leading-6
                  text-white/80
                  sm:text-base
                "
              >
                Consulta información detallada del sistema
                seleccionando el reporte que deseas analizar.
              </p>
            </div>

            {onVolver && (
              <button
                type="button"
                onClick={onVolver}
                className="
                  inline-flex
                  shrink-0
                  items-center
                  justify-center
                  gap-2
                  rounded-full
                  border
                  border-white/25
                  bg-white/10
                  px-4
                  py-2.5
                  text-sm
                  font-bold
                  text-white
                  backdrop-blur-sm
                  transition
                  hover:-translate-y-0.5
                  hover:bg-white/20
                "
              >
                {iconos.volver}
                Volver
              </button>
            )}
          </div>
        </header>

        {/* =====================================================
         * SELECTOR DE REPORTES
         * ===================================================== */}

        <section
          className="
            mb-7
            rounded-3xl
            border
            border-white/40
            bg-white/70
            p-5
            shadow-sm
            backdrop-blur-md
            dark:border-white/[0.08]
            dark:bg-slate-900/60
            print:hidden
            sm:p-6
          "
        >
          <div className="mb-5">
            <h2
              className="
                text-lg
                font-bold
                text-[#173d2e]
                dark:text-[#eaf6ef]
              "
            >
              Seleccionar reporte
            </h2>

            <p
              className="
                mt-1
                text-sm
                text-[#64776e]
                dark:text-[#a9beb2]
              "
            >
              Selecciona el tipo de información que deseas consultar.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {reportes.map((reporte) => {
              const seleccionado =
                reporte.id === tipoReporte;

              return (
                <button
                  key={reporte.id}
                  type="button"
                  onClick={() =>
                    setTipoReporte(reporte.id)
                  }
                  className={`
                    rounded-2xl
                    border
                    p-5
                    text-left
                    transition-all
                    duration-200
                    ${
                      seleccionado
                        ? `
                          border-[#0b6849]
                          bg-[#0b6849]/8
                          shadow-[0_10px_30px_rgba(11,104,73,0.12)]
                        `
                        : `
                          border-white/40
                          bg-white/60
                          hover:-translate-y-0.5
                          hover:border-[#0b6849]/30
                          hover:bg-white/80
                          dark:border-white/[0.08]
                          dark:bg-slate-900/50
                          dark:hover:bg-slate-900/70
                        `
                    }
                  `}
                >
                  <div
                    className={`
                      mb-4
                      flex
                      h-11
                      w-11
                      items-center
                      justify-center
                      rounded-xl
                      ${
                        seleccionado
                          ? `
                            bg-[#0b6849]
                            text-white
                          `
                          : `
                            bg-black/5
                            text-[#0b6849]
                            dark:bg-white/10
                            dark:text-[#8dc63f]
                          `
                      }
                    `}
                  >
                    {reporte.icono}
                  </div>

                  <h3
                    className={`
                      text-sm
                      font-bold
                      ${
                        seleccionado
                          ? `
                            text-[#0b6849]
                            dark:text-[#8dc63f]
                          `
                          : `
                            text-[#173d2e]
                            dark:text-[#eaf6ef]
                          `
                      }
                    `}
                  >
                    {reporte.titulo}
                  </h3>

                  <p
                    className="
                      mt-2
                      text-xs
                      leading-5
                      text-[#64776e]
                      dark:text-[#a9beb2]
                    "
                  >
                    {reporte.descripcion}
                  </p>
                </button>
              );
            })}
          </div>
        </section>

        {/* =====================================================
         * REPORTE SELECCIONADO
         * ===================================================== */}

        <section>
          <div
            className="
              mb-5
              flex
              flex-col
              gap-4
              print:hidden
              sm:flex-row
              sm:items-center
              sm:justify-between
            "
          >
            <div className="flex items-center gap-3">
              <span
                className="
                  flex
                  h-11
                  w-11
                  items-center
                  justify-center
                  rounded-xl
                  bg-[#0b6849]/10
                  text-[#0b6849]
                  dark:bg-[#0b6849]/20
                  dark:text-[#8dc63f]
                "
              >
                {reporteSeleccionado?.icono}
              </span>

              <div>
                <h2
                  className="
                    text-xl
                    font-bold
                    text-[#173d2e]
                    dark:text-[#eaf6ef]
                  "
                >
                  {reporteSeleccionado?.titulo}
                </h2>

                <p
                  className="
                    text-sm
                    text-[#64776e]
                    dark:text-[#a9beb2]
                  "
                >
                  {reporteSeleccionado?.descripcion}
                </p>
              </div>
            </div>

            <BotonesExportar />
          </div>

          {tipoReporte === 'usuarios' && (
            <ReporteUsuarios />
          )}

          {tipoReporte === 'reservas' && (
            <ReporteReservas />
          )}

          {tipoReporte === 'emprendimientos' && (
            <ReporteEmprendimientos />
          )}

          {tipoReporte === 'eventos' && (
            <ReporteEventos />
          )}

          {tipoReporte === 'incidencias' && (
            <ReporteIncidencias />
          )}
        </section>
      </div>
    </main>
  );
}
