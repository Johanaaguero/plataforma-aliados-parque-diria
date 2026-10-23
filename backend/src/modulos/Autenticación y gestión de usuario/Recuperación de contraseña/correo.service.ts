import nodemailer from 'nodemailer';
import type { SendMailOptions, SentMessageInfo } from 'nodemailer';
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

export interface TransportadorCorreo {
  sendMail(opciones: SendMailOptions): Promise<SentMessageInfo>;
}

export type CrearTransportadorCorreo = (
  configuracion: ConfiguracionCorreo,
) => TransportadorCorreo;

function enmascararDestinatario(correo: string): string {
  const [usuario, dominio] = correo.trim().split('@');

  if (!usuario || !dominio) {
    return 'destinatario-inválido';
  }

  return `${usuario.slice(0, 1)}***@${dominio}`;
}

function obtenerDominioRemitente(remitente: string): string {
  const correo = remitente.match(/<([^>]+)>/)?.[1] ?? remitente;
  return correo.trim().split('@')[1] ?? 'dominio-desconocido';
}

function sanitizarMensajeProveedor(message: string): string {
  return message
    .replace(
      /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi,
      (correo) => enmascararDestinatario(correo),
    )
    .replace(/https?:\/\/\S+/gi, '[URL omitida]');
}

function describirErrorProveedor(error: unknown): {
  code: string | undefined;
  message: string;
} {
  if (error instanceof Error) {
    const code =
      typeof (error as NodeJS.ErrnoException).code === 'string'
        ? (error as NodeJS.ErrnoException).code
        : undefined;

    return { code, message: sanitizarMensajeProveedor(error.message) };
  }

  return { code: undefined, message: 'Error desconocido del proveedor SMTP' };
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

function crearTransportador(configuracion: ConfiguracionCorreo): TransportadorCorreo {
  return nodemailer.createTransport({
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
}

export async function enviarCorreoRecuperacion({
  destinatario,
  nombre,
  token,
  minutosExpiracion,
}: EnviarCorreoRecuperacionParams,
crearTransportadorCorreo: CrearTransportadorCorreo = crearTransportador,
): Promise<void> {
  const configuracion = obtenerConfiguracionCorreo();
  const resetUrl = construirUrlRecuperacion(configuracion.frontendUrl, token);
  const plantilla = crearPlantillaRecuperacion({
    nombre,
    resetUrl,
    minutosExpiracion,
  });
  const destinatarioEnmascarado = enmascararDestinatario(destinatario);
  const dominioRemitente = obtenerDominioRemitente(configuracion.from);

  console.info('Recuperación de contraseña: inicio de envío SMTP', {
    destinatario: destinatarioEnmascarado,
    dominioRemitente,
    proveedor: 'Brevo SMTP',
  });

  try {
    const transporter = crearTransportadorCorreo(configuracion);
    const resultado = await transporter.sendMail({
      from: configuracion.from,
      to: destinatario,
      subject: plantilla.subject,
      html: plantilla.html,
      text: plantilla.text,
    });

    const rechazados = resultado.rejected?.length ?? 0;

    if (rechazados > 0) {
      const error = new Error('El proveedor SMTP rechazó el destinatario');
      (error as NodeJS.ErrnoException).code = 'SMTP_RECIPIENT_REJECTED';
      throw error;
    }

    console.info('Recuperación de contraseña: correo SMTP aceptado', {
      destinatario: destinatarioEnmascarado,
      dominioRemitente,
      messageId: resultado.messageId ?? null,
      aceptados: resultado.accepted?.length ?? 0,
      rechazados,
      respuestaProveedor: resultado.response ?? null,
    });
  } catch (error) {
    const detalle = describirErrorProveedor(error);

    console.error('Recuperación de contraseña: fallo de envío SMTP', {
      destinatario: destinatarioEnmascarado,
      dominioRemitente,
      proveedor: 'Brevo SMTP',
      code: detalle.code ?? null,
      message: detalle.message,
    });
    throw error;
  }
}
