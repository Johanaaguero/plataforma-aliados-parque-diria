import { Check, Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Usuario } from './Usuario';

@Entity('resenas') @Check('CHK_RESENAS_PUNTUACION', '`puntuacion` BETWEEN 1 AND 5')
export class Resena {
  @PrimaryGeneratedColumn() id!: number;
  @Column({ type: 'tinyint' }) puntuacion!: number;
  @Column({ type: 'text' }) comentario!: string;
  @Column({ name: 'nombre_visitante', type: 'varchar', length: 150, nullable: true }) nombreVisitante?: string | null;
  @Column({ name: 'usuario_id', type: 'int', nullable: true }) usuarioId?: number | null;
  @ManyToOne(() => Usuario, { nullable: true }) @JoinColumn({ name: 'usuario_id' }) usuario?: Usuario | null;
  @CreateDateColumn({ type: 'datetime', precision: 6 }) fecha!: Date;
}
