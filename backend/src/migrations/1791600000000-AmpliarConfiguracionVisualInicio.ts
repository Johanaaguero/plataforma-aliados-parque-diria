import { MigrationInterface, QueryRunner } from 'typeorm';

export class AmpliarConfiguracionVisualInicio1791600000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE `configuracion_visual` ADD `hero_titulo` varchar(180) NULL, ADD `hero_eslogan` varchar(280) NULL, ADD `sobre_imagen` varchar(500) NULL, ADD `galeria_imagenes` json NULL');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE `configuracion_visual` DROP COLUMN `galeria_imagenes`, DROP COLUMN `sobre_imagen`, DROP COLUMN `hero_eslogan`, DROP COLUMN `hero_titulo`');
  }
}
