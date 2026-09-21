import { MigrationInterface, QueryRunner } from 'typeorm';

export class CrearIncidencias1789951309358 implements MigrationInterface {
  name = 'CrearIncidencias1789951309358';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE \`incidencias\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`titulo\` varchar(150) NOT NULL,
        \`descripcion\` text NOT NULL,

        \`categoria\` enum(
          'seguridad',
          'incendio',
          'flora_fauna',
          'ambiental',
          'infraestructura',
          'senderos',
          'servicios',
          'otro'
        ) NOT NULL,

        \`prioridad\` enum(
          'baja',
          'media',
          'alta',
          'critica'
        ) NOT NULL,

        \`estado\` enum(
          'pendiente',
          'en_revision',
          'en_proceso',
          'resuelta',
          'rechazada',
          'cerrada'
        ) NOT NULL DEFAULT 'pendiente',

        \`ubicacion\` varchar(255) NULL,

        \`latitud\` decimal(10,8) NULL,

        \`longitud\` decimal(11,8) NULL,

        \`observaciones_admin\` text NULL,

        \`fecha_resolucion\` datetime NULL,

        \`fecha_registro\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),

        \`fecha_actualizacion\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)
          ON UPDATE CURRENT_TIMESTAMP(6),

        \`usuario_reporta_id\` int NULL,

        \`admin_actualiza_id\` int NULL,

        INDEX \`IDX_INCIDENCIAS_CATEGORIA\` (\`categoria\`),

        INDEX \`IDX_INCIDENCIAS_PRIORIDAD\` (\`prioridad\`),

        INDEX \`IDX_INCIDENCIAS_ESTADO\` (\`estado\`),

        INDEX \`IDX_INCIDENCIAS_USUARIO_REPORTA\` (\`usuario_reporta_id\`),

        INDEX \`IDX_INCIDENCIAS_ADMIN_ACTUALIZA\` (\`admin_actualiza_id\`),

        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB
    `);

    await queryRunner.query(`
      CREATE TABLE \`incidencias_evidencias\` (
        \`id\` int NOT NULL AUTO_INCREMENT,

        \`archivo\` longblob NOT NULL,

        \`tipo_mime\` varchar(100) NOT NULL,

        \`nombre_archivo\` varchar(255) NULL,

        \`tamano_bytes\` int NULL,

        \`tipo\` enum('foto', 'video') NOT NULL,

        \`incidencia_id\` int NOT NULL,

        \`fecha_creacion\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),

        INDEX \`IDX_INCIDENCIAS_EVIDENCIAS_INCIDENCIA\`
        (\`incidencia_id\`),

        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB
    `);

    await queryRunner.query(`
      ALTER TABLE \`incidencias_evidencias\`
      ADD CONSTRAINT \`FK_INCIDENCIAS_EVIDENCIAS_INCIDENCIA\`
      FOREIGN KEY (\`incidencia_id\`)
      REFERENCES \`incidencias\`(\`id\`)
      ON DELETE CASCADE
      ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE \`incidencias\`
      ADD CONSTRAINT \`FK_INCIDENCIAS_USUARIO_REPORTA\`
      FOREIGN KEY (\`usuario_reporta_id\`)
      REFERENCES \`usuarios\`(\`id\`)
      ON DELETE NO ACTION
      ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE \`incidencias\`
      ADD CONSTRAINT \`FK_INCIDENCIAS_ADMIN_ACTUALIZA\`
      FOREIGN KEY (\`admin_actualiza_id\`)
      REFERENCES \`usuarios\`(\`id\`)
      ON DELETE NO ACTION
      ON UPDATE NO ACTION
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`incidencias\`
      DROP FOREIGN KEY \`FK_INCIDENCIAS_ADMIN_ACTUALIZA\`
    `);

    await queryRunner.query(`
      ALTER TABLE \`incidencias\`
      DROP FOREIGN KEY \`FK_INCIDENCIAS_USUARIO_REPORTA\`
    `);

    await queryRunner.query(`
      ALTER TABLE \`incidencias_evidencias\`
      DROP FOREIGN KEY \`FK_INCIDENCIAS_EVIDENCIAS_INCIDENCIA\`
    `);

    await queryRunner.query(`
      DROP INDEX \`IDX_INCIDENCIAS_ADMIN_ACTUALIZA\`
      ON \`incidencias\`
    `);

    await queryRunner.query(`
      DROP INDEX \`IDX_INCIDENCIAS_USUARIO_REPORTA\`
      ON \`incidencias\`
    `);

    await queryRunner.query(`
      DROP INDEX \`IDX_INCIDENCIAS_ESTADO\`
      ON \`incidencias\`
    `);

    await queryRunner.query(`
      DROP INDEX \`IDX_INCIDENCIAS_PRIORIDAD\`
      ON \`incidencias\`
    `);

    await queryRunner.query(`
      DROP INDEX \`IDX_INCIDENCIAS_CATEGORIA\`
      ON \`incidencias\`
    `);

    await queryRunner.query(`
      DROP INDEX \`IDX_INCIDENCIAS_EVIDENCIAS_INCIDENCIA\`
      ON \`incidencias_evidencias\`
    `);

    await queryRunner.query(`
      DROP TABLE \`incidencias_evidencias\`
    `);

    await queryRunner.query(`
      DROP TABLE \`incidencias\`
    `);
  }
}