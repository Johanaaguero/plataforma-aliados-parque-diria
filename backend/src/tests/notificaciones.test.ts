import 'reflect-metadata';
import assert from 'node:assert/strict';
import { after, before, beforeEach, describe, test } from 'node:test';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import { resolve } from 'node:path';
import { config } from 'dotenv';
import express from 'express';
import jwt from 'jsonwebtoken';
import type { DataSource } from 'typeorm';
import { errorMiddleware } from '../middlewares/registro.middleware';
import { Notificacion, TipoNotificacion } from '../models/Notificacion';
import { Rol, type NombreRol } from '../models/Rol';
import { Usuario } from '../models/Usuario';

config({ path: resolve(process.cwd(), '.env') });

const databaseTest = 'aliados_parque_diria_test';
process.env.DB_DATABASE = databaseTest;
if (process.env.DB_DATABASE !== databaseTest) {
  throw new Error(
    'SEGURIDAD: DB_DATABASE no apunta exactamente a aliados_parque_diria_test.',
  );
}
process.env.JWT_SECRET =
  'notificaciones-test-secret-no-usar-en-produccion';

interface Actores {
  usuarioA: Usuario;
  usuarioB: Usuario;
}

interface RespuestaHttp {
  status: number;
  body: unknown;
}

let dataSource: DataSource;
let server: Server;
let baseUrl: string;
let actores: Actores;
let secuencia = 0;

const variableRequerida = (nombre: string): string => {
  const valor = process.env[nombre];
  if (!valor) throw new Error(`Falta la variable requerida ${nombre}`);
  return valor;
};

const asegurarBaseConfiguradaParaPruebas = (): void => {
  const databaseConfigurada = (
    dataSource.options as { database?: string }
  ).database;

  if (databaseConfigurada !== databaseTest) {
    throw new Error(
      `Ejecucion cancelada: el DataSource apunta a ${String(databaseConfigurada)} y no a ${databaseTest}`,
    );
  }
};

const assertTestDatabase = async (): Promise<void> => {
  asegurarBaseConfiguradaParaPruebas();

  const basesConectadas: Array<{ databaseActual: string }> =
    await dataSource.query('SELECT DATABASE() AS databaseActual');
  if (basesConectadas[0]?.databaseActual !== databaseTest) {
    throw new Error(
      'SEGURIDAD: los tests intentaron utilizar una base distinta de aliados_parque_diria_test. Ejecucion cancelada.',
    );
  }
};

const solicitar = async (
  path: string,
  options: RequestInit = {},
): Promise<RespuestaHttp> => {
  const response = await fetch(`${baseUrl}${path}`, options);
  const texto = await response.text();

  return {
    status: response.status,
    body: texto.length > 0 ? (JSON.parse(texto) as unknown) : undefined,
  };
};

const comoObjeto = (valor: unknown): Record<string, unknown> => {
  assert.ok(
    typeof valor === 'object' && valor !== null && !Array.isArray(valor),
    'Se esperaba un objeto JSON',
  );
  return valor as Record<string, unknown>;
};

const comoArray = (valor: unknown): Record<string, unknown>[] => {
  assert.ok(Array.isArray(valor), 'Se esperaba un arreglo JSON');
  return valor.map(comoObjeto);
};

const tokenPara = (usuario: Usuario, rol: NombreRol): string =>
  jwt.sign(
    {
      id: usuario.id,
      nombreUsuario: usuario.nombreUsuario,
      rol,
    },
    variableRequerida('JWT_SECRET'),
    { expiresIn: '1h' },
  );

const encabezadosJson = (token?: string): Record<string, string> => ({
  'Content-Type': 'application/json',
  ...(token ? { Authorization: `Bearer ${token}` } : {}),
});

const tokenA = (): string => tokenPara(actores.usuarioA, 'visitante');
const tokenB = (): string => tokenPara(actores.usuarioB, 'visitante');

