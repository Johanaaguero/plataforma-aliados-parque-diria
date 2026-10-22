import { MigrationInterface, QueryRunner } from 'typeorm';

export class AmpliarCodigoIncidencia1791700000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE `incidencias` MODIFY `codigo` varchar(20) NOT NULL');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE `incidencias` MODIFY `codigo` varchar(8) NOT NULL');
  }
}
