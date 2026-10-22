import { MigrationInterface, QueryRunner } from 'typeorm';
export class CrearComentariosIncidencias1790400000000 implements MigrationInterface {
  name = 'CrearComentariosIncidencias1790400000000';
  public async up(q: QueryRunner): Promise<void> {
    await q.query("CREATE TABLE `comentarios_incidencias` (`id` int NOT NULL AUTO_INCREMENT, `incidencia_id` int NOT NULL, `autor_id` int NULL, `texto` text NOT NULL, `fecha_hora` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), `es_nota_privada` tinyint NOT NULL DEFAULT 0, `es_dato_sensible` tinyint NOT NULL DEFAULT 0, PRIMARY KEY (`id`), INDEX `IDX_COMENTARIOS_INCIDENCIA` (`incidencia_id`), CONSTRAINT `FK_COMENTARIOS_INCIDENCIA` FOREIGN KEY (`incidencia_id`) REFERENCES `incidencias`(`id`) ON DELETE CASCADE, CONSTRAINT `FK_COMENTARIOS_AUTOR` FOREIGN KEY (`autor_id`) REFERENCES `usuarios`(`id`)) ENGINE=InnoDB");
  }
  public async down(q: QueryRunner): Promise<void> { await q.query('DROP TABLE `comentarios_incidencias`'); }
}
