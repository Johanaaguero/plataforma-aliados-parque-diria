import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import type { EntityManager, QueryRunner, Repository } from 'typeorm';
import { NotificacionController } from '../modulos/Notificaciones/Crear notificaciones Reservas/NotificacionReservaController';
import { NotificacionService } from '../modulos/Notificaciones/Crear notificaciones Reservas/NotificacionReservaService';
import { Notificacion, EstadoNotificacion, TipoNotificacion } from '../models/Notificacion';
import { EventosCapacitaciones, TipoActividad } from '../models/EventosCapacitaciones';
import { Usuario } from '../models/Usuario';
import { NotificacionEventoService } from '../modulos/Notificaciones/Crear notificaciones Eventos/notificacionEvento.service';
import { conBloqueoNotificacionEvento } from '../modulos/Notificaciones/Crear notificaciones Eventos/notificacionEventoLock';

const usuarioAdministrador = {
  id: 81,
  rol: { nombre: 'administrador' },
} as Usuario;

const usuarioVisitante = {
  id: 82,
  rol: { nombre: 'visitante' },
} as Usuario;

const usuarioAsociado = {
  id: 83,
  rol: { nombre: 'asociado' },
} as Usuario;

const usuarioSuperAdmin = {
  id: 84,
  rol: { nombre: 'super_admin' },
} as Usuario;

const evento = {
  id: 912,
  nombre: 'Jornada de conservación',
  fecha: '2026-11-10',
  hora: '09:00',
  lugar: 'Parque Nacional Diría',
  tipoActividad: TipoActividad.EVENTO,
} as EventosCapacitaciones;

const comoEntityManager = (repositorios: Map<unknown, unknown>) =>
  ({
    getRepository: (entidad: unknown) => repositorios.get(entidad),
  }) as unknown as EntityManager;

describe('persistencia de notificaciones administrativas de eventos', () => {
  test('mantiene el bloqueo hasta completar la operación transaccional', async () => {
    const operaciones: string[] = [];
    const queryRunner = {
      connect: async () => {
        operaciones.push('connect');
      },
      query: async (sql: string) => {
        operaciones.push(sql.includes('GET_LOCK') ? 'lock' : 'unlock');
        return [{ adquirido: 1, liberado: 1 }];
      },
      release: async () => {
        operaciones.push('release');
      },
    } as unknown as QueryRunner;

    const resultado = await conBloqueoNotificacionEvento(
      evento.id,
      async () => {
        operaciones.push('transaction');
        return 'guardado';
      },
      () => queryRunner,
    );

    assert.equal(resultado, 'guardado');
    assert.deepEqual(operaciones, [
      'connect',
      'lock',
      'transaction',
      'unlock',
      'release',
    ]);
  });

  test('genera, persiste y entrega al administrador la notificación activa tras consultar la bandeja', async () => {
    const usuarios = [
      usuarioAdministrador,
      usuarioVisitante,
      usuarioAsociado,
      usuarioSuperAdmin,
    ];
    let relacionesConsultadas: unknown;
    const guardadas: Partial<Notificacion>[] = [];
    const existentes = new Set<number>();

    const repositorioUsuarios = {
      find: async (opciones: { relations: { rol: boolean } }) => {
        relacionesConsultadas = opciones.relations;
        return usuarios;
      },
    };

    const repositorioNotificacionesEvento = {
      find: async () =>
        guardadas.filter((notificacion) =>
          existentes.has(notificacion.usuarioId ?? -1),
        ),
      create: (notificacion: Partial<Notificacion>) => notificacion,
      save: async (notificaciones: Partial<Notificacion>[]) => {
        for (const notificacion of notificaciones) {
          if (!existentes.has(notificacion.usuarioId ?? -1)) {
            existentes.add(notificacion.usuarioId ?? -1);
            guardadas.push(notificacion);
          }
        }
        return notificaciones;
      },
    };

    const manager = comoEntityManager(
      new Map<unknown, unknown>([
        [Usuario, repositorioUsuarios],
        [Notificacion, repositorioNotificacionesEvento],
      ]),
    );
    const service = new NotificacionEventoService();

    await service.notificarNuevoEvento(evento, manager);

    assert.deepEqual(relacionesConsultadas, { rol: true });
    assert.deepEqual(
      guardadas.map(({ usuarioId }) => usuarioId).sort(),
      [81, 82, 83],
    );
    const notificacionAdmin = guardadas.find(
      ({ usuarioId }) => usuarioId === usuarioAdministrador.id,
    );
    assert.ok(notificacionAdmin);
    assert.equal(notificacionAdmin.tipo, TipoNotificacion.NUEVO_EVENTO);
    assert.equal(notificacionAdmin.estado, EstadoNotificacion.ACTIVA);
    assert.equal(notificacionAdmin.referenciaId, evento.id);
    assert.equal(notificacionAdmin.referenciaTipo, 'evento_capacitacion');

    await service.notificarNuevoEvento(evento, manager);
    assert.equal(guardadas.length, 3, 'la segunda publicación no debe duplicar filas');

    let consultaBandeja: { usuarioId: number; estado: EstadoNotificacion } | undefined;
    const repositorioBandeja = {
      find: async (opciones: {
        where: { usuarioId: number; estado: EstadoNotificacion };
      }) => {
        consultaBandeja = opciones.where;
        return guardadas.filter(
          (notificacion) =>
            notificacion.usuarioId === opciones.where.usuarioId &&
            notificacion.estado === opciones.where.estado,
        );
      },
    };
    const notificacionService = new NotificacionService(
      repositorioBandeja as Repository<Notificacion>,
    );
    const controller = new NotificacionController(notificacionService);
    let respuesta: Notificacion[] | undefined;
    const response = {
      json: (body: Notificacion[]) => {
        respuesta = body;
        return response;
      },
      status: (status: number) => {
        assert.equal(status, 200);
        return response;
      },
    };

    await controller.obtenerMisNotificaciones(
      { usuario: { id: usuarioAdministrador.id } } as never,
      response as never,
    );

    assert.deepEqual(consultaBandeja, {
      usuarioId: usuarioAdministrador.id,
      estado: EstadoNotificacion.ACTIVA,
    });
    assert.equal(respuesta?.length, 1);
    assert.equal(respuesta?.[0]?.tipo, 'nuevo_evento');
    assert.equal(respuesta?.[0]?.usuarioId, usuarioAdministrador.id);
  });

  test('usa el tipo compatible con la bandeja para una capacitación', async () => {
    const guardadas: Partial<Notificacion>[] = [];
    const manager = comoEntityManager(
      new Map<unknown, unknown>([
        [
          Usuario,
          {
            find: async () => [usuarioAdministrador],
          },
        ],
        [
          Notificacion,
          {
            find: async () => [],
            create: (notificacion: Partial<Notificacion>) => notificacion,
            save: async (notificaciones: Partial<Notificacion>[]) => {
              guardadas.push(...notificaciones);
            },
          },
        ],
      ]),
    );

    const capacitacion = {
      ...evento,
      tipoActividad: TipoActividad.CAPACITACION,
    } as EventosCapacitaciones;
    await new NotificacionEventoService().notificarNuevoEvento(capacitacion, manager);

    assert.equal(
      guardadas[0]?.tipo,
      TipoNotificacion.NUEVA_CAPACITACION,
    );
    assert.equal(guardadas[0]?.estado, EstadoNotificacion.ACTIVA);
  });
});
