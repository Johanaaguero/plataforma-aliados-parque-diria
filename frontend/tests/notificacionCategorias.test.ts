import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { categoriaNotificacion } from '../src/components/Notificaciones/notificacionCategorias.ts';

describe('categorías en la bandeja de notificaciones', () => {
  test('muestra eventos y capacitaciones dentro del filtro correspondiente', () => {
    assert.equal(categoriaNotificacion('nuevo_evento'), 'eventos');
    assert.equal(categoriaNotificacion('nueva_capacitacion'), 'eventos');
  });
});
