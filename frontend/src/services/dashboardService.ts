import { api } from './api';

export type DashboardModuloAdministradorKey =
  | 'roles'
  | 'emprendimientos'
  | 'eventos'
  | 'inscripciones';

export interface DashboardModuloAdministrador {
  key: DashboardModuloAdministradorKey;
  name: string;
}

export interface DashboardAdministradorRespuesta {
  ok: true;
  role: 'administrador';
  dashboard: 'administrador';
  modules: DashboardModuloAdministrador[];
}

const esModuloAdministrador = (
  modulo: unknown,
): modulo is DashboardModuloAdministrador => {
  if (
    typeof modulo !== 'object' ||
    modulo === null ||
    Array.isArray(modulo)
  ) {
    return false;
  }

  const valor = modulo as Record<string, unknown>;

  return (
    (valor.key === 'roles' ||
      valor.key === 'emprendimientos' ||
      valor.key === 'eventos' ||
      valor.key === 'inscripciones') &&
    typeof valor.name === 'string'
  );
};

const esDashboardAdministrador = (
  respuesta: unknown,
): respuesta is DashboardAdministradorRespuesta => {
  if (
    typeof respuesta !== 'object' ||
    respuesta === null ||
    Array.isArray(respuesta)
  ) {
    return false;
  }

  const valor = respuesta as Record<string, unknown>;

  return (
    valor.ok === true &&
    valor.role === 'administrador' &&
    valor.dashboard === 'administrador' &&
    Array.isArray(valor.modules) &&
    valor.modules.every(esModuloAdministrador)
  );
};

export const obtenerDashboardAdministrador = async (): Promise<
  DashboardAdministradorRespuesta
> => {
  const respuesta = await api.solicitar<unknown>(
    '/dashboard',
    { method: 'GET' },
    {
      desempaquetarData: false,
      mensajeError: 'No se pudo cargar el dashboard.',
    },
  );

  if (!esDashboardAdministrador(respuesta)) {
    throw new Error('La respuesta del dashboard no es válida.');
  }

  return respuesta;
};
