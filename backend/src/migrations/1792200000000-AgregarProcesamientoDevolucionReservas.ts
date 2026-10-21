import { MigrationInterface, QueryRunner } from 'typeorm';
export class AgregarProcesamientoDevolucionReservas1792200000000 implements MigrationInterface {
  async up(q: QueryRunner): Promise<void> { await q.query('ALTER TABLE `reservas` ADD `devolucion_procesada_en` datetime NULL, ADD `referencia_devolucion` varchar(120) NULL'); }
  async down(q: QueryRunner): Promise<void> { await q.query('ALTER TABLE `reservas` DROP COLUMN `referencia_devolucion`, DROP COLUMN `devolucion_procesada_en`'); }
}
