import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { resolve } from 'node:path';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import express from 'express';
import { config } from 'dotenv';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import sharp from 'sharp';
import type { DataSource } from 'typeorm';
import type { Usuario } from '../models/Usuario';

config({ path: resolve(process.cwd(), '.env') });
const BASE_PRUEBA = 'aliados_parque_diria_test';
process.env.DB_DATABASE = BASE_PRUEBA;
process.env.JWT_SECRET = 'perfil-integracion-secret-no-usar-en-produccion';

let dataSource: DataSource;
let UsuarioModel: typeof Usuario;
let usuarioId = 0;
let usuarioSecundarioId = 0;
let usuarioNombre = '';
let correoOriginal = '';
let correoSecundario = '';
let telefonoNuevo = '';
let rolVisitanteCreadoId = 0;
let contrasenaOriginal = 'ClaveSegura1!';
let tokenSesion = '';
let tokenCorreo: string | null = null;
let avisoCorreoAnterior = false;
let avisoContrasena = false;
let server: Server;
let baseUrl: string;
let loginUser: typeof import('../modulos/Autenticación y gestión de usuario/inicio de sesion/login.service').loginUser;
let correoModule: Record<string, unknown>;
let descriptoresCorreo: Map<string, PropertyDescriptor | undefined>;

const request = async (
  ruta: string,
  opciones: RequestInit = {},
  token = tokenSesion,
) => {
  const headers = new Headers(opciones.headers);
  if (token) headers.set('Authorization', `Bearer ${token}`);
  const response = await fetch(`${baseUrl}${ruta}`, {
    ...opciones,
    headers,
  });
  const body = await response.json() as Record<string, unknown>;
  return { response, body };
};

const bodyJson = (value: unknown) => ({
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(value),
});

before(async () => {
  const mailRequire = require('../modulos/Autenticación y gestión de usuario/Recuperación de contraseña/correo.service') as Record<string, unknown>;
  correoModule = mailRequire;
  const nombresCorreo = [
    'enviarVerificacionCambioCorreo',
    'enviarAvisoCambioCorreo',
    'enviarAvisoCambioContrasena',
  ];
  descriptoresCorreo = new Map(
    nombresCorreo.map((nombre) => [
      nombre,
      Object.getOwnPropertyDescriptor(correoModule, nombre),
    ]),
  );
  Object.defineProperty(correoModule, 'enviarVerificacionCambioCorreo', {
    configurable: true,
    value: async (datos: { token: string }) => {
      tokenCorreo = datos.token;
    },
  });
  Object.defineProperty(correoModule, 'enviarAvisoCambioCorreo', {
    configurable: true,
    value: async () => {
      avisoCorreoAnterior = true;
    },
  });
  Object.defineProperty(correoModule, 'enviarAvisoCambioContrasena', {
    configurable: true,
    value: async () => {
      avisoContrasena = true;
    },
  });

  const dataSourceModule = await import('../data-source');
  const userModule = await import('../models/Usuario');
  const rolModule = await import('../models/Rol');
  const routeModule = await import(
    '../modulos/Autenticación y gestión de usuario/Gestión de Perfil/perfil.routes'
  );
  const loginModule = await import(
    '../modulos/Autenticación y gestión de usuario/inicio de sesion/login.service'
  );
  dataSource = dataSourceModule.AppDataSource;
  UsuarioModel = userModule.Usuario;
  loginUser = loginModule.loginUser;

  if ((dataSource.options as { database?: string }).database !== BASE_PRUEBA) {
    throw new Error('Las pruebas de perfil solo pueden utilizar la base test indicada.');
  }

  await dataSource.initialize();
  const bases: Array<{ databaseActual: string }> =
    await dataSource.query('SELECT DATABASE() AS databaseActual');
  if (bases[0]?.databaseActual !== BASE_PRUEBA) {
    throw new Error('Ejecución cancelada: el DataSource no apunta a la base test.');
  }
  await dataSource.runMigrations();

  const roles = dataSource.getRepository(rolModule.Rol);
  let rolVisitante = await roles.findOneBy({ nombre: 'visitante' });
  if (!rolVisitante) {
    rolVisitante = await roles.save(roles.create({
      nombre: 'visitante',
      descripcion: 'Rol para pruebas de integración',
    }));
    rolVisitanteCreadoId = rolVisitante.id;
  }

  const sufijo = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  usuarioNombre = `perfil_${sufijo}`;
  correoOriginal = `perfil-${sufijo}@example.test`;
  correoSecundario = `secundario-${sufijo}@example.test`;
  telefonoNuevo = `+50689${sufijo.slice(-6)}`;
  const telefonoOriginal = `+50688${sufijo.slice(-6)}`;
  const passwordHash = await bcrypt.hash(contrasenaOriginal, 10);
  const users = dataSource.getRepository(UsuarioModel);

  const usuario = await users.save(users.create({
    nombreUsuario: usuarioNombre,
    nombre: 'Nombre Inicial',
    apellidos: 'Apellido Inicial',
    correo: correoOriginal,
    telefono: telefonoOriginal,
    contraseña: passwordHash,
    rol: rolVisitante,
    correoVerificado: false,
    telefonoVerificado: false,
  }));
  usuarioId = usuario.id;

  const otroUsuario = await users.save(users.create({
    nombreUsuario: `otro_${sufijo}`,
    nombre: 'Otra Cuenta',
    apellidos: 'Cuenta',
    correo: correoSecundario,
    telefono: `+50687${sufijo.slice(-6)}`,
    contraseña: passwordHash,
    rol: rolVisitante,
    correoVerificado: false,
    telefonoVerificado: false,
  }));
  usuarioSecundarioId = otroUsuario.id;

  tokenSesion = jwt.sign(
    { id: usuarioId, nombreUsuario: usuarioNombre, rol: 'visitante' },
    process.env.JWT_SECRET!,
    { expiresIn: '1h', jwtid: `perfil-${sufijo}` },
  );

  const app = express();
  app.use(express.json());
  app.use('/api/users', routeModule.default);
  server = app.listen(0, '127.0.0.1');
  await new Promise<void>((resolver, rechazar) => {
    server.once('listening', resolver);
    server.once('error', rechazar);
  });
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
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

  if (dataSource?.isInitialized) {
    const userIds = [usuarioId, usuarioSecundarioId].filter(Boolean);
    if (userIds.length > 0) {
      await dataSource.query(
        'DELETE FROM `audit_logs` WHERE `usuario_id` IN (?)',
        [userIds],
      );
      await dataSource.query(
        'DELETE FROM `login_attempts` WHERE `usuarioId` IN (?)',
        [userIds],
      );
      await dataSource.query(
        'DELETE FROM `intentos_acceso` WHERE `usuario_id` IN (?)',
        [userIds],
      );
      await dataSource.getRepository(UsuarioModel).delete(userIds);
    }
    if (rolVisitanteCreadoId) {
      await dataSource.query(
        'DELETE FROM `roles` WHERE `id` = ?',
        [rolVisitanteCreadoId],
      );
    }
    if (tokenSesion) {
      await dataSource.query(
        'DELETE FROM `token_blacklist` WHERE `token` = ?',
        [tokenSesion],
      );
    }
    await dataSource.destroy();
  }

  for (const [nombre, descriptor] of descriptoresCorreo ?? []) {
    if (descriptor) Object.defineProperty(correoModule, nombre, descriptor);
  }
});

