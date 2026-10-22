import { useNavigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import type { DetalleReserva } from '../../../services/notificacionesService';

interface Props {
  datos: DetalleReserva;
}

const ESTADOS: Record<string, { texto: string; clase: string }> = {
  pendiente: {
    texto: 'Pendiente',
    clase: 'bg-[#D9D823]/15 text-[#6B6900] border-[#D9D823]/40',
  },
  aprobada: {
    texto: 'Aprobada',
    clase: 'bg-[#8DC63F]/15 text-[#095540] border-[#8DC63F]/30',
  },
  rechazada: {
    texto: 'Rechazada',
    clase: 'bg-red-50 text-red-700 border-red-200',
  },
  cancelada: {
    texto: 'Cancelada',
    clase: 'bg-slate-100 text-slate-700 border-slate-200',
  },
};

function fechaCorta(valor: string | null): string {
  if (!valor) return 'Pendiente';

  const f = new Date(`${valor.slice(0, 10)}T00:00:00`);

  return Number.isNaN(f.getTime())
    ? valor
    : f.toLocaleDateString('es-CR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      });
}

function horaCorta(valor: string | null): string {
  if (!valor) return 'Pendiente';

  const [h, m] = valor.split(':');

  const f = new Date();
  f.setHours(Number(h), Number(m), 0, 0);

  return f.toLocaleTimeString('es-CR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

function fechaHora(valor: string): string {
  const f = new Date(valor);

  return Number.isNaN(f.getTime())
    ? valor
    : f.toLocaleString('es-CR', {
        dateStyle: 'long',
        timeStyle: 'short',
      });
}

function Campo({
  etiqueta,
  valor,
}: {
  etiqueta: string;
  valor: string;
}) {
  return (
    <div className="min-w-0">
      <dt className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
        {etiqueta}
      </dt>

      <dd className="mt-0.5 break-words text-sm font-semibold text-slate-700">
        {valor || 'No disponible'}
      </dd>
    </div>
  );
}

function Seccion({
  titulo,
  children,
}: {
  titulo: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
      <h3 className="mb-3 text-xs font-bold uppercase tracking-[0.12em] text-[#095540]">
        {titulo}
      </h3>

      <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {children}
      </dl>
    </section>
  );
}

export default function DetalleReservaNotificacion({ datos }: Props) {
  const navigate = useNavigate();
  const { reserva, evento } = datos;

  const estado = ESTADOS[reserva.estado] ?? {
    texto: reserva.estado,
    clase: 'bg-slate-100 text-slate-700 border-slate-200',
  };

  // Utiliza el mismo numeroTicket que devuelve el backend
  // para InscripcionesAdmin. No lo calcula a partir del ID.
  const reservaConTicket = reserva as typeof reserva & {
    numeroTicket?: string | null;
  };

  const numeroTicket = reservaConTicket.numeroTicket;

 const irAMisReservas = () => {
  navigate('/mis-inscripciones');
};

  return (
    <div className="space-y-4">
      {/* Encabezado */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-500">
            Detalle de la reserva
          </p>

          <p className="mt-1 text-sm font-bold text-[#095540]">
            Nº de ticket: {numeroTicket || 'Pendiente de asignación'}
          </p>
        </div>

        <span
          className={`inline-flex rounded-lg border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.1em] ${estado.clase}`}
        >
          {estado.texto}
        </span>
      </div>

      {/* Actividad */}
      {evento ? (
        <Seccion
          titulo={
            evento.tipoActividad === 'evento'
              ? 'Evento'
              : 'Capacitación'
          }
        >
          <div className="sm:col-span-2">
            <Campo
              etiqueta="Nombre"
              valor={evento.nombre ?? 'Sin nombre'}
            />
          </div>

          <Campo
            etiqueta="Fecha"
            valor={fechaCorta(evento.fecha)}
          />

          <Campo
            etiqueta="Hora"
            valor={horaCorta(evento.hora)}
          />

          <div className="sm:col-span-2">
            <Campo
              etiqueta="Lugar"
              valor={evento.lugar ?? 'Lugar pendiente'}
            />
          </div>
        </Seccion>
      ) : (
        <p className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-500">
          La actividad asociada ya no está disponible.
        </p>
      )}

      {/* Datos del participante */}
      <Seccion titulo="Datos del participante">
        <div className="sm:col-span-2">
          <Campo
            etiqueta="Nombre completo"
            valor={reserva.nombreCompleto}
          />
        </div>

        <Campo
          etiqueta="Fecha de nacimiento"
          valor={fechaCorta(reserva.fechaNacimiento)}
        />

        <Campo
          etiqueta="Identificación"
          valor={`${reserva.tipoIdentificacion} - ${reserva.numeroIdentificacion}`}
        />

        <Campo
          etiqueta="Correo"
          valor={reserva.correo}
        />

        <Campo
          etiqueta="Teléfono"
          valor={reserva.telefono}
        />
      </Seccion>

      {/* Fecha de creación */}
      <p className="text-xs text-slate-400">
        Reserva registrada el {fechaHora(reserva.createdAt)}
      </p>

      {/* Botón para consultar las reservas */}
      <button
        type="button"
        onClick={irAMisReservas}
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#095540] px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#087451] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8DC63F] focus-visible:ring-offset-2"
      >
        <svg
          viewBox="0 0 24 24"
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M5 4h14v16H5z" />
          <path d="M8 8h8M8 12h8M8 16h5" />
        </svg>

        Ver mis reservas
      </button>
    </div>
  );
}