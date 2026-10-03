export interface DatosCorreoIncidenciaCompartida {
  tituloIncidencia: string;
  descripcionIncidencia: string;
  fechaRegistro: string;
  categoria: string;
  ubicacion: string;
}

export interface ContenidoCorreo {
  asunto: string;
  html: string;
  texto: string;
}

const escaparHtml = (valor: string): string =>
  valor
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

export const plantillaIncidenciaCompartida = (
  datos: DatosCorreoIncidenciaCompartida,
): ContenidoCorreo => {
  const titulo = escaparHtml(
    datos.tituloIncidencia || 'Incidencia',
  );

  const descripcion = escaparHtml(
    datos.descripcionIncidencia || 'Sin descripción',
  );

  const fecha = escaparHtml(
    datos.fechaRegistro || 'No disponible',
  );

  const categoria = escaparHtml(
    datos.categoria || 'No especificada',
  );

  const ubicacion = escaparHtml(
    datos.ubicacion || 'No especificada',
  );

  const asunto = `⚠️ Aviso importante: ${datos.tituloIncidencia}`;

  const texto =
    `AVISO IMPORTANTE - PARQUE NACIONAL DIRIÁ\n\n` +
    `Se ha compartido una incidencia que puede ser relevante ` +
    `para las personas que visitan el Parque Nacional Diriá.\n\n` +
    `Título: ${datos.tituloIncidencia}\n` +
    `Descripción: ${datos.descripcionIncidencia}\n` +
    `Fecha de registro: ${datos.fechaRegistro}\n` +
    `Categoría: ${datos.categoria}\n` +
    `Ubicación: ${datos.ubicacion}\n\n` +
    `Se recomienda tomar las precauciones correspondientes ` +
    `durante la visita al Parque Nacional Diriá.`;

  const html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Aviso importante</title>
</head>

<body
  style="
    margin:0;
    padding:0;
    background:#EEF4EF;
    font-family:Arial,Helvetica,sans-serif;
  "
>
  <table
    width="100%"
    cellpadding="0"
    cellspacing="0"
    style="padding:24px 0;"
  >
    <tr>
      <td align="center">

        <table
          width="600"
          cellpadding="0"
          cellspacing="0"
          style="
            width:600px;
            max-width:600px;
            background:#ffffff;
            border-radius:16px;
            overflow:hidden;
          "
        >

          <!-- ENCABEZADO -->
          <tr>
            <td
              style="
                background:#095540;
                padding:24px 32px;
                color:#ffffff;
              "
            >
              <p
                style="
                  margin:0 0 8px;
                  font-size:12px;
                  font-weight:bold;
                  letter-spacing:1px;
                  text-transform:uppercase;
                "
              >
                Parque Nacional Diriá
              </p>

              <h1
                style="
                  margin:0;
                  font-size:23px;
                "
              >
                ⚠️ Aviso importante
              </h1>

              <p
                style="
                  margin:8px 0 0;
                  font-size:14px;
                "
              >
                Información preventiva sobre una incidencia
              </p>
            </td>
          </tr>

          <!-- AVISO -->
          <tr>
            <td style="padding:24px 32px 8px;">

              <table
                width="100%"
                cellpadding="0"
                cellspacing="0"
                style="
                  background:#FFF7E6;
                  border:1px solid #F0C36A;
                  border-radius:12px;
                "
              >
                <tr>
                  <td
                    style="
                      padding:16px;
                      color:#7A5200;
                      font-size:13px;
                      line-height:20px;
                    "
                  >
                    <strong>Información preventiva</strong><br>
                    Se ha compartido una incidencia que puede ser
                    relevante para las personas que visitan el
                    Parque Nacional Diriá.
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- DATOS DE LA INCIDENCIA -->
          <tr>
            <td
              style="
                padding:24px 32px;
                color:#17382B;
              "
            >

              <h2
                style="
                  margin:0 0 20px;
                  font-size:18px;
                  color:#095540;
                "
              >
                ${titulo}
              </h2>

              <table
                width="100%"
                cellpadding="0"
                cellspacing="0"
                style="
                  border:1px solid #DDE7E0;
                  border-radius:12px;
                "
              >

                <!-- DESCRIPCIÓN -->
                <tr>
                  <td
                    style="
                      padding:16px;
                      background:#F6F9F6;
                      color:#095540;
                      font-size:13px;
                      font-weight:bold;
                    "
                  >
                    Descripción
                  </td>
                </tr>

                <tr>
                  <td
                    style="
                      padding:16px;
                      color:#365443;
                      font-size:13px;
                      line-height:21px;
                    "
                  >
                    ${descripcion}
                  </td>
                </tr>

                <!-- FECHA -->
                <tr>
                  <td
                    style="
                      padding:16px;
                      background:#F6F9F6;
                      color:#095540;
                      font-size:13px;
                      font-weight:bold;
                    "
                  >
                    Fecha de registro
                  </td>
                </tr>

                <tr>
                  <td
                    style="
                      padding:16px;
                      color:#365443;
                      font-size:13px;
                    "
                  >
                    ${fecha}
                  </td>
                </tr>

                <!-- CATEGORÍA -->
                <tr>
                  <td
                    style="
                      padding:16px;
                      background:#F6F9F6;
                      color:#095540;
                      font-size:13px;
                      font-weight:bold;
                    "
                  >
                    Categoría
                  </td>
                </tr>

                <tr>
                  <td
                    style="
                      padding:16px;
                      color:#365443;
                      font-size:13px;
                    "
                  >
                    ${categoria}
                  </td>
                </tr>

                <!-- UBICACIÓN -->
                <tr>
                  <td
                    style="
                      padding:16px;
                      background:#F6F9F6;
                      color:#095540;
                      font-size:13px;
                      font-weight:bold;
                    "
                  >
                    Ubicación
                  </td>
                </tr>

                <tr>
                  <td
                    style="
                      padding:16px;
                      color:#365443;
                      font-size:13px;
                    "
                  >
                    ${ubicacion}
                  </td>
                </tr>

              </table>

            </td>
          </tr>

          <!-- RECOMENDACIÓN -->
          <tr>
            <td style="padding:0 32px 28px;">

              <table
                width="100%"
                cellpadding="0"
                cellspacing="0"
                style="
                  background:#FFF7E6;
                  border-radius:12px;
                "
              >
                <tr>
                  <td
                    style="
                      padding:16px;
                      color:#7A5200;
                      font-size:13px;
                      line-height:20px;
                    "
                  >
                    <strong>Recomendación:</strong><br>
                    Tome las precauciones correspondientes durante
                    su visita al Parque Nacional Diriá.
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- PIE -->
          <tr>
            <td
              style="
                padding:18px 32px;
                background:#F6F9F6;
                color:#7D9086;
                font-size:11px;
              "
            >
              Gestión administrativa · Aliados del Parque Nacional Diriá
            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>
</body>
</html>
`;

  return {
    asunto,
    html,
    texto,
  };
};