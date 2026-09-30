import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { resolve } from 'node:path';
import { after, before, beforeEach, describe, test } from 'node:test';
import { config } from 'dotenv';
import express from 'express';
import jwt from 'jsonwebtoken';
import mysql from 'mysql2/promise';
import type { Connection } from 'mysql2/promise';
import type { DataSource } from 'typeorm';

import { errorMiddleware } from '../middlewares/registro.middleware';
import type { NombreRol } from '../models/Rol';

config({ path: resolve(process.cwd(), '.env'), quiet: true });

const databaseOriginal = process.env.DB_DATABASE;
const jwtOriginal = process.env.JWT_SECRET;
const databaseTest = `consultas_empr_${Date.now()}_${process.pid}_${randomBytes(4).toString('hex')}_test`;
const patronBaseTest = /^consultas_empr_\d+_\d+_[a-f0-9]{8}_test$/;

process.env.DB_DATABASE = databaseTest;
process.env.JWT_SECRET = 'consultas-emprendimientos-test';

let dataSource: DataSource | undefined;
let adminConnection: Connection | undefined;
let baseCreadaPorEsteProceso = false;
let server: Server | undefined;
let baseUrl = '';
let RolModel: typeof import('../models/Rol').Rol;
let UsuarioModel: typeof import('../models/Usuario').Usuario;
let CategoriaModel: typeof import('../models/CategoriaEmprendimiento').CategoriaEmprendimiento;
let EmprendimientoModel: typeof import('../models/Emprendimiento').Emprendimiento;
let EstadoPublicacionModel: typeof import('../models/Emprendimiento').EstadoPublicacion;
let ConsultaModel: typeof import('../models/ConsultaEmprendimiento').ConsultaEmprendimiento;
let secuencia = 0;

interface RespuestaHttp {
  status: number;
  body: unknown;
}

const variableRequerida = (nombre: string): string => {
  const valor = process.env[nombre];
  if (!valor) throw new Error(`Falta la variable requerida ${nombre}`);
  return valor;
};

const exigirNombreAislado = (nombre: unknown): void => {
  assert.ok(patronBaseTest.test(databaseTest) && databaseTest.length <= 64);
  assert.notEqual(databaseTest, databaseOriginal);
  assert.equal(nombre, databaseTest);
};

const exigirConexionAislada = async (): Promise<DataSource> => {
  assert.ok(baseCreadaPorEsteProceso);
  assert.ok(dataSource?.isInitialized);
  exigirNombreAislado((dataSource.options as { database?: string }).database);
  const bases: Array<{ databaseActual: string }> = await dataSource.query(
    'SELECT DATABASE() AS databaseActual',
  );
  exigirNombreAislado(bases[0]?.databaseActual);
  return dataSource;
};

const solicitar = async (
  path: string,
  options: RequestInit = {},
): Promise<RespuestaHttp> => {
  const response = await fetch(`${baseUrl}${path}`, options);
  const texto = await response.text();

  return {
    status: response.status,
    body: texto ? (JSON.parse(texto) as unknown) : undefined,
  };
};

const tokenPara = (usuarioId: number, rol: NombreRol): string =>
  jwt.sign(
    {
      id: usuarioId,
      nombreUsuario: `usuario_${usuarioId}`,
      rol,
    },
    variableRequerida('JWT_SECRET'),
    { expiresIn: '1h' },
  );

const encabezadosJson = (token?: string): Record<string, string> => ({
  'Content-Type': 'application/json',
  ...(token ? { Authorization: `Bearer ${token}` } : {}),
});

const limpiarBaseTest = async (): Promise<void> => {
  const conexion = await exigirConexionAislada();
  await conexion.query('DELETE FROM consultas_emprendimientos');
  await conexion.query('DELETE FROM emprendimiento_imagenes');
  await conexion.query('DELETE FROM emprendimientos');
  await conexion.query('DELETE FROM categorias_emprendimientos');
  await conexion.query('DELETE FROM historial_cambio_roles');
  await conexion.query('DELETE FROM login_attempts');
  await conexion.query('DELETE FROM intentos_acceso');
  await conexion.query('DELETE FROM audit_logs');
  await conexion.query('DELETE FROM token_blacklist');
  await conexion.query('DELETE FROM recuperacion_contrasenas');
  await conexion.query('DELETE FROM usuarios');
  await conexion.query('DELETE FROM roles');
};

const inicializarRoles = async (): Promise<void> => {
  const conexion = await exigirConexionAislada();
  await conexion.getRepository(RolModel).save([
    { nombre: 'administrador', descripcion: 'Administrador' },
    { nombre: 'asociado', descripcion: 'Asociado' },
    { nombre: 'visitante', descripcion: 'Visitante' },
  ]);
};

