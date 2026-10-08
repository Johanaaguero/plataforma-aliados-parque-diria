import { AppDataSource } from '../../../data-source';
import { In } from 'typeorm';
import { Incidencia } from '../../../models/Incidencia';
import { Usuario } from '../../../models/Usuario';
import {
  Notificacion,
  EstadoNotificacion,
  TipoNotificacion,
} from '../../../models/Notificacion';
import { incidenciaCorreoService } from './Correo/Incidencia.correo.service';

/**
 * Notificación con el código de la incidencia asociada.
 * `referenciaCodigo` es null cuando la notificación
 * no está relacionada con una incidencia.
 */
export type NotificacionConCodigo = Omit<Notificacion, 'toPublic'> & {
  referenciaCodigo: string | null;
};

export interface CanalesCompartirIncidencia {
  notificacion: boolean;
  correo: boolean;
}

export interface ResultadoCompartirIncidencia {
  cantidad: number;
  correoEnviado: boolean;
}

export class NotificacionIncidenciaService {
  private readonly notificacionRepo =
    AppDataSource.getRepository(Notificacion);

  private readonly usuarioRepo =
    AppDataSource.getRepository(Usuario);

  private readonly incidenciaRepo =
    AppDataSource.getRepository(Incidencia);

  /**
   * Agrega `referenciaCodigo` (columna `codigo` de la incidencia)
   * a las notificaciones cuya referenciaTipo es 'incidencia'.
   *
   * Hace una sola consulta para todas las notificaciones.
   */
  async adjuntarCodigoIncidencia(
    notificaciones: Notificacion[],
  ): Promise<NotificacionConCodigo[]> {
    const ids = [
      ...new Set(
        notificaciones
          .filter(
            (n) =>
              n.referenciaTipo === 'incidencia' &&
              n.referenciaId !== null &&
              n.referenciaId !== undefined,
          )
          .map((n) => n.referenciaId as number),
      ),
    ];

    const codigoPorId = new Map<number, string>();

    if (ids.length > 0) {
      const incidencias = await this.incidenciaRepo.find({
        where: { id: In(ids) },
        select: { id: true, codigo: true },
      });

      incidencias.forEach((incidencia) => {
        codigoPorId.set(incidencia.id, incidencia.codigo);
      });
    }

    return notificaciones.map((n) => ({
      ...n,
      referenciaCodigo:
        n.referenciaTipo === 'incidencia' &&
        n.referenciaId !== null &&
        n.referenciaId !== undefined
          ? (codigoPorId.get(n.referenciaId) ?? null)
          : null,
    }));
  }

  /**
   * Notifica a todos los administradores
   * cuando se registra una nueva incidencia.
   */
  async notificarNuevaIncidenciaAAdministradores(
    incidencia: Incidencia,
  ): Promise<void> {
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

    const notificaciones = administradores.map(
      (administrador) =>
        this.notificacionRepo.create({
          usuarioId: administrador.id,
          tipo: TipoNotificacion.NUEVA_INCIDENCIA,
          titulo: 'Nueva incidencia registrada',
          mensaje:
            `Se ha registrado una nueva incidencia: ` +
            `"${incidencia.titulo}".`,
          leida: false,
          referenciaId: incidencia.id,
          referenciaTipo: 'incidencia',
        }),
    );

    await this.notificacionRepo.save(notificaciones);
  }

  /**
   * Notifica al usuario que registró la incidencia
   * cuando el administrador registra un nuevo seguimiento.
   */
  async notificarSeguimientoAlUsuario(
    incidencia: Incidencia,
  ): Promise<void> {
    if (!incidencia.usuarioReporta?.id) {
      return;
    }

    const notificacion =
      this.notificacionRepo.create({
        usuarioId: incidencia.usuarioReporta.id,
        tipo: TipoNotificacion.SEGUIMIENTO_INCIDENCIA,
        titulo: 'Seguimiento de incidencia',
        mensaje:
          `El administrador ha dado seguimiento a tu ` +
          `incidencia "${incidencia.titulo}". ` +
          `Puedes consultar la incidencia para revisar ` +
          `la solución registrada y responder si estás ` +
          `satisfecho o no con la atención recibida.`,
        leida: false,
        referenciaId: incidencia.id,
        referenciaTipo: 'incidencia',
      });

    await this.notificacionRepo.save(notificacion);
  }

  /**
   * Notifica a todos los administradores cuando
   * el usuario indica si está satisfecho o no.
   */
  async notificarRespuestaUsuarioAAdministradores(
    incidencia: Incidencia,
    accion: 'satisfecho' | 'no_satisfecho',
  ): Promise<void> {
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

    const estaSatisfecho = accion === 'satisfecho';

    const titulo = estaSatisfecho
      ? 'Usuario satisfecho con la atención'
      : 'Usuario no satisfecho con la atención';

    const mensaje = estaSatisfecho
      ? `El usuario ha indicado que está satisfecho ` +
        `con la atención recibida para la incidencia ` +
        `"${incidencia.titulo}".`
      : `El usuario ha indicado que no está satisfecho ` +
        `con la atención recibida para la incidencia ` +
        `"${incidencia.titulo}". ` +
        `La incidencia requiere revisión nuevamente.`;

    const notificaciones = administradores.map(
      (administrador) =>
        this.notificacionRepo.create({
          usuarioId: administrador.id,
          tipo: TipoNotificacion.SEGUIMIENTO_INCIDENCIA,
          titulo,
          mensaje,
          leida: false,
          referenciaId: incidencia.id,
          referenciaTipo: 'incidencia',
        }),
    );

    await this.notificacionRepo.save(notificaciones);
  }

