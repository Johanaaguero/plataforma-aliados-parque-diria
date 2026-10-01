import 'reflect-metadata';
import express from 'express';
import path from 'path';
import cors from 'cors';
import dotenv from 'dotenv';

import authRoutes from './modulos/Autenticación y gestión de usuario/Registro de usuarios/autenticacion.route';
import loginRoutes from './modulos/Autenticación y gestión de usuario/inicio de sesion/login.route';
import recuperacionRoutes from './modulos/Autenticación y gestión de usuario/Recuperación de contraseña/recuperacion.route';
import rolesRoutes from './modulos/Autenticación y gestión de usuario/Gestión de Roles/roles.route';
import cuentasBloqueadasRoutes from './modulos/Autenticación y gestión de usuario/Super_admin/Cuentas Bloqueadas/cuentasBloqueadas.route';
import emprendimientoRoutes from './modulos/Administración de emprendimientos/Registro de emprendimientos/emprendimiento.routes';
import categoriaEmprendimientoRoutes from './modulos/Administración de emprendimientos/Registro de emprendimientos/categoriaEmprendimiento.routes';
import eliminarEmprendimientoRoutes from './modulos/Administración de emprendimientos/Eliminación de emprendimientos/eliminarEmprendimiento.route';
import eventosCapacitacionesRoutes from './modulos/Gestión de Eventos y Capacitaciones/Crear Eventos y Capacitaciones/eventosCapacitaciones.routes';
import eventosRoutes from './modulos/Gestión de Eventos y Capacitaciones/Visualización de Eventos y Capacitaciones/eventos.routes';
import inscripcionesAdminRoutes from './modulos/Gestión de Eventos y Capacitaciones/Inscripción a Eventos y Capacitaciones/inscripcionesAdmin.route';

import inscripcionesRoutes, { reservasRouter } from './modulos/Gestión de Eventos y Capacitaciones/Inscripción a Eventos y Capacitaciones/Ver mis Inscripciones/inscripciones.routes';
import bitacoraRoutes from './modulos/Autenticación y gestión de usuario/Super_admin/Bitacora/bitacora.route';

import { iniciarLimpiezaTokensExpirados } from './modulos/Autenticación y gestión de usuario/Recuperación de contraseña/limpieza.service';
import { iniciarLimpiezaTokensBlacklist } from './modulos/Autenticación y gestión de usuario/inicio de sesion/limpieza-blacklist.service';
import { iniciarLimpiezaIncidencias } from './modulos/Gestión de Incidencias/Crear incidencias/limpiezaIncidencias.service';
import dashboardRoutes from './modulos/Dashboard/dashboard.routes';
import { AppDataSource } from './data-source';
import resenaRoutes from './modulos/Resenas/resena.routes';
import comunicadoRoutes from './modulos/Comunicados/comunicado.routes';
import { errorMiddleware } from './middlewares/registro.middleware';
import incidenciaRoutes from './modulos/Gestión de Incidencias/Crear incidencias/IncidenciaRoutes';
import reporteUsuarioRoute from './modulos/Administración de emprendimientos/ReporteEstadistica/ReportesEmprendimientosRoutes';
import reportesUsuariosRoutes from './modulos/Autenticación y gestión de usuario/ReporteEstadistica/ReportesUsuariosRoutes';
import reportesReservasRoutes from './modulos/Gestión de Eventos y Capacitaciones/Inscripción a Eventos y Capacitaciones/ReporteEstadistica/ReportesReservasRoutes';
import reportesEventosRoutes from './modulos/Gestión de Eventos y Capacitaciones/ReporteEventosCapacitaciones/ReportesEvenCapRoutes';
import reportesIncidenciasRoutes from './modulos/Gestión de Incidencias/ReporteIncidencia/ReportesIncidenciasRoute';
import notificacionRoutes from './modulos/Notificaciones/Crear notificaciones+/NotificacionRoutes';
import reporteExportRoutes from './modulos/Reportes y Estadisticas/Exportacion/ReporteExportRoutes';
import reporteRoutes from './modulos/Reportes y Estadisticas/Generar reporte/reporteRoutes';
dotenv.config();

const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.use('/api/auth', authRoutes);
app.use('/api/auth', loginRoutes);
app.use('/api/auth', recuperacionRoutes);
app.use('/api/users', rolesRoutes);
app.use('/api/admin', cuentasBloqueadasRoutes);
app.use('/api/emprendimientos', emprendimientoRoutes);
app.use('/api/categorias-emprendimiento', categoriaEmprendimientoRoutes);
app.use('/api/categorias-emprendimientos', categoriaEmprendimientoRoutes);
app.use('/api/emprendimientos', eliminarEmprendimientoRoutes);
app.use('/api/eventos-capacitaciones', eventosCapacitacionesRoutes); 
app.use('/api/eventos', eventosRoutes);
app.use('/api/admin', inscripcionesAdminRoutes);
app.use('/api/inscripciones', inscripcionesRoutes);
app.use('/api/reservas', reservasRouter);
app.use('/api/admin', bitacoraRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/resenas', resenaRoutes);
app.use('/api/comunicados', comunicadoRoutes);
app.use('/api/incidencias', incidenciaRoutes);
app.use('/api/reportes', reporteUsuarioRoute);
app.use('/api/reportes', reporteExportRoutes);
app.use('/api/reportes/usuarios',reportesUsuariosRoutes,);
app.use('/api/reportes/reservas', reportesReservasRoutes);
app.use('/api/reportes/eventos', reportesEventosRoutes);
app.use('/api/reportes/estadisticas/incidencias', reportesIncidenciasRoutes);
// Notificaciones
app.use('/api/notificaciones', notificacionRoutes);

// Reportes
// Se monta al final: su parámetro /:id no debe interceptar rutas específicas
// como /usuarios, /reservas o /eventos.
app.use('/api/reportes', reporteRoutes);
app.use(errorMiddleware);

const PORT = process.env.PORT || 3000;

AppDataSource.initialize()
  .then(() => {
    console.log('Conectado a MySQL correctamente');

    iniciarLimpiezaTokensExpirados();
    iniciarLimpiezaTokensBlacklist();
    iniciarLimpiezaIncidencias();

    app.listen(PORT, () => {
      console.log(`Servidor corriendo en http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error('Error al conectar con MySQL:', error);
  });
