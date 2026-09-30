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
import {
  Emprendimiento,
  EstadoPublicacion,
} from '../models/Emprendimiento';
import {
  EstadoEventoCapacitacion,
  EventosCapacitaciones,
  Temporada,
  TipoActividad,
} from '../models/EventosCapacitaciones';
import {
  CategoriaIncidencia,
  EstadoIncidencia,
  Incidencia,
  PrioridadIncidencia,
} from '../models/Incidencia';
import { Reserva, EstadoReserva } from '../models/Reserva';
import type { NombreRol, Rol } from '../models/Rol';
import type { Usuario } from '../models/Usuario';
import type {} from '../middlewares/auth.middleware';
import { errorMiddleware } from '../middlewares/registro.middleware';

config({ path: resolve(process.cwd(), '.env'), quiet: true });

// 4071 cubre los reportes existentes. Visitas queda documentado como pendiente
// porque no existe entidad, servicio, endpoint ni componente de reporte.
const REPORTE_VISITAS_NO_IMPLEMENTADO = {
  entidad: false,
  servicio: false,
  endpoint: false,
  componente: false,
};

const databaseOriginal = process.env.DB_DATABASE;
const jwtOriginal = process.env.JWT_SECRET;
const databaseTest = `reportes_view_${Date.now()}_${process.pid}_${randomBytes(4).toString('hex')}_test`;
const patronBaseTest = /^reportes_view_\d+_\d+_[a-f0-9]{8}_test$/;
process.env.DB_DATABASE = databaseTest;
process.env.JWT_SECRET = 'reportes-estadisticas-visualizacion-test';

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
      nombreUsuario: `reportes_${usuarioId}`,
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
      nombreUsuario: `reportes_usuario_${secuencia}`,
      nombre: 'Usuario',
      apellidos: `Reporte ${secuencia}`,
      correo: `reportes.${secuencia}@test.local`,
      telefono: `8700${String(secuencia).padStart(4, '0')}`,
      contraseña: 'hash-no-utilizado',
      rol: rolEntidad,
    } as Partial<Usuario>),
  );
};

const crearEvento = async (
  cambios: ConstructorParameters<typeof EventosCapacitaciones>[0] = {},
): Promise<EventosCapacitaciones> => {
  const conexion = await exigirConexionAislada();
  secuencia += 1;
  const evento = new EventosCapacitaciones({
    nombre: `Evento reporte ${secuencia}`,
    descripcion: 'Fixture de reporte estadistico.',
    fecha: '2020-01-15',
    hora: '10:30:00',
    lugar: 'Parque Nacional Diria',
    tipoActividad: TipoActividad.EVENTO,
    cupoMaximo: 25,
    cuposDisponibles: 25,
    estado: EstadoEventoCapacitacion.PUBLICADO,
    temporada: Temporada.SECA,
    ...cambios,
  });

  return conexion.getRepository(EventosCapacitaciones).save(evento);
};

const crearReserva = async (): Promise<Reserva> => {
  const conexion = await exigirConexionAislada();
  const visitante = await crearUsuario('visitante');
  const evento = await crearEvento();

  return conexion.getRepository(Reserva).save(
    conexion.getRepository(Reserva).create({
      usuarioId: visitante.id,
      eventoCapacitacionId: evento.id,
      usuario: visitante,
      eventoCapacitacion: evento,
      nombreCompleto: 'Visitante Reserva',
      fechaNacimiento: '1990-05-10',
      tipoIdentificacion: 'cedula',
      numeroIdentificacion: '123456789',
      correo: 'reserva.reportes@test.local',
      telefono: '+50688887777',
      estado: EstadoReserva.PENDIENTE,
    }),
  );
};

const crearEmprendimiento = async (): Promise<Emprendimiento> => {
  const conexion = await exigirConexionAislada();
  secuencia += 1;
  const categoria = await conexion.getRepository(CategoriaEmprendimiento).save(
    new CategoriaEmprendimiento({
      nombre: `Categoria reporte ${secuencia}`,
      descripcion: 'Categoria de prueba para reporte.',
    }),
  );

  return conexion.getRepository(Emprendimiento).save(
    conexion.getRepository(Emprendimiento).create({
      nombre: `Emprendimiento reporte ${secuencia}`,
      descripcion: 'Fixture de emprendimiento para reporte.',
      categoria,
      estadoPublicacion: EstadoPublicacion.PUBLICADO,
    }),
  );
};

