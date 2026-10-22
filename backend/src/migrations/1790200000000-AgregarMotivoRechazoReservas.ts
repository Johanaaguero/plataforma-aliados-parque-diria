import { MigrationInterface, QueryRunner } from 'typeorm';

export class AgregarMotivoRechazoReservas1790200000000 implements MigrationInterface {
  name = 'AgregarMotivoRechazoReservas1790200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE `reservas` ADD `motivo_rechazo` text NULL',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE `reservas` DROP COLUMN `motivo_rechazo`',
    );
  }
}
