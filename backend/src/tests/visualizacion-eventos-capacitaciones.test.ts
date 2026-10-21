import 'reflect-metadata';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { resolve } from 'node:path';
import { after, before, beforeEach, describe, test } from 'node:test';
import { config } from 'dotenv';
import express from 'express';
import mysql from 'mysql2/promise';
import type { Connection } from 'mysql2/promise';
import type { DataSource } from 'typeorm';
import { errorMiddleware } from '../middlewares/registro.middleware';
import {
  EventosCapacitaciones,
  EstadoEventoCapacitacion,
  Temporada,
  TipoActividad,
} from '../models/EventosCapacitaciones';
import { EventoCapacitacionImagen } from '../models/EventoCapacitacionImagen';

config({ path: resolve(process.cwd(), '.env'), quiet: true });

// Nunca se reutiliza DB_DATABASE ni una base de pruebas de otro proceso.
// CREATE DATABASE sin IF NOT EXISTS impide aceptar accidentalmente una existente.
const databaseOriginal = process.env.DB_DATABASE;
const databaseTest = `eventos_view_${Date.now()}_${process.pid}_${randomBytes(4).toString('hex')}_test`;
const patronBaseTest = /^eventos_view_\d+_\d+_[a-f0-9]{8}_test$/;
process.env.DB_DATABASE = databaseTest;

type ServicioEventos = typeof import(
  '../modulos/Gestión de Eventos y Capacitaciones/Visualización de Eventos y Capacitaciones/eventos.service'
).EventosService;

interface EventoPublico {
  id: number;
  nombre: string | null;
  descripcion: string | null;
  fecha: string | null;
  hora: string | null;
  lugar: string | null;
  tipoActividad: TipoActividad;
  temporada: Temporada | null;
  estado: EstadoEventoCapacitacion;
  cupoMaximo: number | null;
  cuposDisponibles: number | null;
}

interface Catalogo {
  ok: true;
  data: EventoPublico[];
  paginacion: {
    pagina: number;
    limite: number;
    total: number;
    totalPaginas: number;
  };
  conteos: { todos: number; eventos: number; capacitaciones: number };
}

let dataSource: DataSource | undefined;
let EventosService: ServicioEventos;
let adminConnection: Connection | undefined;
let baseCreadaPorEsteProceso = false;
let server: Server | undefined;
let baseUrl = '';
let secuencia = 0;

const variableRequerida = (nombre: string): string => {
  const valor = process.env[nombre];
  if (!valor) throw new Error(`Falta la variable requerida ${nombre}`);
  return valor;
};

const exigirNombreAislado = (nombre: unknown): void => {
  assert.ok(patronBaseTest.test(databaseTest) && databaseTest.length <= 64);
  assert.notEqual(databaseTest, databaseOriginal);
  assert.equal(nombre, databaseTest, 'La conexión debe apuntar a la base única de esta ejecución');
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

const solicitar = async (path: string) => {
  const respuesta = await fetch(`${baseUrl}${path}`);
  const texto = await respuesta.text();
  return {
    status: respuesta.status,
    body: JSON.parse(texto) as unknown,
    texto,
  };
};

const obtenerCatalogo = async (query = ''): Promise<Catalogo> => {
  const respuesta = await solicitar(`/api/eventos${query}`);
  assert.equal(respuesta.status, 200, respuesta.texto);
  const body = comoObjeto(respuesta.body);
  assert.equal(body.ok, true);
  assert.ok(Array.isArray(body.data));
  assert.ok(body.paginacion);
  assert.ok(body.conteos);
  return body as unknown as Catalogo;
};

const crearEvento = async (
  cambios: ConstructorParameters<typeof EventosCapacitaciones>[0] = {},
): Promise<EventosCapacitaciones> => {
  const conexion = await exigirConexionAislada();
  secuencia += 1;
  const evento = new EventosCapacitaciones({
    nombre: `Actividad ${secuencia}`,
    descripcion: 'Actividad de educación ambiental en el parque.',
    fecha: '2099-12-20',
    hora: '10:30:00',
    lugar: 'Parque Nacional Diriá',
    tipoActividad: TipoActividad.EVENTO,
    temporada: Temporada.SECA,
    cupoMaximo: 25,
    estado: EstadoEventoCapacitacion.PUBLICADO,
    ...cambios,
  });
  evento.cuposDisponibles = cambios.cupoMaximo === undefined
    ? 25
    : cambios.cupoMaximo;
  return conexion.getRepository(EventosCapacitaciones).save(evento);
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
  await adminConnection.changeUser({ database: databaseTest });
  const [bases] = await adminConnection.query('SELECT DATABASE() AS databaseActual');
  exigirNombreAislado((bases as Array<{ databaseActual: string }>)[0]?.databaseActual);

  // AppDataSource captura las variables de entorno: importarlo después del cambio.
  const dataSourceModule = await import('../data-source');
  dataSource = dataSourceModule.AppDataSource;
  exigirNombreAislado((dataSource.options as { database?: string }).database);
  assert.equal(dataSource.options.synchronize, false);
  await dataSource.initialize();
  await exigirConexionAislada();
  await dataSource.runMigrations();

  const rutas = await import(
    '../modulos/Gestión de Eventos y Capacitaciones/Visualización de Eventos y Capacitaciones/eventos.routes'
  );
  const servicio = await import(
    '../modulos/Gestión de Eventos y Capacitaciones/Visualización de Eventos y Capacitaciones/eventos.service'
  );
  const rutasExistentes = await import(
    '../modulos/Gestión de Eventos y Capacitaciones/Crear Eventos y Capacitaciones/eventosCapacitaciones.routes'
  );
  EventosService = servicio.EventosService;
  const app = express();
  app.use(express.json());
  app.use('/api/eventos', rutas.default);
  app.use('/api/eventos-capacitaciones', rutasExistentes.default);
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
  const conexion = await exigirConexionAislada();
  // El CASCADE de la migración existente limpia las imágenes del fixture.
  await conexion.query('DELETE FROM eventos_capacitaciones');
  secuencia = 0;
});

