import { MigrationInterface, QueryRunner } from 'typeorm';

export class PermitirHistorialAutomaticoIncidencias1791300000000
  implements MigrationInterface
{
  name = 'PermitirHistorialAutomaticoIncidencias1791300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`incidencias_historial\`
      MODIFY \`usuario_id\` int NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`incidencias_historial\`
      MODIFY \`usuario_id\` int NOT NULL
    `);
  }
}