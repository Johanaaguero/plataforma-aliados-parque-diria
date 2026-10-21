import { MigrationInterface, QueryRunner } from 'typeorm';

export class AgregarEstadoExpiradaReservas1791800000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("ALTER TABLE `reservas` MODIFY `estado` enum ('pendiente', 'aprobada', 'rechazada', 'cancelada', 'expirada') NOT NULL DEFAULT 'pendiente'");
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const resultado: Array<{ total: string | number }> = await queryRunner.query(
      "SELECT COUNT(*) AS total FROM `reservas` WHERE `estado` = 'expirada'",
    );
    if (Number(resultado[0]?.total ?? 0) > 0) {
      throw new Error('No se puede revertir: existen reservas en estado expirada.');
    }
    await queryRunner.query("ALTER TABLE `reservas` MODIFY `estado` enum ('pendiente', 'aprobada', 'rechazada', 'cancelada') NOT NULL DEFAULT 'pendiente'");
  }
}
