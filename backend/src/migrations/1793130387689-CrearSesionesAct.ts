import { MigrationInterface, QueryRunner } from "typeorm";

export class CrearSesionesAct1793130387689 implements MigrationInterface {
    name = 'CrearSesionesAct1793130387689'

    public async up(queryRunner: QueryRunner): Promise<void> {
    const existeTabla = await queryRunner.hasTable('sesiones_activas');

    if (!existeTabla) {
      await queryRunner.query(`
        CREATE TABLE \`sesiones_activas\` (
          \`id\` int NOT NULL AUTO_INCREMENT,
          \`usuario_id\` int NOT NULL,
          \`jti\` varchar(100) NOT NULL,
          \`ultima_actividad\` datetime NOT NULL,
          \`expira_en\` datetime NOT NULL,
          \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
          UNIQUE INDEX \`UQ_SESIONES_ACTIVAS_USUARIO\` (\`usuario_id\`),
          UNIQUE INDEX \`UQ_SESIONES_ACTIVAS_JTI\` (\`jti\`),
          PRIMARY KEY (\`id\`),
          CONSTRAINT \`FK_SESIONES_ACTIVAS_USUARIO\`
            FOREIGN KEY (\`usuario_id\`)
            REFERENCES \`usuarios\` (\`id\`)
            ON DELETE CASCADE
        ) ENGINE=InnoDB
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'DROP TABLE IF EXISTS `sesiones_activas`',
    );
  }
}