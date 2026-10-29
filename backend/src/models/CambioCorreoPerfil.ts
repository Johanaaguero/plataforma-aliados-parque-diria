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

@Entity('cambios_correo_perfil')
@Index('UQ_cambios_correo_perfil_token_hash', ['tokenHash'], { unique: true })
@Index('UQ_cambios_correo_perfil_correo_nuevo', ['correoNuevo'], { unique: true })
@Index('IDX_cambios_correo_perfil_usuario', ['usuarioId'])
export class CambioCorreoPerfil {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'int', name: 'usuario_id' })
  usuarioId!: number;

  @Column({ type: 'char', length: 64, name: 'token_hash' })
  tokenHash!: string;

  @Column({ type: 'varchar', length: 150, nullable: true, name: 'correo_nuevo' })
  correoNuevo!: string | null;

  @CreateDateColumn({ type: 'datetime', precision: 6, name: 'created_at' })
  createdAt!: Date;

  @Column({ type: 'datetime', precision: 6, name: 'expires_at' })
  expiresAt!: Date;

  @Column({ type: 'datetime', precision: 6, nullable: true, name: 'used_at' })
  usedAt!: Date | null;

  @ManyToOne(() => Usuario, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'usuario_id',
    foreignKeyConstraintName: 'FK_cambios_correo_perfil_usuario',
  })
  usuario!: Usuario;
}
