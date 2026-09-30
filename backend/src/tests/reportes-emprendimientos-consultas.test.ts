import 'reflect-metadata';
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

import { CategoriaEmprendimiento } from '../models/CategoriaEmprendimiento';
import { ConsultaEmprendimiento } from '../models/ConsultaEmprendimiento';
import {
  Emprendimiento,
  EstadoPublicacion,
} from '../models/Emprendimiento';
import type { NombreRol, Rol } from '../models/Rol';
import type { Usuario } from '../models/Usuario';
import type {} from '../middlewares/auth.middleware';
import { errorMiddleware } from '../middlewares/registro.middleware';

config({ path: resolve(process.cwd(), '.env'), quiet: true });

const databaseOriginal = process.env.DB_DATABASE;
const jwtOriginal = process.env.JWT_SECRET;
const databaseTest = `reportes_consultas_${Date.now()}_${process.pid}_${randomBytes(4).toString('hex')}_test`;
const patronBaseTest = /^reportes_consultas_\d+_\d+_[a-f0-9]{8}_test$/;

process.env.DB_DATABASE = databaseTest;
process.env.JWT_SECRET = 'reportes-emprendimientos-consultas-test';

interface RespuestaHttp {
  status: number;
  body: unknown;
  texto: string;
}

let dataSource: DataSource | undefined;
let adminConnection: Connection | undefined;
let baseCreadaPorEsteProceso = false;
let server: Server | undefined;
let baseUrl = '';
let UsuarioModel: typeof import('../models/Usuario').Usuario;
let RolModel: typeof import('../models/Rol').Rol;
let secuencia = 0;

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

const comoObjeto = (valor: unknown): Record<string, unknown> => {
  assert.ok(typeof valor === 'object' && valor !== null && !Array.isArray(valor));
  return valor as Record<string, unknown>;
};

const comoArreglo = (valor: unknown): Record<string, unknown>[] => {
  assert.ok(Array.isArray(valor));
  return valor.map((item) => comoObjeto(item));
};

