import { useEffect, useState } from 'react';
import { api } from '../services/api';

type NombreRol = 'administrador' | 'asociado' | 'visitante';

interface AuthError {
  code: string;
  message: string;
  status: number;
}

export const useAuth = () => {
  const [rol, setRol] = useState<NombreRol | null>(null);
  const [error, setError] = useState<AuthError | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSessionExpired, setIsSessionExpired] = useState(false);

  // Extraer rol del token
  const extraerRolDelToken = (): NombreRol | null => {
    const token = sessionStorage.getItem('token') ?? localStorage.getItem('token');

    if (!token) return null;

    try {
      const payloadCodificado = token.split('.')[1];
      if (!payloadCodificado) return null;

      const base64 = payloadCodificado
        .replace(/-/g, '+')
        .replace(/_/g, '/')
        .padEnd(Math.ceil(payloadCodificado.length / 4) * 4, '=');

      const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
      const payload = JSON.parse(new TextDecoder().decode(bytes)) as { rol?: unknown };

      return payload.rol === 'administrador' ||
        payload.rol === 'asociado' ||
        payload.rol === 'visitante'
        ? payload.rol
        : null;
    } catch {
      return null;
    }
  };

  useEffect(() => {
    setRol(extraerRolDelToken());

    const handleUnauthorized = (event: Event) => {
      const customEvent = event as CustomEvent<AuthError>;
      setError(customEvent.detail);
      setIsSessionExpired(true);
      void api.logout();
      setRol(null);
    };

    const handleForbidden = (event: Event) => {
      const customEvent = event as CustomEvent<AuthError>;
      setError(customEvent.detail);
    };

    window.addEventListener('auth:unauthorized', handleUnauthorized);
    window.addEventListener('auth:forbidden', handleForbidden);

    return () => {
      window.removeEventListener('auth:unauthorized', handleUnauthorized);
      window.removeEventListener('auth:forbidden', handleForbidden);
    };
  }, []);

  const login = async (identificador: string, password: string) => {
    setIsLoading(true);
    setError(null);
    setIsSessionExpired(false);

    try {
      const resultado = await api.login(identificador, password);

      const nuevoRol = extraerRolDelToken();
      setRol(nuevoRol);

      return resultado;
    } catch (err: unknown) {
      const authError = err as AuthError;
      setError(authError);
      throw authError;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);

    try {
      await api.logout();
      setRol(null);
      setError(null);
      setIsSessionExpired(false);
    } catch (err: unknown) {
      console.warn('Error durante logout:', err);
      setRol(null);
      sessionStorage.removeItem('token');
      localStorage.removeItem('token');
    } finally {
      setIsLoading(false);
    }
  };

  const clearError = () => {
    setError(null);
  };

  return {
    rol,
    error,
    isLoading,
    isSessionExpired,
    login,
    logout,
    clearError,
  };
};
