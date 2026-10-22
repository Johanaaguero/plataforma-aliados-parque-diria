import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateLoginAttempt1786669986468 implements MigrationInterface {
    name = 'CreateLoginAttempt1786669986468'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`login_attempts\` (\`id\` int NOT NULL AUTO_INCREMENT, \`usuarioId\` int NOT NULL, \`intentosFallidos\` int NOT NULL DEFAULT '0', \`fechaUltimoIntento\` datetime NULL, \`bloqueadoHasta\` datetime NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`login_attempts\` ADD CONSTRAINT \`FK_e6306e4210bf016408085f72bfd\` FOREIGN KEY (\`usuarioId\`) REFERENCES \`usuarios\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`login_attempts\` DROP FOREIGN KEY \`FK_e6306e4210bf016408085f72bfd\``);
        await queryRunner.query(`DROP TABLE \`login_attempts\``);
    }

}
