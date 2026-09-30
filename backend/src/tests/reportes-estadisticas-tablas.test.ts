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
import { EstadoReserva, Reserva } from '../models/Reserva';
import type { NombreRol, Rol } from '../models/Rol';
import type { Usuario } from '../models/Usuario';
import type {} from '../middlewares/auth.middleware';
import { errorMiddleware } from '../middlewares/registro.middleware';

config({ path: resolve(process.cwd(), '.env'), quiet: true });

const REPORTE_VISITAS_NO_IMPLEMENTADO = {
  tabla: false,
  endpoint: false,
  servicio: false,
};

const databaseOriginal = process.env.DB_DATABASE;
const jwtOriginal = process.env.JWT_SECRET;
const databaseTest = `reportes_tablas_${Date.now()}_${process.pid}_${randomBytes(4).toString('hex')}_test`;
const patronBaseTest = /^reportes_tablas_\d+_\d+_[a-f0-9]{8}_test$/;
process.env.DB_DATABASE = databaseTest;
process.env.JWT_SECRET = 'reportes-estadisticas-tablas-test';

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

const comoArreglo = (valor: unknown): Record<string, unknown>[] => {
  assert.ok(Array.isArray(valor));
  return valor.map((item) => comoObjeto(item));
};

const encontrarPorId = (
  lista: unknown,
  id: number,
): Record<string, unknown> => {
  const registro = comoArreglo(lista).find((item) => Number(item.id) === id);
  assert.ok(registro, `No se encontro el registro ${id} en la tabla del reporte`);
  return registro;
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
      nombreUsuario: `tablas_reportes_${usuarioId}`,
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
      nombreUsuario: `tabla_usuario_${secuencia}`,
      nombre: 'Usuario Tabla',
      apellidos: `Reporte ${secuencia}`,
      correo: `tabla.reportes.${secuencia}@test.local`,
      telefono: `8711${String(secuencia).padStart(4, '0')}`,
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
    nombre: `Taller tabla biodiversidad ${secuencia}`,
    descripcion: 'Fixture especifico para validar tabla de reportes.',
    fecha: '2020-02-20',
    hora: '08:45:00',
    lugar: `Sendero tabla ${secuencia}`,
    tipoActividad: TipoActividad.CAPACITACION,
    cupoMaximo: 32,
    cuposDisponibles: 17,
    cupoMinimo: 5,
    edadMinima: 12,
    edadMaxima: 75,
    estado: EstadoEventoCapacitacion.PUBLICADO,
    temporada: Temporada.LLUVIOSA,
    ...cambios,
  });

  return conexion.getRepository(EventosCapacitaciones).save(evento);
};

const crearReservaConEvento = async (): Promise<{
  reserva: Reserva;
  evento: EventosCapacitaciones;
}> => {
  const conexion = await exigirConexionAislada();
  const visitante = await crearUsuario('visitante');
  const evento = await crearEvento({
    nombre: 'Caminata tabla reserva unica',
    tipoActividad: TipoActividad.EVENTO,
    temporada: Temporada.SECA,
    estado: EstadoEventoCapacitacion.PUBLICADO,
  });

  const reserva = await conexion.getRepository(Reserva).save(
    conexion.getRepository(Reserva).create({
      usuarioId: visitante.id,
      eventoCapacitacionId: evento.id,
      usuario: visitante,
      eventoCapacitacion: evento,
      nombreCompleto: 'Visitante Tabla Reserva',
      fechaNacimiento: '1992-04-18',
      tipoIdentificacion: 'cedula',
      numeroIdentificacion: `4072${String(secuencia).padStart(5, '0')}`,
      correo: 'reserva.tabla.reportes@test.local',
      telefono: '+50687776666',
      estado: EstadoReserva.APROBADA,
    }),
  );

  return { reserva, evento };
};

const crearEmprendimiento = async (): Promise<{
  emprendimiento: Emprendimiento;
  categoria: CategoriaEmprendimiento;
}> => {
  const conexion = await exigirConexionAislada();
  secuencia += 1;
  const categoria = await conexion.getRepository(CategoriaEmprendimiento).save(
    new CategoriaEmprendimiento({
      nombre: `Categoria tabla artesania ${secuencia}`,
      descripcion: 'Categoria fixture para validar tabla.',
    }),
  );

  const emprendimiento = await conexion.getRepository(Emprendimiento).save(
    conexion.getRepository(Emprendimiento).create({
      nombre: `Emprendimiento tabla cafe ${secuencia}`,
      descripcion: 'Fixture especifico de tabla de emprendimientos.',
      categoria,
      estadoPublicacion: EstadoPublicacion.NO_PUBLICADO,
    }),
  );

  return { emprendimiento, categoria };
};

