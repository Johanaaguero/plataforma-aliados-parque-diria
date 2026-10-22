import { MigrationInterface, QueryRunner } from 'typeorm';

export class CrearPreguntasFrecuentes1791669281000
  implements MigrationInterface
{
  name = 'CrearPreguntasFrecuentes1791669281000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE \`preguntas_frecuentes\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`pregunta\` text NOT NULL,
        \`respuesta\` text NOT NULL,
        \`palabras_clave\` json NOT NULL,
        \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE `preguntas_frecuentes`');
  }
}
