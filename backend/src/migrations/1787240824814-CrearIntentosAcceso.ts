import { MigrationInterface, QueryRunner } from 'typeorm';

export class CrearTablaIntentosAcceso1787240824814
  implements MigrationInterface
{
  name = 'CrearTablaIntentosAcceso1787240824814';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE \`intentos_acceso\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`usuario_id\` int NULL,
        \`correo\` varchar(255) NULL,
        \`exitoso\` tinyint NOT NULL DEFAULT 0,
        \`motivo\` varchar(255) NULL,
        \`ip\` varchar(255) NULL,
        \`fecha_hora\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TABLE \`intentos_acceso\`
    `);
  }
}