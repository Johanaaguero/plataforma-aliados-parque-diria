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

export enum EstadoReserva {
  PENDIENTE = 'pendiente',
  APROBADA = 'aprobada',
  RECHAZADA = 'rechazada',
  CANCELADA = 'cancelada',
}

@Entity('reservas')
@Unique('UQ_reservas_usuario_evento', [
  'usuarioId',
  'eventoCapacitacionId',
])
export class Reserva {
  @PrimaryGeneratedColumn()
  id!: number;

  @Index('IDX_reservas_usuario')
  @Column({
    type: 'int',
    name: 'usuario_id',
  })
  usuarioId!: number;

  @Index('IDX_reservas_evento')
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

  @Column({
    type: 'varchar',
    length: 200,
    name: 'nombre_completo',
  })
  nombreCompleto!: string;

  @Column({
    type: 'date',
    name: 'fecha_nacimiento',
  })
  fechaNacimiento!: string;

  @Column({
    type: 'varchar',
    length: 30,
    name: 'tipo_identificacion',
  })
  tipoIdentificacion!: string;

  @Column({
    type: 'varchar',
    length: 50,
    name: 'numero_identificacion',
  })
  numeroIdentificacion!: string;

  @Column({
    type: 'varchar',
    length: 150,
  })
  correo!: string;

  @Column({
    type: 'varchar',
    length: 20,
  })
  telefono!: string;

  @Column({
    type: 'enum',
    enum: EstadoReserva,
    default: EstadoReserva.PENDIENTE,
  })
  estado!: EstadoReserva;

  @CreateDateColumn({
    name: 'created_at',
  })
  createdAt!: Date;

  @UpdateDateColumn({
    name: 'updated_at',
  })
  updatedAt!: Date;
}
