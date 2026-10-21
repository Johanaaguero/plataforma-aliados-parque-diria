import { MigrationInterface, QueryRunner } from 'typeorm';
export class GuardarComprobantesEnMySql1792400000000 implements MigrationInterface {
  async up(q: QueryRunner): Promise<void> {
    await q.query('ALTER TABLE `comprobantes_pago` MODIFY `storage_key` varchar(500) NULL, ADD `contenido` longblob NULL AFTER `storage_key`');
  }
  async down(q: QueryRunner): Promise<void> {
    const pendientes = await q.query('SELECT COUNT(*) AS cantidad FROM `comprobantes_pago` WHERE `contenido` IS NOT NULL');
    if (Number(pendientes[0]?.cantidad) > 0) throw new Error('No se puede revertir: existen comprobantes almacenados en MySQL.');
    await q.query('ALTER TABLE `comprobantes_pago` DROP COLUMN `contenido`, MODIFY `storage_key` varchar(500) NOT NULL');
  }
}
