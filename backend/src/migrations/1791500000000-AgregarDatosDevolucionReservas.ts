import { MigrationInterface, QueryRunner } from 'typeorm';
export class AgregarDatosDevolucionReservas1791500000000 implements MigrationInterface {
  public async up(q: QueryRunner): Promise<void> { await q.query('ALTER TABLE `reservas` ADD `metodo_pago` varchar(40) NULL, ADD `datos_devolucion` json NULL'); }
  public async down(q: QueryRunner): Promise<void> { await q.query('ALTER TABLE `reservas` DROP COLUMN `datos_devolucion`, DROP COLUMN `metodo_pago`'); }
}
