import { randomBytes } from 'node:crypto';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const nombre = `qa_storage_migration_${Date.now()}_${process.pid}_${randomBytes(4).toString('hex')}_test`;
const patron = /^qa_storage_migration_\d+_\d+_[a-f0-9]{8}_test$/;
const requerido = (variable: string): string => {
  const valor = process.env[variable];
  if (!valor) throw new Error(`Falta ${variable}.`);
  return valor;
};

async function main(): Promise<void> {
  if (!patron.test(nombre) || nombre === process.env.DB_DATABASE) {
    throw new Error('Nombre de base temporal no permitido.');
  }

  const conexionAdmin = await mysql.createConnection({
    host: requerido('DB_HOST'),
    port: Number(requerido('DB_PORT')),
    user: requerido('DB_USERNAME'),
    password: requerido('DB_PASSWORD'),
  });
  let creada = false;

  try {
    await conexionAdmin.query(`CREATE DATABASE \`${nombre}\``);
    creada = true;
    process.env.DB_DATABASE = nombre;
    const { AppDataSource } = await import('../data-source');
    await AppDataSource.initialize();
    await AppDataSource.runMigrations();
    const trasSubida = await AppDataSource.query(
      "SELECT COUNT(*) AS cantidad FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'comprobantes_pago'",
    ) as Array<{ cantidad: number }>;
    if (Number(trasSubida[0]?.cantidad) !== 1) throw new Error('La tabla comprobantes_pago no fue creada.');
    await AppDataSource.undoLastMigration();
    const trasReversion = await AppDataSource.query(
      "SELECT COUNT(*) AS cantidad FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'comprobantes_pago'",
    ) as Array<{ cantidad: number }>;
    if (Number(trasReversion[0]?.cantidad) !== 0) throw new Error('La tabla comprobantes_pago no fue eliminada al revertir.');
    console.log(`PASS migración 179230: subida y reversión en ${nombre}`);
    await AppDataSource.destroy();
  } finally {
    if (creada) {
      if (!patron.test(nombre)) throw new Error('Se rechazó limpieza de una base no temporal.');
      await conexionAdmin.query(`DROP DATABASE \`${nombre}\``);
      console.log(`LIMPIEZA PASS: ${nombre}`);
    }
    await conexionAdmin.end();
  }
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
