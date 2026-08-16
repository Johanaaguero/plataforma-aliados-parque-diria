import 'reflect-metadata';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './modulos/Autenticación y gestión de usuario/Registro de usuarios/autenticacion.route';
import loginRoutes from './modulos/Autenticación y gestión de usuario/inicio de sesion/login.route';
import recuperacionRoutes from './modulos/Autenticación y gestión de usuario/Recuperación de contraseña/recuperacion.route';
import { iniciarLimpiezaTokensExpirados } from './modulos/Autenticación y gestión de usuario/Recuperación de contraseña/limpieza.service';
import { AppDataSource } from './data-source';
import { errorMiddleware } from './middlewares/error.middleware';
 

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/auth', loginRoutes);
app.use('/api/auth', recuperacionRoutes);

app.use(errorMiddleware);

const PORT = process.env.PORT || 3000;

AppDataSource.initialize()
  .then(() => {
    console.log('Conectado a MySQL correctamente');
    iniciarLimpiezaTokensExpirados();

    app.listen(PORT, () => {
      console.log(`Servidor corriendo en http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error('Error al conectar con MySQL:', error);
  });
