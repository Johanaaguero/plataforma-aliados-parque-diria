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

const databaseOriginal = process.env.DB_DATABASE;
const jwtOriginal = process.env.JWT_SECRET;
const databaseTest = `reportes_consistencia_${Date.now()}_${process.pid}_${randomBytes(4).toString('hex')}_test`;
const patronBaseTest = /^reportes_consistencia_\d+_\d+_[a-f0-9]{8}_test$/;
process.env.DB_DATABASE = databaseTest;
process.env.JWT_SECRET = 'reportes-estadisticas-consistencia-test';

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

const sumaObjetoNumerico = (valor: unknown): number =>
  Object.values(comoObjeto(valor)).reduce<number>(
    (total, cantidad) => total + Number(cantidad),
    0,
  );

const sumaArregloCantidad = (valor: unknown): number =>
  comoArreglo(valor).reduce(
    (total, item) => total + Number(item.cantidad),
    0,
  );

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
      nombreUsuario: `consistencia_reportes_${usuarioId}`,
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
    { nombre: 'super_admin', descripcion: 'Super admin de prueba' },
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
      nombreUsuario: `consistencia_usuario_${secuencia}`,
      nombre: 'Usuario Consistencia',
      apellidos: `Reporte ${secuencia}`,
      correo: `consistencia.reportes.${secuencia}@test.local`,
      telefono: `8755${String(secuencia).padStart(4, '0')}`,
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
      nombre: `Actividad consistencia ${secuencia}`,
      descripcion: 'Fixture controlado para consistencia.',
      fecha: '2020-01-15',
      hora: '09:00:00',
      lugar: 'Sector de prueba consistencia',
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
      nombreCompleto: `Visitante consistencia ${secuencia}`,
      fechaNacimiento: '1991-03-20',
      tipoIdentificacion: 'cedula',
      numeroIdentificacion: `4049${String(secuencia).padStart(5, '0')}`,
      correo: `reserva.consistencia.${secuencia}@test.local`,
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
      descripcion: 'Categoria controlada para consistencia.',
    }),
  );
};

