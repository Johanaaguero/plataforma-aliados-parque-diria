import { MigrationInterface, QueryRunner } from "typeorm";

export class AgregarCamposRestriccionesEventos1789323487479 implements MigrationInterface {
    name = 'AgregarCamposRestriccionesEventos1789323487479'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`eventos_capacitaciones\` ADD \`cupo_minimo\` int NULL`);
        await queryRunner.query(`ALTER TABLE \`eventos_capacitaciones\` ADD \`edad_minima\` int NULL`);
        await queryRunner.query(`ALTER TABLE \`eventos_capacitaciones\` ADD \`edad_maxima\` int NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`eventos_capacitaciones\` DROP COLUMN \`edad_maxima\``);
        await queryRunner.query(`ALTER TABLE \`eventos_capacitaciones\` DROP COLUMN \`edad_minima\``);
        await queryRunner.query(`ALTER TABLE \`eventos_capacitaciones\` DROP COLUMN \`cupo_minimo\``);
    }
}