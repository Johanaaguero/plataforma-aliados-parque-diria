import { obtenerDashboardAdministrador } from './dashboards/administrador.service';
import { obtenerDashboardSuperAdmin } from './dashboards/super_admin.service';

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

    case 'super_admin':
      return obtenerDashboardSuperAdmin();

    default:
      throw new DashboardNoDisponibleError();
  }
};