import { MigrationInterface, QueryRunner } from "typeorm";

export class CrearNotificaciones1790819754445 implements MigrationInterface {
    name = 'CrearNotificaciones1790819754445'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE \`notificaciones\` (
                \`id\` int NOT NULL AUTO_INCREMENT,
                \`usuario_id\` int NOT NULL,
                \`tipo\` enum(
                    'nuevo_evento',
                    'nueva_capacitacion',
                    'nuevo_emprendimiento',
                    'reserva_realizada',
                    'nueva_reserva_admin',
                    'nueva_incidencia',
                    'seguimiento_incidencia'
                ) NOT NULL,
                \`titulo\` varchar(200) NOT NULL,
                \`mensaje\` text NOT NULL,
                \`leida\` tinyint NOT NULL DEFAULT 0,
                \`referencia_id\` int NULL,
                \`referencia_tipo\` varchar(50) NULL,
                \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                PRIMARY KEY (\`id\`)
            ) ENGINE=InnoDB
        `);

        await queryRunner.query(`
            ALTER TABLE \`notificaciones\`
            ADD CONSTRAINT \`FK_notificaciones_usuario\`
            FOREIGN KEY (\`usuario_id\`)
            REFERENCES \`usuarios\`(\`id\`)
            ON DELETE CASCADE
            ON UPDATE NO ACTION
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE \`notificaciones\`
            DROP FOREIGN KEY \`FK_notificaciones_usuario\`
        `);

        await queryRunner.query(`
            DROP TABLE \`notificaciones\`
        `);
    }
}