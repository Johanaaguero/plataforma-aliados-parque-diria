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

import type { NombreRol, Rol } from '../models/Rol';
import type { Usuario } from '../models/Usuario';
import type {} from '../middlewares/auth.middleware';
import { errorMiddleware } from '../middlewares/registro.middleware';

config({ path: resolve(process.cwd(), '.env'), quiet: true });

const REPORTE_VISITAS_BLOQUEADO = {
  estado: 'BLOQUEADO',
  motivo: 'No existe reporte de visitas en Reportes y Estadisticas',
};

const databaseOriginal = process.env.DB_DATABASE;
const jwtOriginal = process.env.JWT_SECRET;
const databaseTest = `reportes_mensajes_${Date.now()}_${process.pid}_${randomBytes(4).toString('hex')}_test`;
const patronBaseTest = /^reportes_mensajes_\d+_\d+_[a-f0-9]{8}_test$/;
process.env.DB_DATABASE = databaseTest;
process.env.JWT_SECRET = 'reportes-estadisticas-mensajes-carga-test';

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
  assert.equal(nombre, databaseTest, 'La conexion debe apuntar a la base aislada de esta ejecucion');
};

const exigirConexionAislada = async (): Promise<DataSource> => {
  assert.ok(baseCreadaPorEsteProceso, 'La base debe haber sido creada por esta ejecucion');
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

const assertArregloVacio = (valor: unknown): void => {
  assert.ok(Array.isArray(valor));
  assert.deepEqual(valor, []);
};

const assertObjetoConCeros = (valor: unknown): void => {
  const objeto = comoObjeto(valor);
  for (const cantidad of Object.values(objeto)) {
    assert.equal(cantidad, 0);
  }
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
      nombreUsuario: `mensajes_reportes_${usuarioId}`,
      rol,
    },
    variableRequerida('JWT_SECRET'),
    { expiresIn: '1h' },
  );

