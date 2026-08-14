import 'reflect-metadata';
import assert from 'node:assert/strict';
import { after, before, beforeEach, describe, test } from 'node:test';
import { resolve } from 'node:path';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import type { Request, Response } from 'express';
import { config } from 'dotenv';
import mysql from 'mysql2/promise';
import express from 'express';
import jwt from 'jsonwebtoken';
import type { DataSource } from 'typeorm';
import type { Usuario } from '../models/Usuario';
import type { Rol, NombreRol } from '../models/Rol';
import type { HistorialCambioRol } from '../models/HistorialCambioRol';
import { RegisterInitialRoles1786838400000 } from '../migrations/1786838400000-RegisterInitialRoles';

config({ path: resolve(process.cwd(), '.env') });

const databaseBase = process.env.DB_DATABASE;

if (!databaseBase) {
  throw new Error('DB_DATABASE no está configurada para crear la base de pruebas');
}

const databaseTest = `${databaseBase}_test`;

if (!/^[a-zA-Z0-9_]+$/.test(databaseTest)) {
  throw new Error('El nombre calculado para la base de pruebas no es seguro');
}

process.env.DB_DATABASE = databaseTest;
process.env.JWT_SECRET = 'gestion-roles-test-secret-no-usar-en-produccion';

const variableRequerida = (nombre: string): string => {
  const valor = process.env[nombre];
  if (!valor) throw new Error(`Falta la variable requerida ${nombre}`);
  return valor;
};

let dataSource: DataSource;
let UsuarioModel: typeof Usuario;
let RolModel: typeof Rol;
let HistorialModel: typeof HistorialCambioRol;
let getUsersWithRoles: typeof import('../modulos/Autenticación y gestión de usuario/Gestión de Roles/roles.service').getUsersWithRoles;
let updateUserRole: typeof import('../modulos/Autenticación y gestión de usuario/Gestión de Roles/roles.service').updateUserRole;
let getUsersRoles: typeof import('../modulos/Autenticación y gestión de usuario/Gestión de Roles/roles.controller').getUsersRoles;
let updateRole: typeof import('../modulos/Autenticación y gestión de usuario/Gestión de Roles/roles.controller').updateRole;
let server: Server;
let baseUrl: string;
let rolesTrasMigraciones: Array<{
  nombre: NombreRol;
  descripcion: string;
}> = [];

interface Escenario {
  administradorId: number;
  visitanteId: number;
  asociadoId: number;
}

interface RespuestaCapturada {
  statusCode: number;
  body: unknown;
  response: Response;
}