after(async () => {
  try {
    if (server) {
      await new Promise<void>((resolveClose, rejectClose) => {
        server?.close((error) => {
          if (error) rejectClose(error);
          else resolveClose();
        });
      });
    }
    if (dataSource?.isInitialized) {
      await exigirConexionAislada();
      await dataSource.destroy();
    }
    if (baseCreadaPorEsteProceso && adminConnection) {
      exigirNombreAislado(databaseTest);
      const [bases] = await adminConnection.query('SELECT DATABASE() AS databaseActual');
      exigirNombreAislado((bases as Array<{ databaseActual: string }>)[0]?.databaseActual);
      await adminConnection.query(`DROP DATABASE \`${databaseTest}\``);
      baseCreadaPorEsteProceso = false;
    }
  } finally {
    await adminConnection?.end();
    if (databaseOriginal === undefined) delete process.env.DB_DATABASE;
    else process.env.DB_DATABASE = databaseOriginal;
  }
});

describe('GET /api/eventos: catálogo público con TypeORM y MySQL', () => {
  test('devuelve un catálogo vacío con metadatos coherentes', async () => {
    const catalogo = await obtenerCatalogo();
    assert.deepEqual(catalogo.data, []);
    assert.deepEqual(catalogo.paginacion, { pagina: 1, limite: 9, total: 0, totalPaginas: 0 });
    assert.deepEqual(catalogo.conteos, { todos: 0, eventos: 0, capacitaciones: 0 });
  });

  test('permite visitantes sin token y muestra únicamente registros publicados', async () => {
    const publicado = await crearEvento();
    for (const estado of [
      EstadoEventoCapacitacion.BORRADOR,
      EstadoEventoCapacitacion.NO_PUBLICADO,
      EstadoEventoCapacitacion.DESACTIVADO,
    ]) {
      await crearEvento({ estado });
    }
    const catalogo = await obtenerCatalogo();
    assert.deepEqual(catalogo.data.map((evento) => evento.id), [publicado.id]);
    assert.equal(catalogo.data[0]?.estado, EstadoEventoCapacitacion.PUBLICADO);
    assert.equal(catalogo.paginacion.total, 1);
    assert.deepEqual(catalogo.conteos, { todos: 1, eventos: 1, capacitaciones: 0 });
  });

  test('combina nombre, temporada y tipo, con conteos independientes de la pestaña', async () => {
    const eventoSeca = await crearEvento({ nombre: 'Recorrido del bosque' });
    const capacitacionSeca = await crearEvento({
      nombre: 'Taller del BOSQUE', tipoActividad: TipoActividad.CAPACITACION,
    });
    await crearEvento({ nombre: 'Bosque lluvioso', temporada: Temporada.LLUVIOSA });
    await crearEvento({ nombre: 'Astronomía' });
    await crearEvento({ nombre: 'Bosque oculto', estado: EstadoEventoCapacitacion.BORRADOR });

    const catalogo = await obtenerCatalogo('?buscar=bOsQuE&temporada=seca');
    assert.deepEqual(catalogo.data.map((evento) => evento.id), [eventoSeca.id, capacitacionSeca.id]);
    assert.deepEqual(catalogo.conteos, { todos: 2, eventos: 1, capacitaciones: 1 });
    for (const [tipo, id] of [
      [TipoActividad.EVENTO, eventoSeca.id],
      [TipoActividad.CAPACITACION, capacitacionSeca.id],
    ] as const) {
      const filtrado = await obtenerCatalogo(`?buscar=bosque&temporada=seca&tipoActividad=${tipo}`);
      assert.deepEqual(filtrado.data.map((evento) => evento.id), [id]);
      assert.equal(filtrado.paginacion.total, 1);
      assert.deepEqual(filtrado.conteos, catalogo.conteos);
    }
    const lluviosa = await obtenerCatalogo('?buscar=bosque&temporada=lluviosa');
    assert.equal(lluviosa.data.length, 1);
    assert.equal(lluviosa.data[0]?.temporada, Temporada.LLUVIOSA);
    assert.equal((await obtenerCatalogo('?buscar=inexistente&temporada=seca')).paginacion.total, 0);
  });

  test('busca solo en el nombre y trata %, _, !, comillas y barras como texto literal', async () => {
    const casos = ['100%', 'sendero_azul', 'Ruta!Norte', String.raw`Ruta\Norte`, "' OR 1=1"];
    for (const buscar of casos) {
      const esperado = await crearEvento({ nombre: `Actividad ${buscar}` });
      await crearEvento({ nombre: `Distractor ${secuencia}`, descripcion: buscar });
      const catalogo = await obtenerCatalogo(`?buscar=${encodeURIComponent(buscar)}`);
      assert.deepEqual(catalogo.data.map((evento) => evento.id), [esperado.id], buscar);
    }
  });

  test('ordena por fecha, hora e ID y pagina sin duplicar ni omitir actividades', async () => {
    const eventos: EventosCapacitaciones[] = [];
    for (let indice = 0; indice < 22; indice += 1) {
      eventos.push(await crearEvento({
        fecha: indice % 2 === 0 ? '2099-12-22' : '2099-12-21',
        hora: indice % 3 === 0 ? '14:00:00' : '09:00:00',
      }));
    }
    eventos.sort((a, b) =>
      a.fecha!.localeCompare(b.fecha!) || a.hora!.localeCompare(b.hora!) || a.id - b.id,
    );
    const idsRecibidos: number[] = [];
    for (let pagina = 1; pagina <= 3; pagina += 1) {
      const catalogo = await obtenerCatalogo(`?pagina=${pagina}`);
      assert.deepEqual(catalogo.paginacion, { pagina, limite: 9, total: 22, totalPaginas: 3 });
      assert.equal(catalogo.data.length, pagina === 3 ? 4 : 9);
      idsRecibidos.push(...catalogo.data.map((evento) => evento.id));
    }
    assert.deepEqual(idsRecibidos, eventos.map((evento) => evento.id));
    const repetida = await obtenerCatalogo('?pagina=2');
    assert.deepEqual(repetida.data.map((evento) => evento.id), idsRecibidos.slice(9, 18));
    const fueraDeRango = await obtenerCatalogo('?pagina=4');
    assert.deepEqual(fueraDeRango.data, []);
    assert.equal(fueraDeRango.paginacion.total, 22);
  });

  test('rechaza filtros inválidos, repetidos y compuestos con el formato JSON global', async () => {
    const consultas = [
      'pagina=0', 'pagina=-1', 'pagina=1.5', 'pagina=1e3', 'pagina=%2B1',
      'pagina=abc', 'pagina=', 'pagina=9007199254740992', 'pagina=9007199254740991',
      'pagina=1&pagina=2', 'pagina[]=1', 'pagina[valor]=1',
      'temporada=invierno', 'temporada=seca&temporada=lluviosa', 'temporada[]=seca',
      'tipoActividad=excursion', 'tipoActividad=evento&tipoActividad=capacitacion',
      'tipoActividad[nombre]=evento', 'buscar=a&buscar=b', 'buscar[]=bosque',
      'buscar[nombre]=bosque', `buscar=${'x'.repeat(151)}`,
    ];
    for (const consulta of consultas) {
      const respuesta = await solicitar(`/api/eventos?${consulta}`);
      assert.equal(respuesta.status, 400, consulta);
      const body = comoObjeto(respuesta.body);
      assert.equal(body.ok, false, consulta);
      assert.equal(typeof body.message, 'string', consulta);
      assert.ok(String(body.message).length > 0);
    }
  });

  test('conserva el contrato de arreglo del endpoint existente', async () => {
    const publicado = await crearEvento();
    const borrador = await crearEvento({ estado: EstadoEventoCapacitacion.BORRADOR });
    const respuesta = await solicitar('/api/eventos-capacitaciones');
    assert.equal(respuesta.status, 200);
    assert.ok(Array.isArray(respuesta.body));
    const ids = respuesta.body.map((evento: unknown) => comoObjeto(evento).id);
    assert.ok(ids.includes(publicado.id));
    assert.equal(ids.includes(borrador.id), false);
    assert.equal((await obtenerCatalogo()).data.length, 1);
  });
});

