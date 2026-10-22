import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Emprendimiento } from './Emprendimiento';

@Entity('categorias_emprendimientos')
export class CategoriaEmprendimiento {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', length: 100, unique: true })
  nombre!: string;

  @Column({ type: 'text', nullable: true })
  descripcion?: string;

  @OneToMany(() => Emprendimiento, (emprendimiento) => emprendimiento.categoria)
  emprendimientos!: Emprendimiento[];

  @CreateDateColumn({ name: 'fecha_creacion' })
  fechaCreacion!: Date;

  @UpdateDateColumn({ name: 'fecha_actualizacion' })
  fechaActualizacion!: Date;

  constructor(params?: { id?: number; nombre?: string; descripcion?: string }) {
    if (!params) return;

    if (params.id !== undefined) this.id = params.id;
    if (params.nombre !== undefined) this.nombre = params.nombre;
    if (params.descripcion !== undefined) this.descripcion = params.descripcion;
  }

  toPublic() {
    return {
      id: this.id,
      nombre: this.nombre,
      descripcion: this.descripcion,
    };
  }
}