
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('sesiones_activas')
@Index('UQ_SESIONES_ACTIVAS_USUARIO', ['usuarioId'], {
  unique: true,
})
export class SesionActiva {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({
    name: 'usuario_id',
    type: 'int',
  })
  usuarioId!: number;

  @Column({
    type: 'varchar',
    length: 100,
    unique: true,
  })
  jti!: string;

  @Column({
    name: 'ultima_actividad',
    type: 'datetime',
  })
  ultimaActividad!: Date;

  @Column({
    name: 'expira_en',
    type: 'datetime',
  })
  expiraEn!: Date;

  // Última vez que el navegador avisó que la pestaña sigue abierta.
  @Column({
    name: 'ultimo_latido',
    type: 'datetime',
    nullable: true,
  })
  ultimoLatido!: Date | null;

  // Si la pestaña avisó que se está descargando (cerrar o refrescar),
  // la sesión se libera cuando pase esta fecha, salvo que la nueva
  // página la reanude antes.
  @Column({
    name: 'cierre_pendiente_hasta',
    type: 'datetime',
    nullable: true,
  })
  cierrePendienteHasta!: Date | null;

  @CreateDateColumn({
    name: 'created_at',
    type: 'datetime',
  })
  createdAt!: Date;
}
