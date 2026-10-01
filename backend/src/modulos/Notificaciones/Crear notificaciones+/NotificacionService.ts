import { AppDataSource } from '../../../data-source';
import { EntityManager } from 'typeorm';

import { Usuario } from '../../../models/Usuario';
import { Reserva } from '../../../models/Reserva';
import { EventosCapacitaciones } from '../../../models/EventosCapacitaciones';

import {
Notificacion,
TipoNotificacion,
} from '../../../models/Notificacion';

import {
serializarFechaCalendario,
serializarFechaUtc,
} from '../../../utils/fechas';

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
const notificacion =
this.repositorio.create({
usuarioId: params.usuarioId,
tipo: params.tipo,
titulo: params.titulo,
mensaje: params.mensaje,
leida: false,
referenciaId:
params.referenciaId ?? null,
referenciaTipo:
params.referenciaTipo ?? null,
});

return await this.repositorio.save(
  notificacion,
);

}

// =========================================================
// OBTENER DETALLE DE UNA NOTIFICACIÓN
// =========================================================
//
// Este método permite que el usuario abra una notificación
// y consulte la información relacionada con ella.
//
// Actualmente se maneja:
//
// referenciaTipo = "reserva"
//
// Se devuelve:
// - Información de la notificación
// - Información de la reserva
// - Información del evento/capacitación
//
// Además, se verifica que la notificación pertenezca
// al usuario autenticado.
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
    const reserva =
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

    if (!reserva) {
      return {
        notificacion,
        tipo: 'reserva',
        datos: null,
      };
    }

    const evento =
      await AppDataSource.getRepository(
        EventosCapacitaciones,
      ).findOne({
        where: {
          id: reserva.eventoCapacitacionId,
        },
      });

    return {
      notificacion,

      tipo: 'reserva',

      datos: {
        reserva: {
          id: reserva.id,
          estado: reserva.estado,
          nombreCompleto:
            reserva.nombreCompleto,

          fechaNacimiento:
            serializarFechaCalendario(
              reserva.fechaNacimiento,
            ),

          tipoIdentificacion:
            reserva.tipoIdentificacion,

          numeroIdentificacion:
            reserva.numeroIdentificacion,

          correo: reserva.correo,

          telefono: reserva.telefono,

          createdAt:
            serializarFechaUtc(
              reserva.createdAt,
            ),
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
//
// Se generan:
//
// 1. Una notificación para el usuario que realizó
//    la reserva.
//
// 2. Una notificación para cada administrador.
//
// Las notificaciones utilizan el mismo EntityManager
// de la transacción de la reserva.
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
// 1. Notificación para el usuario
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
// 2. Buscar administradores
// -------------------------------------------------------

const usuarios =
  await usuariosRepo.find();

const administradores =
  usuarios.filter(
    (usuario) =>
      usuario.rol?.nombre ===
      'administrador',
  );

// -------------------------------------------------------
// 3. Notificación para los administradores
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
},
});

if (!notificacion) {
  throw new Error(
    'Notificación no encontrada',
  );
}

await this.repositorio.remove(
  notificacion,
);

return {
  mensaje:
    'Notificación eliminada correctamente',
};
}
}