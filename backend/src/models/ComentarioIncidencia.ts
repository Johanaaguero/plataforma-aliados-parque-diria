import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Incidencia } from './Incidencia';
import { Usuario } from './Usuario';

@Entity('comentarios_incidencias')
export class ComentarioIncidencia {
  @PrimaryGeneratedColumn() id!: number;
  @Column({ name: 'incidencia_id', type: 'int' }) incidenciaId!: number;
  @Column({ name: 'autor_id', type: 'int', nullable: true }) autorId!: number | null;
  @Column({ type: 'text' }) texto!: string;
  @CreateDateColumn({ name: 'fecha_hora', type: 'datetime', precision: 6 }) fechaHora!: Date;
  @Column({ name: 'es_nota_privada', type: 'boolean', default: false }) esNotaPrivada!: boolean;
  @Column({ name: 'es_dato_sensible', type: 'boolean', default: false }) esDatoSensible!: boolean;
  @ManyToOne(() => Incidencia, { onDelete: 'CASCADE' }) @JoinColumn({ name: 'incidencia_id' }) incidencia!: Incidencia;
  @ManyToOne(() => Usuario, { nullable: true }) @JoinColumn({ name: 'autor_id' }) autor!: Usuario | null;
}
