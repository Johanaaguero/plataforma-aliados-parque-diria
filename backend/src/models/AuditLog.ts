import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Usuario } from './Usuario';

// Implementado por: Dallane
@Entity('audit_logs')
@Index('IDX_AUDIT_LOGS_USER_ID', ['usuarioId'])
@Index('IDX_AUDIT_LOGS_ACTION', ['action'])
@Index('IDX_AUDIT_LOGS_CREATED_AT', ['createdAt'])
@Index('IDX_AUDIT_LOGS_USER_ACTION', ['usuarioId', 'action'])
export class AuditLog {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'int', nullable: true, name: 'usuario_id' })
  usuarioId!: number | null;

  @ManyToOne(() => Usuario, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'usuario_id' })
  usuario?: Usuario | null;

  @Column({ type: 'varchar', length: 100 })
  action!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  description?: string | null;

  @Column({ type: 'varchar', length: 45, nullable: true })
  ipAddress!: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  userAgent?: string | null;

  @Column({ type: 'varchar', length: 50, default: 'success' })
  status!: 'success' | 'failure' | 'blocked';

  @Column({ type: 'text', nullable: true })
  details?: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
