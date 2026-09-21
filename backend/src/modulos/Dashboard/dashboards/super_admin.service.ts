const MODULOS_DASHBOARD_SUPER_ADMIN = [
  {
    key: 'bitacora',
    name: 'Bitácora',
  },
  {
    key: 'cuentas-bloqueadas',
    name: 'Cuentas Bloqueadas',
  },
] as const;

export const obtenerDashboardSuperAdmin = async () => ({
  ok: true,
  role: 'super_admin',
  dashboard: 'super_admin',
  modules: MODULOS_DASHBOARD_SUPER_ADMIN,
});