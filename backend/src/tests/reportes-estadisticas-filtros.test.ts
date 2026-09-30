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
  motivo: 'No existe reporte de visitas ni filtros de visitas en Reportes y Estadisticas',
};

const databaseOriginal = process.env.DB_DATABASE;
const jwtOriginal = process.env.JWT_SECRET;
const databaseTest = `reportes_filtros_${Date.now()}_${process.pid}_${randomBytes(4).toString('hex')}_test`;
const patronBaseTest = /^reportes_filtros_\d+_\d+_[a-f0-9]{8}_test$/;
process.env.DB_DATABASE = databaseTest;
process.env.JWT_SECRET = 'reportes-estadisticas-filtros-test';

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

const idsDe = (lista: unknown): number[] =>
  comoArreglo(lista).map((item) => Number(item.id));

const assertIncluyeId = (lista: unknown, id: number): void => {
  assert.ok(idsDe(lista).includes(id), `El resultado debe incluir el registro ${id}`);
};

const assertExcluyeId = (lista: unknown, id: number): void => {
  assert.equal(idsDe(lista).includes(id), false, `El resultado no debe incluir el registro ${id}`);
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
      nombreUsuario: `filtros_reportes_${usuarioId}`,
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
      nombreUsuario: `filtro_usuario_${secuencia}`,
      nombre: 'Usuario Filtro',
      apellidos: `Reporte ${secuencia}`,
      correo: `filtro.reportes.${secuencia}@test.local`,
      telefono: `8744${String(secuencia).padStart(4, '0')}`,
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
      nombre: `Actividad filtro ${secuencia}`,
      descripcion: 'Fixture controlado para filtros.',
      fecha: '2020-01-15',
      hora: '09:00:00',
      lugar: 'Sector de prueba filtros',
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
      nombreCompleto: `Visitante filtro ${secuencia}`,
      fechaNacimiento: '1991-03-20',
      tipoIdentificacion: 'cedula',
      numeroIdentificacion: `4075${String(secuencia).padStart(5, '0')}`,
      correo: `reserva.filtro.${secuencia}@test.local`,
      telefono: '+50684443333',
      estado,
    }),
  );

  await conexion.query(
    'UPDATE reservas SET created_at = ?, updated_at = ? WHERE id = ?',
    [fechaCreacion, fechaCreacion, reserva.id],
  );

  return reserva;
};

const crearCategoria = async (
  nombre: string,
): Promise<CategoriaEmprendimiento> => {
  const conexion = await exigirConexionAislada();
  return conexion.getRepository(CategoriaEmprendimiento).save(
    new CategoriaEmprendimiento({
      nombre,
      descripcion: 'Categoria controlada para filtros.',
    }),
  );
};

