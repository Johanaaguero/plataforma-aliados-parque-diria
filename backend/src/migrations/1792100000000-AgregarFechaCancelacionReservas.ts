import { MigrationInterface, QueryRunner } from 'typeorm';

export class AgregarFechaCancelacionReservas1792100000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE `reservas` ADD `fecha_cancelacion` datetime NULL');
  }
  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE `reservas` DROP COLUMN `fecha_cancelacion`');
  }
}