test('consulta y actualiza únicamente los datos permitidos del usuario del JWT', async () => {
  const anonima = await request('/api/users/profile', {}, '');
  assert.equal(anonima.response.status, 401);

  const inicial = await request('/api/users/profile');
  assert.equal(inicial.response.status, 200);
  const perfilInicial = inicial.body.data as Record<string, unknown>;
  assert.equal(perfilInicial.id, usuarioId);
  assert.equal(perfilInicial.correo, correoOriginal);
  assert.equal('contraseña' in perfilInicial, false);
  assert.equal('rol' in perfilInicial, false);

  const actualizacion = await request(
    '/api/users/profile',
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nombre: 'Nombre Actualizado',
        apellidos: 'Apellidos Actualizados',
        telefono: telefonoNuevo,
      }),
    },
  );
  assert.equal(actualizacion.response.status, 200);

  const usuarioActualizado = await dataSource
    .getRepository(UsuarioModel)
    .findOneByOrFail({ id: usuarioId });
  assert.equal(usuarioActualizado.nombre, 'Nombre Actualizado');
  assert.equal(usuarioActualizado.apellidos, 'Apellidos Actualizados');
  assert.equal(usuarioActualizado.rol.nombre, 'visitante');
  assert.equal(usuarioActualizado.telefonoVerificado, false);

  const alteracionPrivilegiada = await request(
    '/api/users/profile',
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: usuarioSecundarioId, rol: 'administrador' }),
    },
  );
  assert.equal(alteracionPrivilegiada.response.status, 400);
  const segundoUsuario = await dataSource
    .getRepository(UsuarioModel)
    .findOneByOrFail({ id: usuarioSecundarioId });
  assert.equal(segundoUsuario.rol.nombre, 'visitante');
});