const limpiarFixtures = async (): Promise<void> => {
  await assertTestDatabase();
  await dataSource.query('DELETE FROM notificaciones');
  await dataSource.query('DELETE FROM token_blacklist');
  await dataSource.query('DELETE FROM audit_logs');
  await dataSource.query('DELETE FROM historial_cambio_roles');
  await dataSource.query('DELETE FROM login_attempts');
  await dataSource.query('DELETE FROM recuperacion_contrasenas');
  await dataSource.query('DELETE FROM usuarios');
  await dataSource.query('DELETE FROM roles');
};

const prepararFixtures = async (): Promise<void> => {
  await assertTestDatabase();
  secuencia += 1;

  const rolRepository = dataSource.getRepository(Rol);
  const usuarioRepository = dataSource.getRepository(Usuario);
  const visitante = await rolRepository.save(
    rolRepository.create({
      nombre: 'visitante',
      descripcion: 'Visitante de prueba',
    }),
  );

  const usuarioA = await usuarioRepository.save(
    usuarioRepository.create({
      nombreUsuario: `notificaciones_a_${secuencia}`,
      nombre: 'Usuario',
      apellidos: 'A',
      correo: `notificaciones.a.${secuencia}@test.local`,
      telefono: '81000001',
      contraseña: 'hash-no-utilizado',
      rol: visitante,
    }),
  );
  const usuarioB = await usuarioRepository.save(
    usuarioRepository.create({
      nombreUsuario: `notificaciones_b_${secuencia}`,
      nombre: 'Usuario',
      apellidos: 'B',
      correo: `notificaciones.b.${secuencia}@test.local`,
      telefono: '81000002',
      contraseña: 'hash-no-utilizado',
      rol: visitante,
    }),
  );

  actores = { usuarioA, usuarioB };
};

const crearNotificacion = async (
  usuario: Usuario,
  overrides: Partial<Notificacion> = {},
): Promise<Notificacion> => {
  const repository = dataSource.getRepository(Notificacion);
  return repository.save(
    repository.create({
      usuarioId: usuario.id,
      tipo: TipoNotificacion.NUEVO_EVENTO,
      titulo: `Titulo ${secuencia}`,
      mensaje: `Mensaje ${secuencia}`,
      leida: false,
      referenciaId: 1000 + secuencia,
      referenciaTipo: 'evento_capacitacion',
      ...overrides,
    }),
  );
};

const obtenerNotificacion = async (id: number): Promise<Notificacion | null> =>
  dataSource.getRepository(Notificacion).findOneBy({ id });

before(async () => {
  const dataSourceModule = await import('../data-source');
  const routeModule = await import(
    '../modulos/Notificaciones/Crear notificaciones Reservas/NotificacionReservaRoutes'
  );

  dataSource = dataSourceModule.AppDataSource;
  asegurarBaseConfiguradaParaPruebas();
  await dataSource.initialize();
  await assertTestDatabase();
  await dataSource.runMigrations();

  const app = express();
  app.use(express.json());
  app.use('/api/notificaciones', routeModule.default);
  app.use(errorMiddleware);

  await new Promise<void>((resolveListen, rejectListen) => {
    server = app.listen(0, '127.0.0.1', (error?: Error) => {
      if (error) rejectListen(error);
      else resolveListen();
    });
  });

  const address = server.address() as AddressInfo;
  baseUrl = `http://127.0.0.1:${address.port}`;
});

beforeEach(async () => {
  if (!dataSource.isInitialized) {
    await dataSource.initialize();
  }
  await assertTestDatabase();
  await limpiarFixtures();
  await prepararFixtures();
});

after(async () => {
  if (server) {
    await new Promise<void>((resolveClose, rejectClose) => {
      server.close((error) => {
        if (error) rejectClose(error);
        else resolveClose();
      });
    });
  }

  if (dataSource?.isInitialized) {
    await assertTestDatabase();
    await limpiarFixtures();
    await dataSource.destroy();
  }
});

