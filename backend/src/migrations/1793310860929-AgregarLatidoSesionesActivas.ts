import { MigrationInterface, QueryRunner } from "typeorm";

export class AgregarLatidoSesionesActivas1793310860929 implements MigrationInterface {
    name = 'AgregarLatidoSesionesActivas1793310860929'

   public async up(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasColumn('sesiones_activas', 'ultimo_latido'))) {
      await queryRunner.query(
        'ALTER TABLE `sesiones_activas` ADD `ultimo_latido` datetime NULL',
      );
    }

    if (
      !(await queryRunner.hasColumn(
        'sesiones_activas',
        'cierre_pendiente_hasta',
      ))
    ) {
      await queryRunner.query(
        'ALTER TABLE `sesiones_activas` ADD `cierre_pendiente_hasta` datetime NULL',
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    if (
      await queryRunner.hasColumn('sesiones_activas', 'cierre_pendiente_hasta')
    ) {
      await queryRunner.query(
        'ALTER TABLE `sesiones_activas` DROP COLUMN `cierre_pendiente_hasta`',
      );
    }

    if (await queryRunner.hasColumn('sesiones_activas', 'ultimo_latido')) {
      await queryRunner.query(
        'ALTER TABLE `sesiones_activas` DROP COLUMN `ultimo_latido`',
      );
    }
  }
}
