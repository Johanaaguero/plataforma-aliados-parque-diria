import { AppDataSource } from '../../../data-source';

import { EntityManager } from 'typeorm';

import { Usuario } from '../../../models/Usuario';

import {
  Reserva,
  EstadoReserva,
} from '../../../models/Reserva';

import { EventosCapacitaciones } from '../../../models/EventosCapacitaciones';

import {
  Notificacion,
  EstadoNotificacion,
  TipoNotificacion,
} from '../../../models/Notificacion';

import {
  serializarFechaCalendario,
  serializarFechaUtc,
} from '../../../utils/fechas';
import { Participantes } from '../../../models/Participantes';

import { enviarCorreoReserva } from '././Correo/reserva.correo.service';

export class NotificacionService {
  private repositorio =
    AppDataSource.getRepository(Notificacion);

  // =========================================================
  // OBTENER TODAS LAS NOTIFICACIONES DE UN USUARIO
  // =========================================================

  async obtenerPorUsuario(usuarioId: number) {
    return await this.repositorio.find({
      where: {
        usuarioId,
        estado: EstadoNotificacion.ACTIVA,
      },
      order: {
        createdAt: 'DESC',
      },
    });
  }

  // =========================================================
  // OBTENER NOTIFICACIONES NO LEÍDAS
  // =========================================================

  async obtenerNoLeidas(usuarioId: number) {
    return await this.repositorio.find({
      where: {
        usuarioId,
        leida: false,
        estado: EstadoNotificacion.ACTIVA,
      },
      order: {
        createdAt: 'DESC',
      },
    });
  }

  // =========================================================
  // CONTAR NOTIFICACIONES NO LEÍDAS
  // =========================================================

  async contarNoLeidas(usuarioId: number) {
    return await this.repositorio.count({
      where: {
        usuarioId,
        leida: false,
        estado: EstadoNotificacion.ACTIVA,
      },
    });
  }

  // =========================================================
  // CREAR UNA NOTIFICACIÓN
  // =========================================================

  async crear(params: {
    usuarioId: number;
    tipo: TipoNotificacion;
    titulo: string;
    mensaje: string;
    referenciaId?: number | null;
    referenciaTipo?: string | null;
  }) {
    const notificacion = this.repositorio.create({
      usuarioId: params.usuarioId,
      tipo: params.tipo,
      titulo: params.titulo,
      mensaje: params.mensaje,
      leida: false,
      referenciaId: params.referenciaId ?? null,
      referenciaTipo: params.referenciaTipo ?? null,
    });

    return await this.repositorio.save(notificacion);
  }

  // =========================================================
  // OBTENER DETALLE DE UNA NOTIFICACIÓN
  // =========================================================

