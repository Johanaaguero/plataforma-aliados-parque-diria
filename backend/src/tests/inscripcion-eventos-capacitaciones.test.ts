import 'reflect-metadata';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import type { Server } from 'node:http';
import jwt from 'jsonwebtoken';
import mysql from 'mysql2/promise';
import type { Connection } from 'mysql2/promise';
import type { AddressInfo } from 'node:net';
import { resolve } from 'node:path';
import { after, before, beforeEach, describe, test } from 'node:test';
import { config } from 'dotenv';
import express from 'express';
import type { DataSource } from 'typeorm';

import {
  EventosCapacitaciones,
  EstadoEventoCapacitacion,
  Temporada,
  TipoActividad,
} from '../models/EventosCapacitaciones';
import { Participantes } from '../models/Participantes';
import type { Rol, NombreRol } from '../models/Rol';
import type { Usuario } from '../models/Usuario';
import { errorMiddleware } from '../middlewares/registro.middleware';

config({ path: resolve(process.cwd(), '.env'), quiet: true });

// Una base aleatoria evita reutilizar DB_DATABASE o la base de otro proceso.
const databaseOriginal = process.env.DB_DATABASE;
const databaseTest = `eventos_inscripcion_${Date.now()}_${process.pid}_${randomBytes(4).toString('hex')}_test`;
const patronBaseTest = /^eventos_inscripcion_\d+_\d+_[a-f0-9]{8}_test$/;
process.env.DB_DATABASE = databaseTest;
process.env.JWT_SECRET = 'inscripcion-eventos-capacitaciones-test-no-usar-en-produccion';

interface RespuestaHttp {
  status: number;
  body: unknown;
  texto: string;
}

interface RespuestaInscripcion {
  ok: true;
  message: string;
  data: {
    id: number;
    usuarioId: number;
    eventoCapacitacionId: number;
    createdAt: string;
    cuposDisponibles: number | null;
  };
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
  assert.equal(nombre, databaseTest, 'La conexión debe apuntar a la base aislada de esta ejecución');
};

const exigirConexionAislada = async (): Promise<DataSource> => {
  assert.ok(baseCreadaPorEsteProceso, 'La base debe haber sido creada por esta ejecución');
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
  options: RequestInit = {},
): Promise<RespuestaHttp> => {
  const respuesta = await fetch(`${baseUrl}${path}`, options);
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
      nombreUsuario: `inscripcion_${usuarioId}`,
      rol,
    },
    variableRequerida('JWT_SECRET'),
    { expiresIn: '1h' },
  );

const crearUsuario = async (): Promise<Usuario> => {
  const conexion = await exigirConexionAislada();
  secuencia += 1;
  const rol = await conexion.getRepository(RolModel).findOneByOrFail({
    nombre: 'visitante',
  });

  return conexion.getRepository(UsuarioModel).save(
    conexion.getRepository(UsuarioModel).create({
      nombreUsuario: `inscripcion_usuario_${secuencia}`,
      nombre: 'Usuario',
      apellidos: `Prueba ${secuencia}`,
      correo: `inscripcion.${secuencia}@test.local`,
      telefono: `8000${String(secuencia).padStart(4, '0')}`,
      contraseña: 'hash-no-utilizado',
      rol,
    }),
  );
};

const crearEvento = async (
  cupoMaximo: number | null,
): Promise<EventosCapacitaciones> => {
  const conexion = await exigirConexionAislada();
  secuencia += 1;
  return conexion.getRepository(EventosCapacitaciones).save(
    new EventosCapacitaciones({
      nombre: `Evento de inscripción ${secuencia}`,
      descripcion: 'Fixture aislado de inscripción.',
      fecha: '2099-12-20',
      hora: '10:30:00',
      lugar: 'Parque Nacional Diriá',
      tipoActividad: TipoActividad.EVENTO,
      cupoMaximo,
      estado: EstadoEventoCapacitacion.PUBLICADO,
      temporada: Temporada.SECA,
    }),
  );
};

const inscribir = async (
  eventoId: number | string,
  token?: string,
): Promise<RespuestaHttp> => solicitar(
  `/api/eventos-capacitaciones/${encodeURIComponent(String(eventoId))}/inscripcion`,
  {
    method: 'POST',
    ...(token ? { headers: { Authorization: `Bearer ${token}` } } : {}),
  },
);

const obtenerDetalle = async (eventoId: number): Promise<Record<string, unknown>> => {
  const respuesta = await solicitar(`/api/eventos/${eventoId}`);
  assert.equal(respuesta.status, 200, respuesta.texto);
  const body = comoObjeto(respuesta.body);
  assert.equal(body.ok, true);
  return comoObjeto(body.data);
};

const limpiarBaseTest = async (): Promise<void> => {
  const conexion = await exigirConexionAislada();
  await conexion.query('DELETE FROM participantes');
  await conexion.query('DELETE FROM eventos_capacitaciones');
  await conexion.query('DELETE FROM usuarios');
  await conexion.query('DELETE FROM roles');
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

  // AppDataSource captura DB_DATABASE al importarse; se carga después del cambio.
  const dataSourceModule = await import('../data-source');
  const usuarioModule = await import('../models/Usuario');
  const rolModule = await import('../models/Rol');
  const rutasInscripcion = await import(
    '../modulos/Gestión de Eventos y Capacitaciones/Crear Eventos y Capacitaciones/eventosCapacitaciones.routes'
  );
  const rutasPublicas = await import(
    '../modulos/Gestión de Eventos y Capacitaciones/Visualización de Eventos y Capacitaciones/eventos.routes'
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
  app.use('/api/eventos-capacitaciones', rutasInscripcion.default);
  app.use('/api/eventos', rutasPublicas.default);
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
  }
});

