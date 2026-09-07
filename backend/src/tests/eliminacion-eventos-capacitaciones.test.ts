import 'reflect-metadata';
import assert from 'node:assert/strict';
import { after, before, beforeEach, describe, test } from 'node:test';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { resolve } from 'node:path';
import { config } from 'dotenv';
import express from 'express';
import jwt from 'jsonwebtoken';
import mysql from 'mysql2/promise';
import type { DataSource } from 'typeorm';

import type { Usuario } from '../models/Usuario';
import type { Rol, NombreRol } from '../models/Rol';

config({ path: resolve(process.cwd(), '.env') });

const databaseBase = process.env.DB_DATABASE?.trim();

if (!databaseBase) {
  throw new Error(
    'DB_DATABASE no está configurada para crear la base de pruebas',
  );
}

const databaseTest = `${databaseBase}_eventos_delete_test`;
const nombreBaseSeguro = /^[a-zA-Z0-9_]+$/;

if (
  !nombreBaseSeguro.test(databaseTest) ||
  !databaseTest.endsWith('_test')
) {
  throw new Error(
    'Ejecución cancelada: el nombre calculado para la base de pruebas no es seguro o no termina en _test',
  );
}

process.env.DB_DATABASE = databaseTest;
process.env.JWT_SECRET =
  'eliminacion-eventos-capacitaciones-test-no-usar-en-produccion';

let dataSource: DataSource;
let UsuarioModel: typeof import('../models/Usuario').Usuario;
let RolModel: typeof import('../models/Rol').Rol;
let EventosModel: typeof import('../models/EventosCapacitaciones').EventosCapacitaciones;
let ImagenModel: typeof import('../models/EventoCapacitacionImagen').EventoCapacitacionImagen;
let EventoEnums: typeof import('../models/EventosCapacitaciones');
let RegisterInitialRolesModel: typeof import('../migrations/1786838400000-RegisterInitialRoles').RegisterInitialRoles1786838400000;

let server: Server | undefined;
let baseUrl = '';

interface Escenario {
  administradorId: number;
  asociadoId: number;
  visitanteId: number;
  eventoId: number;
  imagenId: number;
}

interface RespuestaHttp {
  status: number;
  body: unknown;
  texto: string;
}

const variableRequerida = (nombre: string): string => {
  const valor = process.env[nombre];

  if (!valor) {
    throw new Error(`Falta la variable requerida ${nombre}`);
  }

  return valor;
};

function exigirBaseDePruebas(
  nombre: unknown,
  origen: string,
): asserts nombre is string {
  if (
    typeof nombre !== 'string' ||
    !nombreBaseSeguro.test(nombre) ||
    !nombre.endsWith('_test') ||
    nombre !== databaseTest
  ) {
    throw new Error(
      `Ejecución cancelada: ${origen} no apunta exactamente a la base aislada ${databaseTest}`,
    );
  }
}

const asegurarDataSourceDePruebas = (): void => {
  const databaseConfigurada = (
    dataSource.options as { database?: string }
  ).database;

  exigirBaseDePruebas(
    databaseConfigurada,
    'dataSource.options.database',
  );
};

const asegurarConexionDePruebas = async (): Promise<void> => {
  asegurarDataSourceDePruebas();

  const basesConectadas: Array<{
    databaseActual: string | null;
  }> = await dataSource.query(
    'SELECT DATABASE() AS databaseActual',
  );

  exigirBaseDePruebas(
    basesConectadas[0]?.databaseActual,
    'SELECT DATABASE()',
  );
};

const solicitar = async (
  path: string,
  options: RequestInit = {},
): Promise<RespuestaHttp> => {
  const response = await fetch(`${baseUrl}${path}`, options);
  const texto = await response.text();

  let body: unknown;

  try {
    body = texto.length > 0 ? (JSON.parse(texto) as unknown) : undefined;
  } catch {
    body = texto;
  }

  return {
    status: response.status,
    body,
    texto,
  };
};

