import { MigrationInterface, QueryRunner } from 'typeorm';

export class CrearComprobantesPagoPrivados1792300000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE \`comprobantes_pago\` (
      \`id\` int NOT NULL AUTO_INCREMENT,
      \`reserva_id\` int NOT NULL,
      \`usuario_id\` int NOT NULL,
      \`storage_key\` varchar(500) NOT NULL,
      \`original_filename\` varchar(255) NOT NULL,
      \`content_type\` varchar(100) NOT NULL,
      \`size_bytes\` int unsigned NOT NULL,
      \`sha256\` char(64) NOT NULL,
      \`storage_provider\` varchar(30) NOT NULL,
      \`created_at\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (\`id\`),
      UNIQUE KEY \`UQ_comprobantes_pago_reserva\` (\`reserva_id\`),
      KEY \`IDX_comprobantes_pago_reserva\` (\`reserva_id\`),
      KEY \`IDX_comprobantes_pago_usuario\` (\`usuario_id\`),
      CONSTRAINT \`FK_comprobantes_pago_reserva\` FOREIGN KEY (\`reserva_id\`) REFERENCES \`reservas\` (\`id\`) ON DELETE CASCADE,
      CONSTRAINT \`FK_comprobantes_pago_usuario\` FOREIGN KEY (\`usuario_id\`) REFERENCES \`usuarios\` (\`id\`) ON DELETE RESTRICT
    ) ENGINE=InnoDB`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE `comprobantes_pago`');
  }
}
