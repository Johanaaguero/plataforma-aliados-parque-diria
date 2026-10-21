import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import {
  CategoriaIncidencia,
  EstadoIncidencia,
  PrioridadIncidencia,
} from '../models/Incidencia';
import { puedeIniciarProcesoIncidencia } from '../modulos/Gestión de Incidencias/Crear incidencias/IncidenciaEstado';
import { esPrioridadIncidencia } from '../modulos/Gestión de Incidencias/Crear incidencias/IncidenciaPrioridad';
import { obtenerCambiosClasificacionIncidencia } from '../modulos/Gestión de Incidencias/Crear incidencias/IncidenciaHistorialUtils';

describe('reglas administrativas de incidencias', () => {
  test('solo permite iniciar proceso desde Pendiente', () => {
    assert.equal(
      puedeIniciarProcesoIncidencia(EstadoIncidencia.PENDIENTE),
      true,
    );
    for (const estado of Object.values(EstadoIncidencia).filter(
      (estado) => estado !== EstadoIncidencia.PENDIENTE,
    )) {
      assert.equal(puedeIniciarProcesoIncidencia(estado), false);
    }
  });

  test('valida prioridades conocidas sin aceptar valores arbitrarios', () => {
    for (const prioridad of Object.values(PrioridadIncidencia)) {
      assert.equal(esPrioridadIncidencia(prioridad), true);
    }
    assert.equal(esPrioridadIncidencia('urgente'), false);
    assert.equal(esPrioridadIncidencia(null), false);
  });

  test('genera historial para los valores realmente modificados y omite valores iguales', () => {
    const anterior = {
      categoria: CategoriaIncidencia.SENDEROS,
      prioridad: PrioridadIncidencia.MEDIA,
    };
    const actualizado = {
      categoria: CategoriaIncidencia.INCENDIO,
      prioridad: PrioridadIncidencia.CRITICA,
    };

    assert.deepEqual(
      obtenerCambiosClasificacionIncidencia(anterior, actualizado),
      [
        {
          campoModificado: 'categoria',
          valorAnterior: CategoriaIncidencia.SENDEROS,
          valorNuevo: CategoriaIncidencia.INCENDIO,
        },
        {
          campoModificado: 'prioridad',
          valorAnterior: PrioridadIncidencia.MEDIA,
          valorNuevo: PrioridadIncidencia.CRITICA,
        },
      ],
    );

    assert.deepEqual(
      obtenerCambiosClasificacionIncidencia(anterior, anterior),
      [],
    );
  });
});
