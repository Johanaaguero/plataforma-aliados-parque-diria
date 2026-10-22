
import { AppDataSource } from '../../../data-source';

import {
  EstadoReserva as EstadoParticipante,
  Participantes,
} from '../../../models/Participantes';

import { generarNumeroTicket } from './inscripcion.service';

import {
  Reserva,
  EstadoReserva,
} from '../../../models/Reserva';
import { ComprobantePago } from '../../../models/ComprobantePago';

import { EventosCapacitaciones } from '../../../models/EventosCapacitaciones';

import {
  serializarFechaCalendario,
  serializarFechaUtc,
} from '../../../utils/fechas';

import { NotificacionService } from '../../Notificaciones/Crear notificaciones Reservas/NotificacionReservaService';
import { registrarAuditoria } from '../../Autenticación y gestión de usuario/Autenticación y seguridad de acceso al sistema/auditoria.service';

export interface InscripcionAdministrativaDTO {
  id: number;
  usuarioId: number;
  nombreUsuario: string;
  correo: string;
  nombreCompleto: string;
  fechaNacimiento: string | null;
  tipoIdentificacion: string | null;
  numeroIdentificacion: string | null;
  telefono: string | null;
  eventoCapacitacionId: number;
  nombreActividad: string;
  tipoActividad: string;
  fechaActividad: string | null;
  fechaInscripcion: Date | string | null;
  estado: string;
  origen: 'participante' | 'reserva';
  esPago?: boolean;
  precio?: number | null;
  comprobanteUrl?: string | null;
  motivoRechazo?: string | null;
  numeroTicket?: string | null;
  datosDevolucion?: Reserva['datosDevolucion'];
  fechaCancelacion?: Date | string | null;
  devolucionProcesadaEn?: Date | string | null;
  referenciaDevolucion?: string | null;
}