  async obtenerDetalle(
    id: number,
    usuarioId: number,
  ) {
    const notificacion =
      await this.repositorio.findOne({
        where: {
          id,
          usuarioId,
          estado: EstadoNotificacion.ACTIVA,
        },
      });

    if (!notificacion) {
      throw new Error(
        'Notificación no encontrada',
      );
    }

    switch (notificacion.referenciaTipo) {
      // =====================================================
      // DETALLE DE UNA RESERVA
      // =====================================================

      case 'reserva': {
        let reserva: Reserva | null = null;

        // ---------------------------------------------------
        // NOTIFICACIONES DEL USUARIO
        // ---------------------------------------------------

        if (
          notificacion.tipo ===
            TipoNotificacion.RESERVA_REALIZADA ||
          notificacion.tipo ===
            TipoNotificacion.RESERVA_APROBADA ||
          notificacion.tipo ===
            TipoNotificacion.RESERVA_RECHAZADA
        ) {
          reserva =
            notificacion.referenciaId
              ? await AppDataSource.getRepository(
                  Reserva,
                ).findOne({
                  where: {
                    id: notificacion.referenciaId,
                    usuarioId,
                  },
                })
              : null;
        }

        // ---------------------------------------------------
        // NUEVA RESERVA PARA ADMINISTRADOR
        // ---------------------------------------------------

        else if (
          notificacion.tipo ===
          TipoNotificacion.NUEVA_RESERVA_ADMIN
        ) {
          reserva =
            notificacion.referenciaId
              ? await AppDataSource.getRepository(
                  Reserva,
                ).findOne({
                  where: {
                    id: notificacion.referenciaId,
                  },
                })
              : null;
        }

        // ---------------------------------------------------
        // SI NO SE ENCUENTRA LA RESERVA
        // ---------------------------------------------------

        if (!reserva) {
          return {
            notificacion,
            tipo: 'reserva',
            datos: null,
          };
        }

        // ---------------------------------------------------
        // BUSCAR EVENTO/CAPACITACIÓN
        // ---------------------------------------------------

        const evento =
          await AppDataSource.getRepository(
            EventosCapacitaciones,
          ).findOne({
            where: {
              id: reserva.eventoCapacitacionId,
            },
          });
          // Obtener el mismo número de ticket que se muestra
// en la sección "Mis inscripciones".
let numeroTicket = reserva.numeroTicket ?? null;

// Cuando la reserva está aprobada, Mis inscripciones
// también permite utilizar el ticket del participante.
if (
  !numeroTicket &&
  reserva.estado === EstadoReserva.APROBADA
) {
  const participante =
    await AppDataSource.getRepository(
      Participantes,
    ).findOne({
      where: {
        usuarioId: reserva.usuarioId,
        eventoCapacitacionId:
          reserva.eventoCapacitacionId,
      },
    });

  numeroTicket = participante?.numeroTicket ?? null;
}

        // ---------------------------------------------------
        // DETERMINAR EL ESTADO DE LA NOTIFICACIÓN
        // ---------------------------------------------------

        let estadoNotificacion =
          reserva.estado;

        if (
          notificacion.tipo ===
          TipoNotificacion.RESERVA_REALIZADA
        ) {
          estadoNotificacion =
            EstadoReserva.PENDIENTE;
        }

        if (
          notificacion.tipo ===
          TipoNotificacion.RESERVA_APROBADA
        ) {
          estadoNotificacion =
            EstadoReserva.APROBADA;
        }

        if (
          notificacion.tipo ===
          TipoNotificacion.RESERVA_RECHAZADA
        ) {
          estadoNotificacion =
            EstadoReserva.RECHAZADA;
        }

        // ---------------------------------------------------
        // DEVOLVER INFORMACIÓN
        // ---------------------------------------------------

        return {
          notificacion,
          tipo: 'reserva',
          datos: {
           reserva: {
  id: reserva.id,
  numeroTicket,
  estado: estadoNotificacion,
  nombreCompleto: reserva.nombreCompleto,
  fechaNacimiento: serializarFechaCalendario(
    reserva.fechaNacimiento,
  ),
  tipoIdentificacion: reserva.tipoIdentificacion,
  numeroIdentificacion: reserva.numeroIdentificacion,
  correo: reserva.correo,
  telefono: reserva.telefono,
  createdAt: serializarFechaUtc(reserva.createdAt),
},

            evento: evento
              ? {
                  id: evento.id,
                  nombre: evento.nombre,
                  descripcion:
                    evento.descripcion,
                  tipoActividad:
                    evento.tipoActividad,
                  fecha: evento.fecha,
                  hora: evento.hora,
                  lugar: evento.lugar,
                }
              : null,
          },
        };
      }

      // =====================================================
      // OTROS TIPOS DE NOTIFICACIÓN
      // =====================================================

      default:
        return {
          notificacion,
          tipo:
            notificacion.referenciaTipo,
          datos: null,
        };
    }
  }

  // =========================================================
  // NOTIFICAR CUANDO SE CREA UNA RESERVA
  // =========================================================

  async notificarReserva(
    manager: EntityManager,
    reserva: Reserva,
    evento: EventosCapacitaciones,
  ) {
    const notificacionesRepo =
      manager.getRepository(Notificacion);

    const usuariosRepo =
      manager.getRepository(Usuario);

    // -------------------------------------------------------
    // 1. NOTIFICACIÓN PARA EL USUARIO
    // -------------------------------------------------------

    const notificacionUsuario =
      notificacionesRepo.create({
        usuarioId: reserva.usuarioId,

        tipo:
          TipoNotificacion.RESERVA_REALIZADA,

        titulo: 'Reserva realizada',

        mensaje:
          `Su reserva para "${evento.nombre}" fue registrada correctamente. ` +
          `Fecha: ${evento.fecha}, hora: ${evento.hora}. ` +
          `Estado: pendiente.`,

        leida: false,

        referenciaId: reserva.id,

        referenciaTipo: 'reserva',
      });

    await notificacionesRepo.save(
      notificacionUsuario,
    );

    // -------------------------------------------------------
    // 2. BUSCAR ADMINISTRADORES
    // -------------------------------------------------------

    const usuarios =
      await usuariosRepo.find({
        relations: {
          rol: true,
        },
      });

    const administradores =
      usuarios.filter(
        (usuario) =>
          usuario.rol?.nombre ===
          'administrador',
      );

    // -------------------------------------------------------
    // 3. NOTIFICACIÓN PARA LOS ADMINISTRADORES
    // -------------------------------------------------------

    for (const administrador of administradores) {
      const notificacionAdministrador =
        notificacionesRepo.create({
          usuarioId:
            administrador.id,

          tipo:
            TipoNotificacion.NUEVA_RESERVA_ADMIN,

          titulo: 'Nueva reserva',

          mensaje:
            `El usuario ${reserva.nombreCompleto} ` +
            `realizó una nueva reserva para "${evento.nombre}".`,

          leida: false,

          referenciaId: reserva.id,

          referenciaTipo: 'reserva',
        });

      await notificacionesRepo.save(
        notificacionAdministrador,
      );
    }
  }