const crearUsuario = async (
  rol: NombreRol,
): Promise<InstanceType<typeof UsuarioModel>> => {
  secuencia += 1;
  const conexion = await exigirConexionAislada();
  const rolEntidad = await conexion.getRepository(RolModel).findOneByOrFail({
    nombre: rol,
  });

  return conexion.getRepository(UsuarioModel).save(
    conexion.getRepository(UsuarioModel).create({
      nombreUsuario: `consulta_empr_${rol}_${secuencia}`,
      nombre: 'Usuario',
      apellidos: `Consulta ${secuencia}`,
      correo: `consulta.empr.${rol}.${secuencia}@test.local`,
      telefono: `8700${String(secuencia).padStart(4, '0')}`,
      contraseña: 'hash-test',
      rol: rolEntidad,
    }),
  );
};

const crearCategoria = async () => {
  secuencia += 1;
  const conexion = await exigirConexionAislada();

  return conexion.getRepository(CategoriaModel).save(
    conexion.getRepository(CategoriaModel).create({
      nombre: `Categoria consulta ${secuencia}`,
      descripcion: 'Categoria para consultas de emprendimientos.',
    }),
  );
};

const crearEmprendimiento = async (
  estado = EstadoPublicacionModel.PUBLICADO,
) => {
  secuencia += 1;
  const conexion = await exigirConexionAislada();
  const categoria = await crearCategoria();

  return conexion.getRepository(EmprendimientoModel).save(
    conexion.getRepository(EmprendimientoModel).create({
      nombre: `Emprendimiento consulta ${secuencia}`,
      descripcion: 'Fixture de consulta de emprendimiento.',
      categoria,
      direccion: 'Direccion consulta',
      provincia: 'Guanacaste',
      canton: 'Santa Cruz',
      distrito: 'Santa Cruz',
      latitud: 10.12345678,
      longitud: -85.12345678,
      correoElectronico: `empr.consulta.${secuencia}@test.local`,
      telefono: '+50681112222',
      estadoPublicacion: estado,
      fechaPublicacion:
        estado === EstadoPublicacionModel.PUBLICADO ? new Date() : null,
    }),
  );
};

const contarConsultas = async (): Promise<number> => {
  const conexion = await exigirConexionAislada();
  return conexion.getRepository(ConsultaModel).count();
};

const snapshotEmprendimiento = async (id: number) => {
  const conexion = await exigirConexionAislada();
  return conexion.getRepository(EmprendimientoModel).findOneByOrFail({
    id,
  });
};

const snapshotUsuario = async (id: number) => {
  const conexion = await exigirConexionAislada();
  return conexion.getRepository(UsuarioModel).findOneByOrFail({
    id,
  });
};

before(async () => {
  adminConnection = await mysql.createConnection({
    host: variableRequerida('DB_HOST'),
    port: Number(variableRequerida('DB_PORT')),
    user: variableRequerida('DB_USERNAME'),
    password: variableRequerida('DB_PASSWORD'),
    multipleStatements: false,
  });

  exigirNombreAislado(databaseTest);
  await adminConnection.query(`CREATE DATABASE \`${databaseTest}\``);
  baseCreadaPorEsteProceso = true;

  const dataSourceModule = await import('../data-source');
  const routeModule = await import(
    '../modulos/Administración de emprendimientos/Registro de emprendimientos/emprendimiento.routes'
  );
  const rolModule = await import('../models/Rol');
  const usuarioModule = await import('../models/Usuario');
  const categoriaModule = await import('../models/CategoriaEmprendimiento');
  const emprendimientoModule = await import('../models/Emprendimiento');
  const consultaModule = await import('../models/ConsultaEmprendimiento');

  dataSource = dataSourceModule.AppDataSource;
  RolModel = rolModule.Rol;
  UsuarioModel = usuarioModule.Usuario;
  CategoriaModel = categoriaModule.CategoriaEmprendimiento;
  EmprendimientoModel = emprendimientoModule.Emprendimiento;
  EstadoPublicacionModel = emprendimientoModule.EstadoPublicacion;
  ConsultaModel = consultaModule.ConsultaEmprendimiento;

  await dataSource.initialize();
  await exigirConexionAislada();
  await dataSource.runMigrations();

  const app = express();
  app.use(express.json());
  app.use('/api/emprendimientos', routeModule.default);
  app.use(errorMiddleware);

  await new Promise<void>((resolveListen, rejectListen) => {
    server = app.listen(0, '127.0.0.1', (error?: Error) => {
      if (error) rejectListen(error);
      else resolveListen();
    });
  });

  baseUrl = `http://127.0.0.1:${(server!.address() as AddressInfo).port}`;
});

beforeEach(async () => {
  await limpiarBaseTest();
  await inicializarRoles();
});

