import { MigrationInterface, QueryRunner } from "typeorm";

export class Inicial1786557525492 implements MigrationInterface {
    name = 'Inicial1786557525492'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`roles\` (\`id\` int NOT NULL AUTO_INCREMENT, \`nombre\` enum ('administrador', 'asociado', 'visitante') NOT NULL, \`descripcion\` varchar(255) NULL, UNIQUE INDEX \`IDX_a5be7aa67e759e347b1c6464e1\` (\`nombre\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`usuarios\` (\`id\` int NOT NULL AUTO_INCREMENT, \`nombre_usuario\` varchar(50) NOT NULL, \`nombre\` varchar(100) NOT NULL, \`apellidos\` varchar(100) NOT NULL, \`correo_electronico\` varchar(150) NOT NULL, \`telefono\` varchar(8) NOT NULL, \`contraseña\` varchar(255) NOT NULL, \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`rol_id\` int NOT NULL, UNIQUE INDEX \`IDX_1a7a36f3dffef210b4c0ba5c6c\` (\`nombre_usuario\`), UNIQUE INDEX \`IDX_e871b7157e4b74290df9baa9c9\` (\`correo_electronico\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`usuarios\` ADD CONSTRAINT \`FK_9e519760a660751f4fa21453d3e\` FOREIGN KEY (\`rol_id\`) REFERENCES \`roles\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`usuarios\` DROP FOREIGN KEY \`FK_9e519760a660751f4fa21453d3e\``);
        await queryRunner.query(`DROP INDEX \`IDX_e871b7157e4b74290df9baa9c9\` ON \`usuarios\``);
        await queryRunner.query(`DROP INDEX \`IDX_1a7a36f3dffef210b4c0ba5c6c\` ON \`usuarios\``);
        await queryRunner.query(`DROP TABLE \`usuarios\``);
        await queryRunner.query(`DROP INDEX \`IDX_a5be7aa67e759e347b1c6464e1\` ON \`roles\``);
        await queryRunner.query(`DROP TABLE \`roles\``);
    }

}
