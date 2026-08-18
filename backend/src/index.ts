import 'reflect-metadata';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import authRoutes from './modulos/Autenticación y gestión de usuario/Registro de usuarios/autenticacion.route';
import loginRoutes from './modulos/Autenticación y gestión de usuario/inicio de sesion/login.route';
import recuperacionRoutes from './modulos/Autenticación y gestión de usuario/Recuperación de contraseña/recuperacion.route';
import rolesRoutes from './modulos/Autenticación y gestión de usuario/Gestión de Roles/roles.route';
import emprendimientoRoutes from './modulos/Administración de emprendimientos/Registro de emprendimientos/emprendimiento.routes';
import categoriaEmprendimientoRoutes from './modulos/Administración de emprendimientos/Registro de emprendimientos/categoriaEmprendimiento.routes';

import { iniciarLimpiezaTokensExpirados } from './modulos/Autenticación y gestión de usuario/Recuperación de contraseña/limpieza.service';
import { iniciarLimpiezaTokensBlacklist } from './modulos/Autenticación y gestión de usuario/inicio de sesion/limpieza-blacklist.service';
import { AppDataSource } from './data-source';
import { errorMiddleware } from './middlewares/registro.middleware';

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/auth', loginRoutes);
app.use('/api/auth', recuperacionRoutes);
app.use('/api/users', rolesRoutes);
app.use('/api/emprendimientos', emprendimientoRoutes);
app.use('/api/categorias-emprendimientos', categoriaEmprendimientoRoutes);

app.use(errorMiddleware);

const PORT = process.env.PORT || 3000;

AppDataSource.initialize()
  .then(() => {
    console.log('Conectado a MySQL correctamente');

    iniciarLimpiezaTokensExpirados();
    iniciarLimpiezaTokensBlacklist();

    app.listen(PORT, () => {
      console.log(`Servidor corriendo en http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error('Error al conectar con MySQL:', error);
  });