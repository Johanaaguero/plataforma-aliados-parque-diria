import { MigrationInterface, QueryRunner } from 'typeorm';

const rolesIniciales = [
  ['administrador', 'Administrador del sistema'],
  ['asociado', 'Asociado de la organización'],
  ['visitante', 'Usuario visitante'],
] as const;

export class RegisterInitialRoles1786838400000
  implements MigrationInterface
{
  name = 'RegisterInitialRoles1786838400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const [nombre, descripcion] of rolesIniciales) {
      await queryRunner.query(
        `INSERT INTO \`roles\` (\`nombre\`, \`descripcion\`)
         SELECT ?, ?
         WHERE NOT EXISTS (
           SELECT 1 FROM \`roles\` WHERE \`nombre\` = ?
         )`,
        [nombre, descripcion, nombre],
      );
    }
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    // No se eliminan roles porque pueden ser preexistentes o estar asignados.
  }
}
