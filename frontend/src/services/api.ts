export interface ApiError {
  code: string;
  message: string;
  status: number;
}

export const notificarErrorAuth = (error: ApiError): void => {
  if (error.status === 401) {
    if (error.code !== 'INVALID_CREDENTIALS') {
      sessionStorage.removeItem('token');
      localStorage.removeItem('token');
    }

    window.dispatchEvent(
      new CustomEvent('auth:unauthorized', { detail: error }),
    );
  } else if (error.status === 403) {
    window.dispatchEvent(
      new CustomEvent('auth:forbidden', { detail: error }),
    );
  }
};

export interface ConfiguracionSolicitudApi {
  incluirAuth?: boolean;
  incluirContentType?: boolean;
  desempaquetarData?: boolean;
  mensajeError?: string;
}

function obtenerBaseUrlApi(): string {
  const origen = (import.meta.env.VITE_API_URL || 'http://localhost:3000')
    .trim()
    .replace(/\/+$/, '');

  return origen.replace(/\/api$/i, '');
}

class ApiService {
  private baseUrl = `${obtenerBaseUrlApi()}/api`;

  url(ruta: string): string {
    return `${this.baseUrl}/${ruta.replace(/^\/+/, '')}`;
  }

  private getToken(): string | null {
    return sessionStorage.getItem('token') ?? localStorage.getItem('token');
  }

  private getHeaders(
    includeAuth = true,
    includeContentType = true,
  ): HeadersInit {
    const headers: Record<string, string> = {};

    if (includeContentType) {
      headers['Content-Type'] = 'application/json';
    }

    if (includeAuth) {
      const token = this.getToken();
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }
    }

    return headers;
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    if (response.status === 204) {
      return undefined as T;
    }

    const data = await response.json().catch(() => null);
    if (!response.ok) {
      const respuesta = data as Record<string, unknown> | null;
      const error: ApiError = {
        code:
          typeof respuesta?.code === 'string'
            ? respuesta.code
            : 'UNKNOWN_ERROR',
        message:
          typeof respuesta?.message === 'string'
            ? respuesta.message
            : 'Error desconocido',
        status: response.status,
      };

      notificarErrorAuth(error);

      throw error;
    }

    return data as T;
  }

  async solicitar<T>(
    ruta: string,
    opciones: RequestInit = {},
    configuracion: ConfiguracionSolicitudApi = {},
  ): Promise<T> {
    const {
      incluirAuth = true,
      incluirContentType = true,
      desempaquetarData = true,
      mensajeError = 'No se pudo completar la solicitud',
    } = configuracion;

    const headers = new Headers(
      this.getHeaders(incluirAuth, incluirContentType),
    );
    new Headers(opciones.headers).forEach((valor, clave) => {
      headers.set(clave, valor);
    });

    let response: Response;

    try {
      response = await fetch(this.url(ruta), {
        ...opciones,
        headers,
      });
    } catch {
      throw new Error(mensajeError);
    }

    const data: unknown = await response.json().catch(() => null);
    const esObjeto =
      typeof data === 'object' && data !== null && !Array.isArray(data);
    const respuesta = esObjeto
      ? (data as Record<string, unknown>)
      : null;

    if (!response.ok) {
      const mensajeRespuesta =
        typeof respuesta?.message === 'string' && respuesta.message.trim()
          ? respuesta.message
          : typeof respuesta?.mensaje === 'string' &&
              respuesta.mensaje.trim()
            ? respuesta.mensaje
            : mensajeError;
     const message = mensajeRespuesta;

console.error('Error en solicitud API:', {
  ruta,
  status: response.status,
  respuesta: data,
});
      const error: ApiError = {
        code:
          typeof respuesta?.code === 'string'
            ? respuesta.code
            : 'UNKNOWN_ERROR',
        message,
        status: response.status,
      };

      notificarErrorAuth(error);

      const solicitudError = new Error(message);
      Object.assign(solicitudError, error);
      throw solicitudError;
    }

    if (
      desempaquetarData &&
      respuesta &&
      respuesta.data !== undefined
    ) {
      return respuesta.data as T;
    }

    return data as T;
  }
