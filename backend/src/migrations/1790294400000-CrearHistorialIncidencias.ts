import { MigrationInterface, QueryRunner } from 'typeorm';

export class CrearHistorialIncidencias1790294400000
  implements MigrationInterface
{
  name = 'CrearHistorialIncidencias1790294400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE \`incidencias_historial\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`incidencia_id\` int NOT NULL,
        \`usuario_id\` int NOT NULL,
        \`fecha\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`campo_modificado\` varchar(100) NOT NULL,
        \`valor_anterior\` text NULL,
        \`valor_nuevo\` text NULL,
        INDEX \`IDX_INCIDENCIAS_HISTORIAL_INCIDENCIA\` (\`incidencia_id\`),
        INDEX \`IDX_INCIDENCIAS_HISTORIAL_USUARIO\` (\`usuario_id\`),
        INDEX \`IDX_INCIDENCIAS_HISTORIAL_FECHA\` (\`fecha\`),
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB
    `);

    await queryRunner.query(`
      ALTER TABLE \`incidencias_historial\`
      ADD CONSTRAINT \`FK_INCIDENCIAS_HISTORIAL_INCIDENCIA\`
      FOREIGN KEY (\`incidencia_id\`)
      REFERENCES \`incidencias\`(\`id\`)
      ON DELETE CASCADE
      ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE \`incidencias_historial\`
      ADD CONSTRAINT \`FK_INCIDENCIAS_HISTORIAL_USUARIO\`
      FOREIGN KEY (\`usuario_id\`)
      REFERENCES \`usuarios\`(\`id\`)
      ON DELETE NO ACTION
      ON UPDATE NO ACTION
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`incidencias_historial\`
      DROP FOREIGN KEY \`FK_INCIDENCIAS_HISTORIAL_USUARIO\`
    `);

    await queryRunner.query(`
      ALTER TABLE \`incidencias_historial\`
      DROP FOREIGN KEY \`FK_INCIDENCIAS_HISTORIAL_INCIDENCIA\`
    `);

    await queryRunner.query(`
      DROP INDEX \`IDX_INCIDENCIAS_HISTORIAL_FECHA\`
      ON \`incidencias_historial\`
    `);

    await queryRunner.query(`
      DROP INDEX \`IDX_INCIDENCIAS_HISTORIAL_USUARIO\`
      ON \`incidencias_historial\`
    `);

    await queryRunner.query(`
      DROP INDEX \`IDX_INCIDENCIAS_HISTORIAL_INCIDENCIA\`
      ON \`incidencias_historial\`
    `);

    await queryRunner.query(`
      DROP TABLE \`incidencias_historial\`
    `);
  }
}
