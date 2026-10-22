import 'reflect-metadata';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { resolve } from 'node:path';
import { after, before, describe, test } from 'node:test';
import { config } from 'dotenv';
import mysql from 'mysql2/promise';
import type { Connection } from 'mysql2/promise';
import type { DataSource } from 'typeorm';
import type { FaqId } from '../modulos/Chatbot/Atencion Automatica Visitantes/geminiFaqClassifier.service';

config({ path: resolve(process.cwd(), '.env'), quiet: true });

const databaseOriginal = process.env.DB_DATABASE;
const databaseTest = `chatbot_pbi977_${Date.now()}_${process.pid}_${randomBytes(4).toString('hex')}_test`;
const patronBaseTest = /^chatbot_pbi977_\d+_\d+_[a-f0-9]{8}_test$/;
process.env.DB_DATABASE = databaseTest;

let dataSource: DataSource | undefined;
let adminConnection: Connection | undefined;
let baseCreadaPorEsteProceso = false;

const variableRequerida = (nombre: string): string => {
  const valor = process.env[nombre];
  if (!valor) throw new Error(`Falta la variable requerida ${nombre}`);
  return valor;
};

const exigirNombreAislado = (nombre: unknown): void => {
  assert.ok(patronBaseTest.test(databaseTest) && databaseTest.length <= 64);
  assert.notEqual(databaseTest, databaseOriginal);
  assert.equal(nombre, databaseTest);
};

const exigirConexionAislada = async (): Promise<DataSource> => {
  assert.ok(baseCreadaPorEsteProceso);
  assert.ok(dataSource?.isInitialized);
  exigirNombreAislado((dataSource.options as { database?: string }).database);
  const bases: Array<{ databaseActual: string }> = await dataSource.query(
    'SELECT DATABASE() AS databaseActual',
  );
  exigirNombreAislado(bases[0]?.databaseActual);
  return dataSource;
};

before(async () => {
  adminConnection = await mysql.createConnection({
    host: variableRequerida('DB_HOST'),
    port: Number(variableRequerida('DB_PORT')),
    user: variableRequerida('DB_USERNAME'),
    password: variableRequerida('DB_PASSWORD'),
    multipleStatements: false,
  });

  exigirNombreAislado(databaseTest);
  await adminConnection.query(`CREATE DATABASE \`${databaseTest}\``);
  baseCreadaPorEsteProceso = true;

  const dataSourceModule = await import('../data-source');
  dataSource = dataSourceModule.AppDataSource;
  await dataSource.initialize();
  await exigirConexionAislada();
  await dataSource.runMigrations();
});

after(async () => {
  try {
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

describe('PBI 977 - Chatbot con servicios reales y base aislada', () => {
  test('consulta emprendimientos, eventos y disponibilidad sin exponer datos personales', async () => {
    const conexion = await exigirConexionAislada();
    const { CategoriaEmprendimiento } = await import('../models/CategoriaEmprendimiento');
    const { Emprendimiento, EstadoPublicacion } = await import('../models/Emprendimiento');
    const {
      EventosCapacitaciones,
      EstadoEventoCapacitacion,
      Temporada,
      TipoActividad,
    } = await import('../models/EventosCapacitaciones');
    const { ConversacionChatbot } = await import('../models/ConversacionChatbot');
    const { ChatbotService } = await import(
      '../modulos/Chatbot/Atencion Automatica Visitantes/chatbot.service'
    );

    const categoria = await conexion.getRepository(CategoriaEmprendimiento).save({
      nombre: 'Turismo local',
      descripcion: 'Categoria de prueba para chatbot.',
    });

    await conexion.getRepository(Emprendimiento).save([
      new Emprendimiento({
        nombre: 'Soda La Montaña',
        descripcion: 'Comidas tipicas cerca del parque.',
        categoria,
        provincia: 'Guanacaste',
        canton: 'Santa Cruz',
        distrito: 'Arado',
        direccion: 'Camino principal',
        telefono: '+50688889999',
        estadoPublicacion: EstadoPublicacion.PUBLICADO,
      }),
      new Emprendimiento({
        nombre: 'Borrador privado',
        estadoPublicacion: EstadoPublicacion.BORRADOR,
      }),
    ]);

    await conexion.getRepository(EventosCapacitaciones).save([
      new EventosCapacitaciones({
        nombre: 'Caminata nocturna',
        descripcion: 'Recorrido guiado.',
        fecha: '2099-05-20',
        hora: '18:00:00',
        lugar: 'Entrada principal',
        tipoActividad: TipoActividad.EVENTO,
        temporada: Temporada.SECA,
        cupoMaximo: 8,
        cuposDisponibles: 3,
        estado: EstadoEventoCapacitacion.PUBLICADO,
      }),
      new EventosCapacitaciones({
        nombre: 'Charla llena',
        fecha: '2099-05-21',
        hora: '09:00:00',
        lugar: 'Aula ambiental',
        tipoActividad: TipoActividad.CAPACITACION,
        temporada: Temporada.SECA,
        cupoMaximo: 5,
        cuposDisponibles: 0,
        estado: EstadoEventoCapacitacion.PUBLICADO,
      }),
      new EventosCapacitaciones({
        nombre: 'Evento no publicado',
        fecha: '2099-05-22',
        tipoActividad: TipoActividad.EVENTO,
        temporada: Temporada.SECA,
        estado: EstadoEventoCapacitacion.BORRADOR,
      }),
    ]);

    const servicioPara = (faqId: FaqId) =>
      new ChatbotService(
        conexion.getRepository(ConversacionChatbot),
        { classify: async () => faqId },
        { obtenerFechaActual: () => new Date('2099-05-01T00:00:00.000Z') },
      );

    const emprendimientos = await servicioPara('emprendimientos')
      .procesarPregunta('¿Qué emprendimientos hay?');
    const eventos = await servicioPara('eventos')
      .procesarPregunta('¿Hay eventos próximos?');
    const disponibilidad = await servicioPara('reservas')
      .procesarPregunta('¿Hay cupos disponibles?');

    assert.match(emprendimientos.respuesta, /Soda La Montaña/);
    assert.doesNotMatch(emprendimientos.respuesta, /Borrador privado/);
    assert.match(eventos.respuesta, /Caminata nocturna/);
    assert.match(eventos.respuesta, /Charla llena/);
    assert.doesNotMatch(eventos.respuesta, /Evento no publicado/);
    assert.match(disponibilidad.respuesta, /Caminata nocturna/);
    assert.match(disponibilidad.respuesta, /3 cupo\(s\) disponible\(s\)/);
    assert.doesNotMatch(disponibilidad.respuesta, /Charla llena/);
    assert.doesNotMatch(
      [
        emprendimientos.respuesta,
        eventos.respuesta,
        disponibilidad.respuesta,
      ].join('\n'),
      /numeroIdentificacion|correo privado|fechaNacimiento|nombreCompleto/i,
    );

    assert.equal(await conexion.getRepository(ConversacionChatbot).count(), 3);
  });
});
