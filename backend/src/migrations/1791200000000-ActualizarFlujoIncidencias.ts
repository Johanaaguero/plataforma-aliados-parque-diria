import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class ActualizarFlujoIncidencias1791200000000
  implements MigrationInterface
{
  name = 'ActualizarFlujoIncidencias1791200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'incidencias',
      new TableColumn({
        name: 'conformidad_usuario',
        type: 'enum',
        enum: ['pendiente', 'satisfecho', 'no_satisfecho', 'sin_respuesta'],
        default: "'pendiente'",
        isNullable: false,
      }),
    );

    await queryRunner.addColumn(
      'incidencias',
      new TableColumn({
        name: 'observaciones_usuario',
        type: 'text',
        isNullable: true,
      }),
    );

    await queryRunner.addColumn(
      'incidencias',
      new TableColumn({
        name: 'fecha_respuesta_usuario',
        type: 'datetime',
        isNullable: true,
      }),
    );

    await queryRunner.addColumn(
      'incidencias',
      new TableColumn({
        name: 'fecha_limite_respuesta',
        type: 'datetime',
        isNullable: true,
      }),
    );

    await queryRunner.addColumn(
      'incidencias',
      new TableColumn({
        name: 'fecha_cierre_programado',
        type: 'datetime',
        isNullable: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn(
      'incidencias',
      'fecha_cierre_programado',
    );

    await queryRunner.dropColumn(
      'incidencias',
      'fecha_limite_respuesta',
    );

    await queryRunner.dropColumn(
      'incidencias',
      'fecha_respuesta_usuario',
    );

    await queryRunner.dropColumn(
      'incidencias',
      'observaciones_usuario',
    );

    await queryRunner.dropColumn(
      'incidencias',
      'conformidad_usuario',
    );
  }
}