import { MigrationInterface, QueryRunner } from 'typeorm';

export class AgregarPublicacionPreguntasFrecuentes1791700000000
  implements MigrationInterface
{
  name = 'AgregarPublicacionPreguntasFrecuentes1791700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`preguntas_frecuentes\`
      ADD COLUMN \`publicada\` tinyint(1) NOT NULL DEFAULT 0
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`preguntas_frecuentes\`
      DROP COLUMN \`publicada\`
    `);
  }
}
