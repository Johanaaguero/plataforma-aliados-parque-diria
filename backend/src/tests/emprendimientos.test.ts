import 'reflect-metadata';
import assert from 'node:assert/strict';
import { after, before, beforeEach, describe, test } from 'node:test';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import { resolve } from 'node:path';
import { config } from 'dotenv';
import express from 'express';
import jwt from 'jsonwebtoken';
import type { DataSource } from 'typeorm';
import { errorMiddleware } from '../middlewares/registro.middleware';
import {
  Emprendimiento,
  EstadoPublicacion,
} from '../models/Emprendimiento';
import { CategoriaEmprendimiento } from '../models/CategoriaEmprendimiento';
import { Usuario } from '../models/Usuario';
import { Rol, type NombreRol } from '../models/Rol';

config({ path: resolve(process.cwd(), '.env') });

const databaseTest = 'aliados_parque_diria_test';
process.env.DB_DATABASE = databaseTest;
if (process.env.DB_DATABASE !== databaseTest) {
  throw new Error(
    'SEGURIDAD: DB_DATABASE no apunta exactamente a aliados_parque_diria_test.',
  );
}
process.env.JWT_SECRET =
  'publicacion-emprendimientos-test-secret-no-usar-en-produccion';

const variableRequerida = (nombre: string): string => {
  const valor = process.env[nombre];
  if (!valor) throw new Error(`Falta la variable requerida ${nombre}`);
  return valor;
};

interface Actores {
  administrador: Usuario;
  asociado: Usuario;
  visitante: Usuario;
}

interface RespuestaHttp {
  status: number;
  body: unknown;
}

interface ColumnaEsquema {
  COLUMN_NAME: string;
  COLUMN_TYPE: string;
  IS_NULLABLE: 'YES' | 'NO';
  COLUMN_DEFAULT: string | null;
  COLUMN_KEY: string;
}

interface IndiceEsquema {
  INDEX_NAME: string;
  NON_UNIQUE: string | number;
  SEQ_IN_INDEX: string | number;
  COLUMN_NAME: string;
}

interface MigracionRegistrada {
  timestamp: string | number;
  name: string;
}

interface DatosConservados {
  nombre: string;
  descripcion: string | null;
  direccion: string | null;
  latitud: string;
  longitud: string;
  correo_electronico: string;
  telefono: string;
  imagen: string | null;
  categoria_id: number;
}

type ServicioEmprendimiento = typeof import(
  '../modulos/Administración de emprendimientos/Registro de emprendimientos/emprendimiento.service'
).emprendimientoService;

let dataSource: DataSource;
let emprendimientoService: ServicioEmprendimiento;
let server: Server;
let baseUrl: string;
let actores: Actores;
let categoria: CategoriaEmprendimiento;
let secuenciaEmprendimiento = 0;
let baseAisladaConfirmada = false;

const asegurarBaseConfiguradaParaPruebas = (): void => {
  const databaseConfigurada = (
    dataSource.options as { database?: string }
  ).database;

  if (databaseConfigurada !== databaseTest) {
    throw new Error(
      `Ejecución cancelada: el DataSource apunta a ${String(databaseConfigurada)} y no a ${databaseTest}`,
    );
  }
};

const assertTestDatabase = async (): Promise<void> => {
  asegurarBaseConfiguradaParaPruebas();

  const basesConectadas: Array<{ databaseActual: string }> =
    await dataSource.query('SELECT DATABASE() AS databaseActual');
  if (basesConectadas[0]?.databaseActual !== databaseTest) {
    throw new Error(
      'SEGURIDAD: los tests intentaron utilizar una base distinta de aliados_parque_diria_test. Ejecución cancelada.',
    );
  }
  baseAisladaConfirmada = true;
};

const comoObjeto = (valor: unknown): Record<string, unknown> => {
  assert.ok(
    typeof valor === 'object' && valor !== null && !Array.isArray(valor),
    'Se esperaba un objeto JSON',
  );
  return valor as Record<string, unknown>;
};

const solicitar = async (
  path: string,
  options: RequestInit = {},
): Promise<RespuestaHttp> => {
  const response = await fetch(`${baseUrl}${path}`, options);
  const texto = await response.text();

  return {
    status: response.status,
    body: texto.length > 0 ? (JSON.parse(texto) as unknown) : undefined,
  };
};

