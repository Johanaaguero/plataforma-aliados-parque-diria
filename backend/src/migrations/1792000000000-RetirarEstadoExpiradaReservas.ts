import { MigrationInterface, QueryRunner } from 'typeorm';

export class RetirarEstadoExpiradaReservas1792000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const resultado: Array<{ total: string | number }> = await queryRunner.query(
      "SELECT COUNT(*) AS total FROM `reservas` WHERE `estado` = 'expirada'",
    );
    if (Number(resultado[0]?.total ?? 0) > 0) {
      throw new Error('No se puede retirar el estado expirada: existen reservas que requieren una decisión de negocio.');
    }
    await queryRunner.query("ALTER TABLE `reservas` MODIFY `estado` enum ('pendiente', 'aprobada', 'rechazada', 'cancelada') NOT NULL DEFAULT 'pendiente'");
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("ALTER TABLE `reservas` MODIFY `estado` enum ('pendiente', 'aprobada', 'rechazada', 'cancelada', 'expirada') NOT NULL DEFAULT 'pendiente'");
  }
}
