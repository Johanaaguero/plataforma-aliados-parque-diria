import { MigrationInterface, QueryRunner } from 'typeorm';

export class CrearEventosCapacitacionesImagenes1788489936296
  implements MigrationInterface
{
  name = 'CrearEventosCapacitacionesImagenes1788489936296';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE \`eventos_capacitaciones_imagenes\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`imagen\` longblob NOT NULL,
        \`tipo_mime\` varchar(100) NOT NULL,
        \`nombre_archivo\` varchar(255) NULL,
        \`tamano_bytes\` int NULL,
        \`evento_capacitacion_id\` int NOT NULL,
        \`fecha_creacion\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX \`IDX_eventos_capacitaciones_imagenes_evento\` (\`evento_capacitacion_id\`),
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB
    `);

    await queryRunner.query(`
      ALTER TABLE \`eventos_capacitaciones_imagenes\`
      ADD CONSTRAINT \`FK_eventos_capacitaciones_imagenes_evento\`
      FOREIGN KEY (\`evento_capacitacion_id\`)
      REFERENCES \`eventos_capacitaciones\`(\`id\`)
      ON DELETE CASCADE
      ON UPDATE NO ACTION
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`eventos_capacitaciones_imagenes\`
      DROP FOREIGN KEY \`FK_eventos_capacitaciones_imagenes_evento\`
    `);

    await queryRunner.query(`
      DROP TABLE \`eventos_capacitaciones_imagenes\`
    `);
  }
}