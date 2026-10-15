import 'reflect-metadata';
import assert from 'node:assert/strict';
import { after, before, beforeEach, describe, test } from 'node:test';
import { resolve } from 'node:path';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import express from 'express';
import { config } from 'dotenv';
import jwt from 'jsonwebtoken';
import type { DataSource } from 'typeorm';
import type { AuditLog } from '../models/AuditLog';
import type { Rol, NombreRol } from '../models/Rol';
import type { Usuario } from '../models/Usuario';
import { RegisterInitialRoles1786838400000 } from '../migrations/1786838400000-RegisterInitialRoles';
import { RegisterSuperAdminRole1787558400000 } from '../migrations/1787558400000-RegisterSuperAdminRole';

config({ path: resolve(process.cwd(), '.env') });

const databaseTest = 'aliados_parque_diria_test';
process.env.DB_DATABASE = databaseTest;
process.env.JWT_SECRET = 'bitacora-test-secret-no-usar-en-produccion';

let dataSource: DataSource;
let AuditLogModel: typeof AuditLog;
let RolModel: typeof Rol;
let UsuarioModel: typeof Usuario;
let server: Server;
let baseUrl: string;

const assertTestDatabase = async (): Promise<void> => {
  const databaseConfigurada = (dataSource.options as { database?: string }).database;
  if (databaseConfigurada !== databaseTest) {
    throw new Error(`Base insegura para pruebas: ${String(databaseConfigurada)}`);
  }

  const actual: Array<{ databaseActual: string }> =
    await dataSource.query('SELECT DATABASE() AS databaseActual');
  if (actual[0]?.databaseActual !== databaseTest) {
    throw new Error('Las pruebas de bitacora no apuntan a la base aislada.');
  }
};

const limpiarBaseTest = async (): Promise<void> => {
  await assertTestDatabase();
  await dataSource.query('DELETE FROM audit_logs');
  await dataSource.query('DELETE FROM historial_cambio_roles');
  await dataSource.query('DELETE FROM login_attempts');
  await dataSource.query('DELETE FROM usuarios');
  await dataSource.query('DELETE FROM roles');
};

const inicializarRoles = async (): Promise<void> => {
  const queryRunner = dataSource.createQueryRunner();
  await queryRunner.connect();

  try {
    await new RegisterInitialRoles1786838400000().up(queryRunner);
    await new RegisterSuperAdminRole1787558400000().up(queryRunner);
  } finally {
    await queryRunner.release();
  }
};

const crearUsuario = async (
  indice: string,
  rolNombre: NombreRol,
): Promise<Usuario> => {
  const rol = await dataSource.getRepository(RolModel).findOneByOrFail({
    nombre: rolNombre,
  });

  return dataSource.getRepository(UsuarioModel).save({
    nombreUsuario: `bitacora_${indice}`,
    nombre: `Nombre ${indice}`,
    apellidos: `Apellido ${indice}`,
    correo: `bitacora_${indice}@test.local`,
    telefono: indice.padStart(8, '0').slice(-8),
    contraseña: 'hash-no-utilizado',
    rol,
  });
};

const token = (usuario: Usuario, rol: NombreRol): string =>
  jwt.sign(
    {
      id: usuario.id,
      nombreUsuario: usuario.nombreUsuario,
      rol,
    },
    process.env.JWT_SECRET!,
    { expiresIn: '1h' },
  );

const request = async (
  path: string,
  tokenAutorizacion: string,
) => {
  const response = await fetch(`${baseUrl}${path}`, {
    headers: {
      Authorization: `Bearer ${tokenAutorizacion}`,
    },
  });

  return {
    status: response.status,
    body: await response.json() as Record<string, unknown>,
  };
};

const crearAuditoria = async (
  data: Partial<AuditLog>,
): Promise<AuditLog> => {
  const repo = dataSource.getRepository(AuditLogModel);
  return repo.save(
    repo.create({
      action: 'LOGIN_SUCCESS',
      description: 'Registro de prueba',
      status: 'success',
      usuarioId: null,
      ipAddress: null,
      userAgent: null,
      details: null,
      ...data,
    }),
  );
};

