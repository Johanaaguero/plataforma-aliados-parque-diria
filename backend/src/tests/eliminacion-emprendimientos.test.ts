import 'reflect-metadata';
import assert from 'node:assert/strict';
import { after, before, beforeEach, describe, test } from 'node:test';
import { resolve } from 'node:path';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import { config } from 'dotenv';
import mysql from 'mysql2/promise';
import express from 'express';
import jwt from 'jsonwebtoken';
import type { DataSource } from 'typeorm';

import { errorMiddleware } from '../middlewares/registro.middleware';
import { Usuario } from '../models/Usuario';
import { Rol, type NombreRol } from '../models/Rol';
import { CategoriaEmprendimiento } from '../models/CategoriaEmprendimiento';
import {
  Emprendimiento,
  EstadoPublicacion,
} from '../models/Emprendimiento';
import { RegisterInitialRoles1786838400000 } from '../migrations/1786838400000-RegisterInitialRoles';

config({ path: resolve(process.cwd(), '.env') });

const databaseBase = process.env.DB_DATABASE;

if (!databaseBase) {
  throw new Error(
    'DB_DATABASE no está configurada para crear la base de pruebas',
  );
}

const databaseTest = `${databaseBase}_test`;

if (!/^[a-zA-Z0-9_]+$/.test(databaseTest)) {
  throw new Error(
    'El nombre calculado para la base de pruebas no es seguro',
  );
}

process.env.DB_DATABASE = databaseTest;
process.env.JWT_SECRET =
  'eliminacion-emprendimientos-test-secret-no-usar-en-produccion';

let dataSource: DataSource;
let UsuarioModel: typeof Usuario;
let RolModel: typeof Rol;
let CategoriaModel: typeof CategoriaEmprendimiento;
let EmprendimientoModel: typeof Emprendimiento;

let server: Server;
let baseUrl: string;

interface Escenario {
  administradorId: number;
  asociadoId: number;
  visitanteId: number;
  emprendimientoId: number;
}