export const listarInscripcionesAdministrativas =
  async (): Promise<InscripcionAdministrativaDTO[]> => {
    const registros = await AppDataSource
      .getRepository(Participantes)
      .createQueryBuilder('participante')
      .innerJoinAndSelect('participante.usuario', 'usuario')
      .innerJoinAndSelect(
        'participante.eventoCapacitacion',
        'evento',
      )
      .select([
        'participante.id AS id',
        'participante.usuarioId AS usuarioId',
        'usuario.nombreUsuario AS nombreUsuario',
        'usuario.correo AS correo',
        'usuario.nombre AS nombre',
        'usuario.apellidos AS apellidos',
        'participante.eventoCapacitacionId AS eventoCapacitacionId',
        'evento.nombre AS nombreActividad',
        'evento.tipoActividad AS tipoActividad',
        'evento.esPago AS esPago',
        'evento.precio AS precio',
        "DATE_FORMAT(evento.fecha, '%Y-%m-%d') AS fechaActividad",
        'participante.createdAt AS fechaInscripcion',
        'participante.numeroTicket AS numeroTicket',
      ])
      .orderBy('participante.createdAt', 'DESC')
      .getRawMany();

    const participantes: InscripcionAdministrativaDTO[] =
      registros.map((registro) => {
        const nombreCompleto =
          `${registro.nombre ?? ''} ${registro.apellidos ?? ''}`.trim();

        return {
          id: Number(registro.id),
          usuarioId: Number(registro.usuarioId),
          nombreUsuario: registro.nombreUsuario,
          correo: registro.correo,
          nombreCompleto,
          fechaNacimiento: null,
          tipoIdentificacion: null,
          numeroIdentificacion: null,
          telefono: null,
          eventoCapacitacionId: Number(
            registro.eventoCapacitacionId,
          ),
          nombreActividad: registro.nombreActividad,
          tipoActividad: registro.tipoActividad,
          fechaActividad: serializarFechaCalendario(
            registro.fechaActividad,
          ),
          fechaInscripcion: serializarFechaUtc(
            registro.fechaInscripcion,
          ),
          estado: 'confirmada',
          origen: 'participante',
          esPago: Boolean(registro.esPago),
          precio: registro.precio == null ? null : Number(registro.precio),
          comprobanteUrl: null,
          numeroTicket: registro.numeroTicket ?? null,
        };
      });

    const reservas = await AppDataSource
      .getRepository(Reserva)
      .createQueryBuilder('reserva')
      .innerJoinAndSelect('reserva.usuario', 'usuario')
      .innerJoinAndSelect(
        'reserva.eventoCapacitacion',
        'evento',
      )
      .select([
        'reserva.id AS id',
        'reserva.usuarioId AS usuarioId',
        'usuario.nombreUsuario AS nombreUsuario',
        'reserva.correo AS correo',
        'reserva.nombreCompleto AS nombreCompleto',
        'reserva.fechaNacimiento AS fechaNacimiento',
        'reserva.tipoIdentificacion AS tipoIdentificacion',
        'reserva.numeroIdentificacion AS numeroIdentificacion',
        'reserva.telefono AS telefono',
        'reserva.eventoCapacitacionId AS eventoCapacitacionId',
        'evento.nombre AS nombreActividad',
        'evento.tipoActividad AS tipoActividad',
        'evento.esPago AS esPago',
        'evento.precio AS precio',
        'reserva.comprobanteUrl AS comprobanteUrl',
        'reserva.motivoRechazo AS motivoRechazo',
        'reserva.datosDevolucion AS datosDevolucion',
        'reserva.fechaCancelacion AS fechaCancelacion',
        'reserva.devolucionProcesadaEn AS devolucionProcesadaEn',
        'reserva.referenciaDevolucion AS referenciaDevolucion',
        "DATE_FORMAT(evento.fecha, '%Y-%m-%d') AS fechaActividad",
        'reserva.createdAt AS fechaInscripcion',
        'reserva.estado AS estado',
        'reserva.numeroTicket AS numeroTicket',
      ])
      .orderBy('reserva.createdAt', 'DESC')
      .getRawMany();

    const reservasFormateadas: InscripcionAdministrativaDTO[] =
      reservas.map((registro) => ({
        id: Number(registro.id),
        usuarioId: Number(registro.usuarioId),
        nombreUsuario: registro.nombreUsuario,
        correo: registro.correo,
        nombreCompleto: registro.nombreCompleto,
        fechaNacimiento: serializarFechaCalendario(
          registro.fechaNacimiento,
        ),
        tipoIdentificacion: registro.tipoIdentificacion ?? null,
        numeroIdentificacion: registro.numeroIdentificacion ?? null,
        telefono: registro.telefono ?? null,
        eventoCapacitacionId: Number(
          registro.eventoCapacitacionId,
        ),
        nombreActividad: registro.nombreActividad,
        tipoActividad: registro.tipoActividad,
        fechaActividad: serializarFechaCalendario(
          registro.fechaActividad,
        ),
        fechaInscripcion: serializarFechaUtc(
          registro.fechaInscripcion,
        ),
        estado: registro.estado,
        origen: 'reserva',
        esPago: Boolean(registro.esPago),
        precio: registro.precio == null ? null : Number(registro.precio),
        comprobanteUrl: registro.comprobanteUrl ?? null,
        motivoRechazo: registro.motivoRechazo ?? null,
        numeroTicket: registro.numeroTicket ?? null,
        datosDevolucion: registro.datosDevolucion ? (typeof registro.datosDevolucion === 'string' ? JSON.parse(registro.datosDevolucion) : registro.datosDevolucion) : null,
        fechaCancelacion: serializarFechaUtc(registro.fechaCancelacion),
        devolucionProcesadaEn: serializarFechaUtc(registro.devolucionProcesadaEn),
        referenciaDevolucion: registro.referenciaDevolucion ?? null,
      }));

    return [...participantes, ...reservasFormateadas].sort(
      (a, b) =>
        new Date(b.fechaInscripcion ?? 0).getTime() -
        new Date(a.fechaInscripcion ?? 0).getTime(),
    );
  };

