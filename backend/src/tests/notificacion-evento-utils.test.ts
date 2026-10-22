import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { seleccionarDestinatariosEvento } from '../modulos/Notificaciones/Crear notificaciones Eventos/notificacionEvento.utils';

describe('destinatarios de notificaciones de eventos', () => {
  test('incluye administradores y excluye roles no destinatarios y duplicados', () => {
    const usuarios = [
      { id: 1, rol: { nombre: 'visitante' } },
      { id: 2, rol: { nombre: 'asociado' } },
      { id: 3, rol: { nombre: 'administrador' } },
      { id: 4, rol: { nombre: 'super_admin' } },
    ];

    assert.deepEqual(
      seleccionarDestinatariosEvento(usuarios, new Set([2])),
      [usuarios[0], usuarios[2]],
    );
  });
});