describe('POST /api/eventos-capacitaciones/:id/inscripcion', () => {
  test('inscribe un usuario autenticado y registra el participante', async () => {
    const usuario = await crearUsuario();
    const evento = await crearEvento(3);

    const respuesta = await inscribir(evento.id, crearToken(usuario.id, 'visitante'));

    assert.equal(respuesta.status, 201, respuesta.texto);
    const body = respuesta.body as RespuestaInscripcion;
    assert.equal(body.ok, true);
    assert.equal(body.message, 'Inscripción realizada correctamente.');
    assert.equal(body.data.usuarioId, usuario.id);
    assert.equal(body.data.eventoCapacitacionId, evento.id);
    assert.equal(body.data.cuposDisponibles, 2);
    assert.equal(typeof body.data.createdAt, 'string');

    const participante = await (await exigirConexionAislada())
      .getRepository(Participantes)
      .findOneBy({ usuarioId: usuario.id, eventoCapacitacionId: evento.id });
    assert.notEqual(participante, null);
    assert.equal(participante?.id, body.data.id);
  });

  test('rechaza una inscripción duplicada con 409 y conserva un solo registro', async () => {
    const usuario = await crearUsuario();
    const evento = await crearEvento(3);
    const token = crearToken(usuario.id, 'visitante');

    assert.equal((await inscribir(evento.id, token)).status, 201);
    const respuesta = await inscribir(evento.id, token);

    assert.equal(respuesta.status, 409, respuesta.texto);
    assert.deepEqual(respuesta.body, {
      ok: false,
      code: 'ALREADY_REGISTERED',
      message: 'El usuario ya está inscrito en este evento o capacitación.',
    });
    const cantidad = await (await exigirConexionAislada())
      .getRepository(Participantes)
      .count({ where: { usuarioId: usuario.id, eventoCapacitacionId: evento.id } });
    assert.equal(cantidad, 1);
  });

  test('devuelve 404 y EVENT_NOT_FOUND para un evento inexistente', async () => {
    const usuario = await crearUsuario();
    const respuesta = await inscribir(2147483647, crearToken(usuario.id, 'visitante'));

    assert.equal(respuesta.status, 404, respuesta.texto);
    assert.deepEqual(respuesta.body, {
      ok: false,
      code: 'EVENT_NOT_FOUND',
      message: 'El evento o capacitación no existe.',
    });
  });

  test('sin token devuelve 401', async () => {
    const evento = await crearEvento(3);
    const respuesta = await inscribir(evento.id);

    assert.equal(respuesta.status, 401, respuesta.texto);
    assert.deepEqual(respuesta.body, {
      ok: false,
      code: 'TOKEN_NOT_PROVIDED',
      message: 'Token no proporcionado',
    });
  });

  test('rechaza IDs inválidos con 400 e INVALID_EVENT_ID', async () => {
    const usuario = await crearUsuario();
    const respuesta = await inscribir('abc', crearToken(usuario.id, 'visitante'));

    assert.equal(respuesta.status, 400, respuesta.texto);
    assert.deepEqual(respuesta.body, {
      ok: false,
      code: 'INVALID_EVENT_ID',
      message: 'El id debe ser un número entero positivo.',
    });
  });

  test('rechaza una inscripción cuando ya no hay cupos', async () => {
    const usuarioInscrito = await crearUsuario();
    const usuarioSinCupo = await crearUsuario();
    const evento = await crearEvento(1);
    const conexion = await exigirConexionAislada();
    await conexion.getRepository(Participantes).save({
      usuarioId: usuarioInscrito.id,
      eventoCapacitacionId: evento.id,
    });

    const respuesta = await inscribir(evento.id, crearToken(usuarioSinCupo.id, 'visitante'));

    assert.equal(respuesta.status, 409, respuesta.texto);
    assert.deepEqual(respuesta.body, {
      ok: false,
      code: 'NO_AVAILABLE_SLOTS',
      message: 'No hay cupos disponibles para este evento o capacitación.',
    });
    assert.equal(
      await conexion.getRepository(Participantes).count({ where: { eventoCapacitacionId: evento.id } }),
      1,
    );
  });

  test('actualiza la disponibilidad real en detalle público después de cada inscripción', async () => {
    const primerUsuario = await crearUsuario();
    const segundoUsuario = await crearUsuario();
    const evento = await crearEvento(3);

    const primera = await inscribir(evento.id, crearToken(primerUsuario.id, 'visitante'));
    assert.equal(primera.status, 201, primera.texto);
    assert.equal((primera.body as RespuestaInscripcion).data.cuposDisponibles, 2);
    assert.equal((await obtenerDetalle(evento.id)).cuposDisponibles, 2);

    const segunda = await inscribir(evento.id, crearToken(segundoUsuario.id, 'visitante'));
    assert.equal(segunda.status, 201, segunda.texto);
    assert.equal((segunda.body as RespuestaInscripcion).data.cuposDisponibles, 1);
    assert.equal((await obtenerDetalle(evento.id)).cuposDisponibles, 1);
  });

  test('mantiene cuposDisponibles en null cuando el evento no define cupo máximo', async () => {
    const usuario = await crearUsuario();
    const evento = await crearEvento(null);

    const respuesta = await inscribir(evento.id, crearToken(usuario.id, 'visitante'));

    assert.equal(respuesta.status, 201, respuesta.texto);
    assert.equal((respuesta.body as RespuestaInscripcion).data.cuposDisponibles, null);
    assert.equal((await obtenerDetalle(evento.id)).cuposDisponibles, null);
  });
});
