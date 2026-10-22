import { MigrationInterface, QueryRunner } from 'typeorm';

export class CrearParticipantes1789062141264 implements MigrationInterface {
  name = 'CrearParticipantes1789062141264';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE \`participantes\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`usuario_id\` int NOT NULL,
        \`evento_capacitacion_id\` int NOT NULL,
        \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        INDEX \`IDX_participantes_usuario\` (\`usuario_id\`),
        INDEX \`IDX_participantes_evento\` (\`evento_capacitacion_id\`),
        UNIQUE INDEX \`UQ_participantes_usuario_evento\` (\`usuario_id\`, \`evento_capacitacion_id\`),
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB
    `);

    await queryRunner.query(`
      ALTER TABLE \`participantes\`
      ADD CONSTRAINT \`FK_participantes_usuario\`
      FOREIGN KEY (\`usuario_id\`)
      REFERENCES \`usuarios\`(\`id\`)
      ON DELETE CASCADE
      ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE \`participantes\`
      ADD CONSTRAINT \`FK_participantes_evento\`
      FOREIGN KEY (\`evento_capacitacion_id\`)
      REFERENCES \`eventos_capacitaciones\`(\`id\`)
      ON DELETE CASCADE
      ON UPDATE NO ACTION
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`participantes\`
      DROP FOREIGN KEY \`FK_participantes_evento\`
    `);

    await queryRunner.query(`
      ALTER TABLE \`participantes\`
      DROP FOREIGN KEY \`FK_participantes_usuario\`
    `);

    await queryRunner.query(`
      DROP INDEX \`UQ_participantes_usuario_evento\`
      ON \`participantes\`
    `);

    await queryRunner.query(`
      DROP INDEX \`IDX_participantes_evento\`
      ON \`participantes\`
    `);

    await queryRunner.query(`
      DROP INDEX \`IDX_participantes_usuario\`
      ON \`participantes\`
    `);

    await queryRunner.query(`
      DROP TABLE \`participantes\`
    `);
  }
}