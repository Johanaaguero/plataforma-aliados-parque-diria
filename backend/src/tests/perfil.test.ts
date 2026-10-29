import assert from 'node:assert/strict';
import { after, before, describe, test } from 'node:test';
import { resolve } from 'node:path';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import type { Request, Response } from 'express';
import express from 'express';
import { config } from 'dotenv';

config({ path: resolve(process.cwd(), '.env') });
process.env.DB_DATABASE = 'aliados_parque_diria_test';
process.env.JWT_SECRET = 'perfil-test-secret-no-usar-en-produccion';

let server: Server;
let baseUrl: string;
let actualizarMiPerfil: typeof import('../modulos/Autenticación y gestión de usuario/Gestión de Perfil/perfil.controller').actualizarMiPerfil;
let actualizarContrasenaPerfil: typeof import('../modulos/Autenticación y gestión de usuario/Gestión de Perfil/perfil.controller').actualizarContrasenaPerfil;
let confirmarCambioCorreoPerfil: typeof import('../modulos/Autenticación y gestión de usuario/Gestión de Perfil/perfil.controller').confirmarCambioCorreoPerfil;
let subirFotoPerfil: typeof import('../modulos/Autenticación y gestión de usuario/Gestión de Perfil/perfil.controller').subirFotoPerfil;
let solicitarCambioCorreoPerfil: typeof import('../modulos/Autenticación y gestión de usuario/Gestión de Perfil/perfil.controller').solicitarCambioCorreoPerfil;

interface RespuestaPrueba {
  codigo: number;
  cuerpo: Record<string, unknown> | undefined;
}

function crearRespuesta(): {
  captura: RespuestaPrueba;
  response: Response;
} {
  const captura: RespuestaPrueba = { codigo: 200, cuerpo: undefined };
  const response = {
    status(codigo: number) {
      captura.codigo = codigo;
      return response;
    },
    json(cuerpo: Record<string, unknown>) {
      captura.cuerpo = cuerpo;
      return response;
    },
  } as unknown as Response;
  return { captura, response };
}

function crearRequest(body: unknown, file?: Express.Multer.File): Request {
  return {
    body,
    file,
    usuario: { id: 21, nombreUsuario: 'cuenta-propia', rol: 'visitante' },
    headers: {},
  } as unknown as Request;
}

async function llamarControlador(
  controlador: (
    req: Request,
    res: Response,
    next: (error?: unknown) => void,
  ) => Promise<unknown>,
  req: Request,
) {
  const { captura, response } = crearRespuesta();
  let errorSiguiente: unknown;
  await controlador(req, response, (error) => {
    errorSiguiente = error;
  });
  assert.equal(errorSiguiente, undefined);
  return captura;
}

before(async () => {
  const controlador = await import(
    '../modulos/Autenticación y gestión de usuario/Gestión de Perfil/perfil.controller'
  );
  const ruta = await import(
    '../modulos/Autenticación y gestión de usuario/Gestión de Perfil/perfil.routes'
  );
  actualizarMiPerfil = controlador.actualizarMiPerfil;
  actualizarContrasenaPerfil = controlador.actualizarContrasenaPerfil;
  confirmarCambioCorreoPerfil = controlador.confirmarCambioCorreoPerfil;
  solicitarCambioCorreoPerfil = controlador.solicitarCambioCorreoPerfil;
  subirFotoPerfil = controlador.subirFotoPerfil;

  const app = express();
  app.use(express.json());
  app.use('/api/users', ruta.default);
  server = app.listen(0, '127.0.0.1');
  await new Promise<void>((resolver, rechazar) => {
    server.once('listening', resolver);
    server.once('error', rechazar);
  });
  const address = server.address() as AddressInfo;
  baseUrl = `http://127.0.0.1:${address.port}`;
});

after(async () => {
  if (server) {
    await new Promise<void>((resolver, rechazar) => {
      server.close((error) => {
        if (error) rechazar(error);
        else resolver();
      });
    });
  }
});

describe('perfil: control de acceso y validación', () => {
  test('requiere autenticación para consultar el perfil propio', async () => {
    const response = await fetch(`${baseUrl}/api/users/profile`);
    assert.equal(response.status, 401);
    const body = await response.json() as { code: string };
    assert.equal(body.code, 'TOKEN_NOT_PROVIDED');
  });

  test('la confirmación de correo no requiere sesión, pero sí un token', async () => {
    const response = await fetch(`${baseUrl}/api/users/profile/email/confirm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    assert.equal(response.status, 400);
    const body = await response.json() as { code: string };
    assert.equal(body.code, 'EMAIL_TOKEN_INVALID');
  });

  test('rechaza userId, rol y campos adicionales en la actualización', async () => {
    const resultado = await llamarControlador(
      actualizarMiPerfil,
      crearRequest({
        nombre: 'Nombre actualizado',
        userId: 22,
        rol: 'administrador',
      }),
    );
    assert.equal(resultado.codigo, 400);
    assert.equal(resultado.cuerpo?.code, 'INVALID_PROFILE_FIELDS');
  });

  test('rechaza nombres vacíos o con solo espacios', async () => {
    const resultado = await llamarControlador(
      actualizarMiPerfil,
      crearRequest({ nombre: '   ' }),
    );
    assert.equal(resultado.codigo, 400);
    assert.equal(resultado.cuerpo?.code, 'INVALID_PROFILE_DATA');
  });

  test('rechaza caracteres de control en los nombres', async () => {
    const resultado = await llamarControlador(
      actualizarMiPerfil,
      crearRequest({ nombre: 'Nombre\u0000inválido' }),
    );
    assert.equal(resultado.codigo, 400);
    assert.equal(resultado.cuerpo?.code, 'INVALID_PROFILE_DATA');
  });

  test('rechaza números de teléfono con formato inválido', async () => {
    const resultado = await llamarControlador(
      actualizarMiPerfil,
      crearRequest({ telefono: '123' }),
    );
    assert.equal(resultado.codigo, 400);
    assert.equal(resultado.cuerpo?.code, 'INVALID_PHONE');
  });

  test('rechaza correos con formato inválido antes de consultar disponibilidad', async () => {
    const resultado = await llamarControlador(
      solicitarCambioCorreoPerfil,
      crearRequest({ correo: 'no-es-correo', contrasenaActual: 'secreto' }),
    );
    assert.equal(resultado.codigo, 400);
    assert.equal(resultado.cuerpo?.code, 'INVALID_EMAIL');
  });

  test('rechaza contraseñas que no cumplen la política antes de consultar la cuenta', async () => {
    const resultado = await llamarControlador(
      actualizarContrasenaPerfil,
      crearRequest({
        contrasenaActual: 'secreto',
        contrasenaNueva: 'debil',
        confirmacion: 'debil',
      }),
    );
    assert.equal(resultado.codigo, 400);
    assert.equal(resultado.cuerpo?.code, 'INVALID_PASSWORD');
  });

  test('rechaza bytes que no contienen una imagen válida, aunque el navegador los haya enviado como foto', async () => {
    const resultado = await llamarControlador(
      subirFotoPerfil,
      crearRequest(
        {},
        {
          fieldname: 'foto',
          originalname: 'foto.jpg',
          encoding: '7bit',
          mimetype: 'image/jpeg',
          size: 12,
          buffer: Buffer.from('not-an-image'),
        } as Express.Multer.File,
      ),
    );
    assert.equal(resultado.codigo, 400);
    assert.equal(resultado.cuerpo?.code, 'INVALID_IMAGE');
  });
});
