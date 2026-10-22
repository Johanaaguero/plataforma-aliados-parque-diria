import { MigrationInterface, QueryRunner } from 'typeorm';

export class AgregarNumeroTicketReservas1790300000000 implements MigrationInterface {
  name = 'AgregarNumeroTicketReservas1790300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE `reservas` ADD `numero_ticket` varchar(20) NULL');
    await queryRunner.query('ALTER TABLE `participantes` ADD `numero_ticket` varchar(20) NULL');
    await queryRunner.query("UPDATE `reservas` SET `numero_ticket` = CONCAT('#TKT-', LPAD(`id`, 4, '0'), DATE_FORMAT(`created_at`, '%m%y')) WHERE `numero_ticket` IS NULL");
    await queryRunner.query("UPDATE `participantes` SET `numero_ticket` = CONCAT('#TKT-', LPAD(`id` + 5000, 4, '0'), DATE_FORMAT(`created_at`, '%m%y')) WHERE `numero_ticket` IS NULL");
    await queryRunner.query('ALTER TABLE `reservas` MODIFY `numero_ticket` varchar(20) NOT NULL, ADD UNIQUE INDEX `UQ_reservas_numero_ticket` (`numero_ticket`)');
    await queryRunner.query('ALTER TABLE `participantes` MODIFY `numero_ticket` varchar(20) NOT NULL, ADD UNIQUE INDEX `UQ_participantes_numero_ticket` (`numero_ticket`)');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE `participantes` DROP INDEX `UQ_participantes_numero_ticket`, DROP COLUMN `numero_ticket`');
    await queryRunner.query('ALTER TABLE `reservas` DROP INDEX `UQ_reservas_numero_ticket`, DROP COLUMN `numero_ticket`');
  }
}
