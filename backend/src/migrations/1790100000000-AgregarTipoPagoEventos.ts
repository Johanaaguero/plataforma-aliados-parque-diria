import { MigrationInterface, QueryRunner } from 'typeorm';

export class AgregarTipoPagoEventos1790100000000 implements MigrationInterface {
  name = 'AgregarTipoPagoEventos1790100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE `eventos_capacitaciones` ADD `tipo_pago` varchar(40) NULL',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE `eventos_capacitaciones` DROP COLUMN `tipo_pago`',
    );
  }
}
