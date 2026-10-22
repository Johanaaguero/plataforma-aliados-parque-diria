import { MigrationInterface, QueryRunner } from "typeorm";

export class ActualizarNTelefono1788619324529 implements MigrationInterface {
    name = 'ActualizarNTelefono1788619324529'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `ALTER TABLE \`usuarios\` MODIFY \`telefono\` varchar(20) NOT NULL`,
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `ALTER TABLE \`usuarios\` MODIFY \`telefono\` varchar(8) NOT NULL`,
        );
    }
}