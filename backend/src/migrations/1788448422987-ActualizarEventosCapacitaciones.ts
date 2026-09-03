import { MigrationInterface, QueryRunner } from "typeorm";

export class ActualizarEventosCapacitaciones1788448422987 implements MigrationInterface {
    name = 'ActualizarEventosCapacitaciones1788448422987';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE \`eventos_capacitaciones\`
            ADD COLUMN \`estado\` ENUM('borrador', 'publicado', 'otro') NOT NULL DEFAULT 'borrador'
        `);
        await queryRunner.query(`
            ALTER TABLE \`eventos_capacitaciones\`
            ADD COLUMN \`temporada\` ENUM('seca', 'lluviosa') NOT NULL
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE \`eventos_capacitaciones\` DROP COLUMN \`estado\`
        `);
        await queryRunner.query(`
            ALTER TABLE \`eventos_capacitaciones\` DROP COLUMN \`temporada\`
        `);
    }
}