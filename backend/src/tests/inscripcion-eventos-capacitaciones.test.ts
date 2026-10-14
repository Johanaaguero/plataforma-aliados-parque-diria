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
import { EstadoReserva as EstadoParticipante, Participantes } from '../models/Participantes';
import { EstadoReserva, Reserva } from '../models/Reserva';
import type { AuditLog } from '../models/AuditLog';
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

interface RespuestaReserva {
  ok: true;
  message: string;
  data: {
    id: number;
    usuarioId: number;
    eventoCapacitacionId: number;
    nombreCompleto: string;
    fechaNacimiento: string;
    tipoIdentificacion: string;
    numeroIdentificacion: string;
    correo: string;
    telefono: string;
    estado: EstadoReserva;
    createdAt: string;
    updatedAt: string;
    cuposDisponibles: number;
  };
}

let dataSource: DataSource | undefined;
let adminConnection: Connection | undefined;
let baseCreadaPorEsteProceso = false;
let server: Server | undefined;
let baseUrl = '';
let UsuarioModel: typeof import('../models/Usuario').Usuario;
let RolModel: typeof import('../models/Rol').Rol;
let AuditLogModel: typeof AuditLog;
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
  const evento = new EventosCapacitaciones({
    nombre: `Evento de inscripción ${secuencia}`,
    descripcion: 'Fixture aislado de inscripción.',
    fecha: '2099-12-20',
    hora: '10:30:00',
    lugar: 'Parque Nacional Diriá',
    tipoActividad: TipoActividad.EVENTO,
    cupoMaximo,
    estado: EstadoEventoCapacitacion.PUBLICADO,
    temporada: Temporada.SECA,
  });
  evento.cuposDisponibles = cupoMaximo;
  return conexion.getRepository(EventosCapacitaciones).save(evento);
};

const datosReserva = (cambios: Partial<Record<
  'nombreCompleto' | 'fechaNacimiento' | 'tipoIdentificacion' | 'numeroIdentificacion' | 'correo' | 'telefono',
  string
>> = {}) => ({
  nombreCompleto: 'María Reserva',
  fechaNacimiento: '1990-05-10',
  tipoIdentificacion: 'cedula',
  numeroIdentificacion: '123456789',
  correo: 'reserva@test.local',
  telefono: '+50688887777',
  ...cambios,
});

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

const reservar = async (
  eventoId: number | string,
  token: string | undefined,
  datos = datosReserva(),
): Promise<RespuestaHttp> => solicitar(
  `/api/eventos-capacitaciones/${encodeURIComponent(String(eventoId))}/reserva`,
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(datos),
  },
);

const actualizarReservaComoAdmin = async (
  reservaId: number,
  estado: 'aprobar' | 'rechazar',
  token: string,
): Promise<RespuestaHttp> => {
  const options: RequestInit = {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  };

  if (estado === 'rechazar') {
    options.body = JSON.stringify({
      motivoRechazo: 'No cumple los requisitos de la actividad.',
    });
  }

  return solicitar(`/api/admin/inscripciones/${reservaId}/${estado}`, options);
};

const cancelarReserva = async (
  reservaId: number,
  token: string,
): Promise<RespuestaHttp> => solicitar(`/api/reservas/${reservaId}/cancelar`, {
  method: 'PATCH',
  headers: { Authorization: `Bearer ${token}` },
});

const cancelarInscripcionHttp = async (
  inscripcionId: number,
  token: string,
): Promise<RespuestaHttp> => solicitar(`/api/inscripciones/${inscripcionId}/cancelar`, {
  method: 'PATCH',
  headers: { Authorization: `Bearer ${token}` },
});

const consultarInscripcionesAdmin = async (
  token?: string,
): Promise<RespuestaHttp> => solicitar('/api/admin/inscripciones', {
  method: 'GET',
  ...(token ? { headers: { Authorization: `Bearer ${token}` } } : {}),
});