const tokenPara = (usuario: Usuario, rol: NombreRol): string =>
  jwt.sign(
    {
      id: usuario.id,
      nombreUsuario: usuario.nombreUsuario,
      rol,
    },
    variableRequerida('JWT_SECRET'),
    { expiresIn: '1h' },
  );

const encabezadosJson = (token?: string): Record<string, string> => ({
  'Content-Type': 'application/json',
  ...(token ? { Authorization: `Bearer ${token}` } : {}),
});

const limpiarFixtures = async (): Promise<void> => {
  await assertTestDatabase();
  await dataSource.query('DELETE FROM emprendimientos');
  await dataSource.query('DELETE FROM categorias_emprendimientos');
  await dataSource.query('DELETE FROM historial_cambio_roles');
  await dataSource.query('DELETE FROM login_attempts');
  await dataSource.query('DELETE FROM recuperacion_contrasenas');
  await dataSource.query('DELETE FROM audit_logs');
  await dataSource.query('DELETE FROM token_blacklist');
  await dataSource.query('DELETE FROM usuarios');
  await dataSource.query('DELETE FROM roles');
};

const obtenerRol = (roles: Rol[], nombre: NombreRol): Rol => {
  const rol = roles.find((candidato) => candidato.nombre === nombre);
  assert.ok(rol, `No se pudo preparar el rol ${nombre}`);
  return rol;
};

const prepararFixtures = async (): Promise<void> => {
  await assertTestDatabase();
  const rolRepository = dataSource.getRepository(Rol);
  const usuarioRepository = dataSource.getRepository(Usuario);
  const categoriaRepository = dataSource.getRepository(
    CategoriaEmprendimiento,
  );

  const roles = await rolRepository.save([
    rolRepository.create({
      nombre: 'administrador',
      descripcion: 'Administrador de prueba',
    }),
    rolRepository.create({
      nombre: 'asociado',
      descripcion: 'Asociado de prueba',
    }),
    rolRepository.create({
      nombre: 'visitante',
      descripcion: 'Visitante de prueba',
    }),
  ]);

  const administrador = await usuarioRepository.save(
    usuarioRepository.create({
      nombreUsuario: 'admin_publicacion_test',
      nombre: 'Admin',
      apellidos: 'Publicacion',
      correo: 'admin.publicacion@test.local',
      telefono: '81000001',
      contraseña: 'hash-no-utilizado',
      rol: obtenerRol(roles, 'administrador'),
    }),
  );
  const asociado = await usuarioRepository.save(
    usuarioRepository.create({
      nombreUsuario: 'asociado_publicacion_test',
      nombre: 'Asociado',
      apellidos: 'Publicacion',
      correo: 'asociado.publicacion@test.local',
      telefono: '81000002',
      contraseña: 'hash-no-utilizado',
      rol: obtenerRol(roles, 'asociado'),
    }),
  );
  const visitante = await usuarioRepository.save(
    usuarioRepository.create({
      nombreUsuario: 'visitante_publicacion_test',
      nombre: 'Visitante',
      apellidos: 'Publicacion',
      correo: 'visitante.publicacion@test.local',
      telefono: '81000003',
      contraseña: 'hash-no-utilizado',
      rol: obtenerRol(roles, 'visitante'),
    }),
  );

  actores = { administrador, asociado, visitante };
  categoria = await categoriaRepository.save(
    categoriaRepository.create({
      nombre: 'Categoría publicación test',
      descripcion: 'Categoría aislada para la suite',
    }),
  );
};

