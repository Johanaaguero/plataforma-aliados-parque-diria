import nodemailer from 'nodemailer';

import { Incidencia } from '../../../../models/Incidencia';
import { Usuario } from '../../../../models/Usuario';
import { AppDataSource } from '../../../../data-source';
import { plantillaIncidenciaCompartida } from './Incidencia.correo.template';

interface ConfiguracionCorreo {
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
    throw new Error(
      `Falta la variable de entorno ${nombre}`,
    );
  }

  return valor;
}

function obtenerConfiguracionCorreo(): ConfiguracionCorreo {
  const host = obtenerVariableRequerida('SMTP_HOST');
  const portTexto = obtenerVariableRequerida('SMTP_PORT');
  const secureTexto =
    obtenerVariableRequerida('SMTP_SECURE').toLowerCase();
  const user = obtenerVariableRequerida('SMTP_USER');
  const password =
    obtenerVariableRequerida('SMTP_PASSWORD');
  const from = obtenerVariableRequerida('SMTP_FROM');

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

function crearTransporter() {
  const configuracion = obtenerConfiguracionCorreo();

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


function formatearFechaIncidencia(
  fecha: Date | string | null | undefined,
): string {
  if (!fecha) {
    return 'No disponible';
  }

  if (typeof fecha === 'string') {
    const coincidencia = fecha.match(
      /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})/,
    );

    if (coincidencia) {
      const [
        ,
        anio,
        mes,
        dia,
        hora,
        minuto,
        segundo,
      ] = coincidencia;

      return `${dia}/${mes}/${anio} ${hora}:${minuto}:${segundo}`;
    }

    return fecha;
  }

  return new Intl.DateTimeFormat('es-CR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
    timeZone: 'America/Costa_Rica',
  }).format(fecha);
}

export class IncidenciaCorreoService {
  private readonly usuarioRepo =
    AppDataSource.getRepository(Usuario);

  async enviarIncidenciaCompartida(
    incidencia: Incidencia,
  ): Promise<boolean> {
    try {
      /*
       * Buscar todos los usuarios registrados
       * que tengan un correo.
       */
      const usuarios = await this.usuarioRepo
        .createQueryBuilder('usuario')
        .where('usuario.correo IS NOT NULL')
        .andWhere("TRIM(usuario.correo) <> ''")
        .getMany();

      /*
       * Si no hay usuarios con correo,
       * no se puede enviar.
       */
      if (usuarios.length === 0) {
        console.warn(
          'No se envió correo: no existen usuarios registrados con correo.',
        );

        return false;
      }

      const contenido =
        plantillaIncidenciaCompartida({
          tituloIncidencia:
            incidencia.titulo,

          descripcionIncidencia:
            incidencia.descripcion,

          fechaRegistro:
            formatearFechaIncidencia(
              incidencia.fechaRegistro,
            ),

          categoria:
            incidencia.categoria ??
            'No especificada',

          ubicacion:
            incidencia.ubicacion ??
            'No especificada',
        });

      const configuracion =
        obtenerConfiguracionCorreo();

      const transporter =
        crearTransporter();

      const correos = usuarios
        .map(
          (usuario) =>
            usuario.correo?.trim(),
        )
        .filter(
          (correo): correo is string =>
            Boolean(correo),
        );

      const resultados =
        await Promise.allSettled(
          correos.map((correo) =>
            transporter.sendMail({
              from: configuracion.from,
              to: correo,
              subject: contenido.asunto,
              text: contenido.texto,
              html: contenido.html,
            }),
          ),
        );

      const correosEnviados =
        resultados.filter(
          (resultado) =>
            resultado.status === 'fulfilled',
        ).length;

      resultados.forEach(
        (resultado, indice) => {
          if (
            resultado.status ===
            'fulfilled'
          ) {
            console.log(
              'Correo enviado correctamente:',
              {
                messageId:
                  resultado.value.messageId,
                to: correos[indice],
              },
            );
          } else {
            console.error(
              `No se pudo enviar el correo a ${correos[indice]}:`,
              resultado.reason,
            );
          }
        },
      );

      return correosEnviados > 0;
    } catch (error) {
      console.error(
        'Error al enviar correos de incidencia compartida:',
        error,
      );

      return false;
    }
  }
}

export const incidenciaCorreoService =
  new IncidenciaCorreoService();