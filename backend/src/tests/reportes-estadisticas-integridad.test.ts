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
import type { DataSource, Repository } from 'typeorm';

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
import { Reporte, TipoReporte } from '../models/Reporte';
import { EstadoReserva, Reserva } from '../models/Reserva';
import type { NombreRol, Rol } from '../models/Rol';
import type { Usuario } from '../models/Usuario';
import type {} from '../middlewares/auth.middleware';
import { errorMiddleware } from '../middlewares/registro.middleware';

config({ path: resolve(process.cwd(), '.env'), quiet: true });

const REPORTE_VISITAS_BLOQUEADO = {
  estado: 'BLOQUEADO',
  motivo: 'No existe implementacion de reportes de visitas',
};

const databaseOriginal = process.env.DB_DATABASE;
const jwtOriginal = process.env.JWT_SECRET;
const databaseTest = `reportes_integridad_${Date.now()}_${process.pid}_${randomBytes(4).toString('hex')}_test`;
const patronBaseTest = /^reportes_integridad_\d+_\d+_[a-f0-9]{8}_test$/;
process.env.DB_DATABASE = databaseTest;
process.env.JWT_SECRET = 'reportes-estadisticas-integridad-test';

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

const fecha = (valor: Date | string | null | undefined): string | null => {
  if (valor === null || valor === undefined) return null;
  if (valor instanceof Date) return valor.toISOString();
  return String(valor);
};

const decimal = (valor: number | string | null | undefined): string | null => {
  if (valor === null || valor === undefined) return null;
  return String(valor);
};

const idsOrdenados = <T extends { id: number }>(registros: T[]): number[] =>
  registros.map((registro) => registro.id).sort((a, b) => a - b);

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
      nombreUsuario: `integridad_reportes_${usuarioId}`,
      rol,
    },
    variableRequerida('JWT_SECRET'),
    { expiresIn: '1h' },
  );

const repositorio = async <T extends object>(
  entidad: new (...args: any[]) => T,
): Promise<Repository<T>> => {
  const conexion = await exigirConexionAislada();
  return conexion.getRepository(entidad);
};

const contarReportes = async (tipoReporte: TipoReporte): Promise<number> =>
  (await repositorio(Reporte)).countBy({ tipoReporte });

const assertTrazabilidad = async (
  tipoReporte: TipoReporte,
  antes: number,
): Promise<void> => {
  const despues = await contarReportes(tipoReporte);
  assert.equal(despues, antes + 1);
};

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
    { nombre: 'super_admin', descripcion: 'Super administrador de prueba' },
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
      nombreUsuario: `integridad_usuario_${secuencia}`,
      nombre: 'Usuario Integridad',
      apellidos: `Reporte ${secuencia}`,
      correo: `integridad.reportes.${secuencia}@test.local`,
      telefono: `8777${String(secuencia).padStart(4, '0')}`,
      contraseña: 'hash-no-utilizado',
      rol: rolEntidad,
    } as Partial<Usuario>),
  );
};

const crearEvento = async (
  cambios: ConstructorParameters<typeof EventosCapacitaciones>[0] = {},
): Promise<EventosCapacitaciones> => {
  secuencia += 1;
  return (await repositorio(EventosCapacitaciones)).save(
    new EventosCapacitaciones({
      nombre: `Actividad integridad ${secuencia}`,
      descripcion: 'Fixture controlado para integridad.',
      fecha: '2020-01-15',
      hora: '09:00:00',
      lugar: 'Sector integridad',
      tipoActividad: TipoActividad.EVENTO,
      cupoMaximo: 20,
      cuposDisponibles: 12,
      cupoMinimo: 2,
      edadMinima: 12,
      edadMaxima: 75,
      estado: EstadoEventoCapacitacion.PUBLICADO,
      temporada: Temporada.SECA,
      ...cambios,
    }),
  );
};

