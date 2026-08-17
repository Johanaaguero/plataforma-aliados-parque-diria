import { MigrationInterface, QueryRunner } from 'typeorm';


export class AddIndexesToLoginAttempt1787100000000 implements MigrationInterface {
  name = 'AddIndexesToLoginAttempt1787100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const indicesPorUsuario = await queryRunner.query(
      `SELECT COUNT(*) as count FROM information_schema.STATISTICS 
       WHERE TABLE_SCHEMA = DATABASE() 
       AND TABLE_NAME = 'login_attempts' 
       AND COLUMN_NAME = 'usuarioId'`,
    );

    if (indicesPorUsuario[0].count === 0) {
      await queryRunner.query(
        `ALTER TABLE \`login_attempts\` ADD INDEX \`IDX_LOGIN_ATTEMPTS_USER_ID\` (\`usuarioId\`)`,
      );
    }

    const indicesPorBloqueo = await queryRunner.query(
      `SELECT COUNT(*) as count FROM information_schema.STATISTICS 
       WHERE TABLE_SCHEMA = DATABASE() 
       AND TABLE_NAME = 'login_attempts' 
       AND COLUMN_NAME = 'bloqueadoHasta'`,
    );

    if (indicesPorBloqueo[0].count === 0) {
      await queryRunner.query(
        `ALTER TABLE \`login_attempts\` ADD INDEX \`IDX_LOGIN_ATTEMPTS_BLOCKED_UNTIL\` (\`bloqueadoHasta\`)`,
      );
    }

    const indicesCompuesto = await queryRunner.query(
      `SELECT COUNT(*) as count FROM information_schema.STATISTICS 
       WHERE TABLE_SCHEMA = DATABASE() 
       AND TABLE_NAME = 'login_attempts' 
       AND COLUMN_NAME = 'usuarioId'
       AND SEQ_IN_INDEX = 1`,
    );

    if (indicesCompuesto[0].count > 0) {
      const indiceInfo = await queryRunner.query(
        `SELECT COUNT(*) as count FROM information_schema.STATISTICS 
         WHERE TABLE_SCHEMA = DATABASE() 
         AND TABLE_NAME = 'login_attempts' 
         AND INDEX_NAME LIKE '%USUARIO_ID_BLOQUEADO%'`,
      );

      if (indiceInfo[0].count === 0) {
        await queryRunner.query(
          `ALTER TABLE \`login_attempts\` ADD INDEX \`IDX_LOGIN_ATTEMPTS_USER_BLOCKED\` (\`usuarioId\`, \`bloqueadoHasta\`)`,
        );
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const indexesToDrop = [
      'IDX_LOGIN_ATTEMPTS_USER_ID',
      'IDX_LOGIN_ATTEMPTS_BLOCKED_UNTIL',
      'IDX_LOGIN_ATTEMPTS_USER_BLOCKED',
    ];

    for (const indexName of indexesToDrop) {
      const exists = await queryRunner.query(
        `SELECT COUNT(*) as count FROM information_schema.STATISTICS 
         WHERE TABLE_SCHEMA = DATABASE() 
         AND TABLE_NAME = 'login_attempts' 
         AND INDEX_NAME = ?`,
        [indexName],
      );

      if (exists[0].count > 0) {
        await queryRunner.query(`ALTER TABLE \`login_attempts\` DROP INDEX \`${indexName}\``);
      }
    }
  }
}
