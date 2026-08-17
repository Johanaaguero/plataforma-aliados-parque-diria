

interface ApiResponse<T = unknown> {
  ok: boolean;
  code?: string;
  message?: string;
  data?: T;
  token?: string;
  usuario?: unknown;
}

interface ApiError {
  code: string;
  message: string;
  status: number;
}

class ApiService {
  private baseUrl = 'http://localhost:3000/api';

  private getToken(): string | null {
    return sessionStorage.getItem('token') ?? localStorage.getItem('token');
  }

  private getHeaders(includeAuth = true): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (includeAuth) {
      const token = this.getToken();
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }
    }

    return headers;
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    const data: ApiResponse<T> = await response.json();

    if (!response.ok) {
      const error: ApiError = {
        code: data.code || 'UNKNOWN_ERROR',
        message: data.message || 'Error desconocido',
        status: response.status,
      };

      // Disparar evento global para 401/403
      if (response.status === 401) {
        window.dispatchEvent(new CustomEvent('auth:unauthorized', { detail: error }));
      } else if (response.status === 403) {
        window.dispatchEvent(new CustomEvent('auth:forbidden', { detail: error }));
      }

      throw error;
    }

    return (data.data || data) as T;
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
    const response = await fetch(`${this.baseUrl}/auth/reset-password`, {
      method: 'POST',
      headers: this.getHeaders(false),
      body: JSON.stringify({ token, nuevaPassword }),
    });

    return this.handleResponse(response);
  }

  async obtenerRoles(): Promise<{ usuarios: unknown[] }> {
    const response = await fetch(`${this.baseUrl}/users/roles`, {
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
}

export const api = new ApiService();