before(async () => {
  const dataSourceModule = await import('../data-source');
  const auditLogModule = await import('../models/AuditLog');
  const rolModule = await import('../models/Rol');
  const usuarioModule = await import('../models/Usuario');
  const routeModule = await import(
    '../modulos/Autenticación y gestión de usuario/Super_admin/Bitacora/bitacora.route'
  );

  dataSource = dataSourceModule.AppDataSource;
  AuditLogModel = auditLogModule.AuditLog;
  RolModel = rolModule.Rol;
  UsuarioModel = usuarioModule.Usuario;

  await dataSource.initialize();
  await assertTestDatabase();
  await dataSource.runMigrations();

  const app = express();
  app.use(express.json());
  app.use('/api/admin', routeModule.default);

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
  await limpiarBaseTest();
  await inicializarRoles();
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
    await limpiarBaseTest();
    await dataSource.destroy();
  }
});

describe('bitacora administrativa', () => {
  test('consulta mas de 100 registros con paginacion real', async () => {
    const superAdmin = await crearUsuario('10000001', 'super_admin');
    const repo = dataSource.getRepository(AuditLogModel);
    const base = new Date('2026-10-01T12:00:00.000-06:00').getTime();

    const registros = Array.from({ length: 105 }, (_, indice) =>
      repo.create({
        action: indice % 2 === 0 ? 'LOGIN_SUCCESS' : 'LOGIN_FAILED',
        description: `Registro ${indice}`,
        status: indice % 2 === 0 ? 'success' : 'failure',
        usuarioId: superAdmin.id,
        createdAt: new Date(base + indice * 1000),
      }),
    );

    await repo.save(registros);

    const respuesta = await request(
      '/api/admin/bitacora?page=11&limit=10',
      token(superAdmin, 'super_admin'),
    );

    assert.equal(respuesta.status, 200);
    assert.equal(respuesta.body.total, 105);
    assert.equal(respuesta.body.page, 11);
    assert.equal(respuesta.body.limit, 10);
    assert.equal(respuesta.body.totalPaginas, 11);
    assert.equal((respuesta.body.registros as unknown[]).length, 5);
  });

  test('no duplica ni omite registros entre paginas consecutivas estables', async () => {
    const superAdmin = await crearUsuario('10000002', 'super_admin');
    const fecha = new Date('2026-10-02T08:00:00.000-06:00');

    for (let indice = 0; indice < 25; indice += 1) {
      await crearAuditoria({
        action: 'LOGIN_SUCCESS',
        usuarioId: superAdmin.id,
        description: `Pagina ${indice}`,
        createdAt: fecha,
      });
    }

    const auth = token(superAdmin, 'super_admin');
    const pagina1 = await request('/api/admin/bitacora?page=1&limit=10', auth);
    const pagina2 = await request('/api/admin/bitacora?page=2&limit=10', auth);
    const idsPagina1 = (pagina1.body.registros as Array<{ id: number }>).map((r) => r.id);
    const idsPagina2 = (pagina2.body.registros as Array<{ id: number }>).map((r) => r.id);

    assert.equal(new Set([...idsPagina1, ...idsPagina2]).size, 20);
    assert.equal(Math.min(...idsPagina1) > Math.max(...idsPagina2), true);
  });

  test('combina filtros por fecha, accion, estado y usuario', async () => {
    const superAdmin = await crearUsuario('10000003', 'super_admin');
    const visitante = await crearUsuario('10000004', 'visitante');

    await crearAuditoria({
      action: 'LOGIN_FAILED',
      status: 'failure',
      usuarioId: visitante.id,
      description: 'Coincidencia esperada',
      createdAt: new Date('2026-10-05T10:00:00.000-06:00'),
    });
    await crearAuditoria({
      action: 'LOGIN_FAILED',
      status: 'failure',
      usuarioId: superAdmin.id,
      description: 'Otro usuario',
      createdAt: new Date('2026-10-05T10:00:00.000-06:00'),
    });
    await crearAuditoria({
      action: 'LOGIN_SUCCESS',
      status: 'success',
      usuarioId: visitante.id,
      description: 'Otra accion',
      createdAt: new Date('2026-10-05T10:00:00.000-06:00'),
    });

    const respuesta = await request(
      `/api/admin/bitacora?page=1&limit=10&action=LOGIN_FAILED&status=failure&usuarioId=${visitante.id}&desde=2026-10-05&hasta=2026-10-05`,
      token(superAdmin, 'super_admin'),
    );

    const registros = respuesta.body.registros as Array<{ description: string }>;
    assert.equal(respuesta.status, 200);
    assert.equal(respuesta.body.total, 1);
    assert.ok(registros[0]);
    assert.equal(registros[0].description, 'Coincidencia esperada');
  });

  test('incluye registros del primer y ultimo dia para meses de 31, 30 y febrero', async () => {
    const superAdmin = await crearUsuario('10000010', 'super_admin');
    const auth = token(superAdmin, 'super_admin');
    const casos = [
      {
        desde: '2026-01-01',
        hasta: '2026-01-31',
        primero: '2026-01-01T00:00:00.000-06:00',
        ultimo: '2026-01-31T23:59:59.999-06:00',
        fuera: '2026-02-01T00:00:00.000-06:00',
      },
      {
        desde: '2026-04-01',
        hasta: '2026-04-30',
        primero: '2026-04-01T00:00:00.000-06:00',
        ultimo: '2026-04-30T23:59:59.999-06:00',
        fuera: '2026-05-01T00:00:00.000-06:00',
      },
      {
        desde: '2025-02-01',
        hasta: '2025-02-28',
        primero: '2025-02-01T00:00:00.000-06:00',
        ultimo: '2025-02-28T23:59:59.999-06:00',
        fuera: '2025-03-01T00:00:00.000-06:00',
      },
      {
        desde: '2024-02-01',
        hasta: '2024-02-29',
        primero: '2024-02-01T00:00:00.000-06:00',
        ultimo: '2024-02-29T23:59:59.999-06:00',
        fuera: '2024-03-01T00:00:00.000-06:00',
      },
    ];

    for (const [indice, caso] of casos.entries()) {
      await crearAuditoria({
        action: 'LOGIN_SUCCESS',
        usuarioId: superAdmin.id,
        description: `Primer dia ${indice}`,
        createdAt: new Date(caso.primero),
      });
      await crearAuditoria({
        action: 'LOGIN_SUCCESS',
        usuarioId: superAdmin.id,
        description: `Ultimo dia ${indice}`,
        createdAt: new Date(caso.ultimo),
      });
      await crearAuditoria({
        action: 'LOGIN_SUCCESS',
        usuarioId: superAdmin.id,
        description: `Fuera del mes ${indice}`,
        createdAt: new Date(caso.fuera),
      });

      const respuesta = await request(
        `/api/admin/bitacora?page=1&limit=10&desde=${caso.desde}&hasta=${caso.hasta}&busqueda=${indice}`,
        auth,
      );
      const registros = respuesta.body.registros as Array<{ description: string }>;

      assert.equal(respuesta.status, 200);
      assert.equal(respuesta.body.total, 2);
      assert.deepEqual(
        registros.map((registro) => registro.description).sort(),
        [`Primer dia ${indice}`, `Ultimo dia ${indice}`].sort(),
      );
    }
  });

  test('filtra por busqueda y reporta el total de coincidencias', async () => {
    const superAdmin = await crearUsuario('10000005', 'super_admin');
    const visitante = await crearUsuario('10000006', 'visitante');

    await crearAuditoria({
      action: 'LOGIN_SUCCESS',
      usuarioId: visitante.id,
      description: 'Acceso desde recepcion',
    });
    await crearAuditoria({
      action: 'ACCOUNT_UNLOCKED',
      usuarioId: superAdmin.id,
      description: 'Cuenta desbloqueada',
      details: JSON.stringify({ usuarioAfectado: 'persona especial' }),
    });

    const respuesta = await request(
      '/api/admin/bitacora?busqueda=especial',
      token(superAdmin, 'super_admin'),
    );

    assert.equal(respuesta.status, 200);
    assert.equal(respuesta.body.total, 1);
  });

  test('rechaza parametros invalidos', async () => {
    const superAdmin = await crearUsuario('10000007', 'super_admin');
    const auth = token(superAdmin, 'super_admin');

    assert.equal((await request('/api/admin/bitacora?page=0', auth)).status, 400);
    assert.equal((await request('/api/admin/bitacora?status=invalido', auth)).status, 400);
    assert.equal(
      (await request('/api/admin/bitacora?desde=2026-10-10&hasta=2026-10-01', auth)).status,
      400,
    );
  });

  test('rechaza usuarios sin rol super_admin', async () => {
    const superAdmin = await crearUsuario('10000008', 'super_admin');
    const administrador = await crearUsuario('10000009', 'administrador');

    await crearAuditoria({
      action: 'LOGIN_SUCCESS',
      usuarioId: superAdmin.id,
    });

    const respuesta = await request(
      '/api/admin/bitacora',
      token(administrador, 'administrador'),
    );

    assert.equal(respuesta.status, 403);
  });
});
