import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import {
  etiquetarCampoHistorial,
  etiquetarValorHistorial,
  identificarActorHistorial,
} from '../modulos/Gestión de Incidencias/Crear incidencias/IncidenciaHistorialPresentacion';

describe('presentación del historial de incidencias', () => {
  test('expone etiquetas legibles para conformidad y observaciones', () => {
    assert.equal(etiquetarCampoHistorial('conformidad_usuario'), 'Decisión de conformidad');
    assert.equal(etiquetarCampoHistorial('observaciones_usuario'), 'Observaciones del reportante');
    assert.equal(etiquetarValorHistorial('no_satisfecho'), 'No satisfecho');
    assert.equal(etiquetarValorHistorial(null), '—');
  });

  test('atribuye correctamente decisiones del reportante y cierres automáticos', () => {
    assert.equal(
      identificarActorHistorial('conformidad_usuario', 'satisfecho', 10),
      'reportante',
    );
    assert.equal(
      identificarActorHistorial('estado', 'cerrada', null),
      'cierre_automatico',
    );
    assert.equal(
      identificarActorHistorial('fecha_limite_respuesta', '2026-01-01', null),
      'sistema',
    );
  });
});
