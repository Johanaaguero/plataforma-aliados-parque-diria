import { MigrationInterface, QueryRunner } from 'typeorm';

export class GestionPerfil1792000000000 implements MigrationInterface {
  name = 'GestionPerfil1792000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      "ALTER TABLE `usuarios` ADD `correo_verificado` tinyint NOT NULL DEFAULT 0, ADD `telefono_verificado` tinyint NOT NULL DEFAULT 0, ADD `foto_perfil` mediumblob NULL, ADD `foto_perfil_mime` varchar(50) NULL",
    );
    await queryRunner.query(
      "CREATE TABLE `cambios_correo_perfil` (`id` int NOT NULL AUTO_INCREMENT, `usuario_id` int NOT NULL, `token_hash` char(64) NOT NULL, `correo_nuevo` varchar(150) NULL, `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), `expires_at` datetime(6) NOT NULL, `used_at` datetime(6) NULL, UNIQUE INDEX `UQ_cambios_correo_perfil_token_hash` (`token_hash`), UNIQUE INDEX `UQ_cambios_correo_perfil_correo_nuevo` (`correo_nuevo`), INDEX `IDX_cambios_correo_perfil_usuario` (`usuario_id`), PRIMARY KEY (`id`)) ENGINE=InnoDB",
    );
    await queryRunner.query(
      "ALTER TABLE `cambios_correo_perfil` ADD CONSTRAINT `FK_cambios_correo_perfil_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION",
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      "ALTER TABLE `cambios_correo_perfil` DROP FOREIGN KEY `FK_cambios_correo_perfil_usuario`",
    );
    await queryRunner.query(
      "DROP TABLE `cambios_correo_perfil`",
    );
    await queryRunner.query(
      "ALTER TABLE `usuarios` DROP COLUMN `foto_perfil_mime`, DROP COLUMN `foto_perfil`, DROP COLUMN `telefono_verificado`, DROP COLUMN `correo_verificado`",
    );
  }
}
