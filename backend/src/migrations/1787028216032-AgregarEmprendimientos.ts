import { MigrationInterface, QueryRunner } from "typeorm";

export class AgregarEmprendimientos1787028216032 implements MigrationInterface {
    name = 'AgregarEmprendimientos1787028216032'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`categorias_emprendimientos\` (\`id\` int NOT NULL AUTO_INCREMENT, \`nombre\` varchar(100) NOT NULL, \`descripcion\` text NULL, \`fecha_creacion\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`fecha_actualizacion\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), UNIQUE INDEX \`IDX_c4e6c054e4c23200b471632a7e\` (\`nombre\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`emprendimientos\` (\`id\` int NOT NULL AUTO_INCREMENT, \`nombre\` varchar(150) NOT NULL, \`descripcion\` text NULL, \`direccion\` varchar(255) NULL, \`latitud\` decimal(10,8) NOT NULL, \`longitud\` decimal(11,8) NOT NULL, \`correo_electronico\` varchar(150) NOT NULL, \`telefono\` varchar(20) NOT NULL, \`estado_publicacion\` enum ('pendiente', 'publicado', 'rechazado') NOT NULL DEFAULT 'pendiente', \`imagen\` varchar(255) NULL, \`fecha_creacion\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`fecha_actualizacion\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`categoria_id\` int NOT NULL, UNIQUE INDEX \`IDX_a790ddaf3b762685e99b5d8fe4\` (\`nombre\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`emprendimientos\` ADD CONSTRAINT \`FK_6ae0b7761d6683510b04cf6a52a\` FOREIGN KEY (\`categoria_id\`) REFERENCES \`categorias_emprendimientos\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`emprendimientos\` DROP FOREIGN KEY \`FK_6ae0b7761d6683510b04cf6a52a\``);
        await queryRunner.query(`DROP INDEX \`IDX_a790ddaf3b762685e99b5d8fe4\` ON \`emprendimientos\``);
        await queryRunner.query(`DROP TABLE \`emprendimientos\``);
        await queryRunner.query(`DROP INDEX \`IDX_c4e6c054e4c23200b471632a7e\` ON \`categorias_emprendimientos\``);
        await queryRunner.query(`DROP TABLE \`categorias_emprendimientos\``);
    }

}