const crearIncidencia = async (): Promise<Incidencia> => {
  const conexion = await exigirConexionAislada();
  secuencia += 1;

  return conexion.getRepository(Incidencia).save(
    conexion.getRepository(Incidencia).create({
      codigo: `I${String(secuencia).padStart(7, '0')}`,
      titulo: `Incidencia tabla puente ${secuencia}`,
      descripcion: 'Descripcion unica para validar la fila de incidencia.',
      categoria: CategoriaIncidencia.INFRAESTRUCTURA,
      prioridad: PrioridadIncidencia.ALTA,
      estado: EstadoIncidencia.EN_PROCESO,
      esPublica: true,
      ubicacion: `Mirador tabla ${secuencia}`,
    }),
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

describe('Task 4072 - contenido de tablas de reportes estadisticos', () => {
  test('valida contenido real de detalleReservas', async () => {
    const admin = await crearUsuario('administrador');
    const { reserva, evento } = await crearReservaConEvento();
    const respuesta = await solicitar(
      '/api/reportes/reservas/estadisticas/reservas',
      crearToken(admin.id, 'administrador'),
    );

    assert.equal(respuesta.status, 200, respuesta.texto);
    const body = comoObjeto(respuesta.body);
    assert.ok('detalleReservas' in body);
    const fila = encontrarPorId(body.detalleReservas, reserva.id);

    assert.equal(fila.eventoNombre, evento.nombre);
    assert.equal(fila.tipoActividad, evento.tipoActividad);
    assert.equal(fila.temporada, evento.temporada);
    assert.equal(fila.estado, reserva.estado);
  });

  test('valida contenido real de emprendimientos', async () => {
    const admin = await crearUsuario('administrador');
    const { emprendimiento, categoria } = await crearEmprendimiento();
    const respuesta = await solicitar(
      '/api/reportes/estadisticas/emprendimientos',
      crearToken(admin.id, 'administrador'),
    );

    assert.equal(respuesta.status, 200, respuesta.texto);
    const body = comoObjeto(respuesta.body);
    assert.ok('emprendimientos' in body);
    const fila = encontrarPorId(body.emprendimientos, emprendimiento.id);

    assert.equal(fila.nombre, emprendimiento.nombre);
    assert.equal(fila.categoria, categoria.nombre);
    assert.equal(fila.estado, emprendimiento.estadoPublicacion);
    assert.equal(
      new Date(String(fila.fechaCreacion)).toISOString(),
      emprendimiento.fechaCreacion.toISOString(),
    );
  });

  test('valida contenido real de detalleActividades', async () => {
    const admin = await crearUsuario('administrador');
    const evento = await crearEvento();
    const respuesta = await solicitar(
      '/api/reportes/eventos/estadisticas/eventos',
      crearToken(admin.id, 'administrador'),
    );

    assert.equal(respuesta.status, 200, respuesta.texto);
    const body = comoObjeto(respuesta.body);
    assert.ok('detalleActividades' in body);
    const fila = encontrarPorId(body.detalleActividades, evento.id);

    assert.equal(fila.nombre, evento.nombre);
    assert.equal(fila.lugar, evento.lugar);
    assert.equal(fila.tipoActividad, evento.tipoActividad);
    assert.equal(fila.temporada, evento.temporada);
    assert.equal(fila.estado, evento.estado);
    assert.equal(fila.cupoMaximo, evento.cupoMaximo);
    assert.equal(fila.cuposDisponibles, evento.cuposDisponibles);
  });

  test('valida contenido real de detalleIncidencias', async () => {
    const admin = await crearUsuario('administrador');
    const incidencia = await crearIncidencia();
    const respuesta = await solicitar(
      '/api/reportes/estadisticas/incidencias',
      crearToken(admin.id, 'administrador'),
    );

    assert.equal(respuesta.status, 200, respuesta.texto);
    const body = comoObjeto(respuesta.body);
    assert.ok('detalleIncidencias' in body);
    const fila = encontrarPorId(body.detalleIncidencias, incidencia.id);

    assert.equal(fila.titulo, incidencia.titulo);
    assert.equal(fila.descripcion, incidencia.descripcion);
    assert.equal(fila.categoria, incidencia.categoria);
    assert.equal(fila.prioridad, incidencia.prioridad);
    assert.equal(fila.estado, incidencia.estado);
    assert.equal(fila.ubicacion, incidencia.ubicacion);
  });

  test('documenta que no existe tabla de reporte de visitas', () => {
    assert.deepEqual(REPORTE_VISITAS_NO_IMPLEMENTADO, {
      tabla: false,
      endpoint: false,
      servicio: false,
    });
  });
});
