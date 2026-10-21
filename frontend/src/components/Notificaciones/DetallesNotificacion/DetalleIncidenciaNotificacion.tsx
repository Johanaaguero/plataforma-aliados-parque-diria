
import type { Notificacion } from '../../../services/notificacionesService';
import {
  urlArchivoEvidencia,
  type Incidencia,
} from '../../../services/incidenciaServices';

interface Props {
  notificacion: Notificacion;
  esAdministrador: boolean;
  onVerIncidencias: () => void;
  incidencia: Incidencia | null;
  cargandoIncidencia: boolean;
}

const etiquetasCategoria: Record<string, string> = {
  seguridad: 'Seguridad',
  incendio: 'Incendio',
  flora_fauna: 'Flora y fauna',
  ambiental: 'Ambiental',
  infraestructura: 'Infraestructura',
  senderos: 'Senderos',
  servicios: 'Servicios',
  otro: 'Otro',
};

const etiquetasPrioridad: Record<string, string> = {
  baja: 'Baja',
  media: 'Media',
  alta: 'Alta',
  critica: 'Crítica',
};

export default function DetalleIncidenciaNotificacion({
  notificacion,
  esAdministrador,
  onVerIncidencias,
  incidencia,
  cargandoIncidencia,
}: Props) {
  const esNuevaIncidencia =
    notificacion.tipo === 'nueva_incidencia';

  const esSeguimiento =
    notificacion.tipo === 'seguimiento_incidencia';

  const esIncidenciaCompartida =
    notificacion.tipo === 'incidencia_compartida';

  const codigoIncidencia =
    incidencia?.codigo ||
    notificacion.referenciaCodigo?.trim() ||
    'No disponible';

  const textoBoton = esAdministrador
    ? 'Gestionar incidencias'
    : 'Ver incidencias';

  return (
    <div className="space-y-5">
      {/* AVISO DE GRAN IMPORTANCIA */}
      {esIncidenciaCompartida && (
        <div
          role="alert"
          className="rounded-2xl border-2 border-red-300 bg-red-50 p-5 dark:border-red-500/40 dark:bg-red-950/30"
        >
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-200">
              <svg
                viewBox="0 0 24 24"
                className="h-6 w-6"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M12 3 2.8 20h18.4L12 3Z" />
                <path d="M12 9v5m0 3h.01" />
              </svg>
            </div>

            <div>
              <p className="text-base font-extrabold text-red-800 dark:text-red-200">
                ¡Incidencia de gran importancia!
              </p>

              <p className="mt-2 text-sm leading-6 text-red-700 dark:text-red-200">
                La administración del Parque Nacional Diriá ha
                compartido esta incidencia por considerarla relevante
                para los visitantes. Revise los detalles y las
                recomendaciones antes de realizar actividades en el
                área afectada.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* MENSAJE DE LA NOTIFICACIÓN */}
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-white/10 dark:bg-white/[0.04]">
        <p className="mb-2 text-sm font-semibold text-[#095540] dark:text-[#a9d779]">
          {esNuevaIncidencia
            ? 'Nueva incidencia'
            : esSeguimiento
              ? 'Seguimiento de incidencia'
              : esIncidenciaCompartida
                ? 'Incidencia compartida'
                : 'Incidencia'}
        </p>

        <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">
          {notificacion.mensaje}
        </p>
      </div>

      {/* CARGA DEL DETALLE */}
      {cargandoIncidencia && (
        <div
          className="rounded-xl border border-slate-200 p-5 text-sm text-slate-600 dark:border-white/10 dark:text-slate-300"
          role="status"
        >
          Cargando los detalles de la incidencia...
        </div>
      )}

      {/* DETALLE REAL DE LA INCIDENCIA */}
      {!cargandoIncidencia && incidencia && (
        <div className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-white/[0.03]">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
              Código de incidencia
            </p>
            <p className="mt-1 text-sm font-bold text-[#095540] dark:text-[#a9d779]">
              {codigoIncidencia}
            </p>
          </div>

          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
              Título
            </p>
            <h3 className="mt-1 text-lg font-bold text-slate-800 dark:text-white">
              {incidencia.titulo}
            </h3>
          </div>

          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
              Descripción
            </p>
            <p className="mt-1 whitespace-pre-line text-sm leading-6 text-slate-700 dark:text-slate-300">
              {incidencia.descripcion || 'Sin descripción disponible.'}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                Categoría
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-700 dark:text-slate-200">
                {etiquetasCategoria[incidencia.categoria] ??
                  incidencia.categoria}
              </p>
            </div>

            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                Prioridad
              </p>
              <p
                className={`mt-1 inline-flex rounded-full px-3 py-1 text-sm font-bold ${
                  incidencia.prioridad === 'critica' ||
                  incidencia.prioridad === 'alta'
                    ? 'bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-200'
                    : 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-200'
                }`}
              >
                {etiquetasPrioridad[incidencia.prioridad] ??
                  incidencia.prioridad}
              </p>
            </div>

            

            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                Fecha de registro
              </p>
              <p className="mt-1 text-sm text-slate-700 dark:text-slate-200">
                {new Date(incidencia.fechaRegistro).toLocaleString('es-CR')}
              </p>
            </div>
          </div>

          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
              Ubicación
            </p>
            <p className="mt-1 text-sm text-slate-700 dark:text-slate-200">
              {incidencia.ubicacion || 'Ubicación no especificada.'}
            </p>
          </div>

          {/* EVIDENCIAS */}
          {incidencia.evidencias?.length > 0 && (
            <div>
              <p className="mb-3 text-sm font-bold text-[#095540] dark:text-[#a9d779]">
                Evidencias de la incidencia
              </p>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {incidencia.evidencias.map((evidencia) => {
                  const url = urlArchivoEvidencia(evidencia.id);
                  const esImagen = evidencia.tipoMime.startsWith('image/');

                  return (
                    <div
                      key={evidencia.id}
                      className="overflow-hidden rounded-xl border border-slate-200 dark:border-white/10"
                    >
                      {esImagen && (
                        <a
                          href={url}
                          target="_blank"
                          rel="noreferrer"
                          className="block"
                        >
                          <img
                            src={url}
                            alt={
                              evidencia.nombreArchivo ??
                              'Evidencia de la incidencia'
                            }
                            className="h-44 w-full object-cover"
                            loading="lazy"
                          />
                        </a>
                      )}

                      <div className="p-3">
                        <p className="truncate text-sm font-medium text-slate-700 dark:text-slate-200">
                          {evidencia.nombreArchivo ??
                            `Evidencia ${evidencia.id}`}
                        </p>

                        <a
                          href={url}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-2 inline-flex text-sm font-bold text-[#009444] hover:underline dark:text-[#a9d779]"
                        >
                          {esImagen ? 'Abrir evidencia' : 'Ver archivo'}
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* SI NO SE PUDO CARGAR EL DETALLE */}
      {!cargandoIncidencia && !incidencia && (
        <div
          className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-800 dark:border-amber-500/30 dark:bg-amber-950/20 dark:text-amber-200"
          role="status"
        >
          No fue posible cargar el detalle completo de la incidencia.
          Puede consultar la sección de incidencias para obtener más
          información.
        </div>
      )}

      {/* RECOMENDACIÓN */}
      {esIncidenciaCompartida && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 dark:border-amber-500/30 dark:bg-amber-950/20">
          <p className="text-sm font-bold text-amber-900 dark:text-amber-200">
            Recomendación para los visitantes
          </p>
          <p className="mt-1 text-sm leading-6 text-amber-800 dark:text-amber-200">
            Tome en cuenta la información publicada por la administración
            y siga las indicaciones aplicables al área afectada.
          </p>
        </div>
      )}

      {/* FECHA DE NOTIFICACIÓN */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-white/[0.03]">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
          Fecha de notificación
        </p>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
          {new Date(notificacion.createdAt).toLocaleString('es-CR')}
        </p>
      </div>

      <button
        type="button"
        onClick={onVerIncidencias}
        className="w-full rounded-xl bg-[#095540] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#074432]"
      >
        {textoBoton}
      </button>
    </div>
  );
}
