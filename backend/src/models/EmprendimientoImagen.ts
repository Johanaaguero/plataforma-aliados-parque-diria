import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { Emprendimiento } from './Emprendimiento';

@Entity('emprendimiento_imagenes')
export class EmprendimientoImagen {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Emprendimiento, (emprendimiento) => emprendimiento.imagenes, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'emprendimiento_id' })
  emprendimiento!: Emprendimiento;

  @Column({ type: 'longblob' })
  imagen!: Buffer;

  @Column({ type: 'varchar', length: 100, name: 'tipo_mime' })
  tipoMime!: string;

  @Column({ type: 'boolean', default: false, name: 'es_portada' })
  esPortada!: boolean;

  @CreateDateColumn({ name: 'fecha_creacion' })
  fechaCreacion!: Date;
}
