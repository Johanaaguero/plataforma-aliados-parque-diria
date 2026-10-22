import { MigrationInterface, QueryRunner } from 'typeorm';

export class RegisterSuperAdminRole1787558400000
  implements MigrationInterface
{
  name = 'RegisterSuperAdminRole1787558400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`roles\`
       MODIFY \`nombre\` enum ('administrador', 'asociado', 'visitante', 'super_admin') NOT NULL`,
    );

    await queryRunner.query(
      `INSERT INTO \`roles\` (\`nombre\`, \`descripcion\`)
       SELECT ?, ?
       WHERE NOT EXISTS (
         SELECT 1 FROM \`roles\` WHERE \`nombre\` = ?
       )`,
      ['super_admin', 'Super administrador del sistema', 'super_admin'],
    );
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    // No se elimina ni se contrae el enum porque el rol puede estar asignado.
  }
}
