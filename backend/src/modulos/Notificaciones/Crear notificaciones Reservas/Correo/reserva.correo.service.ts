import fs from 'fs';
import path from 'path';
import nodemailer from 'nodemailer';
import type { Attachment } from 'nodemailer/lib/mailer';

import { crearPlantillaReserva } from './reserva.correo.template';

interface EnviarCorreoReservaParams {
  destinatario: string;
  nombre: string;
  nombreEvento: string;
  fecha: string;
  hora: string;
  estado: 'aprobada' | 'rechazada';
  lugar?: string | null | undefined;
}

interface ConfiguracionCorreo {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  password: string;
  from: string;
}

function obtenerVariableRequerida(
  nombre: string,
): string {
  const valor = process.env[nombre]?.trim();

  if (!valor) {
    throw new Error(
      `Falta la variable de entorno ${nombre}`,
    );
  }

  return valor;
}

function obtenerConfiguracionCorreo(): ConfiguracionCorreo {
  const host =
    obtenerVariableRequerida('SMTP_HOST');

  const portTexto =
    obtenerVariableRequerida('SMTP_PORT');

  const secureTexto =
    obtenerVariableRequerida(
      'SMTP_SECURE',
    ).toLowerCase();

  const user =
    obtenerVariableRequerida('SMTP_USER');

  const password =
    obtenerVariableRequerida(
      'SMTP_PASSWORD',
    );

  const from =
    obtenerVariableRequerida('SMTP_FROM');

  const port = Number(portTexto);

  if (
    !Number.isInteger(port) ||
    port <= 0 ||
    port > 65535
  ) {
    throw new Error(
      'SMTP_PORT debe ser un puerto válido',
    );
  }

  if (
    secureTexto !== 'true' &&
    secureTexto !== 'false'
  ) {
    throw new Error(
      'SMTP_SECURE debe ser true o false',
    );
  }

  return {
    host,
    port,
    secure: secureTexto === 'true',
    user,
    password,
    from,
  };
}

export async function enviarCorreoReserva({
  destinatario,
  nombre,
  nombreEvento,
  fecha,
  hora,
  estado,
  lugar,
}: EnviarCorreoReservaParams): Promise<void> {
  const configuracion =
    obtenerConfiguracionCorreo();

  const plantilla =
    crearPlantillaReserva({
      nombre,
      nombreEvento,
      fecha,
      hora,
      estado,
      lugar,
    });

  const transporter =
    nodemailer.createTransport({
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

 const rutaLogo = path.resolve(
  process.cwd(),
  '..',
  'frontend',
  'logo-blanco.png',
);

  const archivosAdjuntos: Attachment[] = [];

  if (fs.existsSync(rutaLogo)) {
    archivosAdjuntos.push({
      filename: 'logo-blanco.png',
      path: rutaLogo,
      cid: 'logo-aliados',
      contentDisposition: 'inline',
    });
  } else {
    console.warn(
      'No se encontró el logo para el correo:',
      rutaLogo,
    );
  }

  await transporter.sendMail({
    from: configuracion.from,
    to: destinatario,
    subject: plantilla.subject,
    html: plantilla.html,
    text: plantilla.text,
    attachments: archivosAdjuntos,
  });
}