  async notificarCambioEstadoReserva(
    manager: EntityManager,
    reserva: Reserva,
    evento: EventosCapacitaciones,
  ) {
    const notificacionesRepo =
      manager.getRepository(Notificacion);

    // -------------------------------------------------------
    // VERIFICAR EL NUEVO ESTADO
    // -------------------------------------------------------

    if (
      reserva.estado !==
        EstadoReserva.APROBADA &&
      reserva.estado !==
        EstadoReserva.RECHAZADA
    ) {
      return null;
    }

    const aprobada =
      reserva.estado ===
      EstadoReserva.APROBADA;

    // -------------------------------------------------------
    // CREAR NUEVA NOTIFICACIÓN
    // -------------------------------------------------------

    const notificacion =
      notificacionesRepo.create({
        usuarioId:
          reserva.usuarioId,

        tipo: aprobada
          ? TipoNotificacion.RESERVA_APROBADA
          : TipoNotificacion.RESERVA_RECHAZADA,

        titulo: aprobada
          ? 'Reserva aprobada'
          : 'Reserva rechazada',

        mensaje: aprobada
          ? `Su reserva para "${evento.nombre}" ha sido aprobada. ` +
            `Fecha: ${evento.fecha}, hora: ${evento.hora}. ` +
            `Estado: aprobada.`

          : `Su reserva para "${evento.nombre}" ha sido rechazada. ` +
            `Fecha: ${evento.fecha}, hora: ${evento.hora}. ` +
            `Estado: rechazada. Motivo: ${reserva.motivoRechazo ?? 'No especificado.'}`,

        leida: false,

        referenciaId:
          reserva.id,

        referenciaTipo: 'reserva',
      });

    const notificacionGuardada =
      await notificacionesRepo.save(
        notificacion,
      );

    // -------------------------------------------------------
    // ENVIAR CORREO
    // -------------------------------------------------------

    try {
    await enviarCorreoReserva({
  destinatario: reserva.correo,
  nombre: reserva.nombreCompleto,
  nombreEvento: evento.nombre ?? 'Actividad',
  fecha: evento.fecha ?? 'No disponible',
  hora: evento.hora ?? 'No disponible',
  estado: aprobada ? 'aprobada' : 'rechazada',
  lugar: evento.lugar ?? 'No disponible',
  motivoRechazo: reserva.motivoRechazo,
});
    } catch (error) {
      console.error(
        'Error al enviar correo de cambio de estado de reserva:',
        error,
      );
    }

    // -------------------------------------------------------
    // DEVOLVER LA NOTIFICACIÓN GUARDADA
    // -------------------------------------------------------

    return notificacionGuardada;
  }

  // =========================================================
  // MARCAR UNA NOTIFICACIÓN COMO LEÍDA
  // =========================================================

  async marcarComoLeida(
    id: number,
    usuarioId: number,
  ) {
    const notificacion =
      await this.repositorio.findOne({
        where: {
          id,
          usuarioId,
          estado: EstadoNotificacion.ACTIVA,
        },
      });

    if (!notificacion) {
      throw new Error(
        'Notificación no encontrada',
      );
    }

    notificacion.leida = true;

    return await this.repositorio.save(
      notificacion,
    );
  }

  // =========================================================
  // MARCAR TODAS COMO LEÍDAS
  // =========================================================

  async marcarTodasComoLeidas(
    usuarioId: number,
  ) {
    await this.repositorio.update(
      {
        usuarioId,
        leida: false,
        estado: EstadoNotificacion.ACTIVA,
      },
      {
        leida: true,
      },
    );

    return {
      mensaje:
        'Todas las notificaciones fueron marcadas como leídas',
    };
  }

  // =========================================================
  // ELIMINAR UNA NOTIFICACIÓN
  // =========================================================

  async eliminar(
    id: number,
    usuarioId: number,
  ) {
    const notificacion =
      await this.repositorio.findOne({
        where: {
          id,
          usuarioId,
          estado: EstadoNotificacion.ACTIVA,
        },
      });

    if (!notificacion) {
      throw new Error(
        'Notificación no encontrada',
      );
    }

    notificacion.estado = EstadoNotificacion.ELIMINADA;

    await this.repositorio.save(notificacion);

    return {
      mensaje:
        'Notificación eliminada correctamente',
    };
  }

  async eliminarTodas(usuarioId: number) {
    const resultado = await this.repositorio.update(
      { usuarioId, estado: EstadoNotificacion.ACTIVA },
      { estado: EstadoNotificacion.ELIMINADA },
    );

    return { cantidad: resultado.affected ?? 0 };
  }
}
