import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { Emprendimiento } from './Emprendimiento';
import { Usuario } from './Usuario';

@Entity('consultas_emprendimientos')
@Index('IDX_CONSULTAS_EMPRENDIMIENTOS_EMPRENDIMIENTO', ['emprendimientoId'])
@Index('IDX_CONSULTAS_EMPRENDIMIENTOS_FECHA', ['fechaConsulta'])
@Index('IDX_CONSULTAS_EMPRENDIMIENTOS_USUARIO', ['usuarioId'])
export class ConsultaEmprendimiento {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'int', name: 'emprendimiento_id' })
  emprendimientoId!: number;

  @ManyToOne(() => Emprendimiento, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'emprendimiento_id' })
  emprendimiento!: Emprendimiento;

  @Column({ type: 'int', nullable: true, name: 'usuario_id' })
  usuarioId!: number | null;

  @ManyToOne(() => Usuario, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'usuario_id' })
  usuario?: Usuario | null;

  @CreateDateColumn({
    type: 'datetime',
    precision: 6,
    name: 'fecha_consulta',
  })
  fechaConsulta!: Date;
}
