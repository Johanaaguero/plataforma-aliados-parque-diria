import type { Notificacion } from '../../../services/notificacionesService';

interface Props {
  notificacion: Notificacion;

  /** true si quien ve la notificación es administrador */
  esAdministrador: boolean;

  onVerIncidencias: () => void;
}

export default function DetalleIncidenciaNotificacion({
  notificacion,
  esAdministrador,
  onVerIncidencias,
}: Props) {
  const esNuevaIncidencia =
    notificacion.tipo === 'nueva_incidencia';

  const esSeguimiento =
    notificacion.tipo === 'seguimiento_incidencia';

  const esIncidenciaCompartida =
    notificacion.tipo === 'incidencia_compartida';

  const codigoIncidencia =
    notificacion.referenciaCodigo?.trim() || 'No disponible';

  const textoBoton = esAdministrador
    ? 'Gestionar incidencias'
    : 'Ver incidencias';

  return (
    <div className="space-y-5">

      {/* AVISO IMPORTANTE */}
      {esIncidenciaCompartida && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <div className="flex items-start gap-3">

            <div>
              <p className="text-sm font-bold text-amber-800">
                Aviso importante
              </p>

              <p className="mt-1 text-sm leading-6 text-amber-700">
                Esta incidencia ha sido compartida por la administración
                porque puede ser relevante para las personas que visitan
                el Parque Nacional Diriá.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* MENSAJE */}
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
        <p className="mb-2 text-sm font-semibold text-[#095540]">
          {esNuevaIncidencia
            ? 'Nueva incidencia'
            : esSeguimiento
              ? 'Seguimiento de incidencia'
              : esIncidenciaCompartida
                ? 'Incidencia compartida'
                : 'Incidencia'}
        </p>

        <p className="text-sm leading-6 text-slate-600">
          {notificacion.mensaje}
        </p>
      </div>

      {/* INFORMACIÓN DE LA INCIDENCIA */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <p className="mb-4 text-sm font-bold text-[#095540]">
          Información de la incidencia
        </p>

        <div className="space-y-4">

          {/* CÓDIGO */}
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
              Código de incidencia
            </p>

            <p className="mt-1 text-sm font-bold text-[#095540]">
              {codigoIncidencia}
            </p>
          </div>

          {/* REFERENCIA */}
          {notificacion.referenciaId && (
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                Referencia
              </p>

              <p className="mt-1 text-sm text-slate-600">
                Incidencia #{notificacion.referenciaId}
              </p>
            </div>
          )}

        </div>
      </div>

      {/* RECOMENDACIÓN */}
      {esIncidenciaCompartida && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-5">
          <p className="text-sm font-bold text-red-800">
            Recomendación
          </p>

          <p className="mt-1 text-sm leading-6 text-red-700">
            Consulte los detalles de la incidencia antes de realizar
            actividades en el área y siga las recomendaciones indicadas
            por la administración del Parque.
          </p>
        </div>
      )}

      {/* FECHA */}
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
          Fecha de notificación
        </p>

        <p className="mt-1 text-sm text-slate-600">
          {new Date(notificacion.createdAt).toLocaleString('es-CR')}
        </p>
      </div>

      {/* BOTÓN */}
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