describe('GET /api/eventos/:id: detalle público', () => {
  test('devuelve todos los datos públicos, sin cargar imágenes binarias', async () => {
    const evento = await crearEvento({ descripcion: 'Primera línea.\nSegunda línea con información ampliada.' });
    const conexion = await exigirConexionAislada();
    const bytes = Buffer.from('contenido-imagen-privado-del-fixture');
    await conexion.getRepository(EventoCapacitacionImagen).save({
      imagen: bytes,
      tipoMime: 'image/png',
      nombreArchivo: 'fixture.png',
      tamanoBytes: bytes.length,
      eventoCapacitacionId: evento.id,
    });
    const respuesta = await solicitar(`/api/eventos/${evento.id}`);
    assert.equal(respuesta.status, 200);
    const body = comoObjeto(respuesta.body);
    assert.equal(body.ok, true);
    const detalle = comoObjeto(body.data);
    const esperado = JSON.parse(JSON.stringify({ ...evento.toPublic(), cuposDisponibles: evento.cuposDisponibles })) as unknown;
    assert.deepEqual(detalle, esperado);
    assert.equal('imagenes' in detalle, false);
    assert.equal(respuesta.texto.includes(bytes.toString('base64')), false);
  });

  test('conserva cupos desconocidos, cero y positivos en listado y detalle', async () => {
    for (const cupoMaximo of [null, 0, 37]) {
      const evento = await crearEvento({ cupoMaximo });
      const respuesta = await solicitar(`/api/eventos/${evento.id}`);
      assert.equal(respuesta.status, 200);
      const detalle = comoObjeto(comoObjeto(respuesta.body).data);
      assert.equal(detalle.cupoMaximo, cupoMaximo);
      assert.equal(detalle.cuposDisponibles, evento.cuposDisponibles);
      const enCatalogo = (await obtenerCatalogo()).data.find((item) => item.id === evento.id);
      assert.equal(enCatalogo?.cuposDisponibles, evento.cuposDisponibles);
    }
  });

  test('devuelve 404 para IDs inexistentes y para cada estado no público', async () => {
    const ids = [2147483647];
    for (const estado of [
      EstadoEventoCapacitacion.BORRADOR,
      EstadoEventoCapacitacion.NO_PUBLICADO,
      EstadoEventoCapacitacion.DESACTIVADO,
    ]) {
      ids.push((await crearEvento({ estado })).id);
    }
    let errorEsperado: unknown;
    for (const id of ids) {
      const respuesta = await solicitar(`/api/eventos/${id}`);
      assert.equal(respuesta.status, 404);
      const body = comoObjeto(respuesta.body);
      assert.equal(body.ok, false);
      assert.equal(typeof body.message, 'string');
      if (errorEsperado === undefined) errorEsperado = body;
      else assert.deepEqual(body, errorEsperado);
    }
  });

  test('rechaza IDs inválidos antes de consultar el detalle', async () => {
    for (const id of ['abc', '0', '-1', '1.2', '1e3', '+1', '9007199254740992', '1 OR 1=1']) {
      const respuesta = await solicitar(`/api/eventos/${encodeURIComponent(id)}`);
      assert.equal(respuesta.status, 400, id);
      const body = comoObjeto(respuesta.body);
      assert.equal(body.ok, false);
      assert.equal(typeof body.message, 'string');
    }
  });

  test('propaga fallos inesperados al middleware global sin exponer detalles internos', async (t) => {
    const mensajeInterno = 'SQL fixture: credencial interna de prueba';
    t.mock.method(console, 'error', () => undefined);
    t.mock.method(EventosService.prototype, 'listar', async () => { throw new Error(mensajeInterno); });
    t.mock.method(EventosService.prototype, 'obtenerDetalle', async () => { throw new Error(mensajeInterno); });
    for (const path of ['/api/eventos', '/api/eventos/1']) {
      const respuesta = await solicitar(path);
      assert.equal(respuesta.status, 500);
      assert.deepEqual(respuesta.body, { ok: false, message: 'Error interno del servidor' });
      assert.equal(respuesta.texto.includes(mensajeInterno), false);
    }
  });
});
