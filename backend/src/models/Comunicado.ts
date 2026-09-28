import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Usuario } from './Usuario';

export enum PrioridadComunicado { ALTA = 'ALTA', MEDIA = 'MEDIA', BAJA = 'BAJA' }

@Entity('comunicados')
export class Comunicado {
  @PrimaryGeneratedColumn() id!: number;
  @Column({ type: 'varchar', length: 180 }) titulo!: string;
  @Column({ type: 'text' }) contenido!: string;
  @Column({ type: 'enum', enum: PrioridadComunicado, default: PrioridadComunicado.MEDIA }) prioridad!: PrioridadComunicado;
  @CreateDateColumn({ name: 'fecha_publicacion', type: 'datetime', precision: 6 }) fechaPublicacion!: Date;
  @Column({ name: 'creado_por_id', type: 'int' }) creadoPorId!: number;
  @ManyToOne(() => Usuario, { nullable: false }) @JoinColumn({ name: 'creado_por_id' }) creadoPor!: Usuario;
}
