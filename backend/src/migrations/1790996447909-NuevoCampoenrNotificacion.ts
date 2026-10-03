import { MigrationInterface, QueryRunner } from 'typeorm';

export class NuevoCampoEnNotificacion1790996447909
  implements MigrationInterface
{
  name = 'NuevoCampoEnNotificacion1790996447909';

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
        'seguimiento_incidencia',
        'incidencia_compartida'
      ) NOT NULL
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
        'reserva_aprobada',
        'reserva_rechazada',
        'nueva_incidencia',
        'seguimiento_incidencia'
      ) NOT NULL
    `);
  }
}