const crearReserva = async (
  evento: EventosCapacitaciones,
  usuario: Usuario,
): Promise<Reserva> =>
  (await repositorio(Reserva)).save(
    (await repositorio(Reserva)).create({
      usuarioId: usuario.id,
      eventoCapacitacionId: evento.id,
      usuario,
      eventoCapacitacion: evento,
      nombreCompleto: 'Visitante Integridad',
      fechaNacimiento: '1992-04-15',
      tipoIdentificacion: 'cedula',
      numeroIdentificacion: `4077${String(secuencia).padStart(5, '0')}`,
      correo: `reserva.integridad.${secuencia}@test.local`,
      telefono: '+50686665555',
      estado: EstadoReserva.APROBADA,
    }),
  );

const crearCategoria = async (): Promise<CategoriaEmprendimiento> => {
  secuencia += 1;
  return (await repositorio(CategoriaEmprendimiento)).save(
    new CategoriaEmprendimiento({
      nombre: `Categoria integridad ${secuencia}`,
      descripcion: 'Categoria controlada para integridad.',
    }),
  );
};

const crearEmprendimiento = async (
  categoria: CategoriaEmprendimiento,
): Promise<Emprendimiento> => {
  secuencia += 1;
  return (await repositorio(Emprendimiento)).save(
    (await repositorio(Emprendimiento)).create({
      nombre: `Emprendimiento integridad ${secuencia}`,
      descripcion: 'Fixture controlado de integridad.',
      categoria,
      direccion: 'Direccion integridad',
      provincia: 'Guanacaste',
      canton: 'Santa Cruz',
      distrito: 'Diria',
      latitud: 10.12345678,
      longitud: -85.12345678,
      correoElectronico: `emprendimiento.integridad.${secuencia}@test.local`,
      telefono: '+50681112222',
      estadoPublicacion: EstadoPublicacion.PUBLICADO,
    }),
  );
};

const crearIncidencia = async (): Promise<Incidencia> => {
  secuencia += 1;
  return (await repositorio(Incidencia)).save(
    (await repositorio(Incidencia)).create({
      codigo: `I${String(secuencia).padStart(7, '0')}`,
      titulo: `Incidencia integridad ${secuencia}`,
      descripcion: 'Fixture controlado para integridad de incidencias.',
      categoria: CategoriaIncidencia.INFRAESTRUCTURA,
      prioridad: PrioridadIncidencia.ALTA,
      estado: EstadoIncidencia.EN_PROCESO,
      esPublica: true,
      ubicacion: 'Sendero integridad',
      latitud: 10.22222222,
      longitud: -85.22222222,
      observacionesAdmin: 'Observacion inicial',
    }),
  );
};

const snapshotReservas = async () => {
  const registros = await (await repositorio(Reserva)).find({
    order: { id: 'ASC' },
  });

  return registros.map((reserva) => ({
    id: reserva.id,
    usuarioId: reserva.usuarioId,
    eventoCapacitacionId: reserva.eventoCapacitacionId,
    nombreCompleto: reserva.nombreCompleto,
    fechaNacimiento: reserva.fechaNacimiento,
    tipoIdentificacion: reserva.tipoIdentificacion,
    numeroIdentificacion: reserva.numeroIdentificacion,
    correo: reserva.correo,
    telefono: reserva.telefono,
    estado: reserva.estado,
    createdAt: fecha(reserva.createdAt),
    updatedAt: fecha(reserva.updatedAt),
  }));
};

const snapshotCategorias = async () => {
  const registros = await (await repositorio(CategoriaEmprendimiento)).find({
    order: { id: 'ASC' },
  });

  return registros.map((categoria) => ({
    id: categoria.id,
    nombre: categoria.nombre,
    descripcion: categoria.descripcion ?? null,
  }));
};

const snapshotEmprendimientos = async () => {
  const registros = await (await repositorio(Emprendimiento)).find({
    relations: { categoria: true },
    order: { id: 'ASC' },
  });

  return registros.map((emprendimiento) => ({
    id: emprendimiento.id,
    nombre: emprendimiento.nombre,
    descripcion: emprendimiento.descripcion ?? null,
    estadoPublicacion: emprendimiento.estadoPublicacion,
    fechaPublicacion: fecha(emprendimiento.fechaPublicacion),
    fechaCreacion: fecha(emprendimiento.fechaCreacion),
    fechaActualizacion: fecha(emprendimiento.fechaActualizacion),
    categoriaId: emprendimiento.categoria?.id ?? null,
    direccion: emprendimiento.direccion ?? null,
    provincia: emprendimiento.provincia ?? null,
    canton: emprendimiento.canton ?? null,
    distrito: emprendimiento.distrito ?? null,
    latitud: decimal(emprendimiento.latitud),
    longitud: decimal(emprendimiento.longitud),
    correoElectronico: emprendimiento.correoElectronico ?? null,
    telefono: emprendimiento.telefono ?? null,
  }));
};

