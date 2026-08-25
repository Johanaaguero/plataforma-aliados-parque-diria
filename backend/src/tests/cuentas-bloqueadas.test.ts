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
import type { Usuario } from '../models/Usuario';
import type { Rol, NombreRol } from '../models/Rol';
import type { LoginAttempt } from '../models/LoginAttempt';
import type { AuditLog } from '../models/AuditLog';
import { errorMiddleware } from '../middlewares/registro.middleware';
import { RegisterInitialRoles1786838400000 } from '../migrations/1786838400000-RegisterInitialRoles';
import { RegisterSuperAdminRole1787558400000 } from '../migrations/1787558400000-RegisterSuperAdminRole';

config({ path: resolve(process.cwd(), '.env') });

const databaseTest = 'aliados_parque_diria_test';
process.env.DB_DATABASE = databaseTest;
if (process.env.DB_DATABASE !== databaseTest) {
  throw new Error(
    'SEGURIDAD: DB_DATABASE no apunta exactamente a aliados_parque_diria_test.',
  );
}
process.env.JWT_SECRET = 'cuentas-bloqueadas-test-secret-no-usar-en-produccion';

let dataSource: DataSource;
let UsuarioModel: typeof Usuario;
let RolModel: typeof Rol;
let LoginAttemptModel: typeof LoginAttempt;
let AuditLogModel: typeof AuditLog;
let unlockAccountService: typeof import('../modulos/Autenticación y gestión de usuario/Gestión de cuentas bloqueadas/cuentasBloqueadas.service').unlockAccount;
let server: Server;
let baseUrl: string;

interface Escenario {
  superAdmin: Usuario;
  administrador: Usuario;
  asociado: Usuario;
  visitanteBloqueado: Usuario;
}

const asegurarBaseConfiguradaParaPruebas = (): void => {
  const databaseConfigurada = (
    dataSource.options as { database?: string }
  ).database;

  if (databaseConfigurada !== databaseTest) {
    throw new Error(
      `Ejecución cancelada: el DataSource apunta a ${String(databaseConfigurada)} y no a ${databaseTest}`,
    );
  }
};