const obtenerDetalle = async (eventoId: number): Promise<Record<string, unknown>> => {
  const respuesta = await solicitar(`/api/eventos/${eventoId}`);
  assert.equal(respuesta.status, 200, respuesta.texto);
  const body = comoObjeto(respuesta.body);
  assert.equal(body.ok, true);
  return comoObjeto(body.data);
};

const obtenerAuditorias = async (action: string): Promise<AuditLog[]> =>
  (await exigirConexionAislada()).getRepository(AuditLogModel).find({
    where: { action },
    order: { id: 'ASC' },
  });

const limpiarBaseTest = async (): Promise<void> => {
  const conexion = await exigirConexionAislada();
  await conexion.query('DELETE FROM audit_logs');
  await conexion.query('DELETE FROM reservas');
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
  const auditLogModule = await import('../models/AuditLog');
  const rutasInscripcion = await import(
    '../modulos/Gestión de Eventos y Capacitaciones/Crear Eventos y Capacitaciones/eventosCapacitaciones.routes'
  );
  const rutasPublicas = await import(
    '../modulos/Gestión de Eventos y Capacitaciones/Visualización de Eventos y Capacitaciones/eventos.routes'
  );
  const rutasAdminInscripciones = await import(
    '../modulos/Gestión de Eventos y Capacitaciones/Inscripción a Eventos y Capacitaciones/inscripcionesAdmin.route'
  );
  const rutasMisInscripciones = await import(
    '../modulos/Gestión de Eventos y Capacitaciones/Inscripción a Eventos y Capacitaciones/Ver mis Inscripciones/inscripciones.routes'
  );

  dataSource = dataSourceModule.AppDataSource;
  UsuarioModel = usuarioModule.Usuario;
  RolModel = rolModule.Rol;
  AuditLogModel = auditLogModule.AuditLog;
  exigirNombreAislado((dataSource.options as { database?: string }).database);
  assert.equal(dataSource.options.synchronize, false);
  await dataSource.initialize();
  await exigirConexionAislada();
  await dataSource.runMigrations();

  const app = express();
  app.use(express.json());
  app.use('/api/eventos-capacitaciones', rutasInscripcion.default);
  app.use('/api/eventos', rutasPublicas.default);
  app.use('/api/admin', rutasAdminInscripciones.default);
  app.use('/api/inscripciones', rutasMisInscripciones.default);
  app.use('/api/reservas', rutasMisInscripciones.reservasRouter);
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

describe('GET /api/admin/inscripciones', () => {
  test('permite consultar inscripciones a un administrador y devuelve usuarios y actividades relacionadas', async () => {
    const usuario = await crearUsuario();
    const evento = await crearEvento(5);
    const admin = await crearUsuario();
    await (await exigirConexionAislada()).getRepository(UsuarioModel).update(admin.id, { rol: await (await exigirConexionAislada()).getRepository(RolModel).findOneByOrFail({ nombre: 'administrador' }) });

    const respuestaInscripcion = await inscribir(evento.id, crearToken(usuario.id, 'visitante'));
    assert.equal(respuestaInscripcion.status, 201, respuestaInscripcion.texto);

    const respuesta = await consultarInscripcionesAdmin(crearToken(admin.id, 'administrador'));

    assert.equal(respuesta.status, 200, respuesta.texto);
    const body = comoObjeto(respuesta.body);
    assert.equal(body.ok, true);
    assert.equal(body.message, 'Inscripciones consultadas correctamente.');
    assert.ok(Array.isArray(body.data));
    assert.equal(body.data.length, 1);

    const registro = comoObjeto(body.data[0]);
    assert.equal(registro.id, (respuestaInscripcion.body as RespuestaInscripcion).data.id);
    assert.equal(registro.usuarioId, usuario.id);
    assert.equal(registro.nombreUsuario, usuario.nombreUsuario);
    assert.equal(registro.correo, usuario.correo);
    assert.equal(registro.nombreCompleto, `${usuario.nombre} ${usuario.apellidos}`);
    assert.equal(registro.eventoCapacitacionId, evento.id);
    assert.equal(registro.nombreActividad, evento.nombre);
    assert.equal(registro.tipoActividad, evento.tipoActividad);
    assert.equal(registro.fechaActividad, evento.fecha);
    assert.ok(typeof registro.fechaInscripcion === 'string');
  });

  test('rechaza la consulta para un usuario sin rol de administrador', async () => {
    const usuario = await crearUsuario();
    const evento = await crearEvento(5);
    await inscribir(evento.id, crearToken(usuario.id, 'visitante'));

    const respuesta = await consultarInscripcionesAdmin(crearToken(usuario.id, 'visitante'));

    assert.equal(respuesta.status, 403, respuesta.texto);
    assert.deepEqual(respuesta.body, {
      ok: false,
      message: 'No tiene permisos para realizar esta operación',
    });
  });
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

  test('registra auditoría de inscripción sin duplicar eventos en operaciones fallidas', async () => {
    const usuario = await crearUsuario();
    const evento = await crearEvento(3);
    const token = crearToken(usuario.id, 'visitante');

    assert.equal((await inscribir(evento.id, token)).status, 201);
    assert.equal((await inscribir(evento.id, token)).status, 409);

    const auditorias = await obtenerAuditorias('CREAR_INSCRIPCION_EVENTO_CAPACITACION');
    assert.equal(auditorias.length, 1);
    assert.equal(auditorias[0]?.usuarioId, usuario.id);
    const detalles = JSON.parse(auditorias[0]?.details ?? '{}') as Record<string, unknown>;
    assert.equal(detalles.eventoCapacitacionId, evento.id);
    assert.equal(detalles.estado, EstadoParticipante.CONFIRMADA);
  });

  test('registra auditoría al cancelar una inscripción', async () => {
    const usuario = await crearUsuario();
    const evento = await crearEvento(3);
    const token = crearToken(usuario.id, 'visitante');
    const respuestaInscripcion = await inscribir(evento.id, token);
    const inscripcionId = (respuestaInscripcion.body as RespuestaInscripcion).data.id;

    const respuesta = await cancelarInscripcionHttp(inscripcionId, token);

    assert.equal(respuesta.status, 200, respuesta.texto);
    const auditorias = await obtenerAuditorias('CANCELAR_INSCRIPCION_EVENTO_CAPACITACION');
    assert.equal(auditorias.length, 1);
    assert.equal(auditorias[0]?.usuarioId, usuario.id);
    const detalles = JSON.parse(auditorias[0]?.details ?? '{}') as Record<string, unknown>;
    assert.equal(detalles.participanteId, inscripcionId);
    assert.equal(detalles.estadoAnterior, EstadoParticipante.CONFIRMADA);
    assert.equal(detalles.estadoNuevo, EstadoParticipante.CANCELADA);
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
      message: 'Se requiere inicio de sesión',
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
      numeroTicket: '#TKT-99999999',
    });
    await conexion.getRepository(EventosCapacitaciones).update(evento.id, {
      cuposDisponibles: null,
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

describe('POST /api/eventos-capacitaciones/:id/reserva', () => {
  test('registra auditoría de reserva y no registra éxito si la operación falla', async () => {
    const usuario = await crearUsuario();
    const evento = await crearEvento(1);
    const token = crearToken(usuario.id, 'visitante');

    assert.equal((await reservar(evento.id, token)).status, 201);
    const sinCupo = await reservar(evento.id, crearToken((await crearUsuario()).id, 'visitante'));
    assert.equal(sinCupo.status, 409, sinCupo.texto);

    const auditorias = await obtenerAuditorias('CREAR_RESERVA_EVENTO_CAPACITACION');
    assert.equal(auditorias.length, 1);
    assert.equal(auditorias[0]?.usuarioId, usuario.id);
    const detalles = JSON.parse(auditorias[0]?.details ?? '{}') as Record<string, unknown>;
    assert.equal(detalles.eventoCapacitacionId, evento.id);
    assert.equal(detalles.estado, EstadoReserva.PENDIENTE);
  });

  test('revierte la reserva y cupos si falla la auditoría obligatoria', async () => {
    const usuario = await crearUsuario();
    const evento = await crearEvento(1);
    const conexion = await exigirConexionAislada();
    const nombreTrigger = `audit_reserva_bloqueo_${Date.now()}`;
    await conexion.query(`
      CREATE TRIGGER \`${nombreTrigger}\`
      BEFORE INSERT ON \`audit_logs\`
      FOR EACH ROW
      BEGIN
        IF NEW.action = 'CREAR_RESERVA_EVENTO_CAPACITACION' THEN
          SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Fallo de prueba en auditoría';
        END IF;
      END
    `);

    try {
      const respuesta = await reservar(evento.id, crearToken(usuario.id, 'visitante'));

      assert.equal(respuesta.status, 500, respuesta.texto);
      assert.equal(await conexion.getRepository(Reserva).count(), 0);
      const eventoActualizado = await conexion.getRepository(EventosCapacitaciones).findOneByOrFail({ id: evento.id });
      assert.equal(eventoActualizado.cuposDisponibles, 1);
    } finally {
      await conexion.query(`DROP TRIGGER \`${nombreTrigger}\``);
    }
  });

  test('crea una reserva pendiente y persiste los datos personales', async () => {
    const usuario = await crearUsuario();
    const evento = await crearEvento(3);
    const datos = datosReserva();

    const respuesta = await reservar(evento.id, crearToken(usuario.id, 'visitante'), datos);

    assert.equal(respuesta.status, 201, respuesta.texto);
    const body = respuesta.body as RespuestaReserva;
    assert.equal(body.ok, true);
    assert.equal(body.data.usuarioId, usuario.id);
    assert.equal(body.data.eventoCapacitacionId, evento.id);
    assert.equal(body.data.estado, EstadoReserva.PENDIENTE);
    assert.equal(body.data.cuposDisponibles, 2);

    const reserva = await (await exigirConexionAislada())
      .getRepository(Reserva)
      .findOneBy({ usuarioId: usuario.id, eventoCapacitacionId: evento.id });
    assert.ok(reserva);
    assert.equal(reserva.nombreCompleto, datos.nombreCompleto);
    assert.equal(reserva.fechaNacimiento, datos.fechaNacimiento);
    assert.equal(reserva.tipoIdentificacion, datos.tipoIdentificacion);
    assert.equal(reserva.numeroIdentificacion, datos.numeroIdentificacion);
    assert.equal(reserva.correo, datos.correo);
    assert.equal(reserva.telefono, datos.telefono);
    assert.equal(reserva.estado, EstadoReserva.PENDIENTE);
  });

  test('rechaza una segunda reserva pendiente', async () => {
    const usuario = await crearUsuario();
    const evento = await crearEvento(3);
    const token = crearToken(usuario.id, 'visitante');

    assert.equal((await reservar(evento.id, token)).status, 201);
    const respuesta = await reservar(evento.id, token);

    assert.equal(respuesta.status, 409, respuesta.texto);
    assert.deepEqual(respuesta.body, {
      ok: false,
      code: 'RESERVATION_ALREADY_EXISTS',
      message: 'El usuario ya tiene una reserva activa para este evento.',
    });
    assert.equal(
      (await (await exigirConexionAislada()).getRepository(EventosCapacitaciones).findOneByOrFail({ id: evento.id })).cuposDisponibles,
      2,
    );
  });

  test('rechaza una segunda reserva aprobada', async () => {
    const usuario = await crearUsuario();
    const evento = await crearEvento(3);
    const token = crearToken(usuario.id, 'visitante');

    assert.equal((await reservar(evento.id, token)).status, 201);
    await (await exigirConexionAislada()).getRepository(Reserva).update(
      { usuarioId: usuario.id, eventoCapacitacionId: evento.id },
      { estado: EstadoReserva.APROBADA },
    );

    const respuesta = await reservar(evento.id, token);
    assert.equal(respuesta.status, 409, respuesta.texto);
    assert.equal(comoObjeto(respuesta.body).code, 'RESERVATION_ALREADY_EXISTS');
    assert.equal(
      (await (await exigirConexionAislada()).getRepository(EventosCapacitaciones).findOneByOrFail({ id: evento.id })).cuposDisponibles,
      2,
    );
  });

  for (const estado of [EstadoReserva.CANCELADA, EstadoReserva.RECHAZADA]) {
    test(`reutiliza una reserva ${estado} y actualiza sus datos`, async () => {
      const usuario = await crearUsuario();
      const evento = await crearEvento(3);
      const token = crearToken(usuario.id, 'visitante');

      const primera = await reservar(evento.id, token);
      assert.equal(primera.status, 201, primera.texto);
      const primeraId = (primera.body as RespuestaReserva).data.id;
      await (await exigirConexionAislada()).getRepository(Reserva).update(
        { id: primeraId },
        { estado },
      );

      const nuevosDatos = datosReserva({
        nombreCompleto: 'Persona Actualizada',
        numeroIdentificacion: '987654321',
        correo: 'actualizada@test.local',
      });
      const segunda = await reservar(evento.id, token, nuevosDatos);

      assert.equal(segunda.status, 201, segunda.texto);
      const reserva = await (await exigirConexionAislada())
        .getRepository(Reserva)
        .findOneByOrFail({ id: primeraId });
      assert.equal(reserva.id, primeraId);
      assert.equal(reserva.estado, EstadoReserva.PENDIENTE);
      assert.equal(reserva.nombreCompleto, nuevosDatos.nombreCompleto);
      assert.equal(reserva.numeroIdentificacion, nuevosDatos.numeroIdentificacion);
      assert.equal(reserva.correo, nuevosDatos.correo);
      assert.equal((segunda.body as RespuestaReserva).data.cuposDisponibles, 1);
    });
  }

  test('rechaza la reserva cuando no hay cupos', async () => {
    const usuario = await crearUsuario();
    const evento = await crearEvento(0);

    const respuesta = await reservar(evento.id, crearToken(usuario.id, 'visitante'));

    assert.equal(respuesta.status, 409, respuesta.texto);
    assert.equal(comoObjeto(respuesta.body).code, 'NO_AVAILABLE_SLOTS');
  });

  test('rechaza un evento no publicado', async () => {
    const usuario = await crearUsuario();
    const evento = await crearEvento(3);
    await (await exigirConexionAislada()).getRepository(EventosCapacitaciones).update(
      evento.id,
      { estado: EstadoEventoCapacitacion.BORRADOR },
    );

    const respuesta = await reservar(evento.id, crearToken(usuario.id, 'visitante'));

    assert.equal(respuesta.status, 409, respuesta.texto);
    assert.equal(comoObjeto(respuesta.body).code, 'EVENT_NOT_PUBLISHED');
  });

  test('rechaza un evento con fecha vencida', async () => {
    const usuario = await crearUsuario();
    const evento = await crearEvento(3);
    await (await exigirConexionAislada()).getRepository(EventosCapacitaciones).update(
      evento.id,
      { fecha: '2000-01-01' },
    );

    const respuesta = await reservar(evento.id, crearToken(usuario.id, 'visitante'));

    assert.equal(respuesta.status, 409, respuesta.texto);
    assert.equal(comoObjeto(respuesta.body).code, 'EVENT_DATE_PASSED');
  });

  test('rechaza una edad fuera de las restricciones del evento', async () => {
    const usuario = await crearUsuario();
    const evento = await crearEvento(3);
    await (await exigirConexionAislada()).getRepository(EventosCapacitaciones).update(
      evento.id,
      { edadMinima: 40 },
    );

    const respuesta = await reservar(evento.id, crearToken(usuario.id, 'visitante'));

    assert.equal(respuesta.status, 400, respuesta.texto);
    assert.equal(comoObjeto(respuesta.body).code, 'AGE_NOT_ALLOWED');
  });
});

describe('PATCH /api/admin/inscripciones/:id/{aprobar|rechazar}', () => {
  const crearAdministrador = async () => {
    const admin = await crearUsuario();
    const conexion = await exigirConexionAislada();
    const rolAdministrador = await conexion.getRepository(RolModel).findOneByOrFail({ nombre: 'administrador' });
    await conexion.getRepository(UsuarioModel).update(admin.id, { rol: rolAdministrador });
    return admin;
  };

  test('pendiente a rechazada incrementa el cupo una vez', async () => {
    const usuario = await crearUsuario();
    const admin = await crearAdministrador();
    const evento = await crearEvento(3);
    const reservaRespuesta = await reservar(evento.id, crearToken(usuario.id, 'visitante'));
    const reservaId = (reservaRespuesta.body as RespuestaReserva).data.id;

    const respuesta = await actualizarReservaComoAdmin(
      reservaId,
      'rechazar',
      crearToken(admin.id, 'administrador'),
    );

    assert.equal(respuesta.status, 200, respuesta.texto);
    const reserva = await (await exigirConexionAislada()).getRepository(Reserva).findOneByOrFail({ id: reservaId });
    const eventoActualizado = await (await exigirConexionAislada()).getRepository(EventosCapacitaciones).findOneByOrFail({ id: evento.id });
    assert.equal(reserva.estado, EstadoReserva.RECHAZADA);
    assert.equal(eventoActualizado.cuposDisponibles, 3);
  });

  test('pendiente a aprobada conserva el cupo descontado', async () => {
    const usuario = await crearUsuario();
    const admin = await crearAdministrador();
    const evento = await crearEvento(3);
    const reservaRespuesta = await reservar(evento.id, crearToken(usuario.id, 'visitante'));
    const reservaId = (reservaRespuesta.body as RespuestaReserva).data.id;

    const respuesta = await actualizarReservaComoAdmin(
      reservaId,
      'aprobar',
      crearToken(admin.id, 'administrador'),
    );

    assert.equal(respuesta.status, 200, respuesta.texto);
    const reserva = await (await exigirConexionAislada()).getRepository(Reserva).findOneByOrFail({ id: reservaId });
    const eventoActualizado = await (await exigirConexionAislada()).getRepository(EventosCapacitaciones).findOneByOrFail({ id: evento.id });
    const participante = await (await exigirConexionAislada()).getRepository(Participantes).findOneBy({ usuarioId: usuario.id, eventoCapacitacionId: evento.id });
    assert.equal(reserva.estado, EstadoReserva.APROBADA);
    assert.equal(eventoActualizado.cuposDisponibles, 2);
    assert.ok(participante);
    assert.equal(participante?.estado, 'confirmada');

    const auditorias = await obtenerAuditorias('CAMBIAR_ESTADO_RESERVA_EVENTO_CAPACITACION');
    assert.equal(auditorias.length, 1);
    assert.equal(auditorias[0]?.usuarioId, admin.id);
    const detalles = JSON.parse(auditorias[0]?.details ?? '{}') as Record<string, unknown>;
    assert.equal(detalles.reservaId, reservaId);
    assert.equal(detalles.estadoAnterior, EstadoReserva.PENDIENTE);
    assert.equal(detalles.estadoNuevo, EstadoReserva.APROBADA);
  });

  test('no crea un Participante duplicado al aprobar', async () => {
    const usuario = await crearUsuario();
    const admin = await crearAdministrador();
    const evento = await crearEvento(3);
    const conexion = await exigirConexionAislada();
    const participanteInicial = await conexion.getRepository(Participantes).save({
      usuarioId: usuario.id,
      eventoCapacitacionId: evento.id,
      estado: EstadoParticipante.PENDIENTE,
      numeroTicket: '#TKT-99989999',
    });
    const reservaRespuesta = await reservar(evento.id, crearToken(usuario.id, 'visitante'));
    const reservaId = (reservaRespuesta.body as RespuestaReserva).data.id;

    const respuesta = await actualizarReservaComoAdmin(
      reservaId,
      'aprobar',
      crearToken(admin.id, 'administrador'),
    );

    assert.equal(respuesta.status, 200, respuesta.texto);
    const participantes = await conexion.getRepository(Participantes).find({
      where: { usuarioId: usuario.id, eventoCapacitacionId: evento.id },
    });
    assert.equal(participantes.length, 1);
    assert.equal(participantes[0]?.id, participanteInicial.id);
    assert.equal(participantes[0]?.estado, 'confirmada');
  });

  test('revierte la aprobación y el Participante si falla el guardado de la Reserva', async () => {
    const usuario = await crearUsuario();
    const admin = await crearAdministrador();
    const evento = await crearEvento(3);
    const reservaRespuesta = await reservar(evento.id, crearToken(usuario.id, 'visitante'));
    const reservaId = (reservaRespuesta.body as RespuestaReserva).data.id;
    const conexion = await exigirConexionAislada();
    const nombreTrigger = `reservas_bloqueo_${Date.now()}`;

    await conexion.query(`
      CREATE TRIGGER \`${nombreTrigger}\`
      BEFORE UPDATE ON \`reservas\`
      FOR EACH ROW
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Fallo de prueba al aprobar reserva'
    `);

    try {
      const respuesta = await actualizarReservaComoAdmin(
        reservaId,
        'aprobar',
        crearToken(admin.id, 'administrador'),
      );

      assert.equal(respuesta.status, 500, respuesta.texto);
      const reserva = await conexion.getRepository(Reserva).findOneByOrFail({ id: reservaId });
      const participantes = await conexion.getRepository(Participantes).find({
        where: { usuarioId: usuario.id, eventoCapacitacionId: evento.id },
      });
      assert.equal(reserva.estado, EstadoReserva.PENDIENTE);
      assert.equal(participantes.length, 0);
    } finally {
      await conexion.query(`DROP TRIGGER \`${nombreTrigger}\``);
    }
  });

  test('rechazada a rechazada no vuelve a liberar cupo', async () => {
    const usuario = await crearUsuario();
    const admin = await crearAdministrador();
    const evento = await crearEvento(3);
    const reservaRespuesta = await reservar(evento.id, crearToken(usuario.id, 'visitante'));
    const reservaId = (reservaRespuesta.body as RespuestaReserva).data.id;
    const tokenAdmin = crearToken(admin.id, 'administrador');

    assert.equal((await actualizarReservaComoAdmin(reservaId, 'rechazar', tokenAdmin)).status, 200);
    const segundaRespuesta = await actualizarReservaComoAdmin(reservaId, 'rechazar', tokenAdmin);

    assert.equal(segundaRespuesta.status, 409, segundaRespuesta.texto);
    const eventoActualizado = await (await exigirConexionAislada()).getRepository(EventosCapacitaciones).findOneByOrFail({ id: evento.id });
    assert.equal(eventoActualizado.cuposDisponibles, 3);
  });
});

describe('PATCH /api/reservas/:id/cancelar', () => {
  const crearAdministrador = async () => {
    const admin = await crearUsuario();
    const conexion = await exigirConexionAislada();
    const rolAdministrador = await conexion.getRepository(RolModel).findOneByOrFail({ nombre: 'administrador' });
    await conexion.getRepository(UsuarioModel).update(admin.id, { rol: rolAdministrador });
    return admin;
  };

  test('cancela una reserva pendiente y libera un cupo', async () => {
    const usuario = await crearUsuario();
    const evento = await crearEvento(3);
    const respuestaReserva = await reservar(evento.id, crearToken(usuario.id, 'visitante'));
    const reservaId = (respuestaReserva.body as RespuestaReserva).data.id;

    const respuesta = await cancelarReserva(reservaId, crearToken(usuario.id, 'visitante'));
    assert.equal(respuesta.status, 200, respuesta.texto);
    const reserva = await (await exigirConexionAislada()).getRepository(Reserva).findOneByOrFail({ id: reservaId });
    const eventoActualizado = await (await exigirConexionAislada()).getRepository(EventosCapacitaciones).findOneByOrFail({ id: evento.id });
    assert.equal(reserva.estado, EstadoReserva.CANCELADA);
    assert.equal(eventoActualizado.cuposDisponibles, 3);

    const auditorias = await obtenerAuditorias('CANCELAR_RESERVA_EVENTO_CAPACITACION');
    assert.equal(auditorias.length, 1);
    assert.equal(auditorias[0]?.usuarioId, usuario.id);
    const detalles = JSON.parse(auditorias[0]?.details ?? '{}') as Record<string, unknown>;
    assert.equal(detalles.reservaId, reservaId);
    assert.equal(detalles.estadoAnterior, EstadoReserva.PENDIENTE);
    assert.equal(detalles.estadoNuevo, EstadoReserva.CANCELADA);
  });

  test('cancela una reserva aprobada, cancela su Participante y libera un cupo', async () => {
    const usuario = await crearUsuario();
    const admin = await crearAdministrador();
    const evento = await crearEvento(3);
    const respuestaReserva = await reservar(evento.id, crearToken(usuario.id, 'visitante'));
    const reservaId = (respuestaReserva.body as RespuestaReserva).data.id;
    assert.equal((await actualizarReservaComoAdmin(reservaId, 'aprobar', crearToken(admin.id, 'administrador'))).status, 200);

    const respuesta = await cancelarReserva(reservaId, crearToken(usuario.id, 'visitante'));
    assert.equal(respuesta.status, 200, respuesta.texto);
    const conexion = await exigirConexionAislada();
    const reserva = await conexion.getRepository(Reserva).findOneByOrFail({ id: reservaId });
    const participante = await conexion.getRepository(Participantes).findOneByOrFail({ usuarioId: usuario.id, eventoCapacitacionId: evento.id });
    const eventoActualizado = await conexion.getRepository(EventosCapacitaciones).findOneByOrFail({ id: evento.id });
    assert.equal(reserva.estado, EstadoReserva.CANCELADA);
    assert.equal(participante.estado, 'cancelada');
    assert.equal(eventoActualizado.cuposDisponibles, 3);
  });

  test('cancelar una reserva dos veces no libera dos cupos', async () => {
    const usuario = await crearUsuario();
    const evento = await crearEvento(3);
    const respuestaReserva = await reservar(evento.id, crearToken(usuario.id, 'visitante'));
    const reservaId = (respuestaReserva.body as RespuestaReserva).data.id;
    const token = crearToken(usuario.id, 'visitante');

    assert.equal((await cancelarReserva(reservaId, token)).status, 200);
    const segunda = await cancelarReserva(reservaId, token);
    assert.equal(segunda.status, 400, segunda.texto);
    assert.equal((await (await exigirConexionAislada()).getRepository(EventosCapacitaciones).findOneByOrFail({ id: evento.id })).cuposDisponibles, 3);
  });

  test('rechaza cancelar una reserva rechazada', async () => {
    const usuario = await crearUsuario();
    const admin = await crearAdministrador();
    const evento = await crearEvento(3);
    const respuestaReserva = await reservar(evento.id, crearToken(usuario.id, 'visitante'));
    const reservaId = (respuestaReserva.body as RespuestaReserva).data.id;
    assert.equal((await actualizarReservaComoAdmin(reservaId, 'rechazar', crearToken(admin.id, 'administrador'))).status, 200);

    const respuesta = await cancelarReserva(reservaId, crearToken(usuario.id, 'visitante'));
    assert.equal(respuesta.status, 400, respuesta.texto);
  });

  test('rechaza cancelar una reserva de otro usuario', async () => {
    const usuario = await crearUsuario();
    const otroUsuario = await crearUsuario();
    const evento = await crearEvento(3);
    const respuestaReserva = await reservar(evento.id, crearToken(usuario.id, 'visitante'));
    const reservaId = (respuestaReserva.body as RespuestaReserva).data.id;

    const respuesta = await cancelarReserva(reservaId, crearToken(otroUsuario.id, 'visitante'));
    assert.equal(respuesta.status, 403, respuesta.texto);
  });
});