const crearEmprendimiento = async (
  categoria: CategoriaEmprendimiento,
  estadoPublicacion: EstadoPublicacion,
  fechaCreacion?: string,
): Promise<Emprendimiento> => {
  const conexion = await exigirConexionAislada();
  secuencia += 1;
  const emprendimiento = await conexion.getRepository(Emprendimiento).save(
    conexion.getRepository(Emprendimiento).create({
      nombre: `Emprendimiento filtro ${estadoPublicacion} ${secuencia}`,
      descripcion: 'Fixture controlado para filtros de emprendimientos.',
      categoria,
      estadoPublicacion,
    }),
  );

  if (fechaCreacion) {
    await conexion.query(
      'UPDATE emprendimientos SET fecha_creacion = ?, fecha_actualizacion = ? WHERE id = ?',
      [fechaCreacion, fechaCreacion, emprendimiento.id],
    );
  }

  return emprendimiento;
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
      titulo: `Incidencia filtro ${secuencia}`,
      descripcion: 'Fixture controlado para filtros de incidencias.',
      categoria: cambios.categoria,
      prioridad: cambios.prioridad,
      estado: cambios.estado,
      esPublica: true,
      ubicacion: `Sector filtro ${secuencia}`,
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

describe('Task 4075 - aplicacion de filtros en reportes estadisticos', () => {
  test('reservas filtra por rango de fechas', async () => {
    const admin = await crearUsuario('administrador');
    const evento = await crearEvento({ nombre: 'Evento fecha reservas' });
    const enero1 = await crearReserva(evento, EstadoReserva.PENDIENTE, '2020-01-05 09:00:00');
    const enero2 = await crearReserva(evento, EstadoReserva.APROBADA, '2020-01-20 10:00:00');
    const marzo = await crearReserva(evento, EstadoReserva.RECHAZADA, '2020-03-05 11:00:00');

    const respuesta = await solicitar(
      '/api/reportes/reservas/estadisticas/reservas?fechaInicio=2020-01-01&fechaFin=2020-01-31',
      crearToken(admin.id, 'administrador'),
    );

    assert.equal(respuesta.status, 200, respuesta.texto);
    const body = comoObjeto(respuesta.body);
    assert.equal(body.totalReservas, 2);
    assertIncluyeId(body.detalleReservas, enero1.id);
    assertIncluyeId(body.detalleReservas, enero2.id);
    assertExcluyeId(body.detalleReservas, marzo.id);
  });

  test('reservas filtra por temporada', async () => {
    const admin = await crearUsuario('administrador');
    const eventoSeca = await crearEvento({ nombre: 'Evento reserva seca', temporada: Temporada.SECA });
    const eventoLluviosa = await crearEvento({ nombre: 'Evento reserva lluviosa', temporada: Temporada.LLUVIOSA });
    const seca1 = await crearReserva(eventoSeca, EstadoReserva.PENDIENTE, '2020-01-05 09:00:00');
    const seca2 = await crearReserva(eventoSeca, EstadoReserva.APROBADA, '2020-01-06 09:00:00');
    const lluviosa = await crearReserva(eventoLluviosa, EstadoReserva.RECHAZADA, '2020-01-07 09:00:00');

    const respuesta = await solicitar(
      '/api/reportes/reservas/estadisticas/reservas?fechaInicio=2020-01-01&fechaFin=2020-01-31&temporada=seca',
      crearToken(admin.id, 'administrador'),
    );

    assert.equal(respuesta.status, 200, respuesta.texto);
    const body = comoObjeto(respuesta.body);
    assert.equal(body.totalReservas, 2);
    assertIncluyeId(body.detalleReservas, seca1.id);
    assertIncluyeId(body.detalleReservas, seca2.id);
    assertExcluyeId(body.detalleReservas, lluviosa.id);
  });

  test('reservas filtra por tipo de actividad', async () => {
    const admin = await crearUsuario('administrador');
    const evento = await crearEvento({ nombre: 'Reserva tipo evento', tipoActividad: TipoActividad.EVENTO });
    const capacitacion = await crearEvento({ nombre: 'Reserva tipo capacitacion', tipoActividad: TipoActividad.CAPACITACION });
    const reservaEvento = await crearReserva(evento, EstadoReserva.PENDIENTE, '2020-01-05 09:00:00');
    const reservaCapacitacion = await crearReserva(capacitacion, EstadoReserva.APROBADA, '2020-01-06 09:00:00');

    const respuesta = await solicitar(
      '/api/reportes/reservas/estadisticas/reservas?fechaInicio=2020-01-01&fechaFin=2020-01-31&tipoActividad=evento',
      crearToken(admin.id, 'administrador'),
    );

    assert.equal(respuesta.status, 200, respuesta.texto);
    const body = comoObjeto(respuesta.body);
    assert.equal(body.totalReservas, 1);
    assertIncluyeId(body.detalleReservas, reservaEvento.id);
    assertExcluyeId(body.detalleReservas, reservaCapacitacion.id);
  });

  test('emprendimientos filtra por periodo personalizado', async () => {
    const admin = await crearUsuario('administrador');
    const categoria = await crearCategoria('Categoria filtro periodo');
    const dentro1 = await crearEmprendimiento(categoria, EstadoPublicacion.PUBLICADO, '2020-01-05 09:00:00');
    const dentro2 = await crearEmprendimiento(categoria, EstadoPublicacion.BORRADOR, '2020-01-20 09:00:00');
    const fuera = await crearEmprendimiento(categoria, EstadoPublicacion.NO_PUBLICADO, '2020-03-05 09:00:00');

    const respuesta = await solicitar(
      '/api/reportes/estadisticas/emprendimientos?periodo=personalizado&fechaInicio=2020-01-01&fechaFin=2020-01-31',
      crearToken(admin.id, 'administrador'),
    );

    assert.equal(respuesta.status, 200, respuesta.texto);
    const body = comoObjeto(respuesta.body);
    assert.equal(body.total, 2);
    assertIncluyeId(body.emprendimientos, dentro1.id);
    assertIncluyeId(body.emprendimientos, dentro2.id);
    assertExcluyeId(body.emprendimientos, fuera.id);
  });

  test('emprendimientos filtra por categoria', async () => {
    const admin = await crearUsuario('administrador');
    const categoriaObjetivo = await crearCategoria('Categoria filtro objetivo');
    const categoriaExcluida = await crearCategoria('Categoria filtro excluida');
    const incluido1 = await crearEmprendimiento(categoriaObjetivo, EstadoPublicacion.PUBLICADO);
    const incluido2 = await crearEmprendimiento(categoriaObjetivo, EstadoPublicacion.BORRADOR);
    const excluido = await crearEmprendimiento(categoriaExcluida, EstadoPublicacion.DESACTIVADO);

    const respuesta = await solicitar(
      `/api/reportes/estadisticas/emprendimientos?periodo=personalizado&fechaInicio=2000-01-01&fechaFin=2099-12-31&categoriaId=${categoriaObjetivo.id}`,
      crearToken(admin.id, 'administrador'),
    );

    assert.equal(respuesta.status, 200, respuesta.texto);
    const body = comoObjeto(respuesta.body);
    assert.equal(body.total, 2);
    assertIncluyeId(body.emprendimientos, incluido1.id);
    assertIncluyeId(body.emprendimientos, incluido2.id);
    assertExcluyeId(body.emprendimientos, excluido.id);
  });

  test('emprendimientos filtra por id especifico', async () => {
    const admin = await crearUsuario('administrador');
    const categoria = await crearCategoria('Categoria filtro id');
    const objetivo = await crearEmprendimiento(categoria, EstadoPublicacion.PUBLICADO);
    const excluido = await crearEmprendimiento(categoria, EstadoPublicacion.BORRADOR);

    const respuesta = await solicitar(
      `/api/reportes/estadisticas/emprendimientos?periodo=personalizado&fechaInicio=2000-01-01&fechaFin=2099-12-31&emprendimientoId=${objetivo.id}`,
      crearToken(admin.id, 'administrador'),
    );

    assert.equal(respuesta.status, 200, respuesta.texto);
    const body = comoObjeto(respuesta.body);
    assert.equal(body.total, 1);
    assertIncluyeId(body.emprendimientos, objetivo.id);
    assertExcluyeId(body.emprendimientos, excluido.id);
  });

  test('actividades filtra por rango de fechas', async () => {
    const admin = await crearUsuario('administrador');
    const enero1 = await crearEvento({ nombre: 'Actividad enero 1', fecha: '2020-01-05' });
    const enero2 = await crearEvento({ nombre: 'Actividad enero 2', fecha: '2020-01-20' });
    const marzo = await crearEvento({ nombre: 'Actividad marzo', fecha: '2020-03-05' });

    const respuesta = await solicitar(
      '/api/reportes/eventos/estadisticas/eventos?fechaInicio=2020-01-01&fechaFin=2020-01-31',
      crearToken(admin.id, 'administrador'),
    );

    assert.equal(respuesta.status, 200, respuesta.texto);
    const body = comoObjeto(respuesta.body);
    assert.equal(body.totalActividades, 2);
    assertIncluyeId(body.detalleActividades, enero1.id);
    assertIncluyeId(body.detalleActividades, enero2.id);
    assertExcluyeId(body.detalleActividades, marzo.id);
  });

  test('actividades filtra por temporada', async () => {
    const admin = await crearUsuario('administrador');
    const seca = await crearEvento({ nombre: 'Actividad seca', temporada: Temporada.SECA });
    const lluviosa1 = await crearEvento({ nombre: 'Actividad lluviosa 1', temporada: Temporada.LLUVIOSA });
    const lluviosa2 = await crearEvento({ nombre: 'Actividad lluviosa 2', temporada: Temporada.LLUVIOSA });

    const respuesta = await solicitar(
      '/api/reportes/eventos/estadisticas/eventos?fechaInicio=2020-01-01&fechaFin=2020-01-31&temporada=lluviosa',
      crearToken(admin.id, 'administrador'),
    );

    assert.equal(respuesta.status, 200, respuesta.texto);
    const body = comoObjeto(respuesta.body);
    assert.equal(body.totalActividades, 2);
    assertIncluyeId(body.detalleActividades, lluviosa1.id);
    assertIncluyeId(body.detalleActividades, lluviosa2.id);
    assertExcluyeId(body.detalleActividades, seca.id);
  });

  test('actividades filtra por tipo de actividad', async () => {
    const admin = await crearUsuario('administrador');
    const evento = await crearEvento({ nombre: 'Actividad tipo evento', tipoActividad: TipoActividad.EVENTO });
    const capacitacion1 = await crearEvento({ nombre: 'Actividad tipo capacitacion 1', tipoActividad: TipoActividad.CAPACITACION });
    const capacitacion2 = await crearEvento({ nombre: 'Actividad tipo capacitacion 2', tipoActividad: TipoActividad.CAPACITACION });

    const respuesta = await solicitar(
      '/api/reportes/eventos/estadisticas/eventos?fechaInicio=2020-01-01&fechaFin=2020-01-31&tipoActividad=capacitacion',
      crearToken(admin.id, 'administrador'),
    );

    assert.equal(respuesta.status, 200, respuesta.texto);
    const body = comoObjeto(respuesta.body);
    assert.equal(body.totalActividades, 2);
    assertIncluyeId(body.detalleActividades, capacitacion1.id);
    assertIncluyeId(body.detalleActividades, capacitacion2.id);
    assertExcluyeId(body.detalleActividades, evento.id);
  });

  test('incidencias filtra por rango de fechas', async () => {
    const admin = await crearUsuario('administrador');
    const enero1 = await crearIncidencia({
      categoria: CategoriaIncidencia.INFRAESTRUCTURA,
      prioridad: PrioridadIncidencia.ALTA,
      estado: EstadoIncidencia.EN_PROCESO,
      fechaRegistro: '2020-01-05 09:00:00',
    });
    const enero2 = await crearIncidencia({
      categoria: CategoriaIncidencia.SEGURIDAD,
      prioridad: PrioridadIncidencia.BAJA,
      estado: EstadoIncidencia.PENDIENTE,
      fechaRegistro: '2020-01-20 09:00:00',
    });
    const marzo = await crearIncidencia({
      categoria: CategoriaIncidencia.AMBIENTAL,
      prioridad: PrioridadIncidencia.MEDIA,
      estado: EstadoIncidencia.RESUELTA,
      fechaRegistro: '2020-03-05 09:00:00',
    });

    const respuesta = await solicitar(
      '/api/reportes/estadisticas/incidencias?fechaInicio=2020-01-01&fechaFin=2020-01-31',
      crearToken(admin.id, 'administrador'),
    );

    assert.equal(respuesta.status, 200, respuesta.texto);
    const body = comoObjeto(respuesta.body);
    assert.equal(body.totalIncidencias, 2);
    assertIncluyeId(body.detalleIncidencias, enero1.id);
    assertIncluyeId(body.detalleIncidencias, enero2.id);
    assertExcluyeId(body.detalleIncidencias, marzo.id);
  });

  test('incidencias filtra por categoria', async () => {
    const admin = await crearUsuario('administrador');
    const infraestructura1 = await crearIncidencia({
      categoria: CategoriaIncidencia.INFRAESTRUCTURA,
      prioridad: PrioridadIncidencia.ALTA,
      estado: EstadoIncidencia.EN_PROCESO,
      fechaRegistro: '2020-01-05 09:00:00',
    });
    const infraestructura2 = await crearIncidencia({
      categoria: CategoriaIncidencia.INFRAESTRUCTURA,
      prioridad: PrioridadIncidencia.BAJA,
      estado: EstadoIncidencia.PENDIENTE,
      fechaRegistro: '2020-01-06 09:00:00',
    });
    const seguridad = await crearIncidencia({
      categoria: CategoriaIncidencia.SEGURIDAD,
      prioridad: PrioridadIncidencia.MEDIA,
      estado: EstadoIncidencia.RESUELTA,
      fechaRegistro: '2020-01-07 09:00:00',
    });

    const respuesta = await solicitar(
      '/api/reportes/estadisticas/incidencias?fechaInicio=2020-01-01&fechaFin=2020-01-31&categoria=infraestructura',
      crearToken(admin.id, 'administrador'),
    );

    assert.equal(respuesta.status, 200, respuesta.texto);
    const body = comoObjeto(respuesta.body);
    assert.equal(body.totalIncidencias, 2);
    assertIncluyeId(body.detalleIncidencias, infraestructura1.id);
    assertIncluyeId(body.detalleIncidencias, infraestructura2.id);
    assertExcluyeId(body.detalleIncidencias, seguridad.id);
  });

  test('incidencias filtra por prioridad', async () => {
    const admin = await crearUsuario('administrador');
    const alta1 = await crearIncidencia({
      categoria: CategoriaIncidencia.INFRAESTRUCTURA,
      prioridad: PrioridadIncidencia.ALTA,
      estado: EstadoIncidencia.EN_PROCESO,
      fechaRegistro: '2020-01-05 09:00:00',
    });
    const alta2 = await crearIncidencia({
      categoria: CategoriaIncidencia.SEGURIDAD,
      prioridad: PrioridadIncidencia.ALTA,
      estado: EstadoIncidencia.PENDIENTE,
      fechaRegistro: '2020-01-06 09:00:00',
    });
    const baja = await crearIncidencia({
      categoria: CategoriaIncidencia.AMBIENTAL,
      prioridad: PrioridadIncidencia.BAJA,
      estado: EstadoIncidencia.RESUELTA,
      fechaRegistro: '2020-01-07 09:00:00',
    });

    const respuesta = await solicitar(
      '/api/reportes/estadisticas/incidencias?fechaInicio=2020-01-01&fechaFin=2020-01-31&prioridad=alta',
      crearToken(admin.id, 'administrador'),
    );

    assert.equal(respuesta.status, 200, respuesta.texto);
    const body = comoObjeto(respuesta.body);
    assert.equal(body.totalIncidencias, 2);
    assertIncluyeId(body.detalleIncidencias, alta1.id);
    assertIncluyeId(body.detalleIncidencias, alta2.id);
    assertExcluyeId(body.detalleIncidencias, baja.id);
  });

  test('incidencias filtra por estado', async () => {
    const admin = await crearUsuario('administrador');
    const enProceso1 = await crearIncidencia({
      categoria: CategoriaIncidencia.INFRAESTRUCTURA,
      prioridad: PrioridadIncidencia.ALTA,
      estado: EstadoIncidencia.EN_PROCESO,
      fechaRegistro: '2020-01-05 09:00:00',
    });
    const enProceso2 = await crearIncidencia({
      categoria: CategoriaIncidencia.SEGURIDAD,
      prioridad: PrioridadIncidencia.BAJA,
      estado: EstadoIncidencia.EN_PROCESO,
      fechaRegistro: '2020-01-06 09:00:00',
    });
    const pendiente = await crearIncidencia({
      categoria: CategoriaIncidencia.AMBIENTAL,
      prioridad: PrioridadIncidencia.MEDIA,
      estado: EstadoIncidencia.PENDIENTE,
      fechaRegistro: '2020-01-07 09:00:00',
    });

    const respuesta = await solicitar(
      '/api/reportes/estadisticas/incidencias?fechaInicio=2020-01-01&fechaFin=2020-01-31&estado=en_proceso',
      crearToken(admin.id, 'administrador'),
    );

    assert.equal(respuesta.status, 200, respuesta.texto);
    const body = comoObjeto(respuesta.body);
    assert.equal(body.totalIncidencias, 2);
    assertIncluyeId(body.detalleIncidencias, enProceso1.id);
    assertIncluyeId(body.detalleIncidencias, enProceso2.id);
    assertExcluyeId(body.detalleIncidencias, pendiente.id);
  });

  test('documenta que filtros de visitas quedan bloqueados', () => {
    assert.deepEqual(REPORTE_VISITAS_BLOQUEADO, {
      estado: 'BLOQUEADO',
      motivo: 'No existe reporte de visitas ni filtros de visitas en Reportes y Estadisticas',
    });
  });
});
