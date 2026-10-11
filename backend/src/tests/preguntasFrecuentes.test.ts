import assert from 'node:assert/strict';
import { config } from 'dotenv';
import { resolve } from 'node:path';
import { describe, test } from 'node:test';
import type { Repository } from 'typeorm';
import type { PreguntasFrecuentes } from '../models/PreguntasFrecuentes';

config({ path: resolve(process.cwd(), '.env'), quiet: true });
process.env.DB_HOST ??= '127.0.0.1';
process.env.DB_PORT ??= '3306';
process.env.DB_USERNAME ??= 'faq_test';
process.env.DB_PASSWORD ??= 'faq_test';
process.env.DB_DATABASE ??= 'faq_test';

const crearServicio = async () => {
  const { PreguntasFrecuentesService } = await import('../modulos/PreguntasFrecuentes/preguntasFrecuentes.service');
  const filas: PreguntasFrecuentes[] = [];
  const repositorio = {
    create: (datos: Partial<PreguntasFrecuentes>) => datos,
    save: async (datos: Partial<PreguntasFrecuentes>) => {
      const fila = datos as PreguntasFrecuentes;
      const indice = filas.findIndex((actual) => actual.id === fila.id);
      if (indice === -1) {
        Object.assign(fila, { id: filas.length + 1 });
        filas.push(fila);
      } else {
        filas[indice] = fila;
      }
      return fila;
    },
    find: async (opciones?: { where?: Partial<PreguntasFrecuentes> }) =>
      filas.filter((fila) => opciones?.where?.publicada === undefined || fila.publicada === opciones.where.publicada),
    findOneBy: async (condicion: Partial<PreguntasFrecuentes>) =>
      filas.find((fila) => fila.id === condicion.id) ?? null,
    delete: async (id: number) => {
      const indice = filas.findIndex((fila) => fila.id === id);
      if (indice === -1) return { affected: 0 };
      filas.splice(indice, 1);
      return { affected: 1 };
    },
  } as unknown as Repository<PreguntasFrecuentes>;
  return { service: new PreguntasFrecuentesService(repositorio), filas };
};

describe('PreguntasFrecuentesService', () => {
  test('crea borradores por defecto y excluye preguntas no publicadas del listado público', async () => {
    const { service } = await crearServicio();
    const borrador = await service.crear({ pregunta: '  ¿Cómo llegar? ', respuesta: ' Use el mapa. ' });
    await service.crear({ pregunta: '¿Dónde está?', respuesta: 'En Guanacaste.', publicada: true });

    assert.equal(borrador.publicada, false);
    assert.equal(borrador.pregunta, '¿Cómo llegar?');
    assert.deepEqual((await service.listarPublicadas()).map((fila) => fila.pregunta), ['¿Dónde está?']);
    assert.equal((await service.listarTodas()).length, 2);
  });

  test('edita contenido sin cambiar publicación salvo que se indique el nuevo estado', async () => {
    const { service } = await crearServicio();
    const creada = await service.crear({ pregunta: 'Pregunta', respuesta: 'Respuesta', publicada: true });

    const editada = await service.editar(creada.id, { respuesta: 'Respuesta actualizada' });
    assert.equal(editada?.respuesta, 'Respuesta actualizada');
    assert.equal(editada?.publicada, true);

    const retirada = await service.editar(creada.id, { publicada: false });
    assert.equal(retirada?.publicada, false);
  });

  test('permite publicar, retirar y eliminar una pregunta', async () => {
    const { service } = await crearServicio();
    const creada = await service.crear({ pregunta: 'Pregunta', respuesta: 'Respuesta' });

    assert.equal((await service.cambiarPublicacion(creada.id, true))?.publicada, true);
    assert.equal((await service.cambiarPublicacion(creada.id, false))?.publicada, false);
    assert.equal(await service.eliminar(creada.id), true);
    assert.equal(await service.eliminar(creada.id), false);
  });
});
