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

const REPORTE_VISITAS_BLOQUEADO = {
  estado: 'BLOQUEADO',
  motivo: 'No existe reporte de visitas en Reportes y Estadisticas',
};

const databaseOriginal = process.env.DB_DATABASE;
const jwtOriginal = process.env.JWT_SECRET;
const databaseTest = `reportes_graficos_${Date.now()}_${process.pid}_${randomBytes(4).toString('hex')}_test`;
const patronBaseTest = /^reportes_graficos_\d+_\d+_[a-f0-9]{8}_test$/;
process.env.DB_DATABASE = databaseTest;
process.env.JWT_SECRET = 'reportes-estadisticas-graficos-test';

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

const cantidadPorNombre = (
  lista: unknown,
  nombre: string,
): number => {
  const item = comoArreglo(lista).find((registro) => registro.nombre === nombre);
  assert.ok(item, `No se encontro el item estadistico ${nombre}`);
  return Number(item.cantidad);
};

const cantidadPorMes = (
  lista: unknown,
  mes: string,
): number => {
  const item = comoArreglo(lista).find((registro) => registro.mes === mes);
  assert.ok(item, `No se encontro el mes ${mes}`);
  return Number(item.cantidad);
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
      nombreUsuario: `graficos_reportes_${usuarioId}`,
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
      nombreUsuario: `grafico_usuario_${secuencia}`,
      nombre: 'Usuario Grafico',
      apellidos: `Reporte ${secuencia}`,
      correo: `grafico.reportes.${secuencia}@test.local`,
      telefono: `8722${String(secuencia).padStart(4, '0')}`,
      contraseña: 'hash-no-utilizado',
      rol: rolEntidad,
    } as Partial<Usuario>),
  );
};

const crearEvento = async (
  cambios: ConstructorParameters<typeof EventosCapacitaciones>[0],
): Promise<EventosCapacitaciones> => {
  const conexion = await exigirConexionAislada();
  secuencia += 1;
  return conexion.getRepository(EventosCapacitaciones).save(
    new EventosCapacitaciones({
      nombre: `Actividad grafico ${secuencia}`,
      descripcion: 'Fixture controlado para graficos.',
      fecha: '2020-01-15',
      hora: '09:00:00',
      lugar: 'Sector de prueba grafica',
      tipoActividad: TipoActividad.EVENTO,
      cupoMaximo: 20,
      cuposDisponibles: 10,
      estado: EstadoEventoCapacitacion.PUBLICADO,
      temporada: Temporada.SECA,
      ...cambios,
    }),
  );
};

const crearReserva = async (
  evento: EventosCapacitaciones,
  estado: EstadoReserva,
  fechaCreacion: string,
): Promise<Reserva> => {
  const conexion = await exigirConexionAislada();
  const visitante = await crearUsuario('visitante');
  const reserva = await conexion.getRepository(Reserva).save(
    conexion.getRepository(Reserva).create({
      usuarioId: visitante.id,
      eventoCapacitacionId: evento.id,
      usuario: visitante,
      eventoCapacitacion: evento,
      nombreCompleto: `Visitante grafico ${secuencia}`,
      fechaNacimiento: '1991-03-20',
      tipoIdentificacion: 'cedula',
      numeroIdentificacion: `4073${String(secuencia).padStart(5, '0')}`,
      correo: `reserva.grafico.${secuencia}@test.local`,
      telefono: '+50686665555',
      estado,
    }),
  );

  await conexion.query(
    'UPDATE reservas SET created_at = ?, updated_at = ? WHERE id = ?',
    [fechaCreacion, fechaCreacion, reserva.id],
  );

  return reserva;
};

const crearEmprendimiento = async (
  categoria: CategoriaEmprendimiento,
  estadoPublicacion: EstadoPublicacion,
): Promise<Emprendimiento> => {
  const conexion = await exigirConexionAislada();
  secuencia += 1;
  return conexion.getRepository(Emprendimiento).save(
    conexion.getRepository(Emprendimiento).create({
      nombre: `Emprendimiento grafico ${estadoPublicacion} ${secuencia}`,
      descripcion: 'Fixture controlado para grafico de emprendimientos.',
      categoria,
      estadoPublicacion,
    }),
  );
};

const crearCategoria = async (
  nombre: string,
): Promise<CategoriaEmprendimiento> => {
  const conexion = await exigirConexionAislada();
  return conexion.getRepository(CategoriaEmprendimiento).save(
    new CategoriaEmprendimiento({
      nombre,
      descripcion: 'Categoria controlada para graficos.',
    }),
  );
};