  /**
   * Comparte una incidencia por los canales elegidos por el admin:
   * - notificacion: la marca como pública y notifica a los roles elegidos.
   * - correo: envía un correo a quien reportó (si tiene correo).
   *
   * El correo nunca rompe el flujo: si falla, correoEnviado = false.
   */
  async compartirIncidencia(
    incidencia: Incidencia,
    destinatarios: 'usuarios' | 'asociados' | 'todos',
    canales: CanalesCompartirIncidencia,
  ): Promise<ResultadoCompartirIncidencia> {
    if (!canales.notificacion && !canales.correo) {
      throw new Error(
        'Debes seleccionar al menos un canal para compartir.',
      );
    }

    if (canales.notificacion && incidencia.esPublica) {
      throw new Error('La incidencia ya fue compartida.');
    }

    let cantidad = 0;

    if (canales.notificacion) {
      cantidad = await this.publicarYNotificar(
        incidencia,
        destinatarios,
      );
    }

    let correoEnviado = false;

    if (canales.correo) {
      correoEnviado =
        await incidenciaCorreoService.enviarIncidenciaCompartida(
          incidencia,
        );
    }

    return { cantidad, correoEnviado };
  }

  /**
   * Marca la incidencia como pública y crea las notificaciones.
   * Devuelve la cantidad de notificaciones creadas.
   */
  private async publicarYNotificar(
    incidencia: Incidencia,
    destinatarios: 'usuarios' | 'asociados' | 'todos',
  ): Promise<number> {
    let roles: string[] = [];

    if (destinatarios === 'usuarios') {
      roles = ['visitante'];
    }

    if (destinatarios === 'asociados') {
      roles = ['asociado'];
    }

    if (destinatarios === 'todos') {
      roles = ['visitante', 'asociado'];
    }

    incidencia.esPublica = true;

    await this.incidenciaRepo.save(incidencia);

    const usuarios =
      roles.length > 0
        ? await this.usuarioRepo
            .createQueryBuilder('usuario')
            .leftJoinAndSelect('usuario.rol', 'rol')
            .where('rol.nombre IN (:...roles)', { roles })
            .getMany()
        : [];

    if (usuarios.length === 0) {
      return 0;
    }

    const notificaciones = usuarios.map((usuario) =>
      this.notificacionRepo.create({
        usuarioId: usuario.id,
        tipo: TipoNotificacion.INCIDENCIA_COMPARTIDA,

        // Nuevo título para darle carácter de aviso importante
        titulo: 'Aviso importante sobre una incidencia',

        // Nuevo mensaje preventivo
        mensaje:
          `Se ha compartido una incidencia que puede ser ` +
          `relevante para las personas que visitan el Parque ` +
          `Nacional Diriá. Consulte los detalles y tenga ` +
          `precaución durante su visita.`,

        leida: false,
        referenciaId: incidencia.id,
        referenciaTipo: 'incidencia',
      }),
    );

    await this.notificacionRepo.save(notificaciones);

    return notificaciones.length;
  }

  /**
   * Obtener las notificaciones de incidencias
   * del usuario autenticado (incluye `referenciaCodigo`).
   */
  async obtenerPorUsuario(
    usuarioId: number,
  ): Promise<NotificacionConCodigo[]> {
    const notificaciones =
      await this.notificacionRepo.find({
        where: {
          usuarioId,
          tipo: In([
            TipoNotificacion.NUEVA_INCIDENCIA,
            TipoNotificacion.SEGUIMIENTO_INCIDENCIA,
            TipoNotificacion.INCIDENCIA_COMPARTIDA,
          ]),
          estado: EstadoNotificacion.ACTIVA,
        },
        order: {
          createdAt: 'DESC',
        },
      });

    return this.adjuntarCodigoIncidencia(notificaciones);
  }

  /**
   * Marcar una notificación de incidencia
   * como leída.
   */
  async marcarComoLeida(
    id: number,
    usuarioId: number,
  ): Promise<NotificacionConCodigo | null> {
    const notificacion =
      await this.notificacionRepo.findOne({
        where: {
          id,
          usuarioId,
          tipo: In([
            TipoNotificacion.NUEVA_INCIDENCIA,
            TipoNotificacion.SEGUIMIENTO_INCIDENCIA,
            TipoNotificacion.INCIDENCIA_COMPARTIDA,
          ]),
          estado: EstadoNotificacion.ACTIVA,
        },
      });

    if (!notificacion) {
      return null;
    }

    notificacion.leida = true;

    const guardada =
      await this.notificacionRepo.save(notificacion);

    const [conCodigo] =
      await this.adjuntarCodigoIncidencia([guardada]);

    return conCodigo ?? null;
  }
}

export const notificacionIncidenciaService =
  new NotificacionIncidenciaService();