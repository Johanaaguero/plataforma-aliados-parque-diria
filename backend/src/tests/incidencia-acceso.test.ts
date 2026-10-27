import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import {
  puedeConsultarEvidencia,
  puedeConsultarIncidencia,
  puedeListarIncidenciasOcultas,
  prepararRespuestaEvidencia,
} from '../modulos/Gestión de Incidencias/Crear incidencias/IncidenciaAccess';

describe('acceso a incidencias', () => {
  const incidenciaOculta = {
    esPublica: false,
    usuarioReporta: { id: 12 },
  };

  test('permite consultar incidencias públicas sin autenticación', () => {
    assert.equal(
      puedeConsultarIncidencia(
        { esPublica: true, usuarioReporta: null },
        null,
      ),
      true,
    );
  });

  test('permite consultar el historial de incidencias públicas sin autenticación', () => {
    assert.equal(
      puedeConsultarIncidencia(
        { esPublica: true, usuarioReporta: { id: 12 } },
        null,
      ),
      true,
    );
  });

  test('rechaza incidencias ocultas sin autenticación', () => {
    assert.equal(
      puedeConsultarIncidencia(incidenciaOculta, null),
      false,
    );
  });

  test('permite al propietario autenticado consultar su incidencia oculta', () => {
    assert.equal(
      puedeConsultarIncidencia(incidenciaOculta, {
        id: 12,
        rol: 'visitante',
      }),
      true,
    );
  });

  test('permite a administradores autorizados consultar incidencias ocultas', () => {
    for (const rol of ['administrador', 'super_admin']) {
      assert.equal(
        puedeConsultarIncidencia(incidenciaOculta, {
          id: 99,
          rol,
        }),
        true,
      );
    }
  });

  test('permite consultar el detalle privado a administradores y propietario', () => {
    for (const rol of ['administrador', 'super_admin']) {
      assert.equal(
        puedeConsultarIncidencia(incidenciaOculta, { id: 99, rol }),
        true,
      );
    }

    assert.equal(
      puedeConsultarIncidencia(incidenciaOculta, {
        id: 12,
        rol: 'visitante',
      }),
      true,
    );
  });

  test('rechaza el detalle privado para usuarios no autorizados', () => {
    assert.equal(
      puedeConsultarIncidencia(incidenciaOculta, {
        id: 99,
        rol: 'visitante',
      }),
      false,
    );
    assert.equal(puedeConsultarIncidencia(incidenciaOculta, null), false);
  });

  test('rechaza a otros usuarios autenticados en incidencias ocultas', () => {
    assert.equal(
      puedeConsultarIncidencia(incidenciaOculta, {
        id: 99,
        rol: 'asociado',
      }),
      false,
    );
  });

  test('permite consultar evidencia publicada y conserva el acceso restringido a evidencia privada', () => {
    const incidenciaPublica = {
      esPublica: true,
      usuarioReporta: { id: 12 },
    };

    assert.equal(
      puedeConsultarEvidencia(incidenciaPublica, null),
      true,
    );
    assert.equal(
      puedeConsultarEvidencia(incidenciaPublica, {
        id: 99,
        rol: 'visitante',
      }),
      true,
    );
    assert.equal(
      puedeConsultarEvidencia(incidenciaPublica, {
        id: 12,
        rol: 'visitante',
      }),
      true,
    );
    assert.equal(
      puedeConsultarEvidencia(incidenciaPublica, {
        id: 99,
        rol: 'administrador',
      }),
      true,
    );
  });

  test('permite evidencia de incidencias ocultas a propietario y administración', () => {
    assert.equal(
      puedeConsultarEvidencia(incidenciaOculta, {
        id: 12,
        rol: 'visitante',
      }),
      true,
    );
    assert.equal(
      puedeConsultarEvidencia(incidenciaOculta, {
        id: 99,
        rol: 'super_admin',
      }),
      true,
    );
  });

  test('sirve el BLOB de evidencia privada a propietario y administración', () => {
    const archivo = Buffer.from('imagen-qa');

    for (const actor of [
      { id: 12, rol: 'visitante' },
      { id: 99, rol: 'administrador' },
      { id: 99, rol: 'super_admin' },
    ]) {
      const respuesta = prepararRespuestaEvidencia(
        incidenciaOculta,
        actor,
        archivo,
        'image/png',
      );

      assert.equal(respuesta?.archivo, archivo);
      assert.equal(respuesta?.headers['Content-Type'], 'image/png');
      assert.equal(
        respuesta?.headers['Cache-Control'],
        'private, no-store',
      );
    }
  });

  test('sirve la evidencia de una incidencia publicada sin autenticación', () => {
    const archivo = Buffer.from('imagen-publica');
    const respuesta = prepararRespuestaEvidencia(
      { esPublica: true, usuarioReporta: { id: 12 } },
      null,
      archivo,
      'image/jpeg',
    );

    assert.equal(respuesta?.archivo, archivo);
    assert.equal(respuesta?.headers['Content-Type'], 'image/jpeg');
    assert.equal(
      respuesta?.headers['Cache-Control'],
      'private, no-store',
    );
  });

  test('no sirve el BLOB a usuarios no autorizados', () => {
    const archivo = Buffer.from('imagen-qa');

    assert.equal(
      prepararRespuestaEvidencia(
        incidenciaOculta,
        { id: 99, rol: 'visitante' },
        archivo,
        'image/png',
      ),
      null,
    );
    assert.equal(
      prepararRespuestaEvidencia(
        incidenciaOculta,
        null,
        archivo,
        'image/png',
      ),
      null,
    );
  });

  test('permite gestionar incidencias privadas solo a roles administrativos', () => {
    const incidenciaPrivadaVisibleAlPropietario = {
      esPublica: false,
      usuarioReporta: { id: 12 },
    };

    assert.equal(
      puedeConsultarIncidencia(
        incidenciaPrivadaVisibleAlPropietario,
        { id: 12, rol: 'visitante' },
      ),
      true,
    );
    assert.equal(
      puedeListarIncidenciasOcultas({
        id: 12,
        rol: 'visitante',
      }),
      false,
    );

    for (const rol of ['administrador', 'super_admin']) {
      assert.equal(
        puedeListarIncidenciasOcultas({ id: 99, rol }),
        true,
      );
    }
  });
});
