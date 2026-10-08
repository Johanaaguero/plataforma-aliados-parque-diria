import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AgregarEstadoNotificacion1790819754446
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'notificaciones',
      new TableColumn({
        name: 'estado',
        type: 'enum',
        enum: ['activa', 'eliminada'],
        default: "'activa'",
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('notificaciones', 'estado');
  }
}