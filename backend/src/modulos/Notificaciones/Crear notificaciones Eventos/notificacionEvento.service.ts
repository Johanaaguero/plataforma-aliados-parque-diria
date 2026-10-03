import { AppDataSource } from '../../../data-source';

import { Usuario } from '../../../models/Usuario';

import {
  EventosCapacitaciones,
  TipoActividad,
} from '../../../models/EventosCapacitaciones';

import {
  Notificacion,
  TipoNotificacion,
} from '../../../models/Notificacion';

export class NotificacionEventoService {
  private readonly notificacionRepo =
    AppDataSource.getRepository(Notificacion);

  private readonly usuarioRepo =
    AppDataSource.getRepository(Usuario);

  /**
   * Crea las notificaciones para todos los visitantes y asociados
   * cuando se registra un nuevo evento o capacitación.
   */
  async notificarNuevoEvento(
    evento: EventosCapacitaciones,
  ): Promise<void> {
    const usuarios = await this.usuarioRepo
      .createQueryBuilder('usuario')
      .leftJoinAndSelect('usuario.rol', 'rol')
      .where('rol.nombre IN (:...roles)', {
        roles: ['visitante', 'asociado'],
      })
      .getMany();

    if (usuarios.length === 0) {
      return;
    }

    const esCapacitacion =
      evento.tipoActividad === TipoActividad.CAPACITACION;

    const tipoNotificacion = esCapacitacion
      ? TipoNotificacion.NUEVA_CAPACITACION
      : TipoNotificacion.NUEVO_EVENTO;

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

    const notificaciones = usuarios.map((usuario) =>
      this.notificacionRepo.create({
        usuarioId: usuario.id,
        tipo: tipoNotificacion,
        titulo,
        mensaje,
        leida: false,
        referenciaId: evento.id,
        referenciaTipo: 'evento_capacitacion',
      }),
    );

    await this.notificacionRepo.save(notificaciones);
  }

  /**
   * Obtiene las notificaciones de eventos/capacitaciones
   * de un usuario.
   */
  async obtenerPorUsuario(usuarioId: number) {
    return this.notificacionRepo.find({
      where: {
        usuarioId,
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