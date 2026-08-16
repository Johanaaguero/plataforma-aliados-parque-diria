interface RespuestaApi {
  ok: boolean;
  message: string;
}

export class ErrorApi extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ErrorApi';
    this.status = status;
  }
}

export class ErrorConexion extends Error {
  constructor() {
    super('No fue posible conectar con el servidor');
    this.name = 'ErrorConexion';
  }
}

function obtenerUrlBase(): string {
  const urlConfigurada = import.meta.env.VITE_API_URL?.trim();

  if (!urlConfigurada) {
    throw new Error('VITE_API_URL no está configurada');
  }

  return urlConfigurada.replace(/\/+$/, '');
}

function esRespuestaApi(valor: unknown): valor is RespuestaApi {
  if (typeof valor !== 'object' || valor === null) {
    return false;
  }

  const respuesta = valor as Record<string, unknown>;

  return (
    typeof respuesta.ok === 'boolean' &&
    typeof respuesta.message === 'string'
  );
}

async function enviarSolicitud(
  ruta: string,
  datos: Record<string, string>,
): Promise<RespuestaApi> {
  const url = obtenerUrlBase() + ruta;
  let respuesta: Response;

  try {
    respuesta = await fetch(url, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(datos),
    });
  } catch {
    throw new ErrorConexion();
  }

  let contenido: unknown;

  try {
    contenido = await respuesta.json();
  } catch {
    contenido = null;
  }

  if (!esRespuestaApi(contenido)) {
    throw new ErrorApi(
      respuesta.status,
      'El servidor devolvió una respuesta inesperada',
    );
  }

  if (!respuesta.ok || !contenido.ok) {
    throw new ErrorApi(respuesta.status, contenido.message);
  }

  return contenido;
}

export async function solicitarRecuperacionContrasena(
  correo: string,
): Promise<void> {
  await enviarSolicitud('/api/auth/forgot-password', { correo });
}

export async function restablecerContrasena(
  token: string,
  newPassword: string,
): Promise<void> {
  await enviarSolicitud('/api/auth/reset-password', {
    token,
    newPassword,
  });
}
