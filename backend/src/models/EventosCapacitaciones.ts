import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { EventoCapacitacionImagen } from './EventoCapacitacionImagen';

export enum TipoActividad {
  EVENTO = 'evento',
  CAPACITACION = 'capacitacion',
}

@Entity('eventos_capacitaciones')
export class EventosCapacitaciones {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({
    type: 'varchar',
    length: 150,
  })
  nombre!: string;

  @Column({
    type: 'text',
  })
  descripcion!: string;

  @Column({
    type: 'date',
  })
  fecha!: string;

  @Column({
    type: 'time',
  })
  hora!: string;

  @Column({
    type: 'varchar',
    length: 255,
  })
  lugar!: string;

  @Column({
    type: 'enum',
    enum: TipoActividad,
    name: 'tipo_actividad',
  })
  tipoActividad!: TipoActividad;

  @Column({
    type: 'int',
    nullable: true,
    name: 'cupo_maximo',
  })
  cupoMaximo!: number | null;

  @OneToMany(() => EventoCapacitacionImagen, (imagen) => imagen.eventoCapacitacion)
  imagenes!: EventoCapacitacionImagen[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  constructor(params?: {
    id?: number;
    nombre?: string;
    descripcion?: string;
    fecha?: string;
    hora?: string;
    lugar?: string;
    tipoActividad?: TipoActividad;
    cupoMaximo?: number | null;
  }) {
    if (!params) return;

    if (params.id !== undefined) this.id = params.id;
    if (params.nombre !== undefined) this.nombre = params.nombre;
    if (params.descripcion !== undefined) {
      this.descripcion = params.descripcion;
    }
    if (params.fecha !== undefined) this.fecha = params.fecha;
    if (params.hora !== undefined) this.hora = params.hora;
    if (params.lugar !== undefined) this.lugar = params.lugar;
    if (params.tipoActividad !== undefined) {
      this.tipoActividad = params.tipoActividad;
    }
    if (params.cupoMaximo !== undefined) {
      this.cupoMaximo = params.cupoMaximo;
    }
  }

  toPublic() {
    return {
      id: this.id,
      nombre: this.nombre,
      descripcion: this.descripcion,
      fecha: this.fecha,
      hora: this.hora,
      lugar: this.lugar,
      tipoActividad: this.tipoActividad,
      cupoMaximo: this.cupoMaximo,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}