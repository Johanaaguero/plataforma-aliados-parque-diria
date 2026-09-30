import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';

import { Incidencia } from './Incidencia';
import { Usuario } from './Usuario';

@Entity('incidencias_historial')
@Index('IDX_INCIDENCIAS_HISTORIAL_INCIDENCIA', ['incidenciaId'])
@Index('IDX_INCIDENCIAS_HISTORIAL_USUARIO', ['usuarioId'])
@Index('IDX_INCIDENCIAS_HISTORIAL_FECHA', ['fecha'])
export class IncidenciaHistorial {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({
    type: 'int',
    name: 'incidencia_id',
  })
  incidenciaId!: number;

  @ManyToOne(() => Incidencia, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'incidencia_id' })
  incidencia!: Incidencia;

 @Column({
  type: 'int',
  name: 'usuario_id',
  nullable: true,
})
usuarioId!: number | null;

@ManyToOne(() => Usuario, {
  nullable: true,
})
@JoinColumn({ name: 'usuario_id' })
usuario!: Usuario | null;

  @CreateDateColumn({
    type: 'datetime',
    precision: 6,
  })
  fecha!: Date;

  @Column({
    type: 'varchar',
    length: 100,
    name: 'campo_modificado',
  })
  campoModificado!: string;

  @Column({
    type: 'text',
    nullable: true,
    name: 'valor_anterior',
  })
  valorAnterior!: string | null;

  @Column({
    type: 'text',
    nullable: true,
    name: 'valor_nuevo',
  })
  valorNuevo!: string | null;
}
