import { MigrationInterface, QueryRunner } from 'typeorm';

export class CrearReservas1789500000000 implements MigrationInterface {
  name = 'CrearReservas1789500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE \`reservas\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`usuario_id\` int NOT NULL,
        \`evento_capacitacion_id\` int NOT NULL,
        \`nombre_completo\` varchar(200) NOT NULL,
        \`fecha_nacimiento\` date NOT NULL,
        \`tipo_identificacion\` varchar(30) NOT NULL,
        \`numero_identificacion\` varchar(50) NOT NULL,
        \`correo\` varchar(150) NOT NULL,
        \`telefono\` varchar(20) NOT NULL,
        \`estado\` enum ('pendiente', 'aprobada', 'rechazada', 'cancelada') NOT NULL DEFAULT 'pendiente',
        \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        INDEX \`IDX_reservas_usuario\` (\`usuario_id\`),
        INDEX \`IDX_reservas_evento\` (\`evento_capacitacion_id\`),
        UNIQUE INDEX \`UQ_reservas_usuario_evento\` (\`usuario_id\`, \`evento_capacitacion_id\`),
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB
    `);

    await queryRunner.query(`
      ALTER TABLE \`reservas\`
      ADD CONSTRAINT \`FK_reservas_usuario\`
      FOREIGN KEY (\`usuario_id\`)
      REFERENCES \`usuarios\`(\`id\`)
      ON DELETE CASCADE
      ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE \`reservas\`
      ADD CONSTRAINT \`FK_reservas_evento\`
      FOREIGN KEY (\`evento_capacitacion_id\`)
      REFERENCES \`eventos_capacitaciones\`(\`id\`)
      ON DELETE CASCADE
      ON UPDATE NO ACTION
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`reservas\`
      DROP FOREIGN KEY \`FK_reservas_evento\`
    `);

    await queryRunner.query(`
      ALTER TABLE \`reservas\`
      DROP FOREIGN KEY \`FK_reservas_usuario\`
    `);

    await queryRunner.query(`
      DROP INDEX \`UQ_reservas_usuario_evento\`
      ON \`reservas\`
    `);

    await queryRunner.query(`
      DROP INDEX \`IDX_reservas_evento\`
      ON \`reservas\`
    `);

    await queryRunner.query(`
      DROP INDEX \`IDX_reservas_usuario\`
      ON \`reservas\`
    `);

    await queryRunner.query(`
      DROP TABLE \`reservas\`
    `);
  }
}
