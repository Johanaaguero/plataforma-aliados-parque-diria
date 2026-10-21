import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { Reserva } from './Reserva';
import { Usuario } from './Usuario';

@Entity('comprobantes_pago')
@Unique('UQ_comprobantes_pago_reserva', ['reservaId'])
export class ComprobantePago {
  @PrimaryGeneratedColumn()
  id!: number;

  @Index('IDX_comprobantes_pago_reserva')
  @Column({ name: 'reserva_id', type: 'int' })
  reservaId!: number;

  @Index('IDX_comprobantes_pago_usuario')
  @Column({ name: 'usuario_id', type: 'int' })
  usuarioId!: number;

  @Column({ name: 'storage_key', type: 'varchar', length: 500, nullable: true })
  storageKey!: string | null;

  @Column({ name: 'contenido', type: 'longblob', nullable: true })
  contenido!: Buffer | null;

  @Column({ name: 'original_filename', type: 'varchar', length: 255 })
  originalFilename!: string;

  @Column({ name: 'content_type', type: 'varchar', length: 100 })
  contentType!: string;

  @Column({ name: 'size_bytes', type: 'int', unsigned: true })
  sizeBytes!: number;

  @Column({ name: 'sha256', type: 'char', length: 64 })
  sha256!: string;

  @Column({ name: 'storage_provider', type: 'varchar', length: 30 })
  storageProvider!: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @ManyToOne(() => Reserva, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'reserva_id' })
  reserva!: Reserva;

  @ManyToOne(() => Usuario, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'usuario_id' })
  usuario!: Usuario;
}
