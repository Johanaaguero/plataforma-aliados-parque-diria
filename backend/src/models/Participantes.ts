import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  Unique,
} from 'typeorm';
import { Usuario } from './Usuario';
import { EventosCapacitaciones } from './EventosCapacitaciones';

@Entity('participantes')
@Unique('UQ_participantes_usuario_evento', [
  'usuarioId',
  'eventoCapacitacionId',
])
export class Participantes {
  @PrimaryGeneratedColumn()
  id!: number;

  @Index('IDX_participantes_usuario')
  @Column({
    type: 'int',
    name: 'usuario_id',
  })
  usuarioId!: number;

  @Index('IDX_participantes_evento')
  @Column({
    type: 'int',
    name: 'evento_capacitacion_id',
  })
  eventoCapacitacionId!: number;

  @ManyToOne(() => Usuario, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({
    name: 'usuario_id',
  })
  usuario!: Usuario;

  @ManyToOne(() => EventosCapacitaciones, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({
    name: 'evento_capacitacion_id',
  })
  eventoCapacitacion!: EventosCapacitaciones;

  @CreateDateColumn({
    name: 'created_at',
  })
  createdAt!: Date;

  @UpdateDateColumn({
    name: 'updated_at',
  })
  updatedAt!: Date;
}