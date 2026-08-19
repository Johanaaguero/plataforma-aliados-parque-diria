import { MigrationInterface, QueryRunner } from 'typeorm';

export class CambiarImagenEmprendimiento1787077000000
  implements MigrationInterface
{
  name = 'CambiarImagenEmprendimiento1787077000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`emprendimientos\`
      MODIFY COLUMN \`imagen\` LONGBLOB NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`emprendimientos\`
      MODIFY COLUMN \`imagen\` VARCHAR(255) NULL
    `);
  }
}