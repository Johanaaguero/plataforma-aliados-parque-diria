interface PlantillaReservaParams {
  nombre: string;
  nombreEvento: string;
  fecha: string;
  hora: string;
  estado: 'aprobada' | 'rechazada';
  lugar?: string | null | undefined;
}

interface PlantillaReserva {
  subject: string;
  html: string;
  text: string;
}

function escaparHtml(valor: string): string {
  return valor
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/* Paleta institucional */
const COLOR = {
  verdeOscuro: '#095540',
  verde: '#009444',
  lima: '#8DC63F',
  azul: '#00AEEF',
  amarillo: '#D9D823',
  texto: '#1F2937',
  textoSuave: '#5B6B63',
  borde: '#E3EAE5',
  fondo: '#F2F5F3',
  fondoSuave: '#F8FAF8',
} as const;

const FUENTE =
  "'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, Helvetica, Arial, sans-serif";

/**
 * Fila de detalle.
 */
function filaDetalle(
  etiqueta: string,
  valorSeguro: string,
  ultima = false,
): string {
  return `
    <tr>
      <td
        width="34%"
        valign="top"
        style="
          padding:14px 18px;
          font-family:${FUENTE};
          font-size:12px;
          font-weight:600;
          letter-spacing:0.8px;
          text-transform:uppercase;
          color:${COLOR.textoSuave};
          ${ultima ? '' : `border-bottom:1px solid ${COLOR.borde};`}
        "
      >
        ${etiqueta}
      </td>

      <td
        valign="top"
        style="
          padding:14px 18px;
          font-family:${FUENTE};
          font-size:15px;
          font-weight:600;
          color:${COLOR.texto};
          ${ultima ? '' : `border-bottom:1px solid ${COLOR.borde};`}
        "
      >
        ${valorSeguro}
      </td>
    </tr>
  `;
}

export function crearPlantillaReserva({
  nombre,
  nombreEvento,
  fecha,
  hora,
  estado,
  lugar,
}: PlantillaReservaParams): PlantillaReserva {
  const nombreSeguro = escaparHtml(nombre);
  const eventoSeguro = escaparHtml(nombreEvento);
  const fechaSegura = escaparHtml(fecha);
  const horaSegura = escaparHtml(hora);

  const lugarLimpio = lugar?.trim() || '';
  const lugarSeguro = lugarLimpio
    ? escaparHtml(lugarLimpio)
    : '';

  const aprobada = estado === 'aprobada';

  const subject = aprobada
    ? 'Reserva aprobada | Aliados del Parque'
    : 'Actualización de tu reserva | Aliados del Parque';

  const titulo = aprobada
    ? 'Tu reserva fue aprobada'
    : 'No fue posible aprobar tu reserva';

  const mensaje = aprobada
    ? 'Nos complace confirmar tu participación. A continuación encontrarás los detalles de tu reserva.'
    : 'Lamentamos informarte que tu reserva no pudo ser aprobada en esta ocasión. Te compartimos el detalle de la solicitud.';

  const estadoTexto = aprobada
    ? 'Aprobada'
    : 'Rechazada';

  /* Colores del distintivo de estado */
  const estadoFondo = aprobada
    ? '#E6F4EA'
    : '#FBE9E7';

  const estadoBorde = aprobada
    ? '#B7DEC2'
    : '#F2C4BD';

  const estadoColor = aprobada
    ? COLOR.verdeOscuro
    : '#A8352A';

  const estadoPunto = aprobada
    ? COLOR.verde
    : '#D9534F';

  const notaFinal = aprobada
    ? 'Te recomendamos conservar este correo como comprobante de tu reserva. Por favor, llega con unos minutos de anticipación.'
    : 'Si deseas más información sobre el estado de tu reserva o participar en otra actividad, puedes consultar la plataforma de Aliados del Parque.';

  const preheader = aprobada
    ? `Tu reserva para "${nombreEvento}" fue aprobada.`
    : `Actualización sobre tu reserva para "${nombreEvento}".`;

  const filas = [
    filaDetalle(
      'Actividad',
      eventoSeguro,
    ),

    filaDetalle(
      'Fecha',
      fechaSegura,
    ),

    filaDetalle(
      'Hora',
      horaSegura,
      !lugarSeguro,
    ),

    ...(lugarSeguro
      ? [
          filaDetalle(
            'Lugar',
            lugarSeguro,
            true,
          ),
        ]
      : []),
  ].join('');

  const html = `<!DOCTYPE html>
<html lang="es">

<head>
  <meta charset="UTF-8">

  <meta
    name="viewport"
    content="width=device-width, initial-scale=1.0"
  >

  <meta
    name="x-apple-disable-message-reformatting"
  >

  <meta
    name="color-scheme"
    content="light"
  >

  <title>${escaparHtml(subject)}</title>
</head>

<body
  style="
    margin:0;
    padding:0;
    background-color:${COLOR.fondo};
    -webkit-text-size-adjust:100%;
  "
>
  <!-- Texto de vista previa -->
<div
  style="
    display:none;
    max-height:0;
    overflow:hidden;
    opacity:0;
    mso-hide:all;
    font-size:1px;
    line-height:1px;
    color:${COLOR.fondo};
  "
>
  ${escaparHtml(preheader)}
</div>

  <table
    role="presentation"
    width="100%"
    cellpadding="0"
    cellspacing="0"
    border="0"
    style="
      background-color:${COLOR.fondo};
    "
  >
    <tr>
      <td
        align="center"
        style="
          padding:32px 14px;
        "
      >

        <table
          role="presentation"
          width="600"
          cellpadding="0"
          cellspacing="0"
          border="0"
          style="
            width:100%;
            max-width:600px;
            background-color:#ffffff;
            border-radius:18px;
            overflow:hidden;
            border:1px solid ${COLOR.borde};
          "
        >

          <!-- Franja de colores institucionales -->
          <tr>
            <td
              style="
                padding:0;
                font-size:0;
                line-height:0;
              "
            >
              <table
                role="presentation"
                width="100%"
                cellpadding="0"
                cellspacing="0"
                border="0"
              >
                <tr>

                  <td
                    width="40%"
                    height="6"
                    style="
                      background-color:${COLOR.verde};
                      font-size:0;
                      line-height:0;
                    "
                  >
                    &nbsp;
                  </td>

                  <td
                    width="25%"
                    height="6"
                    style="
                      background-color:${COLOR.lima};
                      font-size:0;
                      line-height:0;
                    "
                  >
                    &nbsp;
                  </td>

                  <td
                    width="20%"
                    height="6"
                    style="
                      background-color:${COLOR.amarillo};
                      font-size:0;
                      line-height:0;
                    "
                  >
                    &nbsp;
                  </td>

                  <td
                    width="15%"
                    height="6"
                    style="
                      background-color:${COLOR.azul};
                      font-size:0;
                      line-height:0;
                    "
                  >
                    &nbsp;
                  </td>

                </tr>
              </table>
            </td>
          </tr>

          <!-- ENCABEZADO: LOGO A LA IZQUIERDA Y CENTRADO EN LA PLANTILLA -->
          <tr>
            <td
              align="center"
              style="
                background-color:${COLOR.verdeOscuro};
                padding:28px 30px;
                text-align:center;
              "
            >

              <table
                role="presentation"
                cellpadding="0"
                cellspacing="0"
                border="0"
                style="
                  margin:0 auto;
                  display:inline-table;
                "
              >
                <tr>

                  <!-- Logo a la izquierda -->
                  <td
                    valign="middle"
                    align="center"
                    style="
                      padding-right:18px;
                    "
                  >
                    <img
                      src="cid:logo-aliados"
                      alt="Aliados del Parque"
                      width="82"
                      style="
                        display:block;
                        width:82px;
                        max-width:82px;
                        height:auto;
                        border:0;
                        outline:none;
                        text-decoration:none;
                      "
                    >
                  </td>

                  <!-- Texto al lado derecho del logo -->
                  <td
                    valign="middle"
                    align="left"
                  >
                    <div
                      style="
                        font-family:${FUENTE};
                        font-size:11px;
                        font-weight:600;
                        letter-spacing:2.5px;
                        text-transform:uppercase;
                        color:${COLOR.lima};
                        margin-bottom:7px;
                      "
                    >
                      Parque Nacional Diriá
                    </div>

                    <div
                      style="
                        font-family:${FUENTE};
                        font-size:28px;
                        line-height:1.15;
                        font-weight:700;
                        letter-spacing:0.3px;
                        color:#ffffff;
                      "
                    >
                      Aliados del Parque
                    </div>
                  </td>

                </tr>
              </table>

            </td>
          </tr>

          <!-- CONTENIDO -->
          <tr>
            <td
              style="
                padding:38px 36px 8px 36px;
              "
            >

              <p
                style="
                  margin:0 0 6px 0;
                  font-family:${FUENTE};
                  font-size:15px;
                  color:${COLOR.textoSuave};
                "
              >
                Hola,

                <strong
                  style="color:${COLOR.texto};"
                >
                  ${nombreSeguro}
                </strong>
              </p>

              <h1
                style="
                  margin:0 0 16px 0;
                  font-family:${FUENTE};
                  font-size:27px;
                  line-height:1.25;
                  font-weight:700;
                  color:${COLOR.verdeOscuro};
                "
              >
                ${titulo}
              </h1>

              <p
                style="
                  margin:0 0 26px 0;
                  font-family:${FUENTE};
                  font-size:15px;
                  line-height:1.7;
                  color:${COLOR.textoSuave};
                "
              >
                ${mensaje}
              </p>

              <!-- Distintivo de estado -->
              <table
                role="presentation"
                cellpadding="0"
                cellspacing="0"
                border="0"
                style="
                  margin:0 0 28px 0;
                "
              >
                <tr>
                  <td
                    style="
                      background-color:${estadoFondo};
                      border:1px solid ${estadoBorde};
                      border-radius:999px;
                      padding:9px 18px;
                      font-family:${FUENTE};
                      font-size:12px;
                      font-weight:700;
                      letter-spacing:1px;
                      text-transform:uppercase;
                      color:${estadoColor};
                    "
                  >
                    <span
                      style="
                        color:${estadoPunto};
                        font-size:14px;
                      "
                    >
                      &#9679;
                    </span>

                    &nbsp;

                    Reserva ${estadoTexto}
                  </td>
                </tr>
              </table>

              <!-- Detalles -->
              <div
                style="
                  font-family:${FUENTE};
                  font-size:13px;
                  font-weight:700;
                  letter-spacing:1.2px;
                  text-transform:uppercase;
                  color:${COLOR.verde};
                  margin-bottom:10px;
                "
              >
                Detalles de la reserva
              </div>

              <table
                role="presentation"
                width="100%"
                cellpadding="0"
                cellspacing="0"
                border="0"
                style="
                  background-color:${COLOR.fondoSuave};
                  border:1px solid ${COLOR.borde};
                  border-radius:12px;
                "
              >
                ${filas}
              </table>

              <!-- Nota -->
              <table
                role="presentation"
                width="100%"
                cellpadding="0"
                cellspacing="0"
                border="0"
                style="
                  margin:26px 0 0 0;
                "
              >
                <tr>

                  <td
                    width="4"
                    style="
                      background-color:${
                        aprobada
                          ? COLOR.lima
                          : COLOR.azul
                      };
                      border-radius:4px;
                      font-size:0;
                      line-height:0;
                    "
                  >
                    &nbsp;
                  </td>

                  <td
                    style="
                      padding:2px 0 2px 16px;
                      font-family:${FUENTE};
                      font-size:14px;
                      line-height:1.7;
                      color:${COLOR.textoSuave};
                    "
                  >
                    ${notaFinal}
                  </td>

                </tr>
              </table>

            </td>
          </tr>

          <!-- Despedida -->
          <tr>
            <td
              style="
                padding:28px 36px 36px 36px;
                font-family:${FUENTE};
                font-size:14px;
                line-height:1.7;
                color:${COLOR.textoSuave};
              "
            >
              Gracias por ser parte de la comunidad,<br>

              <strong
                style="
                  color:${COLOR.verdeOscuro};
                "
              >
                Equipo Aliados del Parque
              </strong>
            </td>
          </tr>

          <!-- Pie -->
          <tr>
            <td
              align="center"
              style="
                background-color:${COLOR.fondoSuave};
                border-top:1px solid ${COLOR.borde};
                padding:24px 30px;
              "
            >

              <div
                style="
                  font-family:${FUENTE};
                  font-size:12px;
                  font-weight:600;
                  letter-spacing:1.5px;
                  text-transform:uppercase;
                  color:${COLOR.verdeOscuro};
                "
              >
                Aliados del Parque Nacional Diriá
              </div>

              <div
                style="
                  margin-top:6px;
                  font-family:${FUENTE};
                  font-size:12px;
                  color:${COLOR.textoSuave};
                "
              >
                Guanacaste, Costa Rica
              </div>

              <div
                style="
                  margin-top:14px;
                  font-family:${FUENTE};
                  font-size:11px;
                  line-height:1.6;
                  color:#8A9A92;
                "
              >
                Este es un mensaje automático,
                por favor no respondas a este correo.
              </div>

            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>

</body>
</html>`;

  const text = [
    'ALIADOS DEL PARQUE',
    'Parque Nacional Diriá · Guanacaste, Costa Rica',
    '',
    `Hola, ${nombre}.`,
    '',
    titulo.toUpperCase(),
    '',
    mensaje,
    '',
    `Estado: ${estadoTexto}`,
    '',
    'DETALLES DE LA RESERVA',
    `Actividad: ${nombreEvento}`,
    `Fecha: ${fecha}`,
    `Hora: ${hora}`,
    ...(lugarLimpio
      ? [`Lugar: ${lugarLimpio}`]
      : []),
    '',
    notaFinal,
    '',
    'Gracias por ser parte de la comunidad,',
    'Equipo Aliados del Parque',
    '',
    'Este es un mensaje automático, por favor no respondas a este correo.',
  ].join('\n');

  return {
    subject,
    html,
    text,
  };
}