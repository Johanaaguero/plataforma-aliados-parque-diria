import { MigrationInterface, QueryRunner } from 'typeorm';

export class CrearEventosCapacitaciones1788489919645
  implements MigrationInterface
{
  name = 'CrearEventosCapacitaciones1788489919645';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE \`eventos_capacitaciones\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`nombre\` varchar(150) NULL,
        \`descripcion\` text NULL,
        \`fecha\` date NULL,
        \`hora\` time NULL,
        \`lugar\` varchar(255) NULL,
        \`tipo_actividad\` enum ('evento', 'capacitacion') NOT NULL,
        \`cupo_maximo\` int NULL,
        \`estado\` enum ('borrador', 'publicado', 'no_publicado', 'desactivado') NOT NULL DEFAULT 'borrador',
        \`temporada\` enum ('seca', 'lluviosa') NULL,
        \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TABLE \`eventos_capacitaciones\`
    `);
  }
}