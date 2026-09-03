import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateEventosCapacitaciones1788408210253 implements MigrationInterface {
    name = 'CreateEventosCapacitaciones1788408210253'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`eventos_capacitaciones\` (\`id\` int NOT NULL AUTO_INCREMENT, \`nombre\` varchar(150) NOT NULL, \`descripcion\` text NOT NULL, \`fecha\` date NOT NULL, \`hora\` time NOT NULL, \`lugar\` varchar(255) NOT NULL, \`tipo_actividad\` enum ('evento', 'capacitacion') NOT NULL, \`cupo_maximo\` int NULL, \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE \`eventos_capacitaciones\``);
    }
}