const crearIncidencia = async (): Promise<Incidencia> => {
  const conexion = await exigirConexionAislada();
  secuencia += 1;

  return conexion.getRepository(Incidencia).save(
    conexion.getRepository(Incidencia).create({
      codigo: `I${String(secuencia).padStart(7, '0')}`,
      titulo: `Incidencia reporte ${secuencia}`,
      descripcion: 'Fixture de incidencia para reporte.',
      categoria: CategoriaIncidencia.SEGURIDAD,
      prioridad: PrioridadIncidencia.MEDIA,
      estado: EstadoIncidencia.PENDIENTE,
      esPublica: true,
      ubicacion: 'Sector de prueba',
    }),
  );
};

const idsDe = (lista: unknown): number[] => {
  assert.ok(Array.isArray(lista));
  return lista.map((item) => Number(comoObjeto(item).id));
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

describe('Task 4071 - visualizacion de reportes estadisticos existentes', () => {
  test('valida el reporte de reservas', async () => {
    const admin = await crearUsuario('administrador');
    const reserva = await crearReserva();
    const respuesta = await solicitar(
      '/api/reportes/reservas/estadisticas/reservas',
      crearToken(admin.id, 'administrador'),
    );

    assert.equal(respuesta.status, 200, respuesta.texto);
    const body = comoObjeto(respuesta.body);
    assert.ok(body.reporte);
    assert.ok(body.periodo);
    assert.ok(body.filtros);
    assert.equal(typeof body.totalReservas, 'number');
    assert.ok(body.reservasPorEstado);
    assert.ok(Array.isArray(body.reservasPorMes));
    assert.ok(Array.isArray(body.detalleReservas));
    assert.ok(Number(body.totalReservas) > 0);
    assert.ok(idsDe(body.detalleReservas).includes(reserva.id));
  });

  test('valida el reporte de emprendimientos', async () => {
    const admin = await crearUsuario('administrador');
    const emprendimiento = await crearEmprendimiento();
    const respuesta = await solicitar(
      '/api/reportes/estadisticas/emprendimientos',
      crearToken(admin.id, 'administrador'),
    );

    assert.equal(respuesta.status, 200, respuesta.texto);
    const body = comoObjeto(respuesta.body);
    assert.equal(typeof body.total, 'number');
    assert.equal(typeof body.publicados, 'number');
    assert.equal(typeof body.noPublicados, 'number');
    assert.equal(typeof body.desactivados, 'number');
    assert.equal(typeof body.borradores, 'number');
    assert.ok(Array.isArray(body.categorias));
    assert.ok(Array.isArray(body.emprendimientos));
    assert.ok(Number(body.total) > 0);
    assert.ok(idsDe(body.emprendimientos).includes(emprendimiento.id));
  });

  test('valida el reporte de actividades y eventos', async () => {
    const admin = await crearUsuario('administrador');
    const evento = await crearEvento();
    const respuesta = await solicitar(
      '/api/reportes/eventos/estadisticas/eventos',
      crearToken(admin.id, 'administrador'),
    );

    assert.equal(respuesta.status, 200, respuesta.texto);
    const body = comoObjeto(respuesta.body);
    assert.ok(body.reporte);
    assert.ok(body.periodo);
    assert.ok(body.filtros);
    assert.equal(typeof body.totalActividades, 'number');
    assert.ok(body.actividadesPorTipo);
    assert.ok(body.actividadesPorEstado);
    assert.ok(body.actividadesPorTemporada);
    assert.ok(Array.isArray(body.actividadesPorMes));
    assert.ok(Array.isArray(body.detalleActividades));
    assert.ok(Number(body.totalActividades) > 0);
    assert.ok(idsDe(body.detalleActividades).includes(evento.id));
  });

  test('valida el reporte de incidencias', async () => {
    const admin = await crearUsuario('administrador');
    const incidencia = await crearIncidencia();
    const respuesta = await solicitar(
      '/api/reportes/estadisticas/incidencias',
      crearToken(admin.id, 'administrador'),
    );

    assert.equal(respuesta.status, 200, respuesta.texto);
    const body = comoObjeto(respuesta.body);
    assert.ok(body.reporte);
    assert.ok(body.periodo);
    assert.ok(body.filtros);
    assert.equal(typeof body.totalIncidencias, 'number');
    assert.ok(body.incidenciasPorCategoria);
    assert.ok(body.incidenciasPorPrioridad);
    assert.ok(body.incidenciasPorEstado);
    assert.ok(Array.isArray(body.incidenciasPorMes));
    assert.ok(Array.isArray(body.detalleIncidencias));
    assert.ok(Number(body.totalIncidencias) > 0);
    assert.ok(idsDe(body.detalleIncidencias).includes(incidencia.id));
  });

  test('documenta que el reporte de visitas no existe actualmente', () => {
    assert.deepEqual(REPORTE_VISITAS_NO_IMPLEMENTADO, {
      entidad: false,
      servicio: false,
      endpoint: false,
      componente: false,
    });
  });
});
