import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import DetalleReservaNotificacion from './DetallesNotificacion/DetalleReservaNotificacion.tsx';
import DetalleNuevaReservaAdministrador from './DetallesNotificacion/DetalleNuevaReservaAdministrador.tsx';
import DetalleEventoNotificacion from './DetallesNotificacion/DetalleEventoNotificacion.tsx';
import DetalleEmprendimientoNotificacion from './DetallesNotificacion/DetalleEmprendimientoNotificacion.tsx';
import DetalleIncidenciaNotificacion from './DetallesNotificacion/DetalleIncidenciaNotificacion.tsx';

import {
  obtenerDetalleNotificacion,
  type DetalleNotificacion as Detalle,
  type DetalleReserva,
  type Notificacion,
} from '../../services/notificacionesService.ts';

interface Props {
  notificacionId: number;
  notificacion?: Notificacion;
  esAdministrador: boolean;
  onClose: () => void;
}

export default function DetalleNotificacion({
  notificacionId,
  notificacion,
  esAdministrador,
  onClose,
}: Props) {
  const navigate = useNavigate();

  const [detalle, setDetalle] = useState<Detalle | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const esNotificacionEvento =
    notificacion?.tipo === 'nuevo_evento' ||
    notificacion?.tipo === 'nueva_capacitacion';

  const esNotificacionEmprendimiento =
    notificacion?.tipo === 'nuevo_emprendimiento';

  const esNotificacionIncidencia =
  notificacion?.tipo === 'nueva_incidencia' ||
  notificacion?.tipo === 'seguimiento_incidencia' ||
  notificacion?.tipo === 'incidencia_compartida';
  
  useEffect(() => {
    const controlador = new AbortController();

    /*
     * Las notificaciones de eventos, capacitaciones, emprendimientos
     * e incidencias no necesitan consultar el detalle de reserva.
     */
    if (
      esNotificacionEvento ||
      esNotificacionEmprendimiento ||
      esNotificacionIncidencia
    ) {
      setCargando(false);
      setError(null);

      return () => controlador.abort();
    }

    setCargando(true);
    setError(null);
    setDetalle(null);

    obtenerDetalleNotificacion(notificacionId, controlador.signal)
      .then(setDetalle)
      .catch((e) => {
        if (controlador.signal.aborted) return;

        setError(
          e instanceof Error ? e.message : 'No se pudo cargar el detalle.',
        );
      })
      .finally(() => {
        if (!controlador.signal.aborted) {
          setCargando(false);
        }
      });

    return () => controlador.abort();
  }, [
    notificacionId,
    esNotificacionEvento,
    esNotificacionEmprendimiento,
    esNotificacionIncidencia,
  ]);

  useEffect(() => {
    const cerrar = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', cerrar);

    return () => document.removeEventListener('keydown', cerrar);
  }, [onClose]);

  const irAReservas = () => {
    onClose();
    navigate('/admin/inscripciones', { state: { fromDashboard: true } });
  };

  const irAEmprendimientos = () => {
    onClose();
    navigate('/', {
      state: { fromDashboard: true, seccionPublica: 'emprendimientos' },
    });
  };

  const irAEventos = () => {
    onClose();
    navigate('/', {
      state: { fromDashboard: true, seccionPublica: 'eventos' },
    });
  };

 
  const irAIncidencias = () => {
    onClose();

    if (esAdministrador) {
      navigate('/admin/incidencias', {
        state: { fromNotification: true },
      });
      return;
    }

    navigate('/mis-incidencias', {
      state: { fromNotification: true },
    });
  };

  const esNuevaReservaAdministrador =
    detalle?.notificacion.tipo === 'nueva_reserva_admin';

  return (
    <div
      className="fixed inset-0 z-[9998] flex items-center justify-center bg-slate-950/65 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="titulo-detalle-notificacion"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-slate-100 bg-white p-6 shadow-2xl sm:p-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <h2
            id="titulo-detalle-notificacion"
            className="text-xl font-bold tracking-tight text-[#095540]"
          >
            {notificacion?.titulo ??
              detalle?.notificacion.titulo ??
              'Detalle de la notificación'}
          </h2>

          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          >
            <svg
              className="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M6 6l12 12M18 6L6 18"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        {cargando && (
          <div className="space-y-3" role="status" aria-label="Cargando detalle">
            <div className="h-5 w-1/3 animate-pulse rounded bg-slate-200" />
            <div className="h-32 animate-pulse rounded-2xl bg-slate-100" />
            <div className="h-32 animate-pulse rounded-2xl bg-slate-100" />
          </div>
        )}

        {!cargando && error && (
          <p
            className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
            role="alert"
          >
            {error}
          </p>
        )}

        {!cargando && !error && (
          <div className="space-y-4">
            {esNotificacionEvento && notificacion ? (
              <DetalleEventoNotificacion
                notificacion={notificacion}
                onVerEventos={irAEventos}
              />
            ) : esNotificacionEmprendimiento && notificacion ? (
              <DetalleEmprendimientoNotificacion
                notificacion={notificacion}
                onVerEmprendimientos={irAEmprendimientos}
              />
            ) : esNotificacionIncidencia && notificacion ? (
              <DetalleIncidenciaNotificacion
                notificacion={notificacion}
                esAdministrador={esAdministrador}
                onVerIncidencias={irAIncidencias}
              />
            ) : detalle ? (
              <>
                <p className="text-sm leading-6 text-slate-600">
                  {detalle.notificacion.mensaje}
                </p>

                {detalle.tipo === 'reserva' &&
                detalle.datos &&
                esNuevaReservaAdministrador ? (
                  <DetalleNuevaReservaAdministrador
                    datos={detalle.datos as DetalleReserva}
                    onIrReservas={irAReservas}
                  />
                ) : detalle.tipo === 'reserva' && detalle.datos ? (
                  <DetalleReservaNotificacion
                    datos={detalle.datos as DetalleReserva}
                  />
                ) : (
                  <p className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-500">
                    Esta notificación no tiene información adicional.
                  </p>
                )}
              </>
            ) : (
              <p className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-500">
                No se pudo obtener la información de la notificación.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}