export const actualizarEstadoReserva = async (
  reservaId: number,
  estado: EstadoReserva.APROBADA | EstadoReserva.RECHAZADA,
  motivoRechazo: string | null = null,
  actorId: number | null = null,
) => {
  return AppDataSource.transaction(async (manager) => {
    const reservasRepo = manager.getRepository(Reserva);
    const comprobantesRepo = manager.getRepository(ComprobantePago);
    const participantesRepo = manager.getRepository(Participantes);
    const eventosRepo = manager.getRepository(EventosCapacitaciones);

    const notificacionService = new NotificacionService();

    const reserva = await reservasRepo.findOneBy({
      id: reservaId,
    });

    if (!reserva) {
      const error = new Error('La reserva no existe.');
      error.name = 'NotFoundError';
      throw error;
    }

    const evento = await eventosRepo
      .createQueryBuilder('evento')
      .setLock('pessimistic_write')
      .where('evento.id = :id', {
        id: reserva.eventoCapacitacionId,
      })
      .getOne();

    if (!evento) {
      const error = new Error(
        'La actividad asociada a la reserva no existe.',
      );
      error.name = 'NotFoundError';
      throw error;
    }

    if (reserva.estado !== EstadoReserva.PENDIENTE) {
      const error = new Error(
        'La reserva ya no está pendiente.',
      );
      error.name = 'InvalidReservationStateError';
      throw error;
    }

    const estadoAnterior = reserva.estado;

    if (estado === EstadoReserva.APROBADA) {
      const tieneComprobante = reserva.comprobanteUrl || await comprobantesRepo.existsBy({ reservaId: reserva.id });
      if (evento.esPago && !tieneComprobante) {
        const error = new Error('La reserva pagada requiere comprobante.');
        error.name = 'PaymentProofRequiredError';
        throw error;
      }
      const participanteExistente = await participantesRepo.findOne({
        where: {
          usuarioId: reserva.usuarioId,
          eventoCapacitacionId: reserva.eventoCapacitacionId,
        },
      });

           const participante = participanteExistente
        ? Object.assign(participanteExistente, {
            estado: EstadoParticipante.CONFIRMADA,
            fechaCancelacion: null,
            numeroTicket:
              participanteExistente.numeroTicket ??
              reserva.numeroTicket ??
              (await generarNumeroTicket(manager)),
          })
        : participantesRepo.create({
            usuarioId: reserva.usuarioId,
            eventoCapacitacionId: reserva.eventoCapacitacionId,
            estado: EstadoParticipante.CONFIRMADA,
            fechaCancelacion: null,
            numeroTicket:
              reserva.numeroTicket ??
              (await generarNumeroTicket(manager)),
          });

      await participantesRepo.save(participante);
    }

    reserva.estado = estado;
    reserva.motivoRechazo =
      estado === EstadoReserva.RECHAZADA
        ? motivoRechazo
        : null;

    const reservaActualizada = await reservasRepo.save(reserva);

    // Crear una nueva notificación para el usuario.
    // Se conserva la notificación original.
    await notificacionService.notificarCambioEstadoReserva(
      manager,
      reservaActualizada,
      evento,
    );

    if (
      estado === EstadoReserva.RECHAZADA &&
      evento.cuposDisponibles != null
    ) {
      evento.cuposDisponibles += 1;
      await eventosRepo.save(evento);
    }

    await registrarAuditoria(
      {
        usuarioId: actorId,
        action: 'CAMBIAR_ESTADO_RESERVA_EVENTO_CAPACITACION',
        description: `Cambio de estado de reserva #${reservaActualizada.id}`,
        status: 'success',
        details: JSON.stringify({
          reservaId: reservaActualizada.id,
          usuarioAfectadoId: reservaActualizada.usuarioId,
          eventoCapacitacionId: reservaActualizada.eventoCapacitacionId,
          tipoActividad: evento.tipoActividad,
          estadoAnterior,
          estadoNuevo: reservaActualizada.estado,
          motivoRechazoRegistrado: Boolean(reservaActualizada.motivoRechazo),
        }),
      },
      manager,
    );

    return reservaActualizada;
  });
};

export const registrarDevolucionProcesada = async (reservaId: number, referencia: string, actorId: number | null) => AppDataSource.transaction(async (manager) => {
  const repo = manager.getRepository(Reserva);
  const reserva = await repo.findOne({ where: { id: reservaId }, relations: { eventoCapacitacion: true } });
  if (!reserva) { const error = new Error('La reserva no existe.'); error.name = 'NotFoundError'; throw error; }
  if (!reserva.eventoCapacitacion.esPago || reserva.estado !== EstadoReserva.CANCELADA || !reserva.datosDevolucion) { const error = new Error('La reserva no tiene una devolución pendiente válida.'); error.name = 'InvalidRefundStateError'; throw error; }
  if (!referencia.trim()) { const error = new Error('La referencia de devolución es obligatoria.'); error.name = 'RefundReferenceRequiredError'; throw error; }
  reserva.devolucionProcesadaEn = new Date(); reserva.referenciaDevolucion = referencia.trim();
  await repo.save(reserva);
  await registrarAuditoria({ usuarioId: actorId, action: 'REGISTRAR_DEVOLUCION_PROCESADA', description: `Registro administrativo de devolución para reserva #${reserva.id}`, status: 'success', details: JSON.stringify({ reservaId, referencia: reserva.referenciaDevolucion }) }, manager);
  return reserva;
});
