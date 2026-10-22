import { MigrationInterface, QueryRunner } from 'typeorm';

export class AgregarDatosReporteIncidencia1791000000000 implements MigrationInterface {
  name = 'AgregarDatosReporteIncidencia1791000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("ALTER TABLE `incidencias` ADD `codigo` varchar(8) NULL, ADD `nombre_contacto` varchar(150) NULL, ADD `telefono_contacto` varchar(30) NULL");
    await queryRunner.query("UPDATE `incidencias` SET `codigo` = CONCAT(LPAD(`id`, 4, '0'), DATE_FORMAT(`fecha_registro`, '%m%y')) WHERE `codigo` IS NULL");
    await queryRunner.query("ALTER TABLE `incidencias` MODIFY `codigo` varchar(8) NOT NULL, ADD UNIQUE INDEX `UQ_INCIDENCIAS_CODIGO` (`codigo`)");
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("ALTER TABLE `incidencias` DROP INDEX `UQ_INCIDENCIAS_CODIGO`, DROP COLUMN `telefono_contacto`, DROP COLUMN `nombre_contacto`, DROP COLUMN `codigo`");
  }
}
