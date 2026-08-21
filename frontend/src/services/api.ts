

interface ApiError {
  code: string;
  message: string;
  status: number;
}

export interface ConfiguracionSolicitudApi {
  incluirAuth?: boolean;
  incluirContentType?: boolean;
  desempaquetarData?: boolean;
  mensajeError?: string;
}

class ApiService {
  private baseUrl = 'http://localhost:3000/api';

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

      if (response.status === 401) {
        window.dispatchEvent(
          new CustomEvent('auth:unauthorized', { detail: error }),
        );
      } else if (response.status === 403) {
        window.dispatchEvent(
          new CustomEvent('auth:forbidden', { detail: error }),
        );
      }

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
      response = await fetch(`${this.baseUrl}${ruta}`, {
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
      const message =
        response.status >= 500 ? mensajeError : mensajeRespuesta;
      const error: ApiError = {
        code:
          typeof respuesta?.code === 'string'
            ? respuesta.code
            : 'UNKNOWN_ERROR',
        message,
        status: response.status,
      };

      if (response.status === 401) {
        window.dispatchEvent(
          new CustomEvent('auth:unauthorized', { detail: error }),
        );
      } else if (response.status === 403) {
        window.dispatchEvent(
          new CustomEvent('auth:forbidden', { detail: error }),
        );
      }

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

  async login(identificador: string, password: string): Promise<{ token: string; usuario: unknown }> {
    const response = await fetch(`${this.baseUrl}/auth/login`, {
      method: 'POST',
      headers: this.getHeaders(false),
      body: JSON.stringify({ identificador, password }),
    });

    return this.handleResponse(response);
  }

  async logout(): Promise<void> {
    const token = this.getToken();

    if (!token) {
      throw { code: 'NO_TOKEN', message: 'No hay sesión activa', status: 401 };
    }

    try {
      await fetch(`${this.baseUrl}/auth/logout`, {
        method: 'POST',
        headers: this.getHeaders(true),
      });
    } catch (error) {
      console.warn('Error al cerrar sesión en el servidor:', error);
    }

    // Limpiar token del cliente sin importar si el servidor falla
    sessionStorage.removeItem('token');
    localStorage.removeItem('token');
  }

  async registro(datos: {
    nombreUsuario: string;
    nombre: string;
    apellidos: string;
    correo: string;
    telefono: string;
    password: string;
  }): Promise<{ usuario: unknown }> {
    const response = await fetch(`${this.baseUrl}/auth/registro`, {
      method: 'POST',
      headers: this.getHeaders(false),
      body: JSON.stringify(datos),
    });

    return this.handleResponse(response);
  }

  async solicitarRecuperacion(correo: string): Promise<{ message: string }> {
    const response = await fetch(`${this.baseUrl}/auth/forgot-password`, {
      method: 'POST',
      headers: this.getHeaders(false),
      body: JSON.stringify({ correo }),
    });

    return this.handleResponse(response);
  }

  async restablecerContrasena(token: string, nuevaPassword: string): Promise<{ message: string }> {
    const response = await fetch('${this.baseUrl}/auth/reset-password', {
      method: 'POST',
      headers: this.getHeaders(false),
      body: JSON.stringify({ token, nuevaPassword }),
    });

    return this.handleResponse(response);
  }

  async obtenerRoles(): Promise<{ usuarios: unknown[] }> {
    const response = await fetch('${this.baseUrl}/users/roles',{
      method: 'GET',
      headers: this.getHeaders(true),
    });

    return this.handleResponse(response);
  }

  async actualizarRol(usuarioId: number, rolId: number): Promise<{ usuario: unknown }> {
    const response = await fetch(`${this.baseUrl}/users/${usuarioId}/role`, {
      method: 'PUT',
      headers: this.getHeaders(true),
      body: JSON.stringify({ rolId }),
    });

    return this.handleResponse(response);
  }
  async eliminar(url: string): Promise<void> {
  const response = await fetch(`${this.baseUrl}${url}`, {
    method: 'DELETE',
    headers: this.getHeaders(true),
  });

  await this.handleResponse<void>(response);
  }
}

export const api = new ApiService();

