import { MigrationInterface, QueryRunner } from 'typeorm';

// Implementado por: Dallane
export class CreateAuditLog1787110000000 implements MigrationInterface {
  name = 'CreateAuditLog1787110000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const existsTable = await queryRunner.hasTable('audit_logs');

    if (!existsTable) {
      await queryRunner.query(
        `CREATE TABLE \`audit_logs\` (
          \`id\` int NOT NULL AUTO_INCREMENT,
          \`usuario_id\` int NULL,
          \`action\` varchar(100) NOT NULL,
          \`description\` varchar(255) NULL,
          \`ipAddress\` varchar(45) NULL,
          \`userAgent\` varchar(500) NULL,
          \`status\` varchar(50) NOT NULL DEFAULT 'success',
          \`details\` text NULL,
          \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
          INDEX \`IDX_AUDIT_LOGS_USER_ID\` (\`usuario_id\`),
          INDEX \`IDX_AUDIT_LOGS_ACTION\` (\`action\`),
          INDEX \`IDX_AUDIT_LOGS_CREATED_AT\` (\`created_at\`),
          INDEX \`IDX_AUDIT_LOGS_USER_ACTION\` (\`usuario_id\`, \`action\`),
          PRIMARY KEY (\`id\`)
        ) ENGINE=InnoDB`,
      );

      await queryRunner.query(
        `ALTER TABLE \`audit_logs\` ADD CONSTRAINT \`FK_AUDIT_LOGS_USUARIO\` FOREIGN KEY (\`usuario_id\`) REFERENCES \`usuarios\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const existsTable = await queryRunner.hasTable('audit_logs');

    if (existsTable) {
      await queryRunner.query(
        `ALTER TABLE \`audit_logs\` DROP FOREIGN KEY \`FK_AUDIT_LOGS_USUARIO\``,
      );
      await queryRunner.query(`DROP TABLE \`audit_logs\``);
    }
  }
}
