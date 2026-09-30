import { MigrationInterface, QueryRunner } from 'typeorm';

export class CrearConsultasEmprendimientos1791200000000
  implements MigrationInterface
{
  name = 'CrearConsultasEmprendimientos1791200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE \`consultas_emprendimientos\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`emprendimiento_id\` int NOT NULL,
        \`usuario_id\` int NULL,
        \`fecha_consulta\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        INDEX \`IDX_CONSULTAS_EMPRENDIMIENTOS_EMPRENDIMIENTO\` (\`emprendimiento_id\`),
        INDEX \`IDX_CONSULTAS_EMPRENDIMIENTOS_FECHA\` (\`fecha_consulta\`),
        INDEX \`IDX_CONSULTAS_EMPRENDIMIENTOS_USUARIO\` (\`usuario_id\`),
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB
    `);

    await queryRunner.query(`
      ALTER TABLE \`consultas_emprendimientos\`
      ADD CONSTRAINT \`FK_CONSULTAS_EMPRENDIMIENTOS_EMPRENDIMIENTO\`
      FOREIGN KEY (\`emprendimiento_id\`)
      REFERENCES \`emprendimientos\`(\`id\`)
      ON DELETE CASCADE
      ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE \`consultas_emprendimientos\`
      ADD CONSTRAINT \`FK_CONSULTAS_EMPRENDIMIENTOS_USUARIO\`
      FOREIGN KEY (\`usuario_id\`)
      REFERENCES \`usuarios\`(\`id\`)
      ON DELETE SET NULL
      ON UPDATE NO ACTION
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`consultas_emprendimientos\`
      DROP FOREIGN KEY \`FK_CONSULTAS_EMPRENDIMIENTOS_USUARIO\`
    `);

    await queryRunner.query(`
      ALTER TABLE \`consultas_emprendimientos\`
      DROP FOREIGN KEY \`FK_CONSULTAS_EMPRENDIMIENTOS_EMPRENDIMIENTO\`
    `);

    await queryRunner.query('DROP TABLE `consultas_emprendimientos`');
  }
}
