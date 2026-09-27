import { MigrationInterface, QueryRunner } from "typeorm";

export class CrearReportes1790394070276 implements MigrationInterface {
    name = 'CrearReportes1790394070276'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`reportes\` (\`id\` int NOT NULL AUTO_INCREMENT, \`numero_reporte\` varchar(30) NOT NULL, \`tipo_reporte\` enum ('usuarios', 'reservas', 'emprendimientos', 'eventos', 'incidencias') NOT NULL, \`fecha_generacion\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP, \`usuario_genero_id\` int NOT NULL, UNIQUE INDEX \`IDX_b89424780eefada800e7511776\` (\`numero_reporte\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`reportes\` ADD CONSTRAINT \`FK_b3cde21623dc3cbe74ac7b6b14f\` FOREIGN KEY (\`usuario_genero_id\`) REFERENCES \`usuarios\`(\`id\`) ON DELETE RESTRICT ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`reportes\` DROP FOREIGN KEY \`FK_b3cde21623dc3cbe74ac7b6b14f\``);
        await queryRunner.query(`DROP INDEX \`IDX_b89424780eefada800e7511776\` ON \`reportes\``);
        await queryRunner.query(`DROP TABLE \`reportes\``);
    }
}