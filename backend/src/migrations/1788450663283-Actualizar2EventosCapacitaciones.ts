import { MigrationInterface, QueryRunner } from "typeorm";

export class ActualizarEventosCapacitacionesBorrador1788450663284
  implements MigrationInterface
{
  name = 'ActualizarEventosCapacitacionesBorrador1788450663284';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Permitir campos vacíos para las actividades guardadas como borrador.

    await queryRunner.query(`
      ALTER TABLE \`eventos_capacitaciones\`
      MODIFY COLUMN \`nombre\` varchar(150) NULL
    `);

    await queryRunner.query(`
      ALTER TABLE \`eventos_capacitaciones\`
      MODIFY COLUMN \`descripcion\` text NULL
    `);

    await queryRunner.query(`
      ALTER TABLE \`eventos_capacitaciones\`
      MODIFY COLUMN \`fecha\` date NULL
    `);

    await queryRunner.query(`
      ALTER TABLE \`eventos_capacitaciones\`
      MODIFY COLUMN \`hora\` time NULL
    `);

    await queryRunner.query(`
      ALTER TABLE \`eventos_capacitaciones\`
      MODIFY COLUMN \`lugar\` varchar(255) NULL
    `);

    await queryRunner.query(`
      ALTER TABLE \`eventos_capacitaciones\`
      MODIFY COLUMN \`temporada\`
      enum ('seca', 'lluviosa') NULL
    `);

    // Todo nuevo registro tendrá BORRADOR como estado
    // si no se especifica otro estado.
    await queryRunner.query(`
      ALTER TABLE \`eventos_capacitaciones\`
      MODIFY COLUMN \`estado\`
      enum ('borrador', 'publicado', 'no_publicado', 'desactivado')
      NOT NULL
      DEFAULT 'borrador'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Revertir los campos que permitían NULL.

    await queryRunner.query(`
      ALTER TABLE \`eventos_capacitaciones\`
      MODIFY COLUMN \`estado\`
      enum ('borrador', 'publicado', 'no_publicado', 'desactivado')
      NOT NULL
      DEFAULT 'borrador'
    `);

    await queryRunner.query(`
      ALTER TABLE \`eventos_capacitaciones\`
      MODIFY COLUMN \`temporada\`
      enum ('seca', 'lluviosa') NOT NULL
    `);

    await queryRunner.query(`
      ALTER TABLE \`eventos_capacitaciones\`
      MODIFY COLUMN \`lugar\` varchar(255) NOT NULL
    `);

    await queryRunner.query(`
      ALTER TABLE \`eventos_capacitaciones\`
      MODIFY COLUMN \`hora\` time NOT NULL
    `);

    await queryRunner.query(`
      ALTER TABLE \`eventos_capacitaciones\`
      MODIFY COLUMN \`fecha\` date NOT NULL
    `);

    await queryRunner.query(`
      ALTER TABLE \`eventos_capacitaciones\`
      MODIFY COLUMN \`descripcion\` text NOT NULL
    `);

    await queryRunner.query(`
      ALTER TABLE \`eventos_capacitaciones\`
      MODIFY COLUMN \`nombre\` varchar(150) NOT NULL
    `);
  }
}