const crearToken = (
  usuarioId: number,
  rol: NombreRol,
): string =>
  jwt.sign(
    {
      id: usuarioId,
      nombreUsuario: `actor_${usuarioId}`,
      rol,
    },
    variableRequerida('JWT_SECRET'),
    { expiresIn: '1h' },
  );

const crearUsuario = async (
  indice: string,
  rol: Rol,
): Promise<Usuario> => {
  const repository = dataSource.getRepository(UsuarioModel);

  return repository.save(
    repository.create({
      nombreUsuario: `eventos_delete_${indice}`,
      nombre: `Nombre ${indice}`,
      apellidos: `Apellido ${indice}`,
      correo: `eventos.delete.${indice}@test.local`,
      telefono: indice,
      contraseña: 'hash-no-utilizado',
      rol,
    }),
  );
};

const limpiarBaseTest = async (): Promise<void> => {
  if (!dataSource?.isInitialized) {
    return;
  }

  // Esta doble comprobación ocurre antes del primer DELETE y de cada limpieza.
  await asegurarConexionDePruebas();

  await dataSource.query(
    'DELETE FROM eventos_capacitaciones_imagenes',
  );
  await dataSource.query('DELETE FROM eventos_capacitaciones');
  await dataSource.query('DELETE FROM usuarios');
  await dataSource.query('DELETE FROM roles');
};

const ejecutarInicializacionRoles = async (): Promise<void> => {
  const queryRunner = dataSource.createQueryRunner();

  await queryRunner.connect();
  await queryRunner.startTransaction();

  try {
    const migration = new RegisterInitialRolesModel();

    await migration.up(queryRunner);
    await queryRunner.commitTransaction();
  } catch (error) {
    await queryRunner.rollbackTransaction();
    throw error;
  } finally {
    await queryRunner.release();
  }
};

const prepararEscenario = async (): Promise<Escenario> => {
  await asegurarConexionDePruebas();

  const rolRepository = dataSource.getRepository(RolModel);
  const administrador = await rolRepository.findOneByOrFail({
    nombre: 'administrador',
  });
  const asociado = await rolRepository.findOneByOrFail({
    nombre: 'asociado',
  });
  const visitante = await rolRepository.findOneByOrFail({
    nombre: 'visitante',
  });

  const usuarioAdministrador = await crearUsuario(
    '81000001',
    administrador,
  );
  const usuarioAsociado = await crearUsuario('81000002', asociado);
  const usuarioVisitante = await crearUsuario('81000003', visitante);

  const eventoRepository = dataSource.getRepository(EventosModel);
  const evento = await eventoRepository.save(
    eventoRepository.create({
      nombre: 'Evento para prueba de eliminación',
      descripcion: 'Fixture aislado para probar el DELETE real',
      fecha: '2099-12-31',
      hora: '10:00:00',
      lugar: 'Parque Nacional Diriá',
      tipoActividad: EventoEnums.TipoActividad.EVENTO,
      cupoMaximo: 25,
      estado: EventoEnums.EstadoEventoCapacitacion.PUBLICADO,
      temporada: EventoEnums.Temporada.SECA,
    }),
  );

  const bytesImagen = Buffer.from(
    'imagen-fixture-evento-capacitacion',
    'utf8',
  );
  const imagenRepository = dataSource.getRepository(ImagenModel);
  const imagen = await imagenRepository.save(
    imagenRepository.create({
      imagen: bytesImagen,
      tipoMime: 'image/png',
      nombreArchivo: 'fixture.png',
      tamanoBytes: bytesImagen.length,
      eventoCapacitacionId: evento.id,
      eventoCapacitacion: evento,
    }),
  );

  return {
    administradorId: usuarioAdministrador.id,
    asociadoId: usuarioAsociado.id,
    visitanteId: usuarioVisitante.id,
    eventoId: evento.id,
    imagenId: imagen.id,
  };
};

const comprobarQueNoSeElimino = async (
  escenario: Escenario,
): Promise<void> => {
  const evento = await dataSource.getRepository(EventosModel).findOneBy({
    id: escenario.eventoId,
  });
  const imagen = await dataSource.getRepository(ImagenModel).findOneBy({
    id: escenario.imagenId,
  });

  assert.notEqual(evento, null, 'El evento no debía eliminarse');
  assert.notEqual(imagen, null, 'La imagen relacionada debía conservarse');
};