const solicitar = async (
  path: string,
  token: string,
): Promise<RespuestaHttp> => {
  const respuesta = await fetch(`${baseUrl}${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  const texto = await respuesta.text();

  return {
    status: respuesta.status,
    body: texto.length > 0 ? JSON.parse(texto) as unknown : undefined,
    texto,
  };
};

const crearToken = (usuarioId: number, rol: NombreRol): string =>
  jwt.sign(
    {
      id: usuarioId,
      nombreUsuario: `consultas_reportes_${usuarioId}`,
      rol,
    },
    variableRequerida('JWT_SECRET'),
    { expiresIn: '1h' },
  );

const limpiarBaseTest = async (): Promise<void> => {
  const conexion = await exigirConexionAislada();
  await conexion.query('DELETE FROM consultas_emprendimientos');
  await conexion.query('DELETE FROM reportes');
  await conexion.query('DELETE FROM emprendimientos');
  await conexion.query('DELETE FROM categorias_emprendimientos');
  await conexion.query('DELETE FROM usuarios');
  await conexion.query('DELETE FROM roles');
  await conexion.query('DELETE FROM token_blacklist');
  secuencia = 0;
};

const inicializarRoles = async (): Promise<void> => {
  const conexion = await exigirConexionAislada();
  await conexion.getRepository(RolModel).save([
    { nombre: 'administrador', descripcion: 'Administrador de prueba' },
    { nombre: 'asociado', descripcion: 'Asociado de prueba' },
    { nombre: 'visitante', descripcion: 'Visitante de prueba' },
  ] as Rol[]);
};

const crearUsuario = async (rol: NombreRol): Promise<Usuario> => {
  const conexion = await exigirConexionAislada();
  secuencia += 1;
  const rolEntidad = await conexion.getRepository(RolModel).findOneByOrFail({
    nombre: rol,
  });

  return conexion.getRepository(UsuarioModel).save(
    conexion.getRepository(UsuarioModel).create({
      nombreUsuario: `consulta_reporte_usuario_${secuencia}`,
      nombre: 'Usuario Consulta',
      apellidos: `Reporte ${secuencia}`,
      correo: `consulta.reporte.${secuencia}@test.local`,
      telefono: `8722${String(secuencia).padStart(4, '0')}`,
      contraseña: 'hash-no-utilizado',
      rol: rolEntidad,
    } as Partial<Usuario>),
  );
};

const crearCategoria = async (
  nombre: string,
): Promise<CategoriaEmprendimiento> => {
  const conexion = await exigirConexionAislada();
  return conexion.getRepository(CategoriaEmprendimiento).save(
    new CategoriaEmprendimiento({
      nombre,
      descripcion: 'Categoria controlada para consultas.',
    }),
  );
};

const crearEmprendimiento = async (
  nombre: string,
  categoria: CategoriaEmprendimiento,
  estadoPublicacion = EstadoPublicacion.PUBLICADO,
  fechaCreacion = '2020-01-10 09:00:00',
): Promise<Emprendimiento> => {
  const conexion = await exigirConexionAislada();
  const emprendimiento = await conexion.getRepository(Emprendimiento).save(
    conexion.getRepository(Emprendimiento).create({
      nombre,
      descripcion: 'Fixture controlado para consultas de reportes.',
      categoria,
      estadoPublicacion,
    }),
  );

  await conexion.query(
    'UPDATE emprendimientos SET fecha_creacion = ?, fecha_actualizacion = ? WHERE id = ?',
    [fechaCreacion, fechaCreacion, emprendimiento.id],
  );

  return emprendimiento;
};

const registrarConsulta = async (
  emprendimiento: Emprendimiento,
  fechaConsulta: string,
): Promise<ConsultaEmprendimiento> => {
  const conexion = await exigirConexionAislada();
  const consulta = await conexion.getRepository(ConsultaEmprendimiento).save(
    conexion.getRepository(ConsultaEmprendimiento).create({
      emprendimientoId: emprendimiento.id,
      usuarioId: null,
    }),
  );

  await conexion.query(
    'UPDATE consultas_emprendimientos SET fecha_consulta = ? WHERE id = ?',
    [fechaConsulta, consulta.id],
  );

  return consulta;
};

const rankingIds = (body: Record<string, unknown>): number[] =>
  comoArreglo(body.emprendimientosMasConsultados).map((item) =>
    Number(item.emprendimientoId),
  );

before(async () => {
  exigirNombreAislado(process.env.DB_DATABASE);
  adminConnection = await mysql.createConnection({
    host: variableRequerida('DB_HOST'),
    port: Number(variableRequerida('DB_PORT')),
    user: variableRequerida('DB_USERNAME'),
    password: variableRequerida('DB_PASSWORD'),
  });
  await adminConnection.query(`CREATE DATABASE \`${databaseTest}\``);
  baseCreadaPorEsteProceso = true;

  const dataSourceModule = await import('../data-source');
  const usuarioModule = await import('../models/Usuario');
  const rolModule = await import('../models/Rol');
  const reportesEmprendimientosRoutes = await import(
    '../modulos/Administración de emprendimientos/ReporteEstadistica/ReportesEmprendimientosRoutes'
  );

  dataSource = dataSourceModule.AppDataSource;
  UsuarioModel = usuarioModule.Usuario;
  RolModel = rolModule.Rol;
  exigirNombreAislado((dataSource.options as { database?: string }).database);
  assert.equal(dataSource.options.synchronize, false);
  await dataSource.initialize();
  await exigirConexionAislada();
  await dataSource.runMigrations();

  const app = express();
  app.use(express.json());
  app.use('/api/reportes', reportesEmprendimientosRoutes.default);
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

describe('Task 4055 fase 2 - emprendimientos mas consultados', () => {
  test('devuelve totalConsultas y ranking ordenado por cantidad y nombre', async () => {
    const admin = await crearUsuario('administrador');
    const categoria = await crearCategoria('Categoria consultas ranking');
    const lider = await crearEmprendimiento('Gamma consultas', categoria);
    const empateA = await crearEmprendimiento('Alpha consultas', categoria);
    const empateB = await crearEmprendimiento('Beta consultas', categoria);

    await registrarConsulta(lider, '2020-01-10 09:00:00');
    await registrarConsulta(lider, '2020-01-10 10:00:00');
    await registrarConsulta(lider, '2020-01-10 11:00:00');
    await registrarConsulta(empateA, '2020-01-11 09:00:00');
    await registrarConsulta(empateA, '2020-01-11 10:00:00');
    await registrarConsulta(empateB, '2020-01-12 09:00:00');
    await registrarConsulta(empateB, '2020-01-12 10:00:00');

    const respuesta = await solicitar(
      '/api/reportes/estadisticas/emprendimientos?periodo=personalizado&fechaInicio=2020-01-01&fechaFin=2020-01-31',
      crearToken(admin.id, 'administrador'),
    );

    assert.equal(respuesta.status, 200, respuesta.texto);
    const body = comoObjeto(respuesta.body);
    const ranking = comoArreglo(body.emprendimientosMasConsultados);

    assert.equal(body.totalConsultas, 7);
    assert.deepEqual(rankingIds(body), [
      lider.id,
      empateA.id,
      empateB.id,
    ]);
    const primero = ranking[0];
    const segundo = ranking[1];
    const tercero = ranking[2];
    assert.ok(primero);
    assert.ok(segundo);
    assert.ok(tercero);
    assert.equal(primero.nombre, lider.nombre);
    assert.equal(primero.cantidadConsultas, 3);
    assert.equal(segundo.nombre, empateA.nombre);
    assert.equal(segundo.cantidadConsultas, 2);
    assert.equal(tercero.nombre, empateB.nombre);
    assert.equal(tercero.cantidadConsultas, 2);
  });

  test('filtra por periodo usando fechaConsulta y no fechaCreacion del emprendimiento', async () => {
    const admin = await crearUsuario('administrador');
    const categoria = await crearCategoria('Categoria consultas periodo');
    const emprendimiento = await crearEmprendimiento(
      'Consulta con creacion fuera de rango',
      categoria,
      EstadoPublicacion.PUBLICADO,
      '2019-01-10 09:00:00',
    );

    await registrarConsulta(emprendimiento, '2020-01-15 09:00:00');
    await registrarConsulta(emprendimiento, '2020-03-15 09:00:00');

    const respuesta = await solicitar(
      '/api/reportes/estadisticas/emprendimientos?periodo=personalizado&fechaInicio=2020-01-01&fechaFin=2020-01-31',
      crearToken(admin.id, 'administrador'),
    );

    assert.equal(respuesta.status, 200, respuesta.texto);
    const body = comoObjeto(respuesta.body);
    const ranking = comoArreglo(body.emprendimientosMasConsultados);

    assert.equal(body.totalConsultas, 1);
    assert.equal(ranking.length, 1);
    const primero = ranking[0];
    assert.ok(primero);
    assert.equal(primero.emprendimientoId, emprendimiento.id);
    assert.equal(primero.cantidadConsultas, 1);
  });

  test('filtra consultas por categoria', async () => {
    const admin = await crearUsuario('administrador');
    const objetivo = await crearCategoria('Categoria consultas objetivo');
    const excluida = await crearCategoria('Categoria consultas excluida');
    const incluido = await crearEmprendimiento('Consulta categoria incluida', objetivo);
    const fuera = await crearEmprendimiento('Consulta categoria fuera', excluida);

    await registrarConsulta(incluido, '2020-01-10 09:00:00');
    await registrarConsulta(incluido, '2020-01-10 10:00:00');
    await registrarConsulta(fuera, '2020-01-10 11:00:00');

    const respuesta = await solicitar(
      `/api/reportes/estadisticas/emprendimientos?periodo=personalizado&fechaInicio=2020-01-01&fechaFin=2020-01-31&categoriaId=${objetivo.id}`,
      crearToken(admin.id, 'administrador'),
    );

    assert.equal(respuesta.status, 200, respuesta.texto);
    const body = comoObjeto(respuesta.body);

    assert.equal(body.totalConsultas, 2);
    assert.deepEqual(rankingIds(body), [incluido.id]);
  });

  test('filtra consultas por emprendimiento y devuelve vacio si no tiene consultas', async () => {
    const admin = await crearUsuario('administrador');
    const categoria = await crearCategoria('Categoria consultas emprendimiento');
    const objetivo = await crearEmprendimiento('Consulta objetivo sin visitas', categoria);
    const fuera = await crearEmprendimiento('Consulta fuera con visitas', categoria);

    await registrarConsulta(fuera, '2020-01-10 09:00:00');

    const respuesta = await solicitar(
      `/api/reportes/estadisticas/emprendimientos?periodo=personalizado&fechaInicio=2020-01-01&fechaFin=2020-01-31&emprendimientoId=${objetivo.id}`,
      crearToken(admin.id, 'administrador'),
    );

    assert.equal(respuesta.status, 200, respuesta.texto);
    const body = comoObjeto(respuesta.body);

    assert.equal(body.totalConsultas, 0);
    assert.deepEqual(comoArreglo(body.emprendimientosMasConsultados), []);
  });

  test('combina periodo, categoria y emprendimiento sobre consultas', async () => {
    const admin = await crearUsuario('administrador');
    const categoriaObjetivo = await crearCategoria('Categoria consultas combinada');
    const categoriaExcluida = await crearCategoria('Categoria consultas combinada fuera');
    const objetivo = await crearEmprendimiento('Consulta combinada objetivo', categoriaObjetivo);
    const mismaCategoria = await crearEmprendimiento('Consulta combinada misma categoria', categoriaObjetivo);
    const otraCategoria = await crearEmprendimiento('Consulta combinada otra categoria', categoriaExcluida);

    await registrarConsulta(objetivo, '2020-01-10 09:00:00');
    await registrarConsulta(objetivo, '2020-02-10 09:00:00');
    await registrarConsulta(mismaCategoria, '2020-01-10 09:00:00');
    await registrarConsulta(otraCategoria, '2020-01-10 09:00:00');

    const respuesta = await solicitar(
      `/api/reportes/estadisticas/emprendimientos?periodo=personalizado&fechaInicio=2020-01-01&fechaFin=2020-01-31&categoriaId=${categoriaObjetivo.id}&emprendimientoId=${objetivo.id}`,
      crearToken(admin.id, 'administrador'),
    );

    assert.equal(respuesta.status, 200, respuesta.texto);
    const body = comoObjeto(respuesta.body);
    const ranking = comoArreglo(body.emprendimientosMasConsultados);

    assert.equal(body.totalConsultas, 1);
    assert.equal(ranking.length, 1);
    const primero = ranking[0];
    assert.ok(primero);
    assert.equal(primero.emprendimientoId, objetivo.id);
    assert.equal(primero.cantidadConsultas, 1);
  });

  test('mantiene las estadisticas existentes del reporte de emprendimientos', async () => {
    const admin = await crearUsuario('administrador');
    const gastronomia = await crearCategoria('Categoria consultas gastronomia');
    const senderismo = await crearCategoria('Categoria consultas senderismo');
    const publicado = await crearEmprendimiento(
      'Consulta estado publicado',
      gastronomia,
      EstadoPublicacion.PUBLICADO,
    );

    await crearEmprendimiento(
      'Consulta estado borrador',
      gastronomia,
      EstadoPublicacion.BORRADOR,
    );
    await crearEmprendimiento(
      'Consulta estado no publicado',
      gastronomia,
      EstadoPublicacion.NO_PUBLICADO,
    );
    await crearEmprendimiento(
      'Consulta estado desactivado',
      senderismo,
      EstadoPublicacion.DESACTIVADO,
    );
    await registrarConsulta(publicado, '2020-01-10 09:00:00');

    const respuesta = await solicitar(
      '/api/reportes/estadisticas/emprendimientos?periodo=personalizado&fechaInicio=2020-01-01&fechaFin=2020-01-31',
      crearToken(admin.id, 'administrador'),
    );

    assert.equal(respuesta.status, 200, respuesta.texto);
    const body = comoObjeto(respuesta.body);
    const categorias = comoArreglo(body.categorias);

    assert.equal(body.total, 4);
    assert.equal(body.publicados, 1);
    assert.equal(body.borradores, 1);
    assert.equal(body.noPublicados, 1);
    assert.equal(body.desactivados, 1);
    const categoriaPrincipal = categorias[0];
    assert.ok(categoriaPrincipal);
    assert.equal(categoriaPrincipal.nombre, gastronomia.nombre);
    assert.equal(categoriaPrincipal.cantidad, 3);
    assert.equal(body.totalConsultas, 1);
    assert.deepEqual(rankingIds(body), [publicado.id]);
  });
});
