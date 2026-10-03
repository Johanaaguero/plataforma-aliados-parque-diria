import { MigrationInterface, QueryRunner } from "typeorm";

export class ActualizarNotificacion1790832207611
  implements MigrationInterface
{
  name = 'ActualizarNotificacion1790832207611';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`notificaciones\`
      MODIFY COLUMN \`tipo\`
      ENUM(
        'nuevo_evento',
        'nueva_capacitacion',
        'nuevo_emprendimiento',
        'reserva_realizada',
        'nueva_reserva_admin',
        'reserva_aprobada',
        'reserva_rechazada',
        'nueva_incidencia',
        'seguimiento_incidencia'
      )
      NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`notificaciones\`
      MODIFY COLUMN \`tipo\`
      ENUM(
        'nuevo_evento',
        'nueva_capacitacion',
        'nuevo_emprendimiento',
        'reserva_realizada',
        'nueva_reserva_admin',
        'nueva_incidencia',
        'seguimiento_incidencia'
      )
      NOT NULL
    `);
  }
}