after(async () => {
  try {
    if (server) {
      await new Promise<void>((resolveClose, rejectClose) => {
        server?.close((error) =>
          error ? rejectClose(error) : resolveClose(),
        );
      });
    }

    if (dataSource?.isInitialized) {
      await exigirConexionAislada();
      await dataSource.destroy();
    }

    if (baseCreadaPorEsteProceso && adminConnection) {
      exigirNombreAislado(databaseTest);
      await adminConnection.query(`DROP DATABASE \`${databaseTest}\``);
      baseCreadaPorEsteProceso = false;
    }
  } finally {
    await adminConnection?.end();
    if (databaseOriginal === undefined) delete process.env.DB_DATABASE;
    else process.env.DB_DATABASE = databaseOriginal;
    if (jwtOriginal === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = jwtOriginal;
  }
});

describe('Task 4055 fase 1 - registro de consultas de emprendimientos', () => {
  test('registra consulta anonima de emprendimiento publicado con fecha y usuario null', async () => {
    const emprendimiento = await crearEmprendimiento();

    const respuesta = await solicitar(
      `/api/emprendimientos/${emprendimiento.id}/consulta`,
      {
        method: 'POST',
        headers: encabezadosJson(),
      },
    );

    assert.equal(respuesta.status, 201);
    assert.equal(await contarConsultas(), 1);

    const conexion = await exigirConexionAislada();
    const consulta = await conexion.getRepository(ConsultaModel).findOneByOrFail({
      emprendimientoId: emprendimiento.id,
    });

    assert.equal(consulta.usuarioId, null);
    assert.ok(consulta.fechaConsulta instanceof Date);
  });

  test('registra consulta autenticada con usuarioId', async () => {
    const usuario = await crearUsuario('visitante');
    const emprendimiento = await crearEmprendimiento();

    const respuesta = await solicitar(
      `/api/emprendimientos/${emprendimiento.id}/consulta`,
      {
        method: 'POST',
        headers: encabezadosJson(tokenPara(usuario.id, 'visitante')),
      },
    );

    assert.equal(respuesta.status, 201);

    const conexion = await exigirConexionAislada();
    const consulta = await conexion.getRepository(ConsultaModel).findOneByOrFail({
      emprendimientoId: emprendimiento.id,
    });

    assert.equal(consulta.usuarioId, usuario.id);
  });

  test('rechaza emprendimiento inexistente y no registra consulta', async () => {
    const respuesta = await solicitar('/api/emprendimientos/999999/consulta', {
      method: 'POST',
      headers: encabezadosJson(),
    });

    assert.equal(respuesta.status, 404);
    assert.equal(await contarConsultas(), 0);
  });

  test('rechaza emprendimiento no publicado y no registra consulta', async () => {
    const emprendimiento = await crearEmprendimiento(
      EstadoPublicacionModel.BORRADOR,
    );

    const respuesta = await solicitar(
      `/api/emprendimientos/${emprendimiento.id}/consulta`,
      {
        method: 'POST',
        headers: encabezadosJson(),
      },
    );

    assert.equal(respuesta.status, 404);
    assert.equal(await contarConsultas(), 0);
  });

  test('registrar consulta no modifica emprendimiento ni usuario', async () => {
    const usuario = await crearUsuario('visitante');
    const emprendimiento = await crearEmprendimiento();
    const emprendimientoAntes = await snapshotEmprendimiento(emprendimiento.id);
    const usuarioAntes = await snapshotUsuario(usuario.id);

    const respuesta = await solicitar(
      `/api/emprendimientos/${emprendimiento.id}/consulta`,
      {
        method: 'POST',
        headers: encabezadosJson(tokenPara(usuario.id, 'visitante')),
      },
    );

    assert.equal(respuesta.status, 201);
    assert.equal(await contarConsultas(), 1);

    const emprendimientoDespues = await snapshotEmprendimiento(emprendimiento.id);
    const usuarioDespues = await snapshotUsuario(usuario.id);

    assert.deepEqual(
      {
        nombre: emprendimientoDespues.nombre,
        estadoPublicacion: emprendimientoDespues.estadoPublicacion,
        fechaActualizacion: emprendimientoDespues.fechaActualizacion.toISOString(),
      },
      {
        nombre: emprendimientoAntes.nombre,
        estadoPublicacion: emprendimientoAntes.estadoPublicacion,
        fechaActualizacion: emprendimientoAntes.fechaActualizacion.toISOString(),
      },
    );
    assert.deepEqual(
      {
        nombreUsuario: usuarioDespues.nombreUsuario,
        correo: usuarioDespues.correo,
        updatedAt: usuarioDespues.updatedAt.toISOString(),
      },
      {
        nombreUsuario: usuarioAntes.nombreUsuario,
        correo: usuarioAntes.correo,
        updatedAt: usuarioAntes.updatedAt.toISOString(),
      },
    );
  });

  test('GET de detalle sigue siendo lectura y el POST registra exactamente una consulta', async () => {
    const emprendimiento = await crearEmprendimiento();

    const detalle = await solicitar(
      `/api/emprendimientos/catalogo/${emprendimiento.id}`,
      { method: 'GET' },
    );

    assert.equal(detalle.status, 200);
    assert.equal(await contarConsultas(), 0);

    const registro = await solicitar(
      `/api/emprendimientos/${emprendimiento.id}/consulta`,
      {
        method: 'POST',
        headers: encabezadosJson(),
      },
    );

    assert.equal(registro.status, 201);
    assert.equal(await contarConsultas(), 1);
  });
});
