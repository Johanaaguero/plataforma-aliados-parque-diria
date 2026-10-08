import { AppDataSource } from '../../../data-source';
import {
  Emprendimiento,
  EstadoPublicacion,
} from '../../../models/Emprendimiento';
import { Usuario } from '../../../models/Usuario';
import {
  Notificacion,
  EstadoNotificacion,
  TipoNotificacion,
} from '../../../models/Notificacion';

export class NotificacionEmprendimientoService {
  private readonly notificacionRepo =
    AppDataSource.getRepository(Notificacion);

  private readonly usuarioRepo =
    AppDataSource.getRepository(Usuario);

  /**
   * Notifica a los administradores cuando un asociado
   * registra un nuevo emprendimiento.
   */
  async notificarNuevoEmprendimientoAlAdministrador(
    emprendimiento: Emprendimiento,
    usuarioCreador: Usuario,
  ): Promise<void> {
    // Solo aplica si quien creó el emprendimiento es un asociado.
    if (
      !usuarioCreador.rol ||
      usuarioCreador.rol.nombre !== 'asociado'
    ) {
      return;
    }

    const administradores = await this.usuarioRepo
      .createQueryBuilder('usuario')
      .leftJoinAndSelect('usuario.rol', 'rol')
      .where('rol.nombre = :rol', {
        rol: 'administrador',
      })
      .getMany();

    if (administradores.length === 0) {
      return;
    }

    const nombreAsociado =
      `${usuarioCreador.nombre} ${usuarioCreador.apellidos}`.trim();

    const notificaciones = administradores.map(
      (administrador) =>
        this.notificacionRepo.create({
          usuarioId: administrador.id,
          tipo: TipoNotificacion.NUEVO_EMPRENDIMIENTO,
          titulo: 'Nuevo emprendimiento registrado',
          mensaje:
            `El asociado ${nombreAsociado} ha registrado ` +
            `el emprendimiento "${emprendimiento.nombre}".`,
          leida: false,
          referenciaId: emprendimiento.id,
          referenciaTipo: 'emprendimiento',
        }),
    );

    await this.notificacionRepo.save(notificaciones);
  }

  /**
   * Notifica a todos los visitantes cuando un emprendimiento
   * pasa a estado PUBLICADO.
   */
  async notificarNuevoEmprendimientoAVisitantes(
    emprendimiento: Emprendimiento,
  ): Promise<void> {
    // Solo se notifican emprendimientos publicados.
    if (
      emprendimiento.estadoPublicacion !==
      EstadoPublicacion.PUBLICADO
    ) {
      return;
    }

    const visitantes = await this.usuarioRepo
      .createQueryBuilder('usuario')
      .leftJoinAndSelect('usuario.rol', 'rol')
      .where('rol.nombre = :rol', {
        rol: 'visitante',
      })
      .getMany();

    if (visitantes.length === 0) {
      return;
    }

    const notificaciones = visitantes.map(
      (visitante) =>
        this.notificacionRepo.create({
          usuarioId: visitante.id,
          tipo: TipoNotificacion.NUEVO_EMPRENDIMIENTO,
          titulo: 'Nuevo emprendimiento disponible',
          mensaje:
            `Se ha agregado un nuevo emprendimiento: ` +
            `"${emprendimiento.nombre}".`,
          leida: false,
          referenciaId: emprendimiento.id,
          referenciaTipo: 'emprendimiento',
        }),
    );

    await this.notificacionRepo.save(notificaciones);
  }

  /**
   * Obtiene las notificaciones de emprendimientos
   * correspondientes al usuario autenticado.
   */
  async obtenerPorUsuario(usuarioId: number) {
    return this.notificacionRepo.find({
      where: {
        usuarioId,
        tipo: TipoNotificacion.NUEVO_EMPRENDIMIENTO,
        estado: EstadoNotificacion.ACTIVA,
      },
      order: {
        createdAt: 'DESC',
      },
    });
  }

  /**
   * Marca una notificación de emprendimiento como leída.
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
          tipo: TipoNotificacion.NUEVO_EMPRENDIMIENTO,
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

export const notificacionEmprendimientoService =
  new NotificacionEmprendimientoService();