const snapshotEventos = async () => {
  const registros = await (await repositorio(EventosCapacitaciones)).find({
    order: { id: 'ASC' },
  });

  return registros.map((evento) => ({
    id: evento.id,
    nombre: evento.nombre,
    descripcion: evento.descripcion,
    fecha: evento.fecha,
    hora: evento.hora,
    lugar: evento.lugar,
    tipoActividad: evento.tipoActividad,
    cupoMaximo: evento.cupoMaximo,
    cuposDisponibles: evento.cuposDisponibles,
    cupoMinimo: evento.cupoMinimo,
    edadMinima: evento.edadMinima,
    edadMaxima: evento.edadMaxima,
    estado: evento.estado,
    temporada: evento.temporada,
    createdAt: fecha(evento.createdAt),
    updatedAt: fecha(evento.updatedAt),
  }));
};

const snapshotIncidencias = async () => {
  const registros = await (await repositorio(Incidencia)).find({
    order: { id: 'ASC' },
  });

  return registros.map((incidencia) => ({
    id: incidencia.id,
    codigo: incidencia.codigo,
    titulo: incidencia.titulo,
    descripcion: incidencia.descripcion,
    categoria: incidencia.categoria,
    prioridad: incidencia.prioridad,
    estado: incidencia.estado,
    esPublica: incidencia.esPublica,
    ubicacion: incidencia.ubicacion ?? null,
    latitud: decimal(incidencia.latitud),
    longitud: decimal(incidencia.longitud),
    observacionesAdmin: incidencia.observacionesAdmin ?? null,
    fechaResolucion: fecha(incidencia.fechaResolucion),
    fechaRegistro: fecha(incidencia.fechaRegistro),
    fechaActualizacion: fecha(incidencia.fechaActualizacion),
  }));
};