const limpiarBaseTest = async (): Promise<void> => {
  const conexion = await exigirConexionAislada();
  await conexion.query('DELETE FROM reportes');
  await conexion.query('DELETE FROM reservas');
  await conexion.query('DELETE FROM incidencias');
  await conexion.query('DELETE FROM emprendimientos');
  await conexion.query('DELETE FROM categorias_emprendimientos');
  await conexion.query('DELETE FROM eventos_capacitaciones');
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
      nombreUsuario: `mensajes_usuario_${secuencia}`,
      nombre: 'Usuario Mensajes',
      apellidos: `Reporte ${secuencia}`,
      correo: `mensajes.reportes.${secuencia}@test.local`,
      telefono: `8766${String(secuencia).padStart(4, '0')}`,
      contraseña: 'hash-no-utilizado',
      rol: rolEntidad,
    } as Partial<Usuario>),
  );
};

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
  const reportesReservasRoutes = await import(
    '../modulos/Gestión de Eventos y Capacitaciones/Inscripción a Eventos y Capacitaciones/ReporteEstadistica/ReportesReservasRoutes'
  );
  const reportesEventosRoutes = await import(
    '../modulos/Gestión de Eventos y Capacitaciones/ReporteEventosCapacitaciones/ReportesEvenCapRoutes'
  );
  const reportesIncidenciasRoutes = await import(
    '../modulos/Gestión de Incidencias/ReporteIncidencia/ReportesIncidenciasRoute'
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
  app.use('/api/reportes/reservas', reportesReservasRoutes.default);
  app.use('/api/reportes/eventos', reportesEventosRoutes.default);
  app.use('/api/reportes/estadisticas/incidencias', reportesIncidenciasRoutes.default);
  app.use(errorMiddleware);
  await new Promise<void>((resolveListen, rejectListen) => {
    server = app.listen(0, '127.0.0.1', (error?: Error) => {
      if (error) rejectListen(error);
      else resolveListen();
    });
  });
  assert.ok(server);
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

beforeEach(async () => {
  await limpiarBaseTest();
  await inicializarRoles();
});

after(async () => {
  try {
    if (server) {
      await new Promise<void>((resolveClose, rejectClose) => {
        server?.close((error) => error ? rejectClose(error) : resolveClose());
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

describe('Task 4076 - mensajes y carga de la vista de reportes estadisticos', () => {
  test('reservas responde estructura valida sin resultados', async () => {
    const admin = await crearUsuario('administrador');
    const respuesta = await solicitar(
      '/api/reportes/reservas/estadisticas/reservas?fechaInicio=2020-05-01&fechaFin=2020-05-31',
      crearToken(admin.id, 'administrador'),
    );

    assert.equal(respuesta.status, 200, respuesta.texto);
    const body = comoObjeto(respuesta.body);
    assert.ok(body.reporte);
    assert.ok(body.periodo);
    assert.ok(body.filtros);
    assert.equal(body.totalReservas, 0);
    assertArregloVacio(body.reservasPorMes);
    assertArregloVacio(body.detalleReservas);
    assert.equal(body.mesConMasReservas, null);
    assertObjetoConCeros(body.reservasPorEstado);
    assertObjetoConCeros(body.reservasPorTipo);
    assertObjetoConCeros(body.reservasPorTemporada);
  });

  test('emprendimientos responde estructura valida sin resultados', async () => {
    const admin = await crearUsuario('administrador');
    const respuesta = await solicitar(
      '/api/reportes/estadisticas/emprendimientos?periodo=personalizado&fechaInicio=2020-05-01&fechaFin=2020-05-31&emprendimientoId=999999',
      crearToken(admin.id, 'administrador'),
    );

    assert.equal(respuesta.status, 200, respuesta.texto);
    const body = comoObjeto(respuesta.body);
    assert.equal(body.periodo, 'personalizado');
    assert.equal(body.fechaInicio, '2020-05-01');
    assert.equal(body.fechaFin, '2020-05-31');
    assert.equal(body.total, 0);
    assert.equal(body.publicados, 0);
    assert.equal(body.borradores, 0);
    assert.equal(body.noPublicados, 0);
    assert.equal(body.desactivados, 0);
    assertArregloVacio(body.categorias);
    assertArregloVacio(body.emprendimientos);
  });

  test('actividades y eventos responde estructura valida sin resultados', async () => {
    const admin = await crearUsuario('administrador');
    const respuesta = await solicitar(
      '/api/reportes/eventos/estadisticas/eventos?fechaInicio=2020-05-01&fechaFin=2020-05-31',
      crearToken(admin.id, 'administrador'),
    );

    assert.equal(respuesta.status, 200, respuesta.texto);
    const body = comoObjeto(respuesta.body);
    assert.ok(body.reporte);
    assert.ok(body.periodo);
    assert.ok(body.filtros);
    assert.equal(body.totalActividades, 0);
    assertArregloVacio(body.actividadesPorMes);
    assertArregloVacio(body.detalleActividades);
    assert.equal(body.mesConMasActividades, null);
    assertObjetoConCeros(body.actividadesPorTipo);
    assertObjetoConCeros(body.actividadesPorEstado);
    assertObjetoConCeros(body.actividadesPorTemporada);
  });

  test('incidencias responde estructura valida sin resultados', async () => {
    const admin = await crearUsuario('administrador');
    const respuesta = await solicitar(
      '/api/reportes/estadisticas/incidencias?fechaInicio=2020-05-01&fechaFin=2020-05-31&categoria=seguridad&prioridad=alta&estado=resuelta',
      crearToken(admin.id, 'administrador'),
    );

    assert.equal(respuesta.status, 200, respuesta.texto);
    const body = comoObjeto(respuesta.body);
    assert.ok(body.reporte);
    assert.ok(body.periodo);
    assert.ok(body.filtros);
    assert.equal(body.totalIncidencias, 0);
    assertArregloVacio(body.incidenciasPorMes);
    assertArregloVacio(body.detalleIncidencias);
    assert.equal(body.mesConMasIncidencias, null);
    assertObjetoConCeros(body.incidenciasPorCategoria);
    assertObjetoConCeros(body.incidenciasPorPrioridad);
    assertObjetoConCeros(body.incidenciasPorEstado);
  });

  test('documenta que mensajes y carga de visitas quedan bloqueados', () => {
    assert.deepEqual(REPORTE_VISITAS_BLOQUEADO, {
      estado: 'BLOQUEADO',
      motivo: 'No existe reporte de visitas en Reportes y Estadisticas',
    });
  });
});
