import type { Notificacion } from '../../../services/notificacionesService';

interface Props {
  notificacion: Notificacion;
  onVerEventos: () => void;
}

export default function DetalleEventoNotificacion({
  notificacion,
  onVerEventos,
}: Props) {
  const esCapacitacion =
    notificacion.tipo === 'nueva_capacitacion';

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-[#8DC63F]/30 bg-[#f5f8f6] p-5">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#095540] text-white">
            {esCapacitacion ? (
              <svg
                className="h-5 w-5"
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M4 19h16M6 17V9l6-4 6 4v8M9 13h6M9 16h6"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            ) : (
              <svg
                className="h-5 w-5"
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M4 19h16M5 19V8l7-4 7 4v11M9 19v-5h6v5M8 9h.01M12 9h.01M16 9h.01"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}
          </div>

          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-[#009444]">
              {esCapacitacion ? 'Capacitación' : 'Evento'}
            </p>

            <h3 className="text-lg font-bold text-[#095540]">
              {notificacion.titulo}
            </h3>
          </div>
        </div>

        <p className="text-sm leading-6 text-slate-600">
          {notificacion.mensaje}
        </p>
      </div>

      {notificacion.referenciaId && (
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Información de referencia
          </p>

          <div className="mt-2 flex items-center justify-between gap-3">
            <span className="text-sm text-slate-600">
              ID del evento o capacitación
            </span>

            <span className="rounded-lg bg-slate-100 px-3 py-1 text-sm font-bold text-[#095540]">
              #{notificacion.referenciaId}
            </span>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          Fecha de notificación
        </p>

        <p className="mt-1 text-sm text-slate-600">
          {new Date(notificacion.createdAt).toLocaleString(
            'es-CR',
            {
              dateStyle: 'medium',
              timeStyle: 'short',
            },
          )}
        </p>
      </div>

      <div className="rounded-2xl border border-[#8DC63F]/30 bg-white p-5">
        <p className="text-sm leading-6 text-slate-600">
          Puedes consultar el evento o capacitación desde el
          módulo correspondiente.
        </p>

        <button
          type="button"
          onClick={onVerEventos}
          className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#095540] px-5 py-3 text-sm font-bold text-white shadow-md transition hover:bg-[#073f31] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8DC63F] focus-visible:ring-offset-2"
        >
          <svg
            className="h-5 w-5"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M7 3v3M17 3v3M4 9h16M6 5h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2ZM8 13h3M8 17h3M14 13h2M14 17h2"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>

          Ver eventos y capacitaciones
        </button>
      </div>
    </div>
  );
}