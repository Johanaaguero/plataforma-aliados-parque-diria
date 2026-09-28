import { MigrationInterface, QueryRunner } from 'typeorm';
export class NovedadesComunicadosResenas1791100000000 implements MigrationInterface {
  name = 'NovedadesComunicadosResenas1791100000000';
  async up(q: QueryRunner): Promise<void> {
    await q.query("ALTER TABLE `incidencias` ADD `es_publica` tinyint NOT NULL DEFAULT 0");
    await q.query("CREATE TABLE `comunicados` (`id` int NOT NULL AUTO_INCREMENT, `titulo` varchar(180) NOT NULL, `contenido` text NOT NULL, `prioridad` enum('ALTA','MEDIA','BAJA') NOT NULL DEFAULT 'MEDIA', `fecha_publicacion` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), `creado_por_id` int NOT NULL, PRIMARY KEY (`id`), CONSTRAINT `FK_COMUNICADOS_USUARIO` FOREIGN KEY (`creado_por_id`) REFERENCES `usuarios`(`id`)) ENGINE=InnoDB");
    await q.query("CREATE TABLE `resenas` (`id` int NOT NULL AUTO_INCREMENT, `puntuacion` tinyint NOT NULL, `comentario` text NOT NULL, `nombre_visitante` varchar(150) NULL, `usuario_id` int NULL, `fecha` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), PRIMARY KEY (`id`), CONSTRAINT `FK_RESENAS_USUARIO` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios`(`id`)) ENGINE=InnoDB");
  }
  async down(q: QueryRunner): Promise<void> { await q.query('DROP TABLE `resenas`'); await q.query('DROP TABLE `comunicados`'); await q.query('ALTER TABLE `incidencias` DROP COLUMN `es_publica`'); }
}
