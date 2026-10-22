import { MigrationInterface, QueryRunner } from 'typeorm';

export class AgregarContenidoReporte1791200000000 implements MigrationInterface {
  name = 'AgregarContenidoReporte1791200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE `reportes` ADD `contenido` json NULL');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE `reportes` DROP COLUMN `contenido`');
  }
}
