import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateHistorialCambioRoles1786752000000
  implements MigrationInterface
{
  name = 'CreateHistorialCambioRoles1786752000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE \`historial_cambio_roles\` (\`id\` int NOT NULL AUTO_INCREMENT, \`actor_id\` int NOT NULL, \`usuario_afectado_id\` int NOT NULL, \`rol_anterior\` enum ('administrador', 'asociado', 'visitante') NOT NULL, \`rol_nuevo\` enum ('administrador', 'asociado', 'visitante') NOT NULL, \`fecha_cambio\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `ALTER TABLE \`historial_cambio_roles\` ADD CONSTRAINT \`FK_historial_actor\` FOREIGN KEY (\`actor_id\`) REFERENCES \`usuarios\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`historial_cambio_roles\` ADD CONSTRAINT \`FK_historial_usuario_afectado\` FOREIGN KEY (\`usuario_afectado_id\`) REFERENCES \`usuarios\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`historial_cambio_roles\` DROP FOREIGN KEY \`FK_historial_usuario_afectado\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`historial_cambio_roles\` DROP FOREIGN KEY \`FK_historial_actor\``,
    );
    await queryRunner.query(`DROP TABLE \`historial_cambio_roles\``);
  }
}
