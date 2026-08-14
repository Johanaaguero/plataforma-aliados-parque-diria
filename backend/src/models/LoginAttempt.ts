import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Usuario } from './Usuario';

@Entity('login_attempts')
export class LoginAttempt {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'int' })
  usuarioId!: number;

  @ManyToOne(() => Usuario)
  @JoinColumn({ name: 'usuarioId' })
  usuario!: Usuario;

  @Column({ type: 'int', default: 0 })
  intentosFallidos!: number;

  @Column({ type: 'datetime', nullable: true })
  fechaUltimoIntento!: Date | null;

  @Column({ type: 'datetime', nullable: true })
  bloqueadoHasta!: Date | null;
}