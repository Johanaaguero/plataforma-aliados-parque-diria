import { MigrationInterface, QueryRunner } from 'typeorm';

export class GestionUbicacionGeografica1787400000000
  implements MigrationInterface
{
  name = 'GestionUbicacionGeografica1787400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ============================================================
    // 4173 / 4174
    // Campos de división territorial
    // ============================================================

    await queryRunner.query(`
      ALTER TABLE \`emprendimientos\`
        ADD COLUMN \`provincia\` VARCHAR(100) NULL
          AFTER \`direccion\`,
        ADD COLUMN \`canton\` VARCHAR(100) NULL
          AFTER \`provincia\`,
        ADD COLUMN \`distrito\` VARCHAR(100) NULL
          AFTER \`canton\`
    `);

    // ============================================================
    // 4172 / 4176
    // Permitir ubicación pendiente mientras no esté publicado.
    // La validación de publicación se realizará en Backend.
    // ============================================================

    await queryRunner.query(`
      ALTER TABLE \`emprendimientos\`
        MODIFY COLUMN \`latitud\` DECIMAL(10,8) NULL,
        MODIFY COLUMN \`longitud\` DECIMAL(11,8) NULL
    `);

    // ============================================================
    // 4175
    // Validar rangos geográficos
    // ============================================================

    await queryRunner.query(`
      ALTER TABLE \`emprendimientos\`
        ADD CONSTRAINT \`CHK_EMPRENDIMIENTOS_LATITUD\`
          CHECK (
            \`latitud\` IS NULL
            OR (\`latitud\` >= -90 AND \`latitud\` <= 90)
          ),
        ADD CONSTRAINT \`CHK_EMPRENDIMIENTOS_LONGITUD\`
          CHECK (
            \`longitud\` IS NULL
            OR (\`longitud\` >= -180 AND \`longitud\` <= 180)
          )
    `);

    // ============================================================
    // 4179
    // Índices territoriales
    // ============================================================

    await queryRunner.query(`
      CREATE INDEX \`IDX_EMPRENDIMIENTOS_PROVINCIA\`
        ON \`emprendimientos\` (\`provincia\`)
    `);

    await queryRunner.query(`
      CREATE INDEX \`IDX_EMPRENDIMIENTOS_CANTON\`
        ON \`emprendimientos\` (\`canton\`)
    `);

    await queryRunner.query(`
      CREATE INDEX \`IDX_EMPRENDIMIENTOS_DISTRITO\`
        ON \`emprendimientos\` (\`distrito\`)
    `);

    await queryRunner.query(`
      CREATE INDEX \`IDX_EMPRENDIMIENTOS_UBICACION\`
        ON \`emprendimientos\`
          (\`provincia\`, \`canton\`, \`distrito\`)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX \`IDX_EMPRENDIMIENTOS_UBICACION\`
      ON \`emprendimientos\`
    `);

    await queryRunner.query(`
      DROP INDEX \`IDX_EMPRENDIMIENTOS_DISTRITO\`
      ON \`emprendimientos\`
    `);

    await queryRunner.query(`
      DROP INDEX \`IDX_EMPRENDIMIENTOS_CANTON\`
      ON \`emprendimientos\`
    `);

    await queryRunner.query(`
      DROP INDEX \`IDX_EMPRENDIMIENTOS_PROVINCIA\`
      ON \`emprendimientos\`
    `);

    await queryRunner.query(`
      ALTER TABLE \`emprendimientos\`
        DROP CONSTRAINT \`CHK_EMPRENDIMIENTOS_LONGITUD\`,
        DROP CONSTRAINT \`CHK_EMPRENDIMIENTOS_LATITUD\`
    `);

    await queryRunner.query(`
      ALTER TABLE \`emprendimientos\`
        MODIFY COLUMN \`latitud\` DECIMAL(10,8) NOT NULL,
        MODIFY COLUMN \`longitud\` DECIMAL(11,8) NOT NULL
    `);

    await queryRunner.query(`
      ALTER TABLE \`emprendimientos\`
        DROP COLUMN \`distrito\`,
        DROP COLUMN \`canton\`,
        DROP COLUMN \`provincia\`
    `);
  }
}