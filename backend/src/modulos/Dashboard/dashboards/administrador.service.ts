const MODULOS_DASHBOARD_ADMINISTRADOR = [
  {
    key: 'roles',
    name: 'Usuarios y Roles',
  },
  {
    key: 'emprendimientos',
    name: 'Emprendimientos',
  },
  {
    key: 'eventos',
    name: 'Eventos y Capacitaciones',
  },
  {
    key: 'inscripciones',
    name: 'Inscripciones',
  },
] as const;

export const obtenerDashboardAdministrador = async () => ({
  ok: true,
  role: 'administrador',
  dashboard: 'administrador',
  modules: MODULOS_DASHBOARD_ADMINISTRADOR,
});
