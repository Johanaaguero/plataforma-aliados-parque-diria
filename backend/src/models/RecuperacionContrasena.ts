import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Usuario } from './Usuario';

@Index('UQ_recuperacion_contrasenas_token_hash', ['tokenHash'], { unique: true })
@Index('IDX_recuperacion_contrasenas_usuario_id', ['usuarioId'])
@Index('IDX_recuperacion_contrasenas_expires_at', ['expiresAt'])
@Entity('recuperacion_contrasenas')
export class RecuperacionContrasena {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'int', name: 'usuario_id' })
  usuarioId!: number;

  @Column({ type: 'char', length: 64, name: 'token_hash' })
  tokenHash!: string;

  @CreateDateColumn({ type: 'datetime', precision: 6, name: 'created_at' })
  createdAt!: Date;

  @Column({ type: 'datetime', precision: 6, name: 'expires_at' })
  expiresAt!: Date;

  @Column({ type: 'datetime', precision: 6, nullable: true, name: 'used_at' })
  usedAt!: Date | null;

  @ManyToOne(() => Usuario, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'usuario_id',
    foreignKeyConstraintName: 'FK_recuperacion_contrasenas_usuario',
  })
  usuario!: Usuario;
}
