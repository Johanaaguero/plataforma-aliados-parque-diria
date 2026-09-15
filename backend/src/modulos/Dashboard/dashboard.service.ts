import { obtenerDashboardAdministrador } from './dashboards/administrador.service';

type UsuarioAutenticado = {
  id: number;
  nombreUsuario: string;
  rol: string;
};

export class DashboardNoDisponibleError extends Error {
  constructor() {
    super('No existe un dashboard disponible para el rol actual');
    this.name = 'DashboardNoDisponibleError';
  }
}

export const obtenerDashboard = async (usuario: UsuarioAutenticado) => {
  switch (usuario.rol) {
    case 'administrador':
      return obtenerDashboardAdministrador();
    // Los dashboards de asociado, visitante y super_admin se agregarán aquí.
    default:
      throw new DashboardNoDisponibleError();
  }
};