before(async () => {
  const adminConnection = await mysql.createConnection({
    host: variableRequerida('DB_HOST'),
    port: Number(variableRequerida('DB_PORT')),
    user: variableRequerida('DB_USERNAME'),
    password: variableRequerida('DB_PASSWORD'),
  });

  try {
    await adminConnection.query(
      `CREATE DATABASE IF NOT EXISTS \`${databaseTest}\``,
    );
  } finally {
    await adminConnection.end();
  }

  // Los módulos locales que capturan variables de entorno se cargan solo
  // después de sustituir DB_DATABASE por la base derivada y validada.
  const dataSourceModule = await import('../data-source');
  const usuarioModule = await import('../models/Usuario');
  const rolModule = await import('../models/Rol');
  EventoEnums = await import('../models/EventosCapacitaciones');
  const imagenModule = await import(
    '../models/EventoCapacitacionImagen'
  );
  const rolesMigrationModule = await import(
    '../migrations/1786838400000-RegisterInitialRoles'
  );

  dataSource = dataSourceModule.AppDataSource;
  UsuarioModel = usuarioModule.Usuario;
  RolModel = rolModule.Rol;
  EventosModel = EventoEnums.EventosCapacitaciones;
  ImagenModel = imagenModule.EventoCapacitacionImagen;
  RegisterInitialRolesModel =
    rolesMigrationModule.RegisterInitialRoles1786838400000;

  asegurarDataSourceDePruebas();
  await dataSource.initialize();
  await asegurarConexionDePruebas();
  await dataSource.runMigrations();

  const routeModule = await import(
    '../modulos/Gestión de Eventos y Capacitaciones/Crear Eventos y Capacitaciones/eventosCapacitaciones.routes'
  );
  const app = express();

  app.use(express.json());
  app.use('/api/eventos-capacitaciones', routeModule.default);

  await new Promise<void>((resolveListen, rejectListen) => {
    server = app.listen(0, '127.0.0.1', (error?: Error) => {
      if (error) {
        rejectListen(error);
      } else {
        resolveListen();
      }
    });
  });

  if (!server) {
    throw new Error('El servidor de pruebas no pudo iniciar');
  }

  const address = server.address() as AddressInfo;
  baseUrl = `http://127.0.0.1:${address.port}`;
});

beforeEach(async () => {
  await limpiarBaseTest();
  await ejecutarInicializacionRoles();
});

after(async () => {
  if (server) {
    await new Promise<void>((resolveClose, rejectClose) => {
      server?.close((error) => {
        if (error) {
          rejectClose(error);
        } else {
          resolveClose();
        }
      });
    });
  }

  if (dataSource?.isInitialized) {
    await limpiarBaseTest();
    await dataSource.destroy();
  }
});