const crearRespuesta = (): RespuestaCapturada => {
  const captura: RespuestaCapturada = {
    statusCode: 200,
    body: undefined,
    response: undefined as unknown as Response,
  };

  const response = {
    status(code: number) {
      captura.statusCode = code;
      return response;
    },
    json(body: unknown) {
      captura.body = body;
      return response;
    },
  } as unknown as Response;

  captura.response = response;
  return captura;
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

const prepararEscenario = async (
  administradoresAdicionales = 0,
): Promise<Escenario & { administradoresAdicionalesIds: number[] }> => {
  const rolRepository = dataSource.getRepository(RolModel);
  const administrador = await rolRepository.save(
    rolRepository.create({ nombre: 'administrador', descripcion: 'Admin' }),
  );
  const asociado = await rolRepository.save(
    rolRepository.create({ nombre: 'asociado', descripcion: 'Asociado' }),
  );
  const visitante = await rolRepository.save(
    rolRepository.create({ nombre: 'visitante', descripcion: 'Visitante' }),
  );

  const usuarioAdministrador = await crearUsuario('10000001', administrador);
  const usuarioVisitante = await crearUsuario('10000002', visitante);
  const usuarioAsociado = await crearUsuario('10000003', asociado);
  const administradoresAdicionalesIds: number[] = [];

  for (let indice = 0; indice < administradoresAdicionales; indice += 1) {
    const usuario = await crearUsuario(
      String(20000000 + indice),
      administrador,
    );
    administradoresAdicionalesIds.push(usuario.id);
  }

  return {
    administradorId: usuarioAdministrador.id,
    visitanteId: usuarioVisitante.id,
    asociadoId: usuarioAsociado.id,
    administradoresAdicionalesIds,
  };
};

const limpiarBaseTest = async () => {
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

const token = (
  id: number,
  rol: NombreRol,
  expirado = false,
) =>
  jwt.sign(
    { id, nombreUsuario: `actor_${id}`, rol },
    process.env.JWT_SECRET!,
    { expiresIn: expirado ? -1 : '1h' },
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
  const historialModule = await import('../models/HistorialCambioRol');
  const serviceModule = await import(
    '../modulos/Autenticación y gestión de usuario/Gestión de Roles/roles.service'
  );
  const controllerModule = await import(
    '../modulos/Autenticación y gestión de usuario/Gestión de Roles/roles.controller'
  );
  const routeModule = await import(
    '../modulos/Autenticación y gestión de usuario/Gestión de Roles/roles.route'
  );

  dataSource = dataSourceModule.AppDataSource;
  UsuarioModel = usuarioModule.Usuario;
  RolModel = rolModule.Rol;
  HistorialModel = historialModule.HistorialCambioRol;
  getUsersWithRoles = serviceModule.getUsersWithRoles;
  updateUserRole = serviceModule.updateUserRole;
  getUsersRoles = controllerModule.getUsersRoles;
  updateRole = controllerModule.updateRole;

  await dataSource.initialize();
  await dataSource.runMigrations();
  await ejecutarInicializacionRoles();

  rolesTrasMigraciones = (
    await dataSource.getRepository(RolModel).find({
      order: { nombre: 'ASC' },
    })
  ).map(({ nombre, descripcion }) => ({ nombre, descripcion }));

  const app = express();
  app.use(express.json());
  app.use('/api/users', routeModule.default);

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

describe('inicialización y asignación de roles predeterminados', () => {
  test('las migraciones dejan exactamente los tres roles con sus descripciones', () => {
    assert.deepEqual(rolesTrasMigraciones, [
      {
        nombre: 'administrador',
        descripcion: 'Administrador del sistema',
      },
      {
        nombre: 'asociado',
        descripcion: 'Asociado de la organización',
      },
      {
        nombre: 'visitante',
        descripcion: 'Usuario visitante',
      },
    ]);
  });

  test('ejecutar nuevamente la inicialización no duplica roles', async () => {
    await ejecutarInicializacionRoles();
    await ejecutarInicializacionRoles();

    const roles = await dataSource.getRepository(RolModel).find();
    assert.equal(roles.length, 3);
    assert.equal(new Set(roles.map(({ nombre }) => nombre)).size, 3);
  });

  test('la inicialización vuelve a crear un rol faltante', async () => {
    await ejecutarInicializacionRoles();
    await dataSource.getRepository(RolModel).delete({ nombre: 'visitante' });

    await ejecutarInicializacionRoles();

    const roles = await dataSource.getRepository(RolModel).find({
      order: { nombre: 'ASC' },
    });
    assert.deepEqual(
      roles.map(({ nombre }) => nombre),
      ['administrador', 'asociado', 'visitante'],
    );
    assert.equal(
      roles.find(({ nombre }) => nombre === 'visitante')?.descripcion,
      'Usuario visitante',
    );
  });

  test('los roles pueden asignarse y reasignarse buscando por nombre', async () => {
    await ejecutarInicializacionRoles();
    const rolRepository = dataSource.getRepository(RolModel);
    const usuarioRepository = dataSource.getRepository(UsuarioModel);
    const visitante = await rolRepository.findOneByOrFail({
      nombre: 'visitante',
    });
    const administrador = await rolRepository.findOneByOrFail({
      nombre: 'administrador',
    });
    const asociado = await rolRepository.findOneByOrFail({
      nombre: 'asociado',
    });

    const usuario = await crearUsuario('30000001', visitante);
    assert.equal(usuario.rol.nombre, 'visitante');

    usuario.rol = administrador;
    await usuarioRepository.save(usuario);
    assert.equal(
      (await usuarioRepository.findOneByOrFail({ id: usuario.id })).rol.nombre,
      'administrador',
    );

    usuario.rol = asociado;
    await usuarioRepository.save(usuario);
    assert.equal(
      (await usuarioRepository.findOneByOrFail({ id: usuario.id })).rol.nombre,
      'asociado',
    );
  });
});

describe('roles.service', () => {
  test('obtiene usuarios con sus roles', async () => {
    await prepararEscenario();
    const usuarios = await getUsersWithRoles();
    assert.equal(usuarios.length, 3);
    assert.deepEqual(
      new Set(usuarios.map((usuario) => usuario.rol)),
      new Set(['administrador', 'asociado', 'visitante']),
    );
  });

  test('devuelve 404 si el usuario no existe', async () => {
    const escenario = await prepararEscenario();
    const resultado = await updateUserRole({
      usuarioId: 999999,
      nuevoRol: 'asociado',
      actorId: escenario.administradorId,
    });
    assert.equal(resultado.ok, false);
    if (!resultado.ok) assert.equal(resultado.status, 404);
  });

  test('devuelve 404 si el rol no existe', async () => {
    const escenario = await prepararEscenario();
    const resultado = await updateUserRole({
      usuarioId: escenario.visitanteId,
      nuevoRol: 'editor',
      actorId: escenario.administradorId,
    });
    assert.equal(resultado.ok, false);
    if (!resultado.ok) assert.equal(resultado.status, 404);
  });

  test('cambia un rol correctamente', async () => {
    const escenario = await prepararEscenario();
    const resultado = await updateUserRole({
      usuarioId: escenario.visitanteId,
      nuevoRol: 'asociado',
      actorId: escenario.administradorId,
    });
    assert.equal(resultado.ok, true);
  });

  test('impide la auto-democión', async () => {
    const escenario = await prepararEscenario(1);
    const resultado = await updateUserRole({
      usuarioId: escenario.administradorId,
      nuevoRol: 'visitante',
      actorId: escenario.administradorId,
    });
    assert.equal(resultado.ok, false);
    if (!resultado.ok) {
      assert.equal(resultado.status, 400);
      assert.match(resultado.message, /propio rol/);
    }
  });

  test('impide eliminar al último administrador', async () => {
    const escenario = await prepararEscenario();
    const resultado = await updateUserRole({
      usuarioId: escenario.administradorId,
      nuevoRol: 'asociado',
      actorId: 999999,
    });
    assert.equal(resultado.ok, false);
    if (!resultado.ok) {
      assert.equal(resultado.status, 400);
      assert.match(resultado.message, /al menos un administrador/);
    }
  });

  test('permite degradar a otro administrador si queda uno', async () => {
    const escenario = await prepararEscenario(1);
    const otroAdministradorId = escenario.administradoresAdicionalesIds[0]!;
    const resultado = await updateUserRole({
      usuarioId: otroAdministradorId,
      nuevoRol: 'asociado',
      actorId: escenario.administradorId,
    });
    assert.equal(resultado.ok, true);
  });

  test('permite cambios normales de asociado o visitante', async () => {
    const escenario = await prepararEscenario();
    const resultado = await updateUserRole({
      usuarioId: escenario.asociadoId,
      nuevoRol: 'visitante',
      actorId: escenario.administradorId,
    });
    assert.equal(resultado.ok, true);
  });

  test('devuelve el rol anterior y el nuevo', async () => {
    const escenario = await prepararEscenario();
    const resultado = await updateUserRole({
      usuarioId: escenario.visitanteId,
      nuevoRol: 'asociado',
      actorId: escenario.administradorId,
    });
    assert.equal(resultado.ok, true);
    if (resultado.ok) {
      assert.equal(resultado.data.rolAnterior, 'visitante');
      assert.equal(resultado.data.rolNuevo, 'asociado');
    }
  });

  test('confirma rol y auditoría dentro de una operación exitosa', async () => {
    const escenario = await prepararEscenario();
    await updateUserRole({
      usuarioId: escenario.visitanteId,
      nuevoRol: 'asociado',
      actorId: escenario.administradorId,
    });
    const usuario = await dataSource.getRepository(UsuarioModel).findOneByOrFail({
      id: escenario.visitanteId,
    });
    const auditorias = await dataSource.getRepository(HistorialModel).find();
    assert.equal(usuario.rol.nombre, 'asociado');
    assert.equal(auditorias.length, 1);
  });

  test('revierte el rol si falla la auditoría', async () => {
    const escenario = await prepararEscenario();
    await assert.rejects(() =>
      updateUserRole({
        usuarioId: escenario.visitanteId,
        nuevoRol: 'asociado',
        actorId: 999999,
      }),
    );
    const usuario = await dataSource.getRepository(UsuarioModel).findOneByOrFail({
      id: escenario.visitanteId,
    });
    const auditorias = await dataSource.getRepository(HistorialModel).count();
    assert.equal(usuario.rol.nombre, 'visitante');
    assert.equal(auditorias, 0);
  });

  test('una operación rechazada no crea auditoría', async () => {
    const escenario = await prepararEscenario();
    await updateUserRole({
      usuarioId: escenario.administradorId,
      nuevoRol: 'visitante',
      actorId: escenario.administradorId,
    });
    assert.equal(
      await dataSource.getRepository(HistorialModel).count(),
      0,
    );
  });
});

describe('roles.controller', () => {
  test('GET exitoso devuelve 200', async () => {
    await prepararEscenario();
    const captura = crearRespuesta();
    await getUsersRoles({} as Request, captura.response);
    assert.equal(captura.statusCode, 200);
  });

  test('PUT exitoso devuelve 200', async () => {
    const escenario = await prepararEscenario();
    const captura = crearRespuesta();
    const req = {
      params: { id: String(escenario.visitanteId) },
      body: { rol: 'asociado' },
      usuario: { id: escenario.administradorId, nombreUsuario: 'admin', rol: 'administrador' },
    } as unknown as Request;
    await updateRole(req, captura.response);
    assert.equal(captura.statusCode, 200);
  });

  test('ID inválido devuelve 400', async () => {
    const escenario = await prepararEscenario();
    const captura = crearRespuesta();
    const req = {
      params: { id: 'invalido' },
      body: { rol: 'asociado' },
      usuario: { id: escenario.administradorId, nombreUsuario: 'admin', rol: 'administrador' },
    } as unknown as Request;
    await updateRole(req, captura.response);
    assert.equal(captura.statusCode, 400);
  });

  test('usuario inexistente devuelve 404', async () => {
    const escenario = await prepararEscenario();
    const captura = crearRespuesta();
    const req = {
      params: { id: '999999' },
      body: { rol: 'asociado' },
      usuario: { id: escenario.administradorId, nombreUsuario: 'admin', rol: 'administrador' },
    } as unknown as Request;
    await updateRole(req, captura.response);
    assert.equal(captura.statusCode, 404);
  });

  test('rol inexistente devuelve 404', async () => {
    const escenario = await prepararEscenario();
    const captura = crearRespuesta();
    const req = {
      params: { id: String(escenario.visitanteId) },
      body: { rol: 'editor' },
      usuario: { id: escenario.administradorId, nombreUsuario: 'admin', rol: 'administrador' },
    } as unknown as Request;
    await updateRole(req, captura.response);
    assert.equal(captura.statusCode, 404);
  });

  test('error interno devuelve 500', async () => {
    await prepararEscenario();
    const captura = crearRespuesta();
    await dataSource.destroy();
    try {
      await getUsersRoles({} as Request, captura.response);
      assert.equal(captura.statusCode, 500);
    } finally {
      await dataSource.initialize();
    }
  });

  test('auto-democión devuelve 400', async () => {
    const escenario = await prepararEscenario(1);
    const captura = crearRespuesta();
    const req = {
      params: { id: String(escenario.administradorId) },
      body: { rol: 'visitante' },
      usuario: { id: escenario.administradorId, nombreUsuario: 'admin', rol: 'administrador' },
    } as unknown as Request;
    await updateRole(req, captura.response);
    assert.equal(captura.statusCode, 400);
  });

  test('último administrador devuelve 400', async () => {
    const escenario = await prepararEscenario();
    const captura = crearRespuesta();
    const req = {
      params: { id: String(escenario.administradorId) },
      body: { rol: 'visitante' },
      usuario: { id: 999999, nombreUsuario: 'admin_externo', rol: 'administrador' },
    } as unknown as Request;
    await updateRole(req, captura.response);
    assert.equal(captura.statusCode, 400);
  });
});

describe('rutas HTTP de roles', () => {
  test('GET sin token devuelve 401', async () => {
    await prepararEscenario();
    assert.equal((await request('/api/users/roles')).status, 401);
  });

  test('GET con token inválido devuelve 401', async () => {
    await prepararEscenario();
    const resultado = await request('/api/users/roles', {
      headers: { Authorization: 'Bearer token-invalido' },
    });
    assert.equal(resultado.status, 401);
  });

  test('GET con token expirado devuelve 401', async () => {
    const escenario = await prepararEscenario();
    const resultado = await request('/api/users/roles', {
      headers: { Authorization: `Bearer ${token(escenario.administradorId, 'administrador', true)}` },
    });
    assert.equal(resultado.status, 401);
  });

  for (const rol of ['visitante', 'asociado'] as const) {
    test(`GET con token de ${rol} devuelve 403`, async () => {
      const escenario = await prepararEscenario();
      const resultado = await request('/api/users/roles', {
        headers: { Authorization: `Bearer ${token(escenario.visitanteId, rol)}` },
      });
      assert.equal(resultado.status, 403);
    });
  }

  test('GET con token administrador devuelve 200', async () => {
    const escenario = await prepararEscenario();
    const resultado = await request('/api/users/roles', {
      headers: { Authorization: `Bearer ${token(escenario.administradorId, 'administrador')}` },
    });
    assert.equal(resultado.status, 200);
  });

  test('PUT sin token devuelve 401', async () => {
    const escenario = await prepararEscenario();
    const resultado = await request(`/api/users/${escenario.visitanteId}/role`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rol: 'asociado' }),
    });
    assert.equal(resultado.status, 401);
  });

  test('PUT con token inválido devuelve 401', async () => {
    const escenario = await prepararEscenario();
    const resultado = await request(`/api/users/${escenario.visitanteId}/role`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer token-invalido' },
      body: JSON.stringify({ rol: 'asociado' }),
    });
    assert.equal(resultado.status, 401);
  });

  test('PUT con token expirado devuelve 401', async () => {
    const escenario = await prepararEscenario();
    const resultado = await request(`/api/users/${escenario.visitanteId}/role`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token(escenario.administradorId, 'administrador', true)}`,
      },
      body: JSON.stringify({ rol: 'asociado' }),
    });
    assert.equal(resultado.status, 401);
  });

  for (const rol of ['visitante', 'asociado'] as const) {
    test(`PUT con token de ${rol} devuelve 403`, async () => {
      const escenario = await prepararEscenario();
      const resultado = await request(`/api/users/${escenario.visitanteId}/role`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token(escenario.visitanteId, rol)}`,
        },
        body: JSON.stringify({ rol: 'asociado' }),
      });
      assert.equal(resultado.status, 403);
    });
  }

  test('PUT administrador válido devuelve 200', async () => {
    const escenario = await prepararEscenario();
    const resultado = await request(`/api/users/${escenario.visitanteId}/role`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token(escenario.administradorId, 'administrador')}`,
      },
      body: JSON.stringify({ rol: 'asociado' }),
    });
    assert.equal(resultado.status, 200);
  });

  test('PUT de auto-democión devuelve 400', async () => {
    const escenario = await prepararEscenario(1);
    const resultado = await request(`/api/users/${escenario.administradorId}/role`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token(escenario.administradorId, 'administrador')}`,
      },
      body: JSON.stringify({ rol: 'visitante' }),
    });
    assert.equal(resultado.status, 400);
  });

  test('PUT con claim administrador obsoleto no puede modificar al último administrador', async () => {
    const escenario = await prepararEscenario();
    const resultado = await request(`/api/users/${escenario.administradorId}/role`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token(escenario.visitanteId, 'administrador')}`,
      },
      body: JSON.stringify({ rol: 'visitante' }),
    });
    assert.equal(resultado.status, 403);
  });

  test('PUT de usuario inexistente devuelve 404', async () => {
    const escenario = await prepararEscenario();
    const resultado = await request('/api/users/999999/role', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token(escenario.administradorId, 'administrador')}`,
      },
      body: JSON.stringify({ rol: 'visitante' }),
    });
    assert.equal(resultado.status, 404);
  });

  test('PUT de rol inexistente devuelve 404', async () => {
    const escenario = await prepararEscenario();
    const resultado = await request(`/api/users/${escenario.visitanteId}/role`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token(escenario.administradorId, 'administrador')}`,
      },
      body: JSON.stringify({ rol: 'editor' }),
    });
    assert.equal(resultado.status, 404);
  });

  test('un administrador degradado pierde acceso con el mismo JWT', async () => {
    const escenario = await prepararEscenario(1);
    const administradorDegradadoId = escenario.administradoresAdicionalesIds[0]!;
    const jwtAnterior = token(administradorDegradadoId, 'administrador');

    const cambio = await updateUserRole({
      usuarioId: administradorDegradadoId,
      nuevoRol: 'visitante',
      actorId: escenario.administradorId,
    });
    assert.equal(cambio.ok, true);

    const resultado = await request('/api/users/roles', {
      headers: { Authorization: `Bearer ${jwtAnterior}` },
    });
    assert.equal(resultado.status, 403);
  });

  test('un visitante promovido obtiene acceso con el mismo JWT', async () => {
    const escenario = await prepararEscenario();
    const jwtAnterior = token(escenario.visitanteId, 'visitante');

    const cambio = await updateUserRole({
      usuarioId: escenario.visitanteId,
      nuevoRol: 'administrador',
      actorId: escenario.administradorId,
    });
    assert.equal(cambio.ok, true);

    const resultado = await request('/api/users/roles', {
      headers: { Authorization: `Bearer ${jwtAnterior}` },
    });
    assert.equal(resultado.status, 200);
  });

  test('un JWT válido de un usuario eliminado devuelve 401', async () => {
    const escenario = await prepararEscenario();
    const jwtAnterior = token(escenario.visitanteId, 'visitante');
    await dataSource.getRepository(UsuarioModel).delete(escenario.visitanteId);

    const resultado = await request('/api/users/roles', {
      headers: { Authorization: `Bearer ${jwtAnterior}` },
    });
    assert.equal(resultado.status, 401);
    assert.equal(
      resultado.body.message,
      'Usuario autenticado no encontrado',
    );
  });

  test('un error de base de datos durante RBAC devuelve 500', async () => {
    const escenario = await prepararEscenario();
    const jwtAdministrador = token(escenario.administradorId, 'administrador');
    await dataSource.destroy();

    try {
      const resultado = await request('/api/users/roles', {
        headers: { Authorization: `Bearer ${jwtAdministrador}` },
      });
      assert.equal(resultado.status, 500);
      assert.equal(resultado.body.message, 'Error interno del servidor');
    } finally {
      await dataSource.initialize();
    }
  });
});

describe('auditoría de roles', () => {
  test('registra todos los datos después de un cambio HTTP exitoso', async () => {
    const escenario = await prepararEscenario();
    const resultado = await request(`/api/users/${escenario.visitanteId}/role`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token(escenario.administradorId, 'administrador')}`,
      },
      body: JSON.stringify({ rol: 'asociado' }),
    });
    assert.equal(resultado.status, 200);

    const eventos = await dataSource.getRepository(HistorialModel).find();
    assert.equal(eventos.length, 1);
    assert.equal(eventos[0]!.actorId, escenario.administradorId);
    assert.equal(eventos[0]!.usuarioAfectadoId, escenario.visitanteId);
    assert.equal(eventos[0]!.rolAnterior, 'visitante');
    assert.equal(eventos[0]!.rolNuevo, 'asociado');
    assert.ok(eventos[0]!.fechaCambio instanceof Date);
  });

  test('no registra auditoría después de una operación HTTP rechazada', async () => {
    const escenario = await prepararEscenario();
    const resultado = await request(`/api/users/${escenario.administradorId}/role`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token(escenario.administradorId, 'administrador')}`,
      },
      body: JSON.stringify({ rol: 'visitante' }),
    });
    assert.equal(resultado.status, 400);
    assert.equal(await dataSource.getRepository(HistorialModel).count(), 0);
  });
});

describe('concurrencia', () => {
  test('dos degradaciones simultáneas nunca dejan cero administradores', async () => {
    const escenario = await prepararEscenario(1);
    const segundoAdministradorId = escenario.administradoresAdicionalesIds[0]!;

    const resultados = await Promise.all([
      updateUserRole({
        usuarioId: segundoAdministradorId,
        nuevoRol: 'visitante',
        actorId: escenario.administradorId,
      }),
      updateUserRole({
        usuarioId: escenario.administradorId,
        nuevoRol: 'visitante',
        actorId: segundoAdministradorId,
      }),
    ]);

    const administradores = await dataSource
      .getRepository(UsuarioModel)
      .createQueryBuilder('usuario')
      .innerJoin('usuario.rol', 'rol')
      .where('rol.nombre = :nombre', { nombre: 'administrador' })
      .getCount();

    assert.equal(resultados.filter((resultado) => resultado.ok).length, 1);
    assert.equal(administradores, 1);
  });
});