test('el correo anterior sigue vigente hasta verificar el nuevo y el token es de un solo uso', async () => {
  const contrasenaIncorrecta = await request(
    '/api/users/profile/email',
    bodyJson({
      correo: 'no-autorizado@example.test',
      contrasenaActual: 'incorrecta',
    }),
  );
  assert.equal(contrasenaIncorrecta.response.status, 401);
  assert.equal(tokenCorreo, null);

  const correoDuplicado = await request(
    '/api/users/profile/email',
    bodyJson({
      correo: correoSecundario,
      contrasenaActual: contrasenaOriginal,
    }),
  );
  assert.equal(correoDuplicado.response.status, 409);

  const cambioSolicitado = await request(
    '/api/users/profile/email',
    bodyJson({
      correo: '  NUEVO.PERFIL@EXAMPLE.TEST ',
      contrasenaActual: contrasenaOriginal,
    }),
  );
  assert.equal(cambioSolicitado.response.status, 202);
  assert.ok(tokenCorreo);

  const antesDeConfirmar = await dataSource
    .getRepository(UsuarioModel)
    .findOneByOrFail({ id: usuarioId });
  assert.equal(antesDeConfirmar.correo, correoOriginal);
  assert.equal(antesDeConfirmar.correoVerificado, false);

  const confirmacion = await request(
    '/api/users/profile/email/confirm',
    bodyJson({ token: tokenCorreo }),
    '',
  );
  assert.equal(confirmacion.response.status, 200);
  const despuesDeConfirmar = await dataSource
    .getRepository(UsuarioModel)
    .findOneByOrFail({ id: usuarioId });
  assert.equal(despuesDeConfirmar.correo, 'nuevo.perfil@example.test');
  assert.equal(despuesDeConfirmar.correoVerificado, true);
  assert.equal(avisoCorreoAnterior, true);

  const tokenReutilizado = await request(
    '/api/users/profile/email/confirm',
    bodyJson({ token: tokenCorreo }),
    '',
  );
  assert.equal(tokenReutilizado.response.status, 400);
});

test('guarda y elimina una foto validada, re-encoded y privada', async () => {
  const imagen = await sharp({
    create: {
      width: 24,
      height: 24,
      channels: 3,
      background: { r: 12, g: 112, b: 76 },
    },
  }).png().toBuffer();
  const formulario = new FormData();
  formulario.append(
    'foto',
    new Blob([imagen], { type: 'image/png' }),
    'perfil.png',
  );

  const subida = await request('/api/users/profile/photo', {
    method: 'POST',
    body: formulario,
  });
  assert.equal(subida.response.status, 200);

  const foto = await fetch(`${baseUrl}/api/users/profile/photo`, {
    headers: { Authorization: `Bearer ${tokenSesion}` },
  });
  assert.equal(foto.status, 200);
  assert.equal(foto.headers.get('content-type'), 'image/webp');
  const bytes = Buffer.from(await foto.arrayBuffer());
  assert.equal((await sharp(bytes).metadata()).format, 'webp');

  const eliminacion = await request('/api/users/profile/photo', {
    method: 'DELETE',
  });
  assert.equal(eliminacion.response.status, 200);
  const perfil = await request('/api/users/profile');
  assert.equal((perfil.body.data as Record<string, unknown>).tieneFotoPerfil, false);
});

test('cambiar contraseña requiere la actual, invalida la sesión y conserva el login existente', async () => {
  const incorrecta = await request(
    '/api/users/profile/password',
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contrasenaActual: 'incorrecta',
        contrasenaNueva: 'NuevaClave2!',
        confirmacion: 'NuevaClave2!',
      }),
    },
  );
  assert.equal(incorrecta.response.status, 401);

  const actualizacion = await request(
    '/api/users/profile/password',
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contrasenaActual: contrasenaOriginal,
        contrasenaNueva: 'NuevaClave2!',
        confirmacion: 'NuevaClave2!',
      }),
    },
  );
  assert.equal(actualizacion.response.status, 200);
  assert.equal(avisoContrasena, true);

  const tokenInvalidado = await request('/api/users/profile');
  assert.equal(tokenInvalidado.response.status, 401);

  const usuario = await dataSource
    .getRepository(UsuarioModel)
    .createQueryBuilder('usuario')
    .addSelect('usuario.contraseña')
    .where('usuario.id = :id', { id: usuarioId })
    .getOneOrFail();
  assert.equal(await bcrypt.compare('NuevaClave2!', usuario.contraseña), true);

  const nuevaSesion = await loginUser({
    identificador: 'nuevo.perfil@example.test',
    password: 'NuevaClave2!',
    ipAddress: '127.0.0.1',
  });
  assert.equal(nuevaSesion.ok, true);
});
