import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Usuario } from './Usuario';
import { NombreRol } from './Rol';

@Entity('historial_cambio_roles')
export class HistorialCambioRol {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'int', name: 'actor_id' })
  actorId!: number;

  @ManyToOne(() => Usuario, { nullable: false })
  @JoinColumn({ name: 'actor_id' })
  actor!: Usuario;

  @Column({ type: 'int', name: 'usuario_afectado_id' })
  usuarioAfectadoId!: number;

  @ManyToOne(() => Usuario, { nullable: false })
  @JoinColumn({ name: 'usuario_afectado_id' })
  usuarioAfectado!: Usuario;

  @Column({
    type: 'enum',
    enum: ['administrador', 'asociado', 'visitante'],
    name: 'rol_anterior',
  })
  rolAnterior!: NombreRol;

  @Column({
    type: 'enum',
    enum: ['administrador', 'asociado', 'visitante'],
    name: 'rol_nuevo',
  })
  rolNuevo!: NombreRol;

  @CreateDateColumn({
    type: 'datetime',
    precision: 6,
    name: 'fecha_cambio',
  })
  fechaCambio!: Date;
}
