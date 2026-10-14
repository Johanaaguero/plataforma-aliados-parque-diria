import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import type { Request } from 'express';
import { obtenerClaveRateLimitLogin } from '../modulos/Autenticación y gestión de usuario/inicio de sesion/login.route';

const requestLogin = (
  ip: string,
  identificador: unknown,
): Request =>
  ({
    ip,
    body: { identificador },
  }) as Request;

describe('rate limit de login', () => {
  test('usa claves distintas para cuentas distintas en la misma IP', () => {
    const primeraCuenta = obtenerClaveRateLimitLogin(
      requestLogin('127.0.0.1', 'primera@test.local'),
    );
    const segundaCuenta = obtenerClaveRateLimitLogin(
      requestLogin('127.0.0.1', 'segunda@test.local'),
    );

    assert.notEqual(primeraCuenta, segundaCuenta);
  });

  test('normaliza espacios y mayusculas del mismo identificador', () => {
    const original = obtenerClaveRateLimitLogin(
      requestLogin('127.0.0.1', 'Usuario@Test.Local'),
    );
    const normalizado = obtenerClaveRateLimitLogin(
      requestLogin('127.0.0.1', '  usuario@test.local  '),
    );

    assert.equal(original, normalizado);
  });

  test('mantiene separadas IPs distintas para el mismo identificador', () => {
    const primeraIp = obtenerClaveRateLimitLogin(
      requestLogin('127.0.0.1', 'usuario@test.local'),
    );
    const segundaIp = obtenerClaveRateLimitLogin(
      requestLogin('127.0.0.2', 'usuario@test.local'),
    );

    assert.notEqual(primeraIp, segundaIp);
  });
});
