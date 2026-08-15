interface PlantillaRecuperacionParams {
  nombre: string;
  resetUrl: string;
  minutosExpiracion: number;
}

interface PlantillaRecuperacion {
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

export function crearPlantillaRecuperacion({
  nombre,
  resetUrl,
  minutosExpiracion,
}: PlantillaRecuperacionParams): PlantillaRecuperacion {
  const nombreSeguro = escaparHtml(nombre);
  const urlSegura = escaparHtml(resetUrl);
  const tiempoVigencia =
    minutosExpiracion === 1 ? '1 minuto' : `${minutosExpiracion} minutos`;

  const subject = 'Recupera tu contraseña | Aliados del Parque';
  const html = `<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${subject}</title>
  </head>
  <body style="margin:0;padding:0;background-color:#f4f8f6;color:#17352d;font-family:'Open Sans',Arial,Helvetica,sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#f4f8f6;">
      <tr>
        <td align="center" style="padding:32px 16px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:600px;background-color:#ffffff;border-top:6px solid #D9D823;border-radius:12px;overflow:hidden;box-shadow:0 4px 18px rgba(9,85,64,0.12);">
            <tr>
              <td style="padding:28px 32px;background-color:#095540;text-align:center;">
                <div style="font-family:Montserrat,'Open Sans',Arial,sans-serif;font-size:25px;font-weight:700;line-height:1.2;color:#ffffff;">
                  Aliados del Parque
                </div>
                <div style="margin-top:7px;font-size:13px;line-height:1.5;color:#dcefe8;">
                  Parque Nacional Diriá · Guanacaste, Costa Rica
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding:36px 32px;">
                <h1 style="margin:0 0 20px;font-family:'Open Sans',Arial,Helvetica,sans-serif;font-size:24px;line-height:1.3;color:#095540;">
                  Restablece tu contraseña
                </h1>
                <p style="margin:0 0 16px;font-size:16px;line-height:1.65;">Hola, ${nombreSeguro}:</p>
                <p style="margin:0 0 24px;font-size:16px;line-height:1.65;">
                  Recibimos una solicitud para restablecer la contraseña de tu cuenta. Usa el siguiente botón para crear una nueva:
                </p>
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:0 auto 26px;">
                  <tr>
                    <td bgcolor="#095540" style="border-radius:8px;">
                      <a href="${urlSegura}" style="display:inline-block;padding:14px 24px;border:1px solid #095540;border-radius:8px;color:#ffffff;font-size:16px;font-weight:700;line-height:1.2;text-decoration:none;">
                        Restablecer contraseña
                      </a>
                    </td>
                  </tr>
                </table>
                <p style="margin:0 0 16px;padding:14px 16px;border-left:4px solid #8DC63F;background-color:#f3f8ed;font-size:14px;line-height:1.6;">
                  Por seguridad, este enlace vence en <strong>${tiempoVigencia}</strong> y solo puede utilizarse una vez.
                </p>
                <p style="margin:0 0 12px;font-size:14px;line-height:1.6;">
                  Si el botón no funciona, copia y pega este enlace en tu navegador:
                </p>
                <p style="margin:0 0 24px;font-size:13px;line-height:1.6;word-break:break-all;">
                  <a href="${urlSegura}" style="color:#095540;">${urlSegura}</a>
                </p>
                <p style="margin:0;font-size:14px;line-height:1.6;color:#4b625c;">
                  Si no solicitaste este cambio, ignora este correo. Tu contraseña actual seguirá siendo válida.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 32px;background-color:#eaf4f0;text-align:center;font-size:12px;line-height:1.6;color:#46635a;">
                Aliados del Parque · Parque Nacional Diriá
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
    `Hola, ${nombre}:`,
    '',
    'Recibimos una solicitud para restablecer la contraseña de tu cuenta.',
    `Abre este enlace para crear una nueva contraseña: ${resetUrl}`,
    '',
    `El enlace vence en ${tiempoVigencia} y solo puede utilizarse una vez.`,
    '',
    'Si no solicitaste este cambio, ignora este correo. Tu contraseña actual seguirá siendo válida.',
  ].join('\n');

  return { subject, html, text };
}