const crearIncidencia = async (
  cambios: {
    categoria: CategoriaIncidencia;
    prioridad: PrioridadIncidencia;
    estado: EstadoIncidencia;
    fechaRegistro: string;
  },
): Promise<Incidencia> => {
  const conexion = await exigirConexionAislada();
  secuencia += 1;
  const incidencia = await conexion.getRepository(Incidencia).save(
    conexion.getRepository(Incidencia).create({
      codigo: `I${String(secuencia).padStart(7, '0')}`,
      titulo: `Incidencia grafico ${secuencia}`,
      descripcion: 'Fixture controlado para grafico de incidencias.',
      categoria: cambios.categoria,
      prioridad: cambios.prioridad,
      estado: cambios.estado,
      esPublica: true,
      ubicacion: `Sector grafico ${secuencia}`,
    }),
  );

  await conexion.query(
    'UPDATE incidencias SET fecha_registro = ?, fecha_actualizacion = ? WHERE id = ?',
    [cambios.fechaRegistro, cambios.fechaRegistro, incidencia.id],
  );

  return incidencia;
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

describe('Task 4073 - datos estadisticos para graficos de reportes', () => {
  test('valida valores estadisticos para graficos de reservas', async () => {
    const admin = await crearUsuario('administrador');
    const eventoSeca = await crearEvento({
      nombre: 'Evento seca grafico reservas',
      tipoActividad: TipoActividad.EVENTO,
      temporada: Temporada.SECA,
      fecha: '2020-01-10',
    });
    const capacitacionLluviosa = await crearEvento({
      nombre: 'Capacitacion lluviosa grafico reservas',
      tipoActividad: TipoActividad.CAPACITACION,
      temporada: Temporada.LLUVIOSA,
      fecha: '2020-02-10',
    });

    await crearReserva(eventoSeca, EstadoReserva.PENDIENTE, '2020-01-05 09:00:00');
    await crearReserva(capacitacionLluviosa, EstadoReserva.APROBADA, '2020-01-20 10:00:00');
    await crearReserva(eventoSeca, EstadoReserva.RECHAZADA, '2020-02-05 11:00:00');
    await crearReserva(capacitacionLluviosa, EstadoReserva.CANCELADA, '2020-02-15 12:00:00');

    const respuesta = await solicitar(
      '/api/reportes/reservas/estadisticas/reservas?fechaInicio=2020-01-01&fechaFin=2020-02-29',
      crearToken(admin.id, 'administrador'),
    );

    assert.equal(respuesta.status, 200, respuesta.texto);
    const body = comoObjeto(respuesta.body);
    const reservasPorTemporada = comoObjeto(body.reservasPorTemporada);
    const reservasPorTipo = comoObjeto(body.reservasPorTipo);
    const reservasPorEstado = comoObjeto(body.reservasPorEstado);

    assert.equal(cantidadPorMes(body.reservasPorMes, '2020-01'), 2);
    assert.equal(cantidadPorMes(body.reservasPorMes, '2020-02'), 2);
    assert.equal(reservasPorTemporada.seca, 2);
    assert.equal(reservasPorTemporada.lluviosa, 2);
    assert.equal(reservasPorTipo.evento, 2);
    assert.equal(reservasPorTipo.capacitacion, 2);
    assert.equal(reservasPorEstado.pendiente, 1);
    assert.equal(reservasPorEstado.aprobada, 1);
    assert.equal(reservasPorEstado.rechazada, 1);
    assert.equal(reservasPorEstado.cancelada, 1);
  });

  test('valida valores estadisticos para graficos de emprendimientos', async () => {
    const admin = await crearUsuario('administrador');
    const categoriaPrincipal = await crearCategoria('Categoria grafico gastronomia');
    const categoriaSecundaria = await crearCategoria('Categoria grafico senderismo');

    await crearEmprendimiento(categoriaPrincipal, EstadoPublicacion.PUBLICADO);
    await crearEmprendimiento(categoriaPrincipal, EstadoPublicacion.BORRADOR);
    await crearEmprendimiento(categoriaSecundaria, EstadoPublicacion.NO_PUBLICADO);
    await crearEmprendimiento(categoriaSecundaria, EstadoPublicacion.DESACTIVADO);

    const respuesta = await solicitar(
      '/api/reportes/estadisticas/emprendimientos',
      crearToken(admin.id, 'administrador'),
    );

    assert.equal(respuesta.status, 200, respuesta.texto);
    const body = comoObjeto(respuesta.body);

    assert.equal(body.total, 4);
    assert.equal(body.publicados, 1);
    assert.equal(body.borradores, 1);
    assert.equal(body.noPublicados, 1);
    assert.equal(body.desactivados, 1);
    assert.equal(cantidadPorNombre(body.categorias, categoriaPrincipal.nombre), 2);
    assert.equal(cantidadPorNombre(body.categorias, categoriaSecundaria.nombre), 2);
  });

  test('valida valores estadisticos para graficos de actividades y eventos', async () => {
    const admin = await crearUsuario('administrador');
    await crearEvento({
      nombre: 'Evento enero seca publicado',
      fecha: '2020-01-12',
      tipoActividad: TipoActividad.EVENTO,
      temporada: Temporada.SECA,
      estado: EstadoEventoCapacitacion.PUBLICADO,
    });
    await crearEvento({
      nombre: 'Capacitacion enero lluviosa borrador',
      fecha: '2020-01-22',
      tipoActividad: TipoActividad.CAPACITACION,
      temporada: Temporada.LLUVIOSA,
      estado: EstadoEventoCapacitacion.BORRADOR,
    });
    await crearEvento({
      nombre: 'Evento febrero seca no publicado',
      fecha: '2020-02-08',
      tipoActividad: TipoActividad.EVENTO,
      temporada: Temporada.SECA,
      estado: EstadoEventoCapacitacion.NO_PUBLICADO,
    });
    await crearEvento({
      nombre: 'Capacitacion marzo lluviosa desactivada',
      fecha: '2020-03-10',
      tipoActividad: TipoActividad.CAPACITACION,
      temporada: Temporada.LLUVIOSA,
      estado: EstadoEventoCapacitacion.DESACTIVADO,
    });

    const respuesta = await solicitar(
      '/api/reportes/eventos/estadisticas/eventos?fechaInicio=2020-01-01&fechaFin=2020-03-31',
      crearToken(admin.id, 'administrador'),
    );

    assert.equal(respuesta.status, 200, respuesta.texto);
    const body = comoObjeto(respuesta.body);
    const actividadesPorTipo = comoObjeto(body.actividadesPorTipo);
    const actividadesPorTemporada = comoObjeto(body.actividadesPorTemporada);
    const actividadesPorEstado = comoObjeto(body.actividadesPorEstado);
    const mesConMasActividades = comoObjeto(body.mesConMasActividades);

    assert.equal(actividadesPorTipo.evento, 2);
    assert.equal(actividadesPorTipo.capacitacion, 2);
    assert.equal(actividadesPorTemporada.seca, 2);
    assert.equal(actividadesPorTemporada.lluviosa, 2);
    assert.equal(actividadesPorEstado.borrador, 1);
    assert.equal(actividadesPorEstado.publicado, 1);
    assert.equal(actividadesPorEstado.no_publicado, 1);
    assert.equal(actividadesPorEstado.desactivado, 1);
    assert.equal(cantidadPorMes(body.actividadesPorMes, '2020-01'), 2);
    assert.equal(cantidadPorMes(body.actividadesPorMes, '2020-02'), 1);
    assert.equal(cantidadPorMes(body.actividadesPorMes, '2020-03'), 1);
    assert.equal(mesConMasActividades.mes, '2020-01');
    assert.equal(mesConMasActividades.cantidad, 2);
  });

  test('valida valores estadisticos para graficos de incidencias', async () => {
    const admin = await crearUsuario('administrador');
    await crearIncidencia({
      categoria: CategoriaIncidencia.INFRAESTRUCTURA,
      prioridad: PrioridadIncidencia.ALTA,
      estado: EstadoIncidencia.EN_PROCESO,
      fechaRegistro: '2020-01-11 08:00:00',
    });
    await crearIncidencia({
      categoria: CategoriaIncidencia.INFRAESTRUCTURA,
      prioridad: PrioridadIncidencia.ALTA,
      estado: EstadoIncidencia.EN_PROCESO,
      fechaRegistro: '2020-01-19 08:00:00',
    });
    await crearIncidencia({
      categoria: CategoriaIncidencia.SEGURIDAD,
      prioridad: PrioridadIncidencia.BAJA,
      estado: EstadoIncidencia.PENDIENTE,
      fechaRegistro: '2020-02-03 08:00:00',
    });

    const respuesta = await solicitar(
      '/api/reportes/estadisticas/incidencias?fechaInicio=2020-01-01&fechaFin=2020-02-29',
      crearToken(admin.id, 'administrador'),
    );

    assert.equal(respuesta.status, 200, respuesta.texto);
    const body = comoObjeto(respuesta.body);
    const incidenciasPorCategoria = comoObjeto(body.incidenciasPorCategoria);
    const incidenciasPorPrioridad = comoObjeto(body.incidenciasPorPrioridad);
    const incidenciasPorEstado = comoObjeto(body.incidenciasPorEstado);

    assert.equal(incidenciasPorCategoria.infraestructura, 2);
    assert.equal(incidenciasPorCategoria.seguridad, 1);
    assert.equal(incidenciasPorPrioridad.alta, 2);
    assert.equal(incidenciasPorPrioridad.baja, 1);
    assert.equal(incidenciasPorEstado.en_proceso, 2);
    assert.equal(incidenciasPorEstado.pendiente, 1);
    assert.equal(cantidadPorMes(body.incidenciasPorMes, '2020-01'), 2);
    assert.equal(cantidadPorMes(body.incidenciasPorMes, '2020-02'), 1);
  });

  test('documenta que graficos de visitas quedan bloqueados', () => {
    assert.deepEqual(REPORTE_VISITAS_BLOQUEADO, {
      estado: 'BLOQUEADO',
      motivo: 'No existe reporte de visitas en Reportes y Estadisticas',
    });
  });
});