const snapshotUsuarios = async () => {
  const registros = await (await repositorio(UsuarioModel)).find({
    relations: { rol: true },
    order: { id: 'ASC' },
  });

  return registros.map((usuario) => ({
    id: usuario.id,
    nombreUsuario: usuario.nombreUsuario,
    nombre: usuario.nombre,
    apellidos: usuario.apellidos,
    correo: usuario.correo,
    telefono: usuario.telefono,
    rolId: usuario.rol.id,
    rolNombre: usuario.rol.nombre,
    createdAt: fecha(usuario.createdAt),
    updatedAt: fecha(usuario.updatedAt),
  }));
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

describe('Task 4077 - integridad de informacion en reportes estadisticos', () => {
  test('reservas conserva datos de dominio y registra trazabilidad', async () => {
    const admin = await crearUsuario('administrador');
    const visitante = await crearUsuario('visitante');
    const evento = await crearEvento();
    await crearReserva(evento, visitante);

    const antes = await snapshotReservas();
    const idsAntes = idsOrdenados(antes);
    const reportesAntes = await contarReportes(TipoReporte.RESERVAS);
    const respuesta = await solicitar(
      '/api/reportes/reservas/estadisticas/reservas',
      crearToken(admin.id, 'administrador'),
    );

    assert.equal(respuesta.status, 200, respuesta.texto);
    assert.ok(comoObjeto(respuesta.body).reporte);
    const despues = await snapshotReservas();
    assert.deepEqual(despues, antes);
    assert.deepEqual(idsOrdenados(despues), idsAntes);
    assert.equal(despues.length, antes.length);
    await assertTrazabilidad(TipoReporte.RESERVAS, reportesAntes);
  });

  test('emprendimientos conserva datos de dominio y registra trazabilidad', async () => {
    const admin = await crearUsuario('administrador');
    const categoria = await crearCategoria();
    await crearEmprendimiento(categoria);

    const emprendimientosAntes = await snapshotEmprendimientos();
    const categoriasAntes = await snapshotCategorias();
    const reportesAntes = await contarReportes(TipoReporte.EMPRENDIMIENTOS);
    const respuesta = await solicitar(
      '/api/reportes/estadisticas/emprendimientos',
      crearToken(admin.id, 'administrador'),
    );

    assert.equal(respuesta.status, 200, respuesta.texto);
    const emprendimientosDespues = await snapshotEmprendimientos();
    const categoriasDespues = await snapshotCategorias();
    assert.deepEqual(emprendimientosDespues, emprendimientosAntes);
    assert.deepEqual(categoriasDespues, categoriasAntes);
    assert.deepEqual(idsOrdenados(emprendimientosDespues), idsOrdenados(emprendimientosAntes));
    assert.deepEqual(idsOrdenados(categoriasDespues), idsOrdenados(categoriasAntes));
    assert.equal(emprendimientosDespues.length, emprendimientosAntes.length);
    assert.equal(categoriasDespues.length, categoriasAntes.length);
    await assertTrazabilidad(TipoReporte.EMPRENDIMIENTOS, reportesAntes);
  });

  test('actividades y eventos conserva datos de dominio y registra trazabilidad', async () => {
    const admin = await crearUsuario('administrador');
    await crearEvento({
      tipoActividad: TipoActividad.CAPACITACION,
      temporada: Temporada.LLUVIOSA,
    });

    const antes = await snapshotEventos();
    const reportesAntes = await contarReportes(TipoReporte.EVENTOS);
    const respuesta = await solicitar(
      '/api/reportes/eventos/estadisticas/eventos',
      crearToken(admin.id, 'administrador'),
    );

    assert.equal(respuesta.status, 200, respuesta.texto);
    const despues = await snapshotEventos();
    assert.deepEqual(despues, antes);
    assert.deepEqual(idsOrdenados(despues), idsOrdenados(antes));
    assert.equal(despues.length, antes.length);
    await assertTrazabilidad(TipoReporte.EVENTOS, reportesAntes);
  });

  test('incidencias conserva datos de dominio y registra trazabilidad', async () => {
    const admin = await crearUsuario('administrador');
    await crearIncidencia();

    const antes = await snapshotIncidencias();
    const reportesAntes = await contarReportes(TipoReporte.INCIDENCIAS);
    const respuesta = await solicitar(
      '/api/reportes/estadisticas/incidencias',
      crearToken(admin.id, 'administrador'),
    );

    assert.equal(respuesta.status, 200, respuesta.texto);
    const despues = await snapshotIncidencias();
    assert.deepEqual(despues, antes);
    assert.deepEqual(idsOrdenados(despues), idsOrdenados(antes));
    assert.equal(despues.length, antes.length);
    await assertTrazabilidad(TipoReporte.INCIDENCIAS, reportesAntes);
  });

  test('usuarios conserva datos de dominio y registra trazabilidad', async () => {
    const admin = await crearUsuario('administrador');
    await crearUsuario('asociado');
    await crearUsuario('visitante');

    const antes = await snapshotUsuarios();
    const reportesAntes = await contarReportes(TipoReporte.USUARIOS);
    const respuesta = await solicitar(
      '/api/reportes/usuarios',
      crearToken(admin.id, 'administrador'),
    );

    assert.equal(respuesta.status, 200, respuesta.texto);
    const despues = await snapshotUsuarios();
    assert.deepEqual(despues, antes);
    assert.deepEqual(idsOrdenados(despues), idsOrdenados(antes));
    assert.equal(despues.length, antes.length);
    await assertTrazabilidad(TipoReporte.USUARIOS, reportesAntes);
  });

  test('documenta que integridad de visitas queda bloqueada', () => {
    assert.deepEqual(REPORTE_VISITAS_BLOQUEADO, {
      estado: 'BLOQUEADO',
      motivo: 'No existe implementacion de reportes de visitas',
    });
  });
});
