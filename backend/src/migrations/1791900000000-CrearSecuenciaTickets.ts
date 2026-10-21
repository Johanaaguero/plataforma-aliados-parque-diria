import { MigrationInterface, QueryRunner } from 'typeorm';

export class CrearSecuenciaTickets1791900000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE \`secuencias_tickets\` (
        \`periodo\` varchar(4) NOT NULL,
        \`ultimo\` int UNSIGNED NOT NULL DEFAULT 0,
        PRIMARY KEY (\`periodo\`)
      ) ENGINE=InnoDB
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE `secuencias_tickets`');
  }
}
