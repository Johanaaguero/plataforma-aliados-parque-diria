import 'reflect-metadata';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import authRoutes from './modulos/Autenticación y gestión de usuario/Registro de usuarios/autenticacion.route';
import loginRoutes from './modulos/Autenticación y gestión de usuario/inicio de sesion/login.route';
import rolesRoutes from './modulos/Autenticación y gestión de usuario/Gestión de Roles/roles.route';

import { AppDataSource } from './data-source';
import { errorMiddleware } from './middlewares/error.middleware';

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

// Registro de usuarios
app.use('/api/auth', authRoutes);

// Inicio de sesión
app.use('/api/auth', loginRoutes);

// Gestión de roles
app.use('/api/users', rolesRoutes);

// Middleware de errores
app.use(errorMiddleware);

const PORT = process.env.PORT || 3000;

AppDataSource.initialize()
  .then(() => {
    console.log('Conectado a MySQL correctamente');

    app.listen(PORT, () => {
      console.log(`Servidor corriendo en http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error('Error al conectar con MySQL:', error);
  });