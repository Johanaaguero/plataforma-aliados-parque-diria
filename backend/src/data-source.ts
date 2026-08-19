import 'reflect-metadata';
import { DataSource } from 'typeorm';
import dotenv from 'dotenv';
import { Usuario } from './models/Usuario';
import { Rol } from './models/Rol';
import { LoginAttempt } from './models/LoginAttempt';
import { RecuperacionContrasena } from './models/RecuperacionContrasena';
import { TokenBlacklist } from './models/TokenBlacklist';
import { AuditLog } from './models/AuditLog';
import { HistorialCambioRol } from './models/HistorialCambioRol';
import { IntentoAcceso } from './models/IntentoAcceso';
import { CategoriaEmprendimiento } from './models/CategoriaEmprendimiento';
import { Emprendimiento } from './models/Emprendimiento';

dotenv.config();

const DB_HOST = process.env.DB_HOST;
const DB_PORT = process.env.DB_PORT;
const DB_USERNAME = process.env.DB_USERNAME;
const DB_PASSWORD = process.env.DB_PASSWORD;
const DB_DATABASE = process.env.DB_DATABASE;

if (!DB_HOST || !DB_PORT || !DB_USERNAME || !DB_PASSWORD || !DB_DATABASE) {
  throw new Error(
    'Faltan variables de conexión a la base de datos en el archivo .env',
  );
}

export const AppDataSource = new DataSource({
  type: 'mysql',
  host: DB_HOST,
  port: Number(DB_PORT),
  username: DB_USERNAME,
  password: DB_PASSWORD,
  database: DB_DATABASE,

  entities: [
    Usuario,
    Rol,
    LoginAttempt,
    RecuperacionContrasena,
    TokenBlacklist,
    AuditLog,
    IntentoAcceso,
    HistorialCambioRol,
    CategoriaEmprendimiento,
    Emprendimiento,
  ],
 

  migrations: ['src/migrations/*.ts'],

  synchronize: false,
});