describe('notificaciones', () => {
  test('crea una notificacion para el usuario autenticado con leida en false', async () => {
    const respuesta = await solicitar('/api/notificaciones', {
      method: 'POST',
      headers: encabezadosJson(tokenA()),
      body: JSON.stringify({
        tipo: TipoNotificacion.NUEVO_EMPRENDIMIENTO,
        titulo: 'Nuevo emprendimiento disponible',
        mensaje: 'Hay un emprendimiento publicado',
        referenciaId: 55,
        referenciaTipo: 'emprendimiento',
      }),
    });

    assert.equal(respuesta.status, 201);
    const body = comoObjeto(respuesta.body);
    assert.equal(body.usuarioId, actores.usuarioA.id);
    assert.equal(body.tipo, TipoNotificacion.NUEVO_EMPRENDIMIENTO);
    assert.equal(body.titulo, 'Nuevo emprendimiento disponible');
    assert.equal(body.mensaje, 'Hay un emprendimiento publicado');
    assert.equal(body.referenciaId, 55);
    assert.equal(body.referenciaTipo, 'emprendimiento');
    assert.equal(body.leida, false);

    const persistida = await obtenerNotificacion(Number(body.id));
    assert.ok(persistida);
    assert.equal(persistida.usuarioId, actores.usuarioA.id);
    assert.equal(persistida.leida, false);
  });

  test('lista solamente notificaciones del usuario autenticado', async () => {
    const propia = await crearNotificacion(actores.usuarioA, {
      titulo: 'Propia',
    });
    const ajena = await crearNotificacion(actores.usuarioB, {
      titulo: 'Ajena',
    });

    const sinToken = await solicitar('/api/notificaciones');
    assert.equal(sinToken.status, 401);

    const respuesta = await solicitar('/api/notificaciones', {
      headers: encabezadosJson(tokenA()),
    });

    assert.equal(respuesta.status, 200);
    const items = comoArray(respuesta.body);
    assert.deepEqual(
      items.map((item) => item.id),
      [propia.id],
    );
    assert.ok(!items.some((item) => item.id === ajena.id));
  });

  test('obtiene no leidas solamente del usuario autenticado', async () => {
    const noLeidaPropia = await crearNotificacion(actores.usuarioA, {
      titulo: 'No leida propia',
      leida: false,
    });
    await crearNotificacion(actores.usuarioA, {
      titulo: 'Leida propia',
      leida: true,
    });
    const noLeidaAjena = await crearNotificacion(actores.usuarioB, {
      titulo: 'No leida ajena',
      leida: false,
    });

    const respuesta = await solicitar('/api/notificaciones/no-leidas', {
      headers: encabezadosJson(tokenA()),
    });

    assert.equal(respuesta.status, 200);
    const items = comoArray(respuesta.body);
    assert.deepEqual(
      items.map((item) => item.id),
      [noLeidaPropia.id],
    );
    assert.ok(!items.some((item) => item.id === noLeidaAjena.id));
    assert.ok(items.every((item) => item.leida === false));
  });

  test('cuenta correctamente las notificaciones no leidas del usuario autenticado', async () => {
    await crearNotificacion(actores.usuarioA, { leida: false });
    await crearNotificacion(actores.usuarioA, { leida: false });
    await crearNotificacion(actores.usuarioA, { leida: true });
    await crearNotificacion(actores.usuarioB, { leida: false });

    const respuesta = await solicitar('/api/notificaciones/no-leidas/count', {
      headers: encabezadosJson(tokenA()),
    });

    assert.equal(respuesta.status, 200);
    assert.deepEqual(respuesta.body, { cantidad: 2 });
  });

  test('devuelve el detalle al propietario sin marcar la notificacion como leida', async () => {
    const notificacion = await crearNotificacion(actores.usuarioA, {
      leida: false,
      referenciaId: 77,
      referenciaTipo: 'evento_capacitacion',
    });

    const respuesta = await solicitar(
      `/api/notificaciones/${notificacion.id}/detalle`,
      { headers: encabezadosJson(tokenA()) },
    );

    assert.equal(respuesta.status, 200);
    const body = comoObjeto(respuesta.body);
    const detalleNotificacion = comoObjeto(body.notificacion);
    assert.equal(detalleNotificacion.id, notificacion.id);
    assert.equal(detalleNotificacion.usuarioId, actores.usuarioA.id);
    assert.equal(body.tipo, 'evento_capacitacion');
    assert.equal(body.datos, null);

    const persistida = await obtenerNotificacion(notificacion.id);
    assert.ok(persistida);
    assert.equal(persistida.leida, false);
  });

  test('rechaza detalle sin token, token invalido, id invalido, inexistente y usuario ajeno', async () => {
    const notificacion = await crearNotificacion(actores.usuarioA);

    assert.equal(
      (await solicitar(`/api/notificaciones/${notificacion.id}/detalle`)).status,
      401,
    );
    assert.equal(
      (
        await solicitar(`/api/notificaciones/${notificacion.id}/detalle`, {
          headers: { Authorization: 'Bearer token-invalido' },
        })
      ).status,
      401,
    );
    assert.equal(
      (
        await solicitar('/api/notificaciones/invalido/detalle', {
          headers: encabezadosJson(tokenA()),
        })
      ).status,
      400,
    );
    assert.equal(
      (
        await solicitar('/api/notificaciones/2147483647/detalle', {
          headers: encabezadosJson(tokenA()),
        })
      ).status,
      404,
    );
    assert.equal(
      (
        await solicitar(`/api/notificaciones/${notificacion.id}/detalle`, {
          headers: encabezadosJson(tokenB()),
        })
      ).status,
      404,
    );
  });

  test('marca una notificacion como leida y persiste el cambio', async () => {
    const notificacion = await crearNotificacion(actores.usuarioA, {
      leida: false,
    });
    assert.equal((await obtenerNotificacion(notificacion.id))?.leida, false);

    const respuesta = await solicitar(
      `/api/notificaciones/${notificacion.id}/leida`,
      {
        method: 'PATCH',
        headers: encabezadosJson(tokenA()),
      },
    );

    assert.equal(respuesta.status, 200);
    const body = comoObjeto(respuesta.body);
    assert.equal(body.id, notificacion.id);
    assert.equal(body.leida, true);

    const persistida = await obtenerNotificacion(notificacion.id);
    assert.ok(persistida);
    assert.equal(persistida.leida, true);

    const recarga = await solicitar(
      `/api/notificaciones/${notificacion.id}/detalle`,
      { headers: encabezadosJson(tokenA()) },
    );
    assert.equal(recarga.status, 200);
    const detalle = comoObjeto(comoObjeto(recarga.body).notificacion);
    assert.equal(detalle.leida, true);
  });

  test('protege propiedad en detalle, marcado como leida y eliminacion', async () => {
    const notificacion = await crearNotificacion(actores.usuarioA, {
      leida: false,
    });

    assert.equal(
      (
        await solicitar(`/api/notificaciones/${notificacion.id}/detalle`, {
          headers: encabezadosJson(tokenA()),
        })
      ).status,
      200,
    );
    assert.equal(
      (
        await solicitar(`/api/notificaciones/${notificacion.id}/leida`, {
          method: 'PATCH',
          headers: encabezadosJson(tokenA()),
        })
      ).status,
      200,
    );

    await dataSource
      .getRepository(Notificacion)
      .update({ id: notificacion.id }, { leida: false });

    assert.equal(
      (
        await solicitar(`/api/notificaciones/${notificacion.id}/detalle`, {
          headers: encabezadosJson(tokenB()),
        })
      ).status,
      404,
    );
    assert.equal(
      (
        await solicitar(`/api/notificaciones/${notificacion.id}/leida`, {
          method: 'PATCH',
          headers: encabezadosJson(tokenB()),
        })
      ).status,
      404,
    );
    assert.equal(
      (
        await solicitar(`/api/notificaciones/${notificacion.id}`, {
          method: 'DELETE',
          headers: encabezadosJson(tokenB()),
        })
      ).status,
      404,
    );

    const persistida = await obtenerNotificacion(notificacion.id);
    assert.ok(persistida);
    assert.equal(persistida.usuarioId, actores.usuarioA.id);
    assert.equal(persistida.leida, false);
  });

  test('marca todas las notificaciones no leidas del usuario actual sin modificar otros usuarios', async () => {
    const propiaNoLeida1 = await crearNotificacion(actores.usuarioA, {
      leida: false,
    });
    const propiaNoLeida2 = await crearNotificacion(actores.usuarioA, {
      leida: false,
    });
    const propiaLeida = await crearNotificacion(actores.usuarioA, {
      leida: true,
    });
    const ajenaNoLeida = await crearNotificacion(actores.usuarioB, {
      leida: false,
    });

    const respuesta = await solicitar(
      '/api/notificaciones/marcar-todas-leidas',
      {
        method: 'PATCH',
        headers: encabezadosJson(tokenA()),
      },
    );

    assert.equal(respuesta.status, 200);
    assert.equal((await obtenerNotificacion(propiaNoLeida1.id))?.leida, true);
    assert.equal((await obtenerNotificacion(propiaNoLeida2.id))?.leida, true);
    assert.equal((await obtenerNotificacion(propiaLeida.id))?.leida, true);
    assert.equal((await obtenerNotificacion(ajenaNoLeida.id))?.leida, false);
  });

  test('elimina solamente cuando lo solicita el propietario', async () => {
    const propia = await crearNotificacion(actores.usuarioA);

    const respuesta = await solicitar(`/api/notificaciones/${propia.id}`, {
      method: 'DELETE',
      headers: encabezadosJson(tokenA()),
    });

    assert.equal(respuesta.status, 200);
    assert.equal(await obtenerNotificacion(propia.id), null);

    const detalle = await solicitar(`/api/notificaciones/${propia.id}/detalle`, {
      headers: encabezadosJson(tokenA()),
    });
    assert.equal(detalle.status, 404);
  });

  test('rechaza eliminacion sin token, id invalido, inexistente y usuario ajeno', async () => {
    const notificacion = await crearNotificacion(actores.usuarioA);

    assert.equal(
      (await solicitar(`/api/notificaciones/${notificacion.id}`, { method: 'DELETE' })).status,
      401,
    );
    assert.equal(
      (
        await solicitar('/api/notificaciones/invalido', {
          method: 'DELETE',
          headers: encabezadosJson(tokenA()),
        })
      ).status,
      400,
    );
    assert.equal(
      (
        await solicitar('/api/notificaciones/2147483647', {
          method: 'DELETE',
          headers: encabezadosJson(tokenA()),
        })
      ).status,
      404,
    );
    assert.equal(
      (
        await solicitar(`/api/notificaciones/${notificacion.id}`, {
          method: 'DELETE',
          headers: encabezadosJson(tokenB()),
        })
      ).status,
      404,
    );

    const persistida = await obtenerNotificacion(notificacion.id);
    assert.ok(persistida);
    assert.equal(persistida.usuarioId, actores.usuarioA.id);
  });

  test('responde 500 sin exponer detalles cuando falla la base de datos durante el listado', async () => {
    await dataSource.destroy();

    try {
      const respuesta = await solicitar('/api/notificaciones', {
        headers: encabezadosJson(tokenA()),
      });

      assert.equal(respuesta.status, 500);
      assert.deepEqual(respuesta.body, {
        ok: false,
        message: 'Error interno del servidor',
      });
    } finally {
      await dataSource.initialize();
    }
  });
});
