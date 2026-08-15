import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateRecuperacionContrasena1786687065075 implements MigrationInterface {
  name = 'CreateRecuperacionContrasena1786687065075';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'CREATE TABLE \`recuperacion_contrasenas\` (' +
        '\`id\` int NOT NULL AUTO_INCREMENT, ' +
        '\`usuario_id\` int NOT NULL, ' +
        '\`token_hash\` char(64) NOT NULL, ' +
        '\`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), ' +
        '\`expires_at\` datetime(6) NOT NULL, ' +
        '\`used_at\` datetime(6) NULL, ' +
        'UNIQUE INDEX \`UQ_recuperacion_contrasenas_token_hash\` (\`token_hash\`), ' +
        'INDEX \`IDX_recuperacion_contrasenas_usuario_id\` (\`usuario_id\`), ' +
        'INDEX \`IDX_recuperacion_contrasenas_expires_at\` (\`expires_at\`), ' +
        'PRIMARY KEY (\`id\`)' +
        ') ENGINE=InnoDB',
    );
    await queryRunner.query(
      'ALTER TABLE \`recuperacion_contrasenas\` ' +
        'ADD CONSTRAINT \`FK_recuperacion_contrasenas_usuario\` ' +
        'FOREIGN KEY (\`usuario_id\`) REFERENCES \`usuarios\`(\`id\`) ' +
        'ON DELETE CASCADE ON UPDATE NO ACTION',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE \`recuperacion_contrasenas\` ' +
        'DROP FOREIGN KEY \`FK_recuperacion_contrasenas_usuario\`',
    );
    await queryRunner.query(
      'DROP INDEX \`IDX_recuperacion_contrasenas_expires_at\` ' +
        'ON \`recuperacion_contrasenas\`',
    );
    await queryRunner.query(
      'DROP INDEX \`IDX_recuperacion_contrasenas_usuario_id\` ' +
        'ON \`recuperacion_contrasenas\`',
    );
    await queryRunner.query(
      'DROP INDEX \`UQ_recuperacion_contrasenas_token_hash\` ' +
        'ON \`recuperacion_contrasenas\`',
    );
    await queryRunner.query('DROP TABLE \`recuperacion_contrasenas\`');
  }
}