const assertTestDatabase = async (): Promise<void> => {
  asegurarBaseConfiguradaParaPruebas();

  const basesConectadas: Array<{ databaseActual: string }> =
    await dataSource.query('SELECT DATABASE() AS databaseActual');
  if (basesConectadas[0]?.databaseActual !== databaseTest) {
    throw new Error(
      'SEGURIDAD: los tests intentaron utilizar una base distinta de aliados_parque_diria_test. Ejecución cancelada.',
    );
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
  rol: Rol,
): Promise<Usuario> => {
  const repository = dataSource.getRepository(UsuarioModel);

  return repository.save(
    repository.create({
      nombreUsuario: `usuario_${indice}`,
      nombre: `Nombre ${indice}`,
      apellidos: `Apellido ${indice}`,
      correo: `${indice}@test.local`,
      telefono: indice.padStart(8, '0').slice(-8),
      contraseña: 'hash-no-utilizado',
      rol,
    }),
  );
};

const crearIntento = async (
  usuarioId: number,
  intentosFallidos: number,
  bloqueadoHasta: Date | null,
): Promise<LoginAttempt> => {
  const repository = dataSource.getRepository(LoginAttemptModel);

  return repository.save(
    repository.create({
      usuarioId,
      intentosFallidos,
      fechaUltimoIntento: new Date(Date.now() - 60_000),
      bloqueadoHasta,
    }),
  );
};

const prepararEscenario = async (): Promise<Escenario> => {
  const rolRepository = dataSource.getRepository(RolModel);
  const superAdminRol = await rolRepository.findOneByOrFail({
    nombre: 'super_admin',
  });
  const administradorRol = await rolRepository.findOneByOrFail({
    nombre: 'administrador',
  });
  const asociadoRol = await rolRepository.findOneByOrFail({
    nombre: 'asociado',
  });
  const visitanteRol = await rolRepository.findOneByOrFail({
    nombre: 'visitante',
  });

  const superAdmin = await crearUsuario('50000001', superAdminRol);
  const administrador = await crearUsuario('50000002', administradorRol);
  const asociado = await crearUsuario('50000003', asociadoRol);
  const visitanteBloqueado = await crearUsuario('50000004', visitanteRol);

  await crearIntento(
    visitanteBloqueado.id,
    3,
    new Date(Date.now() + 10 * 60_000),
  );
  await crearIntento(
    administrador.id,
    1,
    new Date(Date.now() - 10 * 60_000),
  );

  return {
    superAdmin,
    administrador,
    asociado,
    visitanteBloqueado,
  };
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
  options: RequestInit = {},
) => {
  const response = await fetch(`${baseUrl}${path}`, options);

  return {
    status: response.status,
    body: await response.json() as Record<string, unknown>,
  };
};

before(async () => {
  const dataSourceModule = await import('../data-source');
  const usuarioModule = await import('../models/Usuario');
  const rolModule = await import('../models/Rol');
  const loginAttemptModule = await import('../models/LoginAttempt');
  const auditLogModule = await import('../models/AuditLog');
  const serviceModule = await import(
    '../modulos/Autenticación y gestión de usuario/Gestión de cuentas bloqueadas/cuentasBloqueadas.service'
  );
  const routeModule = await import(
    '../modulos/Autenticación y gestión de usuario/Gestión de cuentas bloqueadas/cuentasBloqueadas.route'
  );

  dataSource = dataSourceModule.AppDataSource;
  UsuarioModel = usuarioModule.Usuario;
  RolModel = rolModule.Rol;
  LoginAttemptModel = loginAttemptModule.LoginAttempt;
  AuditLogModel = auditLogModule.AuditLog;
  unlockAccountService = serviceModule.unlockAccount;

  await dataSource.initialize();
  await assertTestDatabase();
  await dataSource.runMigrations();

  const app = express();
  app.use(express.json());
  app.use('/api/admin', routeModule.default);
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

describe('consulta de cuentas bloqueadas', () => {
  test('sin autenticación devuelve 401', async () => {
    const resultado = await request('/api/admin/cuentas-bloqueadas');
    assert.equal(resultado.status, 401);
  });

  for (const rol of ['administrador', 'asociado', 'visitante'] as const) {
    test(`${rol} recibe 403`, async () => {
      const escenario = await prepararEscenario();
      const actores = {
        administrador: escenario.administrador,
        asociado: escenario.asociado,
        visitante: escenario.visitanteBloqueado,
      };

      const resultado = await request('/api/admin/cuentas-bloqueadas', {
        headers: {
          Authorization: `Bearer ${token(actores[rol], rol)}`,
        },
      });

      assert.equal(resultado.status, 403);
    });
  }

  test('super_admin consulta únicamente las cuentas actualmente bloqueadas', async () => {
    const escenario = await prepararEscenario();

    const resultado = await request('/api/admin/cuentas-bloqueadas', {
      headers: {
        Authorization: `Bearer ${token(escenario.superAdmin, 'super_admin')}`,
      },
    });

    assert.equal(resultado.status, 200);
    const cuentas = resultado.body.data as Array<Record<string, unknown>>;
    assert.equal(cuentas.length, 1);
    assert.equal(cuentas[0]?.id, escenario.visitanteBloqueado.id);
    assert.deepEqual(
      Object.keys(cuentas[0]!).sort(),
      [
        'id',
        'nombreUsuario',
        'correo',
        'intentosFallidos',
        'fechaUltimoIntento',
        'bloqueadoHasta',
      ].sort(),
    );
  });
});

describe('desbloqueo administrativo', () => {
  test('sin autenticación devuelve 401', async () => {
    const resultado = await request('/api/admin/usuarios/999999/desbloquear', {
      method: 'POST',
    });
    assert.equal(resultado.status, 401);
  });

  for (const rol of ['administrador', 'asociado', 'visitante'] as const) {
    test(`${rol} recibe 403 y no modifica la cuenta`, async () => {
      const escenario = await prepararEscenario();
      const actores = {
        administrador: escenario.administrador,
        asociado: escenario.asociado,
        visitante: escenario.visitanteBloqueado,
      };

      const resultado = await request(
        `/api/admin/usuarios/${escenario.visitanteBloqueado.id}/desbloquear`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token(actores[rol], rol)}`,
          },
        },
      );

      assert.equal(resultado.status, 403);
      const intento = await dataSource.getRepository(LoginAttemptModel).findOneByOrFail({
        usuarioId: escenario.visitanteBloqueado.id,
      });
      assert.equal(intento.intentosFallidos, 3);
      assert.ok(intento.bloqueadoHasta);
    });
  }

  test('super_admin reinicia intentos y limpia bloqueadoHasta', async () => {
    const escenario = await prepararEscenario();
    const intentoAntes = await dataSource.getRepository(LoginAttemptModel).findOneByOrFail({
      usuarioId: escenario.visitanteBloqueado.id,
    });
    const fechaUltimoIntentoAnterior = intentoAntes.fechaUltimoIntento?.getTime();

    const resultado = await request(
      `/api/admin/usuarios/${escenario.visitanteBloqueado.id}/desbloquear`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token(escenario.superAdmin, 'super_admin')}`,
        },
      },
    );

    assert.equal(resultado.status, 200);
    const intentoDespues = await dataSource.getRepository(LoginAttemptModel).findOneByOrFail({
      usuarioId: escenario.visitanteBloqueado.id,
    });
    assert.equal(intentoDespues.intentosFallidos, 0);
    assert.equal(intentoDespues.bloqueadoHasta, null);
    assert.equal(
      intentoDespues.fechaUltimoIntento?.getTime(),
      fechaUltimoIntentoAnterior,
    );
  });

  test('ID inválido devuelve 400', async () => {
    const escenario = await prepararEscenario();
    const resultado = await request('/api/admin/usuarios/invalido/desbloquear', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token(escenario.superAdmin, 'super_admin')}`,
      },
    });

    assert.equal(resultado.status, 400);
  });

  test('usuario inexistente devuelve 404', async () => {
    const escenario = await prepararEscenario();
    const resultado = await request('/api/admin/usuarios/999999/desbloquear', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token(escenario.superAdmin, 'super_admin')}`,
      },
    });

    assert.equal(resultado.status, 404);
    assert.equal(resultado.body.message, 'El usuario no existe');
  });

  test('LoginAttempt inexistente devuelve 404', async () => {
    const escenario = await prepararEscenario();
    const resultado = await request(
      `/api/admin/usuarios/${escenario.asociado.id}/desbloquear`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token(escenario.superAdmin, 'super_admin')}`,
        },
      },
    );

    assert.equal(resultado.status, 404);
    assert.equal(
      resultado.body.message,
      'El registro de intentos de inicio de sesión no existe',
    );
  });

  test('registra ACCOUNT_UNLOCKED con actor, afectado y metadatos', async () => {
    const escenario = await prepararEscenario();

    const resultado = await request(
      `/api/admin/usuarios/${escenario.visitanteBloqueado.id}/desbloquear`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token(escenario.superAdmin, 'super_admin')}`,
          'X-Forwarded-For': '203.0.113.10',
          'User-Agent': 'cuentas-bloqueadas-test',
        },
      },
    );

    assert.equal(resultado.status, 200);
    const auditoria = await dataSource.getRepository(AuditLogModel).findOneByOrFail({
      usuarioId: escenario.superAdmin.id,
      action: 'ACCOUNT_UNLOCKED',
    });
    assert.equal(auditoria.status, 'success');
    assert.match(auditoria.description!, /desbloqueada administrativamente/);
    assert.equal(auditoria.ipAddress, '203.0.113.10');
    assert.equal(auditoria.userAgent, 'cuentas-bloqueadas-test');
    assert.ok(auditoria.createdAt instanceof Date);

    const details = JSON.parse(auditoria.details!) as Record<string, unknown>;
    assert.equal(details.usuarioAfectadoId, escenario.visitanteBloqueado.id);
    assert.equal(
      details.nombreUsuarioAfectado,
      escenario.visitanteBloqueado.nombreUsuario,
    );
    assert.equal(details.intentosFallidosAnteriores, 3);
    assert.equal(typeof details.bloqueadoHastaAnterior, 'string');
    assert.equal(details.intentosFallidosNuevos, 0);
    assert.equal(details.bloqueadoHastaNuevo, null);
  });

  test('un fallo de auditoría revierte el desbloqueo', async () => {
    const escenario = await prepararEscenario();

    await assert.rejects(() =>
      unlockAccountService({
        usuarioId: escenario.visitanteBloqueado.id,
        actorId: 999999,
        ipAddress: '127.0.0.1',
        userAgent: 'rollback-test',
      }),
    );

    const intento = await dataSource.getRepository(LoginAttemptModel).findOneByOrFail({
      usuarioId: escenario.visitanteBloqueado.id,
    });
    assert.equal(intento.intentosFallidos, 3);
    assert.ok(intento.bloqueadoHasta);
    assert.equal(
      await dataSource.getRepository(AuditLogModel).count({
        where: { action: 'ACCOUNT_UNLOCKED' },
      }),
      0,
    );
  });

  test('dos desbloqueos concurrentes dejan un estado consistente', async () => {
    const escenario = await prepararEscenario();

    const resultados = await Promise.all([
      unlockAccountService({
        usuarioId: escenario.visitanteBloqueado.id,
        actorId: escenario.superAdmin.id,
        ipAddress: '127.0.0.1',
        userAgent: 'concurrencia-test-1',
      }),
      unlockAccountService({
        usuarioId: escenario.visitanteBloqueado.id,
        actorId: escenario.superAdmin.id,
        ipAddress: '127.0.0.1',
        userAgent: 'concurrencia-test-2',
      }),
    ]);

    assert.equal(resultados.every((resultado) => resultado.ok), true);
    const intento = await dataSource.getRepository(LoginAttemptModel).findOneByOrFail({
      usuarioId: escenario.visitanteBloqueado.id,
    });
    assert.equal(intento.intentosFallidos, 0);
    assert.equal(intento.bloqueadoHasta, null);

    const auditorias = await dataSource.getRepository(AuditLogModel).find({
      where: {
        usuarioId: escenario.superAdmin.id,
        action: 'ACCOUNT_UNLOCKED',
      },
    });
    assert.equal(auditorias.length, 2);

    const intentosAnteriores = auditorias
      .map((auditoria) => {
        const details = JSON.parse(auditoria.details!) as Record<
          string,
          unknown
        >;
        return details.intentosFallidosAnteriores;
      })
      .sort();
    assert.deepEqual(intentosAnteriores, [0, 3]);
  });
});
