import { MigrationInterface, QueryRunner } from 'typeorm';

export class CrearConfiguracionVisual1791400000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("CREATE TABLE `configuracion_visual` (`id` tinyint NOT NULL, `epoca` enum ('seca', 'lluviosa') NOT NULL DEFAULT 'seca', `hero_imagenes` json NULL, `hero_leyendas` json NULL, `updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), PRIMARY KEY (`id`)) ENGINE=InnoDB");
    await queryRunner.query("INSERT INTO `configuracion_visual` (`id`, `epoca`) VALUES (1, 'seca')");
  }
  public async down(queryRunner: QueryRunner): Promise<void> { await queryRunner.query('DROP TABLE `configuracion_visual`'); }
}
