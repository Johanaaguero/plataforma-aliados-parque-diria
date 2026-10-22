import { MigrationInterface, QueryRunner } from 'typeorm';

export class AgregarEstadoYCancelacionReservas1789400000000 implements MigrationInterface {
  name = 'AgregarEstadoYCancelacionReservas1789400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("ALTER TABLE `participantes` ADD `estado` enum ('pendiente', 'confirmada', 'cancelada') NOT NULL DEFAULT 'confirmada'");
    await queryRunner.query('ALTER TABLE `participantes` ADD `fecha_cancelacion` datetime NULL');
    await queryRunner.query('ALTER TABLE `eventos_capacitaciones` ADD `cupos_disponibles` int NULL');
    await queryRunner.query('UPDATE `eventos_capacitaciones` SET `cupos_disponibles` = `cupo_maximo` WHERE `cupo_maximo` IS NOT NULL');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE `eventos_capacitaciones` DROP COLUMN `cupos_disponibles`');
    await queryRunner.query('ALTER TABLE `participantes` DROP COLUMN `fecha_cancelacion`');
    await queryRunner.query('ALTER TABLE `participantes` DROP COLUMN `estado`');
  }
}