const crearEmprendimiento = async (
  completo = true,
): Promise<Emprendimiento> => {
  secuenciaEmprendimiento += 1;
  const repository = dataSource.getRepository(Emprendimiento);
  const sufijo = String(secuenciaEmprendimiento).padStart(2, '0');
  const emprendimiento = repository.create({
    nombre: `Emprendimiento publicación ${sufijo}`,
    ...(completo
      ? { descripcion: `Descripción completa ${sufijo}` }
      : {}),
    categoria,
    direccion: `Dirección ${sufijo}`,
    latitud: 10.12345678,
    longitud: -85.12345678,
    correoElectronico: `emprendimiento.${sufijo}@test.local`,
    telefono: `820000${sufijo}`,
    ...(completo ? { imagen: Buffer.from(`imagen-${sufijo}`) } : {}),
  });

  const guardado = await repository.save(emprendimiento);
  const recargado = await repository.findOne({
    where: { id: guardado.id },
    relations: { categoria: true },
  });
  assert.ok(recargado, 'No se pudo recargar el emprendimiento de prueba');
  return recargado;
};

const obtenerEmprendimiento = async (id: number): Promise<Emprendimiento> => {
  const emprendimiento = await dataSource
    .getRepository(Emprendimiento)
    .findOne({
      where: { id },
      relations: { categoria: true },
    });
  assert.ok(emprendimiento, 'No se encontró el emprendimiento esperado');
  return emprendimiento;
};

const leerDatosConservados = async (
  id: number,
): Promise<DatosConservados> => {
  const filas: DatosConservados[] = await dataSource.query(
    `
      SELECT
        nombre,
        descripcion,
        direccion,
        CAST(latitud AS CHAR) AS latitud,
        CAST(longitud AS CHAR) AS longitud,
        correo_electronico,
        telefono,
        HEX(imagen) AS imagen,
        categoria_id
      FROM emprendimientos
      WHERE id = ?
    `,
    [id],
  );
  const fila = filas[0];
  assert.ok(fila, 'No se encontraron los datos del emprendimiento');
  return fila;
};

const cambiarEstado = async (
  id: number,
  body: Record<string, string>,
  token?: string,
): Promise<RespuestaHttp> =>
  solicitar(`/api/emprendimientos/${id}/publicacion`, {
    method: 'PATCH',
    headers: encabezadosJson(token),
    body: JSON.stringify(body),
  });

before(async () => {
  const dataSourceModule = await import('../data-source');
  const routeModule = await import(
    '../modulos/Administración de emprendimientos/Registro de emprendimientos/emprendimiento.routes'
  );
  const serviceModule = await import(
    '../modulos/Administración de emprendimientos/Registro de emprendimientos/emprendimiento.service'
  );

  dataSource = dataSourceModule.AppDataSource;
  emprendimientoService = serviceModule.emprendimientoService;
  asegurarBaseConfiguradaParaPruebas();
  await dataSource.initialize();

  await assertTestDatabase();

  await dataSource.runMigrations();

  const app = express();
  app.use(express.json());
  app.use('/api/emprendimientos', routeModule.default);
  app.use(errorMiddleware);

  await new Promise<void>((resolveListen, rejectListen) => {
    server = app.listen(0, '127.0.0.1', (error?: Error) => {
      if (error) rejectListen(error);
      else resolveListen();
    });
  });

  const address = server.address() as AddressInfo;
  baseUrl = `http://127.0.0.1:${address.port}`;
});

beforeEach(async () => {
  await assertTestDatabase();
  await limpiarFixtures();
  await prepararFixtures();
});

after(async () => {
  if (server) {
    await new Promise<void>((resolveClose, rejectClose) => {
      server.close((error) => {
        if (error) rejectClose(error);
        else resolveClose();
      });
    });
  }

  if (dataSource?.isInitialized) {
    await assertTestDatabase();
    await limpiarFixtures();
    await dataSource.destroy();
  }
});