const variableRequerida = (nombre: string): string => {
  const valor = process.env[nombre];

  if (!valor) {
    throw new Error(`Falta la variable requerida ${nombre}`);
  }

  return valor;
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

const crearToken = (
  id: number,
  rol: NombreRol,
): string => {
  return jwt.sign(
    {
      id,
      nombreUsuario: `actor_${id}`,
      rol,
    },
    process.env.JWT_SECRET!,
    {
      expiresIn: '1h',
    },
  );
};

const request = async (
  path: string,
  options: RequestInit = {},
) => {
  const response = await fetch(`${baseUrl}${path}`, options);

  let body: unknown = null;

  if (response.status !== 204) {
    body = await response.json().catch(() => null);
  }

  return {
    status: response.status,
    body,
  };
};

const limpiarBaseTest = async () => {
  if (!dataSource?.isInitialized) {
    return;
  }

  await dataSource.query('DELETE FROM emprendimientos');
  await dataSource.query('DELETE FROM categorias_emprendimientos');
  await dataSource.query('DELETE FROM historial_cambio_roles');
  await dataSource.query('DELETE FROM login_attempts');
  await dataSource.query('DELETE FROM usuarios');
  await dataSource.query('DELETE FROM roles');
};

const ejecutarInicializacionRoles = async () => {
  const queryRunner = dataSource.createQueryRunner();

  await queryRunner.connect();
  await queryRunner.startTransaction();

  try {
    const migration = new RegisterInitialRoles1786838400000();

    await migration.up(queryRunner);

    await queryRunner.commitTransaction();
  } catch (error) {
    await queryRunner.rollbackTransaction();
    throw error;
  } finally {
    await queryRunner.release();
  }
};

const prepararEscenario = async (): Promise<Escenario> => {
  const rolRepository = dataSource.getRepository(RolModel);

  // Los roles ya fueron creados por ejecutarInicializacionRoles().
  // Aquí solo los recuperamos.
  const administrador = await rolRepository.findOneByOrFail({
    nombre: 'administrador',
  });

  const asociado = await rolRepository.findOneByOrFail({
    nombre: 'asociado',
  });

  const visitante = await rolRepository.findOneByOrFail({
    nombre: 'visitante',
  });

  const usuarioAdministrador = await crearUsuario(
    '10000001',
    administrador,
  );

  const usuarioAsociado = await crearUsuario(
    '10000002',
    asociado,
  );

  const usuarioVisitante = await crearUsuario(
    '10000003',
    visitante,
  );

  const categoriaRepository =
    dataSource.getRepository(CategoriaModel);

  const categoria = await categoriaRepository.save(
    categoriaRepository.create({
      nombre: `Comida de prueba ${Date.now()}`,
      descripcion:
        'Categoría utilizada por las pruebas automatizadas',
    }),
  );

  const emprendimientoRepository =
    dataSource.getRepository(EmprendimientoModel);

  const emprendimiento = await emprendimientoRepository.save(
    emprendimientoRepository.create({
      nombre: `Emprendimiento de prueba ${Date.now()}`,
      descripcion:
        'Registro utilizado por las pruebas automatizadas',
      categoria,
      direccion: 'Nicoya, Guanacaste',
      latitud: 10.148,
      longitud: -85.452,
      correoElectronico: `emprendimiento-${Date.now()}@test.local`,
      telefono: '88888888',
      estadoPublicacion: EstadoPublicacion.PENDIENTE,
    }),
  );

  return {
    administradorId: usuarioAdministrador.id,
    asociadoId: usuarioAsociado.id,
    visitanteId: usuarioVisitante.id,
    emprendimientoId: emprendimiento.id,
  };
};

before(async () => {
  const adminConnection = await mysql.createConnection({
    host: variableRequerida('DB_HOST'),
    port: Number(variableRequerida('DB_PORT')),
    user: variableRequerida('DB_USERNAME'),
    password: variableRequerida('DB_PASSWORD'),
  });

  try {
    await adminConnection.query(
      `CREATE DATABASE IF NOT EXISTS \`${databaseTest}\``,
    );
  } finally {
    await adminConnection.end();
  }

  const dataSourceModule = await import('../data-source');
  const usuarioModule = await import('../models/Usuario');
  const rolModule = await import('../models/Rol');
  const categoriaModule = await import(
    '../models/CategoriaEmprendimiento'
  );
  const emprendimientoModule = await import(
    '../models/Emprendimiento'
  );

  const routeModule = await import(
    '../modulos/Administración de emprendimientos/Eliminación de emprendimientos/eliminarEmprendimiento.route'
  );

  dataSource = dataSourceModule.AppDataSource;

  UsuarioModel = usuarioModule.Usuario;
  RolModel = rolModule.Rol;
  CategoriaModel =
    categoriaModule.CategoriaEmprendimiento;
  EmprendimientoModel =
    emprendimientoModule.Emprendimiento;

  await dataSource.initialize();
  await dataSource.runMigrations();

  const app = express();

  app.use(express.json());

  app.use(
    '/api/emprendimientos',
    routeModule.default,
  );

  app.use(errorMiddleware);

  await new Promise<void>((resolveListen, rejectListen) => {
    server = app.listen(
      0,
      '127.0.0.1',
      (error?: Error) => {
        if (error) {
          rejectListen(error);
        } else {
          resolveListen();
        }
      },
    );
  });

  const address = server.address() as AddressInfo;

  baseUrl = `http://127.0.0.1:${address.port}`;
});

beforeEach(async () => {
  await limpiarBaseTest();
  await ejecutarInicializacionRoles();
});

after(async () => {
  if (server) {
    await new Promise<void>((resolveClose, rejectClose) => {
      server.close((error) => {
        if (error) {
          rejectClose(error);
        } else {
          resolveClose();
        }
      });
    });
  }

  if (dataSource?.isInitialized) {
    await limpiarBaseTest();
    await dataSource.destroy();
  }
});

describe('DELETE /api/emprendimientos/:id', () => {
  test('sin token devuelve 401', async () => {
    const escenario = await prepararEscenario();

    const resultado = await request(
      `/api/emprendimientos/${escenario.emprendimientoId}`,
      {
        method: 'DELETE',
      },
    );

    assert.equal(resultado.status, 401);
  });

  test('con token de asociado devuelve 403', async () => {
    const escenario = await prepararEscenario();

    const resultado = await request(
      `/api/emprendimientos/${escenario.emprendimientoId}`,
      {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${crearToken(
            escenario.asociadoId,
            'asociado',
          )}`,
        },
      },
    );

    assert.equal(resultado.status, 403);
  });

  test('con token de visitante devuelve 403', async () => {
    const escenario = await prepararEscenario();

    const resultado = await request(
      `/api/emprendimientos/${escenario.emprendimientoId}`,
      {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${crearToken(
            escenario.visitanteId,
            'visitante',
          )}`,
        },
      },
    );

    assert.equal(resultado.status, 403);
  });

  test('con administrador válido devuelve 204', async () => {
    const escenario = await prepararEscenario();

    const resultado = await request(
      `/api/emprendimientos/${escenario.emprendimientoId}`,
      {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${crearToken(
            escenario.administradorId,
            'administrador',
          )}`,
        },
      },
    );

    assert.equal(resultado.status, 204);
  });

  test('ID inexistente devuelve 404', async () => {
    const escenario = await prepararEscenario();

    const resultado = await request(
      '/api/emprendimientos/999999',
      {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${crearToken(
            escenario.administradorId,
            'administrador',
          )}`,
        },
      },
    );

    assert.equal(resultado.status, 404);

    const body = resultado.body as {
      message?: string;
    };

    assert.equal(
      body.message,
      'El emprendimiento no fue encontrado.',
    );
  });

  test('eliminación exitosa elimina físicamente el registro', async () => {
    const escenario = await prepararEscenario();

    const resultado = await request(
      `/api/emprendimientos/${escenario.emprendimientoId}`,
      {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${crearToken(
            escenario.administradorId,
            'administrador',
          )}`,
        },
      },
    );

    assert.equal(resultado.status, 204);

    const emprendimientoRepository =
      dataSource.getRepository(EmprendimientoModel);

    const eliminado = await emprendimientoRepository.findOne({
      where: {
        id: escenario.emprendimientoId,
      },
    });

    assert.equal(eliminado, null);
  });
});