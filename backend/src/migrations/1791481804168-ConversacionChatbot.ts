import { MigrationInterface, QueryRunner } from "typeorm";

export class ConversacionChatbot1791481804168 implements MigrationInterface {
    name = 'ConversacionChatbot1791481804168'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE \`conversaciones_chatbot\` (
                \`id\` int NOT NULL AUTO_INCREMENT,
                \`mensaje_usuario\` text NOT NULL,
                \`respuesta_chatbot\` text NOT NULL,
                \`estado\` enum ('RESUELTA', 'DERIVADA_ADMIN', 'EN_PROCESO') NOT NULL DEFAULT 'EN_PROCESO',
                \`fecha_registro\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
                \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                \`usuario_id\` int NULL,
                \`administrador_id\` int NULL,
                PRIMARY KEY (\`id\`)
            ) ENGINE=InnoDB
        `);

        await queryRunner.query(`
            ALTER TABLE \`conversaciones_chatbot\`
            ADD CONSTRAINT \`FK_chatbot_usuario\`
            FOREIGN KEY (\`usuario_id\`)
            REFERENCES \`usuarios\`(\`id\`)
            ON DELETE SET NULL
            ON UPDATE NO ACTION
        `);

        await queryRunner.query(`
            ALTER TABLE \`conversaciones_chatbot\`
            ADD CONSTRAINT \`FK_chatbot_administrador\`
            FOREIGN KEY (\`administrador_id\`)
            REFERENCES \`usuarios\`(\`id\`)
            ON DELETE SET NULL
            ON UPDATE NO ACTION
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE \`conversaciones_chatbot\`
            DROP FOREIGN KEY \`FK_chatbot_administrador\`
        `);

        await queryRunner.query(`
            ALTER TABLE \`conversaciones_chatbot\`
            DROP FOREIGN KEY \`FK_chatbot_usuario\`
        `);

        await queryRunner.query(`
            DROP TABLE \`conversaciones_chatbot\`
        `);
    }
}