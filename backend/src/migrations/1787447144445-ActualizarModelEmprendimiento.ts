import { MigrationInterface, QueryRunner } from 'typeorm';

export class ActualizarModelEmprendimiento1787447144445
  implements MigrationInterface
{
  name = 'ActualizarModelEmprendimiento1787447144445';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Permitir categoría NULL
    await queryRunner.query(`
      ALTER TABLE emprendimientos
      MODIFY COLUMN categoria_id INT NULL
    `);

    // Permitir latitud NULL
    await queryRunner.query(`
      ALTER TABLE emprendimientos
      MODIFY COLUMN latitud DECIMAL(10,8) NULL
    `);

    // Permitir longitud NULL
    await queryRunner.query(`
      ALTER TABLE emprendimientos
      MODIFY COLUMN longitud DECIMAL(11,8) NULL
    `);

    // Permitir correo NULL
    await queryRunner.query(`
      ALTER TABLE emprendimientos
      MODIFY COLUMN correo_electronico VARCHAR(150) NULL
    `);

    // Permitir teléfono NULL
    await queryRunner.query(`
      ALTER TABLE emprendimientos
      MODIFY COLUMN telefono VARCHAR(20) NULL
    `);

    // Actualizar estados y cambiar estado por defecto
    await queryRunner.query(`
      ALTER TABLE emprendimientos
      MODIFY COLUMN estado_publicacion
      ENUM(
        'borrador',
        'no_publicado',
        'publicado',
        'desactivado'
      )
      NOT NULL
      DEFAULT 'borrador'
    `);

    // Agregar asociado_id
    await queryRunner.query(`
      ALTER TABLE emprendimientos
      ADD COLUMN asociado_id INT NULL
    `);

    // Crear índice
    await queryRunner.query(`
      CREATE INDEX IDX_EMPRENDIMIENTOS_ASOCIADO
      ON emprendimientos (asociado_id)
    `);

    // Crear relación con usuarios
    await queryRunner.query(`
      ALTER TABLE emprendimientos
      ADD CONSTRAINT FK_EMPRENDIMIENTOS_ASOCIADO
      FOREIGN KEY (asociado_id)
      REFERENCES usuarios(id)
      ON DELETE NO ACTION
      ON UPDATE NO ACTION
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Eliminar FK
    await queryRunner.query(`
      ALTER TABLE emprendimientos
      DROP FOREIGN KEY FK_EMPRENDIMIENTOS_ASOCIADO
    `);

    // Eliminar índice
    await queryRunner.query(`
      DROP INDEX IDX_EMPRENDIMIENTOS_ASOCIADO
      ON emprendimientos
    `);

    // Eliminar asociado_id
    await queryRunner.query(`
      ALTER TABLE emprendimientos
      DROP COLUMN asociado_id
    `);

    // Restaurar enum original
    await queryRunner.query(`
      ALTER TABLE emprendimientos
      MODIFY COLUMN estado_publicacion
      ENUM(
        'no_publicado',
        'publicado'
      )
      NOT NULL
      DEFAULT 'no_publicado'
    `);

    // Restaurar teléfono
    await queryRunner.query(`
      ALTER TABLE emprendimientos
      MODIFY COLUMN telefono VARCHAR(20) NOT NULL
    `);

    // Restaurar correo
    await queryRunner.query(`
      ALTER TABLE emprendimientos
      MODIFY COLUMN correo_electronico VARCHAR(150) NOT NULL
    `);

    // Restaurar longitud
    await queryRunner.query(`
      ALTER TABLE emprendimientos
      MODIFY COLUMN longitud DECIMAL(11,8) NOT NULL
    `);

    // Restaurar latitud
    await queryRunner.query(`
      ALTER TABLE emprendimientos
      MODIFY COLUMN latitud DECIMAL(10,8) NOT NULL
    `);

    // Restaurar categoría
    await queryRunner.query(`
      ALTER TABLE emprendimientos
      MODIFY COLUMN categoria_id INT NOT NULL
    `);
  }
}