const crearEmprendimiento = async (
  categoria: CategoriaEmprendimiento,
  estadoPublicacion: EstadoPublicacion,
): Promise<Emprendimiento> => {
  const conexion = await exigirConexionAislada();
  secuencia += 1;
  return conexion.getRepository(Emprendimiento).save(
    conexion.getRepository(Emprendimiento).create({
      nombre: `Emprendimiento consistencia ${estadoPublicacion} ${secuencia}`,
      descripcion: 'Fixture controlado para consistencia de emprendimientos.',
      categoria,
      estadoPublicacion,
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
      titulo: `Incidencia consistencia ${secuencia}`,
      descripcion: 'Fixture controlado para consistencia de incidencias.',
      categoria: cambios.categoria,
      prioridad: cambios.prioridad,
      estado: cambios.estado,
      esPublica: true,
      ubicacion: `Sector consistencia ${secuencia}`,
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
  const reportesUsuariosRoutes = await import(
    '../modulos/Autenticación y gestión de usuario/ReporteEstadistica/ReportesUsuariosRoutes'
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
  app.use('/api/reportes/usuarios', reportesUsuariosRoutes.default);
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

describe('Task 4049 - consistencia de reportes estadisticos', () => {
  test('reservas mantiene consistencia entre total, detalle, agrupaciones y filtros', async () => {
    const admin = await crearUsuario('administrador');
    const evento = await crearEvento({
      nombre: 'Evento consistencia reservas',
      temporada: Temporada.SECA,
      tipoActividad: TipoActividad.EVENTO,
    });

    await crearReserva(evento, EstadoReserva.PENDIENTE, '2020-01-05 09:00:00');
    await crearReserva(evento, EstadoReserva.APROBADA, '2020-01-20 10:00:00');
    await crearReserva(evento, EstadoReserva.RECHAZADA, '2020-02-05 11:00:00');
    await crearReserva(evento, EstadoReserva.CANCELADA, '2020-02-15 12:00:00');

    const respuesta = await solicitar(
      '/api/reportes/reservas/estadisticas/reservas?fechaInicio=2020-01-01&fechaFin=2020-02-29&temporada=seca&tipoActividad=evento',
      crearToken(admin.id, 'administrador'),
    );

    assert.equal(respuesta.status, 200, respuesta.texto);
    const body = comoObjeto(respuesta.body);
    const total = Number(body.totalReservas);
    assert.equal(total, comoArreglo(body.detalleReservas).length);
    assert.equal(sumaObjetoNumerico(body.reservasPorEstado), total);
    assert.equal(sumaArregloCantidad(body.reservasPorMes), total);
    assert.equal(sumaObjetoNumerico(body.reservasPorTipo), total);
    assert.equal(sumaObjetoNumerico(body.reservasPorTemporada), total);

    const periodo = comoObjeto(body.periodo);
    const filtros = comoObjeto(body.filtros);
    assert.equal(periodo.fechaInicio, '2020-01-01');
    assert.equal(periodo.fechaFin, '2020-02-29');
    assert.equal(filtros.temporada, 'seca');
    assert.equal(filtros.tipoActividad, 'evento');
    assert.equal(comoObjeto(body.informacionGeneral).tipo, 'reservas');
  });

  test('emprendimientos mantiene consistencia entre total, estados, categorias y porcentajes', async () => {
    const admin = await crearUsuario('administrador');
    const gastronomia = await crearCategoria('Gastronomia consistencia');
    const senderismo = await crearCategoria('Senderismo consistencia');
    await crearEmprendimiento(gastronomia, EstadoPublicacion.PUBLICADO);
    await crearEmprendimiento(gastronomia, EstadoPublicacion.BORRADOR);
    await crearEmprendimiento(gastronomia, EstadoPublicacion.NO_PUBLICADO);
    await crearEmprendimiento(senderismo, EstadoPublicacion.DESACTIVADO);

    const respuesta = await solicitar(
      '/api/reportes/estadisticas/emprendimientos?periodo=personalizado&fechaInicio=2000-01-01&fechaFin=2099-12-31',
      crearToken(admin.id, 'administrador'),
    );

    assert.equal(respuesta.status, 200, respuesta.texto);
    const body = comoObjeto(respuesta.body);
    const total = Number(body.total);
    assert.equal(total, comoArreglo(body.emprendimientos).length);
    assert.equal(
      Number(body.publicados) +
        Number(body.borradores) +
        Number(body.noPublicados) +
        Number(body.desactivados),
      total,
    );
    assert.equal(sumaArregloCantidad(body.categorias), total);
    assert.deepEqual(comoObjeto(body.porcentajesPorEstado), {
      publicados: 25,
      noPublicados: 25,
      desactivados: 25,
      borradores: 25,
    });
    assert.equal(body.periodo, 'personalizado');
    assert.equal(body.fechaInicio, '2000-01-01');
    assert.equal(body.fechaFin, '2099-12-31');
    assert.equal(comoObjeto(body.informacionGeneral).tipo, 'emprendimientos');
  });

  test('actividades y eventos mantiene consistencia entre total, detalle y agrupaciones', async () => {
    const admin = await crearUsuario('administrador');
    await crearEvento({ nombre: 'Evento uno', fecha: '2020-01-10', tipoActividad: TipoActividad.EVENTO });
    await crearEvento({ nombre: 'Evento dos', fecha: '2020-01-20', tipoActividad: TipoActividad.EVENTO });
    await crearEvento({
      nombre: 'Capacitacion uno',
      fecha: '2020-02-10',
      tipoActividad: TipoActividad.CAPACITACION,
      temporada: Temporada.LLUVIOSA,
    });
    await crearEvento({
      nombre: 'Capacitacion dos',
      fecha: '2020-02-20',
      tipoActividad: TipoActividad.CAPACITACION,
      temporada: Temporada.LLUVIOSA,
    });

    const respuesta = await solicitar(
      '/api/reportes/eventos/estadisticas/eventos?fechaInicio=2020-01-01&fechaFin=2020-02-29',
      crearToken(admin.id, 'administrador'),
    );

    assert.equal(respuesta.status, 200, respuesta.texto);
    const body = comoObjeto(respuesta.body);
    const total = Number(body.totalActividades);
    assert.equal(total, comoArreglo(body.detalleActividades).length);
    assert.equal(sumaArregloCantidad(body.actividadesPorMes), total);
    assert.equal(sumaObjetoNumerico(body.actividadesPorTipo), total);
    assert.equal(sumaObjetoNumerico(body.actividadesPorEstado), total);
    assert.equal(sumaObjetoNumerico(body.actividadesPorTemporada), total);

    const periodo = comoObjeto(body.periodo);
    assert.equal(periodo.fechaInicio, '2020-01-01');
    assert.equal(periodo.fechaFin, '2020-02-29');
    assert.equal(comoObjeto(body.informacionGeneral).tipo, 'eventos');
  });

  test('incidencias mantiene consistencia entre total, detalle, agrupaciones y porcentajes', async () => {
    const admin = await crearUsuario('administrador');
    await crearIncidencia({
      categoria: CategoriaIncidencia.INFRAESTRUCTURA,
      prioridad: PrioridadIncidencia.ALTA,
      estado: EstadoIncidencia.EN_PROCESO,
      fechaRegistro: '2020-01-05 09:00:00',
    });
    await crearIncidencia({
      categoria: CategoriaIncidencia.INFRAESTRUCTURA,
      prioridad: PrioridadIncidencia.ALTA,
      estado: EstadoIncidencia.EN_PROCESO,
      fechaRegistro: '2020-01-20 09:00:00',
    });
    await crearIncidencia({
      categoria: CategoriaIncidencia.SEGURIDAD,
      prioridad: PrioridadIncidencia.BAJA,
      estado: EstadoIncidencia.PENDIENTE,
      fechaRegistro: '2020-02-05 09:00:00',
    });

    const respuesta = await solicitar(
      '/api/reportes/estadisticas/incidencias?fechaInicio=2020-01-01&fechaFin=2020-02-29',
      crearToken(admin.id, 'administrador'),
    );

    assert.equal(respuesta.status, 200, respuesta.texto);
    const body = comoObjeto(respuesta.body);
    const total = Number(body.totalIncidencias);
    assert.equal(total, comoArreglo(body.detalleIncidencias).length);
    assert.equal(sumaArregloCantidad(body.incidenciasPorMes), total);
    assert.equal(sumaObjetoNumerico(body.incidenciasPorCategoria), total);
    assert.equal(sumaObjetoNumerico(body.incidenciasPorPrioridad), total);
    assert.equal(sumaObjetoNumerico(body.incidenciasPorEstado), total);

    const porcentajes = comoObjeto(body.porcentajesPorCategoria);
    assert.equal(porcentajes.infraestructura, 67);
    assert.equal(porcentajes.seguridad, 33);
    assert.equal(comoObjeto(body.informacionGeneral).tipo, 'incidencias');
  });

  test('usuarios mantiene consistencia entre total, roles y registros por mes', async () => {
    const admin = await crearUsuario('administrador');
    await crearUsuario('asociado');
    await crearUsuario('visitante');
    await crearUsuario('super_admin');

    const respuesta = await solicitar(
      '/api/reportes/usuarios?periodo=personalizado&fechaInicio=2000-01-01&fechaFin=2099-12-31',
      crearToken(admin.id, 'administrador'),
    );

    assert.equal(respuesta.status, 200, respuesta.texto);
    const body = comoObjeto(respuesta.body);
    const total = Number(body.total);
    assert.equal(total, comoArreglo(body.usuarios).length);
    assert.equal(
      Number(body.administradores) +
        Number(body.asociados) +
        Number(body.visitantes) +
        Number(body.superAdmins),
      total,
    );
    assert.equal(sumaArregloCantidad(body.registrosPorMes), total);
    assert.equal(body.periodo, 'personalizado');
    assert.equal(body.fechaInicio, '2000-01-01');
    assert.equal(body.fechaFin, '2099-12-31');
    assert.equal(comoObjeto(body.informacionGeneral).tipo, 'usuarios');
  });
});
