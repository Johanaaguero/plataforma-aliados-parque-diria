import { MigrationInterface, QueryRunner } from 'typeorm';

export class AgregarPagosEventosYComprobantesReservas1790000000000 implements MigrationInterface {
  name = 'AgregarPagosEventosYComprobantesReservas1790000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("ALTER TABLE `eventos_capacitaciones` ADD `es_pago` tinyint NOT NULL DEFAULT 0, ADD `precio` int NOT NULL DEFAULT 0, ADD `politicas_cancelacion` text NULL");
    await queryRunner.query("ALTER TABLE `reservas` ADD `comprobante_url` varchar(500) NULL, ADD `fecha_expiracion_pre_reserva` datetime NULL");
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("ALTER TABLE `reservas` DROP COLUMN `fecha_expiracion_pre_reserva`, DROP COLUMN `comprobante_url`");
    await queryRunner.query("ALTER TABLE `eventos_capacitaciones` DROP COLUMN `politicas_cancelacion`, DROP COLUMN `precio`, DROP COLUMN `es_pago`");
  }
}
