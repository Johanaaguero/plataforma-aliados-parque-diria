import { MigrationInterface, QueryRunner } from 'typeorm';

export class PublicacionEmprendimientos1787286000000
  implements MigrationInterface
{
  name = 'PublicacionEmprendimientos1787286000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const estadosIncompatibles: Array<{
      estado: string;
      cantidad: string | number;
    }> = await queryRunner.query(`
      SELECT
        \`estado_publicacion\` AS \`estado\`,
        COUNT(*) AS \`cantidad\`
      FROM \`emprendimientos\`
      WHERE \`estado_publicacion\` NOT IN ('publicado', 'no_publicado')
      GROUP BY \`estado_publicacion\`
    `);

    if (estadosIncompatibles.length > 0) {
      const detalle = estadosIncompatibles
        .map(({ estado, cantidad }) => `${estado}: ${cantidad}`)
        .join(', ');

      throw new Error(
        'No se puede restringir estado_publicacion sin modificar datos ' +
          `existentes. Estados incompatibles: ${detalle}`,
      );
    }

    await queryRunner.query(`
      ALTER TABLE \`emprendimientos\`
      MODIFY COLUMN \`estado_publicacion\`
        ENUM('no_publicado', 'publicado')
        NOT NULL
        DEFAULT 'no_publicado',
      ADD COLUMN \`fecha_publicacion\` DATETIME(6) NULL
        AFTER \`estado_publicacion\`,
      ADD INDEX \`IDX_EMPRENDIMIENTOS_ESTADO_PUBLICACION\`
        (\`estado_publicacion\`)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const estadosIncompatibles: Array<{
      estado: string;
      cantidad: string | number;
    }> = await queryRunner.query(`
      SELECT
        \`estado_publicacion\` AS \`estado\`,
        COUNT(*) AS \`cantidad\`
      FROM \`emprendimientos\`
      WHERE \`estado_publicacion\` NOT IN ('publicado')
      GROUP BY \`estado_publicacion\`
    `);

    if (estadosIncompatibles.length > 0) {
      const detalle = estadosIncompatibles
        .map(({ estado, cantidad }) => `${estado}: ${cantidad}`)
        .join(', ');

      throw new Error(
        'No se puede restaurar el ENUM anterior sin modificar datos ' +
          `existentes. Estados incompatibles: ${detalle}`,
      );
    }

    await queryRunner.query(`
      ALTER TABLE \`emprendimientos\`
      MODIFY COLUMN \`estado_publicacion\`
        ENUM('pendiente', 'publicado', 'rechazado')
        NOT NULL
        DEFAULT 'pendiente',
      DROP INDEX \`IDX_EMPRENDIMIENTOS_ESTADO_PUBLICACION\`,
      DROP COLUMN \`fecha_publicacion\`
    `);
  }
}
