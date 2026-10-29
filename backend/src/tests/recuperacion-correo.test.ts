import assert from 'node:assert/strict';
import test from 'node:test';
import type { SendMailOptions, SentMessageInfo } from 'nodemailer';
import {
  enviarCorreoRecuperacion,
  type TransportadorCorreo,
} from '../modulos/Autenticación y gestión de usuario/Recuperación de contraseña/correo.service';

const variablesCorreo = {
  FRONTEND_URL: 'https://frontend.example.test',
  SMTP_HOST: 'smtp-relay.brevo.com',
  SMTP_PORT: '587',
  SMTP_SECURE: 'false',
  SMTP_USER: 'usuario-prueba',
  SMTP_PASSWORD: 'secreto-prueba',
  SMTP_FROM: 'Aliados <no-reply@example.test>',
};

function configurarEntornoCorreo(): () => void {
  const valoresPrevios = Object.fromEntries(
    Object.keys(variablesCorreo).map((nombre) => [nombre, process.env[nombre]]),
  );

  Object.assign(process.env, variablesCorreo);

  return () => {
    for (const [nombre, valor] of Object.entries(valoresPrevios)) {
      if (valor === undefined) {
        delete process.env[nombre];
      } else {
        process.env[nombre] = valor;
      }
    }
  };
}

test('envía mediante el transportador inyectado y registra el messageId sin exponer el token', async () => {
  const restaurarEntorno = configurarEntornoCorreo();
  const registros: unknown[][] = [];
  const infoOriginal = console.info;
  let mensaje: SendMailOptions | undefined;

  console.info = (...argumentos: unknown[]) => registros.push(argumentos);

  const transportador: TransportadorCorreo = {
    sendMail: async (opciones) => {
      mensaje = opciones;
      return {
        messageId: 'brevo-message-id-123',
        envelope: {
          from: 'no-reply@example.test',
          to: ['destinatario@example.test'],
        },
        accepted: ['destinatario@example.test'],
        rejected: [],
        response: '250 Message queued',
      } as SentMessageInfo;
    },
  };

  try {
    await enviarCorreoRecuperacion(
      {
        destinatario: 'destinatario@example.test',
        nombre: 'Destinatario',
        token: 'token-secreto-no-registrable',
        minutosExpiracion: 30,
      },
      () => transportador,
    );

    assert.equal(mensaje?.to, 'destinatario@example.test');
    assert.match(String(mensaje?.html ?? ''), /restablecer-contrasena/);
    assert.match(JSON.stringify(registros), /brevo-message-id-123/);
    assert.doesNotMatch(JSON.stringify(registros), /token-secreto-no-registrable/);
  } finally {
    console.info = infoOriginal;
    restaurarEntorno();
  }
});

test('registra el código del proveedor y propaga el fallo sin enviar correo real', async () => {
  const restaurarEntorno = configurarEntornoCorreo();
  const registros: unknown[][] = [];
  const errorOriginal = console.error;
  console.error = (...argumentos: unknown[]) => registros.push(argumentos);

  const errorProveedor = Object.assign(new Error('Autenticación SMTP rechazada'), {
    code: 'EAUTH',
  });
  const transportador: TransportadorCorreo = {
    sendMail: async () => {
      throw errorProveedor;
    },
  };

  try {
    await assert.rejects(
      enviarCorreoRecuperacion(
        {
          destinatario: 'destinatario@example.test',
          nombre: 'Destinatario',
          token: 'token-secreto-no-registrable',
          minutosExpiracion: 30,
        },
        () => transportador,
      ),
      errorProveedor,
    );

    const salida = JSON.stringify(registros);
    assert.match(salida, /EAUTH/);
    assert.match(salida, /d\*\*\*@example\.test/);
    assert.doesNotMatch(salida, /token-secreto-no-registrable/);
  } finally {
    console.error = errorOriginal;
    restaurarEntorno();
  }
});