describe('DELETE /api/eventos-capacitaciones/:id', () => {
  test('rechaza con 400 IDs inválidos y formatos peligrosos sin eliminar', async () => {
    const escenario = await prepararEscenario();
    const token = crearToken(
      escenario.administradorId,
      'administrador',
    );
    const idsInvalidos = [
      'abc',
      '0',
      '-1',
      '1.5',
      '1e3',
      '+1',
      '9007199254740992',
      '1 OR 1=1',
      '1; DROP TABLE eventos_capacitaciones',
    ];

    for (const idInvalido of idsInvalidos) {
      const resultado = await solicitar(
        `/api/eventos-capacitaciones/${encodeURIComponent(idInvalido)}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      assert.equal(
        resultado.status,
        400,
        `Se esperaba 400 para el ID ${idInvalido}`,
      );
      assert.deepEqual(resultado.body, {
        mensaje: 'El id debe ser un número entero positivo.',
      });
    }

    await comprobarQueNoSeElimino(escenario);
  });

  test('sin token devuelve 401 y no elimina', async () => {
    const escenario = await prepararEscenario();
    const resultado = await solicitar(
      `/api/eventos-capacitaciones/${escenario.eventoId}`,
      { method: 'DELETE' },
    );

    assert.equal(resultado.status, 401);
    assert.deepEqual(resultado.body, {
      ok: false,
      code: 'TOKEN_NOT_PROVIDED',
      message: 'Token no proporcionado',
    });
    await comprobarQueNoSeElimino(escenario);
  });

  test('asociado recibe 403 y no elimina', async () => {
    const escenario = await prepararEscenario();
    const resultado = await solicitar(
      `/api/eventos-capacitaciones/${escenario.eventoId}`,
      {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${crearToken(
            escenario.asociadoId,
            'asociado',
          )}`,
        },
      },
    );

    assert.equal(resultado.status, 403);
    assert.deepEqual(resultado.body, {
      ok: false,
      message: 'No tiene permisos para realizar esta operación',
    });
    await comprobarQueNoSeElimino(escenario);
  });

  test('visitante recibe 403 y no elimina', async () => {
    const escenario = await prepararEscenario();
    const resultado = await solicitar(
      `/api/eventos-capacitaciones/${escenario.eventoId}`,
      {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${crearToken(
            escenario.visitanteId,
            'visitante',
          )}`,
        },
      },
    );

    assert.equal(resultado.status, 403);
    assert.deepEqual(resultado.body, {
      ok: false,
      message: 'No tiene permisos para realizar esta operación',
    });
    await comprobarQueNoSeElimino(escenario);
  });

  test('administrador recibe 404 para un registro inexistente', async () => {
    const escenario = await prepararEscenario();
    const resultado = await solicitar(
      '/api/eventos-capacitaciones/2147483647',
      {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${crearToken(
            escenario.administradorId,
            'administrador',
          )}`,
        },
      },
    );

    assert.equal(resultado.status, 404);
    assert.deepEqual(resultado.body, {
      mensaje: 'Evento o capacitación no encontrado.',
    });
    await comprobarQueNoSeElimino(escenario);
  });

  test('administrador elimina físicamente, activa CASCADE y actualiza el catálogo', async () => {
    const escenario = await prepararEscenario();
    const imagenRepository = dataSource.getRepository(ImagenModel);

    const imagenAntes = await imagenRepository.findOneBy({
      id: escenario.imagenId,
    });
    assert.notEqual(
      imagenAntes,
      null,
      'La imagen relacionada debe existir antes del DELETE',
    );

    const catalogoAntes = await solicitar('/api/eventos-capacitaciones');
    assert.equal(catalogoAntes.status, 200);
    assert.ok(Array.isArray(catalogoAntes.body));
    assert.ok(
      catalogoAntes.body.some(
        (registro: unknown) =>
          typeof registro === 'object' &&
          registro !== null &&
          'id' in registro &&
          registro.id === escenario.eventoId,
      ),
      'El catálogo debía contener el evento antes del DELETE',
    );

    const resultado = await solicitar(
      `/api/eventos-capacitaciones/${escenario.eventoId}`,
      {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${crearToken(
            escenario.administradorId,
            'administrador',
          )}`,
        },
      },
    );

    assert.equal(resultado.status, 204);
    assert.equal(resultado.texto, '');

    const eventoDespues = await dataSource
      .getRepository(EventosModel)
      .findOneBy({ id: escenario.eventoId });
    assert.equal(
      eventoDespues,
      null,
      'El registro padre debe desaparecer físicamente',
    );

    const imagenDespues = await imagenRepository.findOneBy({
      id: escenario.imagenId,
    });
    assert.equal(
      imagenDespues,
      null,
      'MySQL debe eliminar la imagen mediante ON DELETE CASCADE',
    );

    const catalogoDespues = await solicitar(
      '/api/eventos-capacitaciones',
    );
    assert.equal(catalogoDespues.status, 200);
    assert.ok(Array.isArray(catalogoDespues.body));
    assert.equal(
      catalogoDespues.body.some(
        (registro: unknown) =>
          typeof registro === 'object' &&
          registro !== null &&
          'id' in registro &&
          registro.id === escenario.eventoId,
      ),
      false,
      'El catálogo no debe contener el registro eliminado',
    );
  });
});
