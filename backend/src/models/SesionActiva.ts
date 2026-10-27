
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

  @CreateDateColumn({
    name: 'created_at',
    type: 'datetime',
  })
  createdAt!: Date;
}