async solicitarBlob(
  ruta: string,
  opciones: RequestInit = {},
  mensajeError = 'No se pudo completar la solicitud',
): Promise<Blob> {
  const headers = new Headers(this.getHeaders(true, false));

  new Headers(opciones.headers).forEach((valor, clave) => {
    headers.set(clave, valor);
  });

  let response: Response;

  try {
    response = await fetch(this.url(ruta), {
      ...opciones,
      headers,
    });
  } catch {
    throw new Error(mensajeError);
  }

  if (!response.ok) {
    const data = await response.json().catch(() => null);
    const respuesta = data as Record<string, unknown> | null;

    const error: ApiError = {
      code:
        typeof respuesta?.code === 'string'
          ? respuesta.code
          : 'UNKNOWN_ERROR',
      message:
        typeof respuesta?.message === 'string'
          ? respuesta.message
          : typeof respuesta?.mensaje === 'string'
            ? respuesta.mensaje
            : mensajeError,
      status: response.status,
    };
notificarErrorAuth(error);

    const solicitudError = new Error(error.message);
    Object.assign(solicitudError, error);
    throw solicitudError;
  }

  return response.blob();
}

  async login(identificador: string, password: string): Promise<{ token: string; usuario: unknown }> {
    const response = await fetch(this.url('/auth/login'), {
      method: 'POST',
      headers: this.getHeaders(false),
      body: JSON.stringify({ identificador, password }),
    });

    return this.handleResponse(response);
  }

 
async logout(): Promise<void> {
  const token = this.getToken();

  // Eliminar la sesión del navegador inmediatamente.
  sessionStorage.removeItem('token');
  localStorage.removeItem('token');

  // Intentar invalidar también el token en el servidor.
  if (token) {
    try {
      await fetch(this.url('/auth/logout'), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
    } catch (error) {
      console.warn('Error al cerrar sesión en el servidor:', error);
    }
  }
}


  async registro(datos: {
    nombreUsuario: string;
    nombre: string;
    apellidos: string;
    correo: string;
    telefono: string;
    password: string;
  }): Promise<{ usuario: unknown }> {
    const response = await fetch(this.url('/auth/registro'), {
      method: 'POST',
      headers: this.getHeaders(false),
      body: JSON.stringify(datos),
    });

    return this.handleResponse(response);
  }

  async solicitarRecuperacion(correo: string): Promise<{ message: string }> {
    const response = await fetch(this.url('/auth/forgot-password'), {
      method: 'POST',
      headers: this.getHeaders(false),
      body: JSON.stringify({ correo }),
    });

    return this.handleResponse(response);
  }

  // CORRECCIÓN 1: backticks para que se interpole ${this.baseUrl}
  async restablecerContrasena(token: string, nuevaPassword: string): Promise<{ message: string }> {
    const response = await fetch(this.url('/auth/reset-password'), {
      method: 'POST',
      headers: this.getHeaders(false),
      body: JSON.stringify({ token, nuevaPassword }),
    });

    return this.handleResponse(response);
  }

  // CORRECCIÓN 1: backticks para que se interpole ${this.baseUrl}
  async obtenerRoles(): Promise<{ usuarios: unknown[] }> {
    const response = await fetch(this.url('/users/roles'), {
      method: 'GET',
      headers: this.getHeaders(true),
    });

    return this.handleResponse(response);
  }

  async actualizarRol(usuarioId: number, rol: string): Promise<{ usuario: unknown }> {
    const response = await fetch(this.url(`/users/${usuarioId}/role`), {
      method: 'PUT',
      headers: this.getHeaders(true),
      body: JSON.stringify({ rol }),
    });

    return this.handleResponse(response);
  }
  async eliminar(url: string): Promise<void> {
  const response = await fetch(this.url(url), {
    method: 'DELETE',
    headers: this.getHeaders(true),
  });

  await this.handleResponse<void>(response);
  }
}

export const api = new ApiService();
