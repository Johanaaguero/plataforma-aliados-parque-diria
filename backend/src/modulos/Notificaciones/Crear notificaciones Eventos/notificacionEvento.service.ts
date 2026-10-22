import { AppDataSource } from '../../../data-source';

import { Usuario } from '../../../models/Usuario';

import {
  EventosCapacitaciones,
  TipoActividad,
} from '../../../models/EventosCapacitaciones';

import {
  Notificacion,
  EstadoNotificacion,
  TipoNotificacion,
} from '../../../models/Notificacion';
import { In, type EntityManager } from 'typeorm';
import { seleccionarDestinatariosEvento } from './notificacionEvento.utils';

export class NotificacionEventoService {
  private readonly notificacionRepo =
    AppDataSource.getRepository(Notificacion);

  private readonly usuarioRepo =
    AppDataSource.getRepository(Usuario);

  /**
   * Crea notificaciones para los usuarios destinatarios cuando se publica
   * un nuevo evento o capacitación.
   */
  async notificarNuevoEvento(
    evento: EventosCapacitaciones,
    manager?: EntityManager,
  ): Promise<void> {
    const usuarioRepo =
      manager?.getRepository(Usuario) ?? this.usuarioRepo;
    const notificacionRepo =
      manager?.getRepository(Notificacion) ?? this.notificacionRepo;
    const usuarios = await usuarioRepo.find({
      relations: { rol: true },
    });
    const usuariosDestinatarios =
      seleccionarDestinatariosEvento(usuarios, new Set());

    if (usuariosDestinatarios.length === 0) {
      return;
    }

    const esCapacitacion =
      evento.tipoActividad === TipoActividad.CAPACITACION;

    const tipoNotificacion = esCapacitacion
      ? TipoNotificacion.NUEVA_CAPACITACION
      : TipoNotificacion.NUEVO_EVENTO;

    const usuariosYaNotificados = await notificacionRepo.find({
      select: { usuarioId: true },
      where: {
        usuarioId: In(usuariosDestinatarios.map((usuario) => usuario.id)),
        tipo: tipoNotificacion,
        referenciaId: evento.id,
        referenciaTipo: 'evento_capacitacion',
      },
    });
    const destinatarios = seleccionarDestinatariosEvento(
      usuariosDestinatarios,
      new Set(usuariosYaNotificados.map(({ usuarioId }) => usuarioId)),
    );

    if (destinatarios.length === 0) {
      return;
    }

    const titulo = esCapacitacion
      ? 'Nueva capacitación disponible'
      : 'Nuevo evento disponible';

    const nombreTipo = esCapacitacion
      ? 'capacitación'
      : 'evento';

    const mensaje =
      `Se ha agregado una nueva ${nombreTipo}: "${evento.nombre}". ` +
      `Fecha: ${evento.fecha}. Hora: ${evento.hora}. ` +
      `Lugar: ${evento.lugar}.`;

    const notificaciones = destinatarios.map((usuario) =>
      notificacionRepo.create({
        usuarioId: usuario.id,
        tipo: tipoNotificacion,
        titulo,
        mensaje,
        leida: false,
        estado: EstadoNotificacion.ACTIVA,
        referenciaId: evento.id,
        referenciaTipo: 'evento_capacitacion',
      }),
    );

    await notificacionRepo.save(notificaciones);
  }

  /**
   * Obtiene las notificaciones de eventos/capacitaciones
   * de un usuario.
   */
  async obtenerPorUsuario(usuarioId: number) {
    return this.notificacionRepo.find({
      where: {
        usuarioId,
        estado: EstadoNotificacion.ACTIVA,
      },
      order: {
        createdAt: 'DESC',
      },
    });
  }

  /**
   * Marca una notificación como leída.
   */
  async marcarComoLeida(
    id: number,
    usuarioId: number,
  ): Promise<Notificacion | null> {
    const notificacion =
      await this.notificacionRepo.findOne({
        where: {
          id,
          usuarioId,
          estado: EstadoNotificacion.ACTIVA,
        },
      });

    if (!notificacion) {
      return null;
    }

    notificacion.leida = true;

    return this.notificacionRepo.save(notificacion);
  }
}

export const notificacionEventoService =
  new NotificacionEventoService();