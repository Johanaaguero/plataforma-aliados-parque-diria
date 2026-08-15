import nodemailer from 'nodemailer';
import { crearPlantillaRecuperacion } from './correo.template';

interface EnviarCorreoRecuperacionParams {
  destinatario: string;
  nombre: string;
  token: string;
  minutosExpiracion: number;
}

interface ConfiguracionCorreo {
  frontendUrl: string;
  host: string;
  port: number;
  secure: boolean;
  user: string;
  password: string;
  from: string;
}

function obtenerVariableRequerida(nombre: string): string {
  const valor = process.env[nombre]?.trim();

  if (!valor) {
    throw new Error(`Falta la variable de entorno ${nombre}`);
  }

  return valor;
}

function obtenerConfiguracionCorreo(): ConfiguracionCorreo {
  const frontendUrl = obtenerVariableRequerida('FRONTEND_URL');
  const host = obtenerVariableRequerida('SMTP_HOST');
  const portTexto = obtenerVariableRequerida('SMTP_PORT');
  const secureTexto = obtenerVariableRequerida('SMTP_SECURE').toLowerCase();
  const user = obtenerVariableRequerida('SMTP_USER');
  const password = obtenerVariableRequerida('SMTP_PASSWORD');
  const from = obtenerVariableRequerida('SMTP_FROM');
  const port = Number(portTexto);

  if (!Number.isInteger(port) || port <= 0 || port > 65535) {
    throw new Error('SMTP_PORT debe ser un puerto válido');
  }

  if (secureTexto !== 'true' && secureTexto !== 'false') {
    throw new Error('SMTP_SECURE debe ser true o false');
  }

  return {
    frontendUrl,
    host,
    port,
    secure: secureTexto === 'true',
    user,
    password,
    from,
  };
}

function construirUrlRecuperacion(frontendUrl: string, token: string): string {
  const resetUrl = new URL(frontendUrl);

  if (resetUrl.protocol !== 'http:' && resetUrl.protocol !== 'https:') {
    throw new Error('FRONTEND_URL debe utilizar HTTP o HTTPS');
  }

  resetUrl.username = '';
  resetUrl.password = '';
  resetUrl.hash = '';
  resetUrl.search = '';
  resetUrl.pathname =
    `${resetUrl.pathname.replace(/\/+$/, '')}/restablecer-contrasena`;
  resetUrl.searchParams.set('token', token);
  return resetUrl.toString();
}

export async function enviarCorreoRecuperacion({
  destinatario,
  nombre,
  token,
  minutosExpiracion,
}: EnviarCorreoRecuperacionParams): Promise<void> {
  const configuracion = obtenerConfiguracionCorreo();
  const resetUrl = construirUrlRecuperacion(configuracion.frontendUrl, token);
  const plantilla = crearPlantillaRecuperacion({
    nombre,
    resetUrl,
    minutosExpiracion,
  });
  const transporter = nodemailer.createTransport({
    host: configuracion.host,
    port: configuracion.port,
    secure: configuracion.secure,
    requireTLS: !configuracion.secure,
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
    auth: {
      user: configuracion.user,
      pass: configuracion.password,
    },
  });

  await transporter.sendMail({
    from: configuracion.from,
    to: destinatario,
    subject: plantilla.subject,
    html: plantilla.html,
    text: plantilla.text,
  });
}
