import { MigrationInterface, QueryRunner } from 'typeorm';

export class CrearEmprendimientoImagenes1787600000000
  implements MigrationInterface
{
  name = 'CrearEmprendimientoImagenes1787600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE emprendimiento_imagenes (
        id INT NOT NULL AUTO_INCREMENT,
        emprendimiento_id INT NOT NULL,
        imagen LONGBLOB NOT NULL,
        tipo_mime VARCHAR(100) NOT NULL,
        es_portada TINYINT(1) NOT NULL DEFAULT 0,
        fecha_creacion DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        PRIMARY KEY (id),
        INDEX IDX_EMPRENDIMIENTO_IMAGENES_EMPRENDIMIENTO (emprendimiento_id),
        CONSTRAINT FK_EMPRENDIMIENTO_IMAGENES_EMPRENDIMIENTO
          FOREIGN KEY (emprendimiento_id)
          REFERENCES emprendimientos(id)
          ON DELETE CASCADE
          ON UPDATE NO ACTION
      ) ENGINE=InnoDB
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TABLE emprendimiento_imagenes
    `);
  }
}