describe('publicación de emprendimientos', () => {
  test('la migración registra columnas, ENUM, índice y conserva la PK existente', async () => {
    const columnas: ColumnaEsquema[] = await dataSource.query(`
      SELECT
        COLUMN_NAME,
        COLUMN_TYPE,
        IS_NULLABLE,
        COLUMN_DEFAULT,
        COLUMN_KEY
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'emprendimientos'
    `);
    const indices: IndiceEsquema[] = await dataSource.query(`
      SELECT INDEX_NAME, NON_UNIQUE, SEQ_IN_INDEX, COLUMN_NAME
      FROM information_schema.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'emprendimientos'
    `);
    const migraciones: MigracionRegistrada[] = await dataSource.query(
      `
        SELECT timestamp, name
        FROM migrations
        WHERE name = ?
      `,
      ['PublicacionEmprendimientos1787286000000'],
    );

    const id = columnas.find((columna) => columna.COLUMN_NAME === 'id');
    const estado = columnas.find(
      (columna) => columna.COLUMN_NAME === 'estado_publicacion',
    );
    const fecha = columnas.find(
      (columna) => columna.COLUMN_NAME === 'fecha_publicacion',
    );
    const indiceEstado = indices.find(
      (indice) =>
        indice.INDEX_NAME ===
        'IDX_EMPRENDIMIENTOS_ESTADO_PUBLICACION',
    );

    assert.equal(id?.COLUMN_KEY, 'PRI');
    assert.equal(estado?.COLUMN_TYPE, "enum('no_publicado','publicado')");
    assert.equal(estado?.IS_NULLABLE, 'NO');
    assert.equal(estado?.COLUMN_DEFAULT, 'no_publicado');
    assert.equal(fecha?.COLUMN_TYPE, 'datetime(6)');
    assert.equal(fecha?.IS_NULLABLE, 'YES');
    assert.equal(fecha?.COLUMN_DEFAULT, null);
    assert.equal(indiceEstado?.COLUMN_NAME, 'estado_publicacion');
    assert.equal(Number(indiceEstado?.NON_UNIQUE), 1);
    assert.equal(Number(indiceEstado?.SEQ_IN_INDEX), 1);
    assert.equal(migraciones.length, 1);
    assert.equal(Number(migraciones[0]?.timestamp), 1787286000000);
  });

  test('un emprendimiento nuevo inicia No Publicado y sin fecha de publicación', async () => {
    const respuesta = await solicitar('/api/emprendimientos', {
      method: 'POST',
      headers: encabezadosJson(),
      body: JSON.stringify({
        nombre: 'Emprendimiento creado por HTTP',
        descripcion: 'Descripción creada por HTTP',
        categoriaId: categoria.id,
        direccion: 'Dirección HTTP',
        latitud: 10.25,
        longitud: -85.25,
        correoElectronico: 'creado.http@test.local',
        telefono: '83000001',
      }),
    });

    assert.equal(respuesta.status, 201);
    const body = comoObjeto(respuesta.body);
    assert.equal(
      body.estadoPublicacion,
      EstadoPublicacion.NO_PUBLICADO,
    );

    const creado = await dataSource.getRepository(Emprendimiento).findOne({
      where: { nombre: 'Emprendimiento creado por HTTP' },
    });
    assert.ok(creado);
    assert.equal(creado.estadoPublicacion, EstadoPublicacion.NO_PUBLICADO);
    assert.equal(creado.fechaPublicacion, null);
  });

  test('rechaza el cambio de publicación sin JWT', async () => {
    const emprendimiento = await crearEmprendimiento();
    const respuesta = await cambiarEstado(emprendimiento.id, {
      estadoPublicacion: 'Publicado',
    });

    assert.equal(respuesta.status, 401);
    const recargado = await obtenerEmprendimiento(emprendimiento.id);
    assert.equal(
      recargado.estadoPublicacion,
      EstadoPublicacion.NO_PUBLICADO,
    );
    assert.equal(recargado.fechaPublicacion, null);
  });

  test('rechaza el cambio solicitado por un visitante', async () => {
    const emprendimiento = await crearEmprendimiento();
    const respuesta = await cambiarEstado(
      emprendimiento.id,
      { estadoPublicacion: 'Publicado' },
      tokenPara(actores.visitante, 'visitante'),
    );

    assert.equal(respuesta.status, 403);
    const recargado = await obtenerEmprendimiento(emprendimiento.id);
    assert.equal(
      recargado.estadoPublicacion,
      EstadoPublicacion.NO_PUBLICADO,
    );
  });

  test('rechaza el cambio solicitado por un asociado', async () => {
    const emprendimiento = await crearEmprendimiento();
    const respuesta = await cambiarEstado(
      emprendimiento.id,
      { estadoPublicacion: 'Publicado' },
      tokenPara(actores.asociado, 'asociado'),
    );

    assert.equal(respuesta.status, 403);
    const recargado = await obtenerEmprendimiento(emprendimiento.id);
    assert.equal(
      recargado.estadoPublicacion,
      EstadoPublicacion.NO_PUBLICADO,
    );
  });

  test('responde 404 al cambiar la publicación de un ID inexistente', async () => {
    const respuesta = await cambiarEstado(
      2_147_483_647,
      { estadoPublicacion: 'Publicado' },
      tokenPara(actores.administrador, 'administrador'),
    );

    assert.equal(respuesta.status, 404);
    const body = comoObjeto(respuesta.body);
    assert.equal(body.ok, false);
  });

  test('impide publicar si faltan datos obligatorios para el catálogo', async () => {
    const emprendimiento = await crearEmprendimiento(false);
    const respuesta = await cambiarEstado(
      emprendimiento.id,
      { estadoPublicacion: 'Publicado' },
      tokenPara(actores.administrador, 'administrador'),
    );

    assert.equal(respuesta.status, 400);
    const body = comoObjeto(respuesta.body);
    assert.equal(body.ok, false);
    assert.equal(
      body.message,
      'El emprendimiento no tiene toda la información requerida para publicarse',
    );
    assert.ok(Array.isArray(body.camposFaltantes));
    assert.ok(body.camposFaltantes.includes('descripción'));
    assert.ok(body.camposFaltantes.includes('imagen o logotipo'));
    assert.doesNotMatch(JSON.stringify(body), /sql|stack|query|typeorm/i);

    const recargado = await obtenerEmprendimiento(emprendimiento.id);
    assert.equal(
      recargado.estadoPublicacion,
      EstadoPublicacion.NO_PUBLICADO,
    );
    assert.equal(recargado.fechaPublicacion, null);
  });

  test('un administrador publica, asigna fecha y conserva los demás datos', async () => {
    const emprendimiento = await crearEmprendimiento();
    const datosAntes = await leerDatosConservados(emprendimiento.id);
    const respuesta = await cambiarEstado(
      emprendimiento.id,
      { estadoPublicacion: 'Publicado' },
      tokenPara(actores.administrador, 'administrador'),
    );

    assert.equal(respuesta.status, 200);
    const body = comoObjeto(respuesta.body);
    assert.equal(body.ok, true);
    assert.equal(
      body.message,
      'Emprendimiento publicado correctamente.',
    );
    const data = comoObjeto(body.data);
    assert.equal(data.id, emprendimiento.id);
    assert.equal(data.nombre, emprendimiento.nombre);
    assert.equal(data.estadoPublicacion, EstadoPublicacion.PUBLICADO);
    assert.equal(typeof data.fechaPublicacion, 'string');

    const recargado = await obtenerEmprendimiento(emprendimiento.id);
    assert.equal(recargado.estadoPublicacion, EstadoPublicacion.PUBLICADO);
    assert.ok(recargado.fechaPublicacion instanceof Date);
    assert.deepEqual(
      await leerDatosConservados(emprendimiento.id),
      datosAntes,
    );
  });

  test('el catálogo público devuelve únicamente emprendimientos publicados', async () => {
    const publicado = await crearEmprendimiento();
    const noPublicado = await crearEmprendimiento();
    const publicacion = await cambiarEstado(
      publicado.id,
      { estadoPublicacion: 'Publicado' },
      tokenPara(actores.administrador, 'administrador'),
    );
    assert.equal(publicacion.status, 200);

    const respuesta = await solicitar('/api/emprendimientos/catalogo');
    assert.equal(respuesta.status, 200);
    assert.ok(Array.isArray(respuesta.body));
    const items = respuesta.body.map(comoObjeto);

    assert.deepEqual(
      items.map((item) => item.id),
      [publicado.id],
    );
    assert.equal(
      items[0]?.estadoPublicacion,
      EstadoPublicacion.PUBLICADO,
    );
    assert.equal(items[0]?.nombre, publicado.nombre);
    assert.equal(items[0]?.descripcion, publicado.descripcion);
    assert.equal(items[0]?.categoria, categoria.nombre);
    assert.equal(items[0]?.direccion, publicado.direccion);
    assert.equal(String(items[0]?.latitud), String(publicado.latitud));
    assert.equal(String(items[0]?.longitud), String(publicado.longitud));
    assert.equal(
      items[0]?.correoElectronico,
      publicado.correoElectronico,
    );
    assert.equal(items[0]?.telefono, publicado.telefono);
    assert.equal(
      items[0]?.imagen,
      `data:image/jpeg;base64,${publicado.imagen?.toString('base64')}`,
    );
    assert.ok(!items.some((item) => item.id === noPublicado.id));

    const catalogoLegado = await solicitar(
      '/api/emprendimientos?estado=publicado',
    );
    assert.equal(catalogoLegado.status, 200);
    assert.ok(Array.isArray(catalogoLegado.body));
    assert.deepEqual(
      catalogoLegado.body.map(comoObjeto).map((item) => item.id),
      [publicado.id],
    );
  });

  test('un administrador vuelve un emprendimiento a No Publicado usando el alias estado', async () => {
    const emprendimiento = await crearEmprendimiento();
    const tokenAdministrador = tokenPara(
      actores.administrador,
      'administrador',
    );
    const publicacion = await cambiarEstado(
      emprendimiento.id,
      { estadoPublicacion: 'Publicado' },
      tokenAdministrador,
    );
    assert.equal(publicacion.status, 200);
    const publicado = await obtenerEmprendimiento(emprendimiento.id);
    assert.ok(publicado.fechaPublicacion instanceof Date);
    const fechaPublicacion = publicado.fechaPublicacion.getTime();
    const datosAntes = await leerDatosConservados(emprendimiento.id);

    const respuesta = await cambiarEstado(
      emprendimiento.id,
      { estado: 'No Publicado' },
      tokenAdministrador,
    );

    assert.equal(respuesta.status, 200);
    const body = comoObjeto(respuesta.body);
    assert.equal(body.ok, true);
    assert.equal(
      body.message,
      'Emprendimiento ocultado correctamente.',
    );
    const data = comoObjeto(body.data);
    assert.equal(data.id, emprendimiento.id);
    assert.equal(data.nombre, emprendimiento.nombre);
    assert.equal(
      data.estadoPublicacion,
      EstadoPublicacion.NO_PUBLICADO,
    );
    assert.equal(typeof data.fechaPublicacion, 'string');
    const recargado = await obtenerEmprendimiento(emprendimiento.id);
    assert.equal(
      recargado.estadoPublicacion,
      EstadoPublicacion.NO_PUBLICADO,
    );
    assert.equal(recargado.fechaPublicacion?.getTime(), fechaPublicacion);
    assert.deepEqual(
      await leerDatosConservados(emprendimiento.id),
      datosAntes,
    );

    const catalogo = await solicitar('/api/emprendimientos/catalogo');
    assert.equal(catalogo.status, 200);
    assert.ok(Array.isArray(catalogo.body));
    assert.ok(
      !catalogo.body
        .map(comoObjeto)
        .some((item) => item.id === emprendimiento.id),
    );
  });

  test('el PUT genérico no permite eludir el endpoint de publicación', async () => {
    const emprendimiento = await crearEmprendimiento();
    const respuesta = await solicitar(
      `/api/emprendimientos/${emprendimiento.id}`,
      {
        method: 'PUT',
        headers: encabezadosJson(
          tokenPara(actores.administrador, 'administrador'),
        ),
        body: JSON.stringify({ estadoPublicacion: 'Publicado' }),
      },
    );

    assert.equal(respuesta.status, 400);
    const body = comoObjeto(respuesta.body);
    assert.equal(body.ok, false);
    const recargado = await obtenerEmprendimiento(emprendimiento.id);
    assert.equal(
      recargado.estadoPublicacion,
      EstadoPublicacion.NO_PUBLICADO,
    );
    assert.equal(recargado.fechaPublicacion, null);
  });

  test('impide que una edición deje incompleto un emprendimiento publicado', async () => {
    const emprendimiento = await crearEmprendimiento();
    const tokenAdministrador = tokenPara(
      actores.administrador,
      'administrador',
    );
    const publicacion = await cambiarEstado(
      emprendimiento.id,
      { estadoPublicacion: 'Publicado' },
      tokenAdministrador,
    );
    assert.equal(publicacion.status, 200);

    const respuesta = await solicitar(
      `/api/emprendimientos/${emprendimiento.id}`,
      {
        method: 'PUT',
        headers: encabezadosJson(tokenAdministrador),
        body: JSON.stringify({ descripcion: '' }),
      },
    );

    assert.equal(respuesta.status, 400);
    const recargado = await obtenerEmprendimiento(emprendimiento.id);
    assert.equal(recargado.estadoPublicacion, EstadoPublicacion.PUBLICADO);
    assert.notEqual(recargado.descripcion, '');
  });

  test('separa el catálogo público del listado administrativo completo', async () => {
    const publicado = await crearEmprendimiento();
    const noPublicado = await crearEmprendimiento();
    const tokenAdministrador = tokenPara(
      actores.administrador,
      'administrador',
    );
    const publicacion = await cambiarEstado(
      publicado.id,
      { estadoPublicacion: 'Publicado' },
      tokenAdministrador,
    );
    assert.equal(publicacion.status, 200);

    const listadoSinToken = await solicitar('/api/emprendimientos');
    assert.equal(listadoSinToken.status, 401);

    const listadoAdministrativo = await solicitar(
      '/api/emprendimientos',
      { headers: encabezadosJson(tokenAdministrador) },
    );
    assert.equal(listadoAdministrativo.status, 200);
    assert.ok(Array.isArray(listadoAdministrativo.body));
    const idsAdministrativos = listadoAdministrativo.body
      .map(comoObjeto)
      .map((item) => item.id);
    assert.ok(idsAdministrativos.includes(publicado.id));
    assert.ok(idsAdministrativos.includes(noPublicado.id));

    const catalogo = await solicitar('/api/emprendimientos/catalogo');
    assert.equal(catalogo.status, 200);
    assert.ok(Array.isArray(catalogo.body));
    assert.deepEqual(
      catalogo.body.map(comoObjeto).map((item) => item.id),
      [publicado.id],
    );
  });

  test('rechaza estados arbitrarios tanto en la API como en MySQL', async () => {
    const emprendimiento = await crearEmprendimiento();
    const respuesta = await cambiarEstado(
      emprendimiento.id,
      { estadoPublicacion: 'Pendiente' },
      tokenPara(actores.administrador, 'administrador'),
    );

    assert.equal(respuesta.status, 400);
    const body = comoObjeto(respuesta.body);
    assert.equal(body.ok, false);
    assert.equal(
      body.message,
      'El estado de publicación debe ser Publicado o No Publicado',
    );
    await assert.rejects(() =>
      dataSource.query(
        `
          UPDATE emprendimientos
          SET estado_publicacion = ?
          WHERE id = ?
        `,
        ['Pendiente', emprendimiento.id],
      ),
    );

    const recargado = await obtenerEmprendimiento(emprendimiento.id);
    assert.equal(
      recargado.estadoPublicacion,
      EstadoPublicacion.NO_PUBLICADO,
    );
    assert.equal(recargado.fechaPublicacion, null);
  });

  test('un error interno del PATCH se responde sin detalles técnicos', async () => {
    const emprendimiento = await crearEmprendimiento();
    const cambiarPublicacionOriginal =
      emprendimientoService.cambiarPublicacion;

    emprendimientoService.cambiarPublicacion = async () => {
      throw new Error(
        'SQLSTATE 42000: stack y consulta interna que no deben exponerse',
      );
    };

    try {
      const respuesta = await cambiarEstado(
        emprendimiento.id,
        { estadoPublicacion: 'Publicado' },
        tokenPara(actores.administrador, 'administrador'),
      );

      assert.equal(respuesta.status, 500);
      assert.deepEqual(respuesta.body, {
        ok: false,
        message: 'Error interno del servidor',
      });
      assert.doesNotMatch(
        JSON.stringify(respuesta.body),
        /sqlstate|stack|consulta interna/i,
      );

      const recargado = await obtenerEmprendimiento(emprendimiento.id);
      assert.equal(
        recargado.estadoPublicacion,
        EstadoPublicacion.NO_PUBLICADO,
      );
      assert.equal(recargado.fechaPublicacion, null);
    } finally {
      emprendimientoService.cambiarPublicacion =
        cambiarPublicacionOriginal;
    }
  });
});
