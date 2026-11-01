import assert from 'node:assert/strict';
import test from 'node:test';
import jwt from 'jsonwebtoken';
import {
  crearCapacidadEvidenciaAnonima,
  validarCapacidadEvidenciaAnonima,
} from '../modulos/Gestión de Incidencias/Crear incidencias/IncidenciaEvidenciaCapability';
import { puedeAdjuntarEvidenciaComoPropietario } from '../modulos/Gestión de Incidencias/Crear incidencias/IncidenciaEvidenciaAuthorization';

process.env.JWT_SECRET = 'incidencia-evidencia-capability-test-secret';

test('la capacidad anónima solo autoriza adjuntar evidencias a su incidencia', () => {
  const capacidad = crearCapacidadEvidenciaAnonima(25);

  assert.equal(validarCapacidadEvidenciaAnonima(capacidad, 25), true);
  assert.equal(validarCapacidadEvidenciaAnonima(capacidad, 26), false);
});

test('un JWT de sesión no funciona como capacidad anónima', () => {
  const tokenSesion = jwt.sign(
    { id: 8, nombreUsuario: 'visitante', rol: 'visitante' },
    process.env.JWT_SECRET as string,
    { expiresIn: '1h', jwtid: 'sesion-de-prueba' },
  );

  assert.equal(validarCapacidadEvidenciaAnonima(tokenSesion, 25), false);
});

test('una capacidad vencida o alterada se rechaza', () => {
  const vencida = jwt.sign(
    {
      tipo: 'incidencia-evidencia-capability',
      proposito: 'adjuntar-evidencias',
      incidenciaId: 25,
    },
    process.env.JWT_SECRET as string,
    { expiresIn: -1 },
  );
  const capacidad = crearCapacidadEvidenciaAnonima(25);
  const alterada = `${capacidad.slice(0, -1)}x`;

  assert.throws(() => validarCapacidadEvidenciaAnonima(vencida, 25));
  assert.throws(() => validarCapacidadEvidenciaAnonima(alterada, 25));
});

test('solo el reportante autenticado puede adjuntar evidencia', () => {
  const incidencia = { usuarioReporta: { id: 12 } };

  assert.equal(
    puedeAdjuntarEvidenciaComoPropietario(incidencia, {
      id: 12,
      rol: 'visitante',
    }),
    true,
  );
  assert.equal(
    puedeAdjuntarEvidenciaComoPropietario(incidencia, {
      id: 12,
      rol: 'asociado',
    }),
    true,
  );
  assert.equal(
    puedeAdjuntarEvidenciaComoPropietario(incidencia, {
      id: 33,
      rol: 'administrador',
    }),
    false,
  );
  assert.equal(
    puedeAdjuntarEvidenciaComoPropietario(incidencia, {
      id: 34,
      rol: 'super_admin',
    }),
    false,
  );
});
