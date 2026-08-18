import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTokenBlacklist1787000000000 implements MigrationInterface {
  name = 'CreateTokenBlacklist1787000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const existeTabla = await queryRunner.hasTable('token_blacklist');

    if (!existeTabla) {
      await queryRunner.query(`
        CREATE TABLE \`token_blacklist\` (
          \`id\` int NOT NULL AUTO_INCREMENT,
          \`token\` varchar(512) NOT NULL,
          \`motivo\` varchar(255) NULL,
          \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
          \`expiracion\` datetime NULL,
          INDEX \`IDX_TOKEN_BLACKLIST_TOKEN\` (\`token\`),
          PRIMARY KEY (\`id\`)
        ) ENGINE=InnoDB
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS \`token_blacklist\``);
  }
}
