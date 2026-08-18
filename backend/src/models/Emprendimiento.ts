import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';

import { CategoriaEmprendimiento } from './CategoriaEmprendimiento';

export enum EstadoPublicacion {
  PENDIENTE = 'pendiente',
  PUBLICADO = 'publicado',
  RECHAZADO = 'rechazado',
}

@Entity('emprendimientos')
export class Emprendimiento {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', length: 150, unique: true })
  nombre!: string;

  @Column({ type: 'text', nullable: true })
  descripcion?: string;

  // Clave foránea referenciando a la tabla categorias_emprendimientos
  @ManyToOne(
    () => CategoriaEmprendimiento,
    (categoria) => categoria.emprendimientos,
    {
      nullable: false,
      eager: true,
    }
  )
  @JoinColumn({ name: 'categoria_id' })
  categoria!: CategoriaEmprendimiento;

  @Column({ type: 'varchar', length: 255, nullable: true })
  direccion?: string;

  @Column({ type: 'decimal', precision: 10, scale: 8 })
  latitud!: number;

  @Column({ type: 'decimal', precision: 11, scale: 8 })
  longitud!: number;

  @Column({
    type: 'varchar',
    length: 150,
    name: 'correo_electronico',
  })
  correoElectronico!: string;

  @Column({ type: 'varchar', length: 20 })
  telefono!: string;

  @Column({
    type: 'enum',
    enum: EstadoPublicacion,
    default: EstadoPublicacion.PENDIENTE,
    name: 'estado_publicacion',
  })
  estadoPublicacion!: EstadoPublicacion;

  // Imagen almacenada directamente en MySQL
  @Column({
    type: 'longblob',
    nullable: true,
  })
  imagen?: Buffer;

  @CreateDateColumn({ name: 'fecha_creacion' })
  fechaCreacion!: Date;

  @UpdateDateColumn({ name: 'fecha_actualizacion' })
  fechaActualizacion!: Date;

  constructor(params?: {
    id?: number;
    nombre?: string;
    descripcion?: string | undefined;
    categoria?: CategoriaEmprendimiento;
    direccion?: string | undefined;
    latitud?: number;
    longitud?: number;
    correoElectronico?: string;
    telefono?: string;
    estadoPublicacion?: EstadoPublicacion;
    imagen?: Buffer | undefined;
  }) {
    if (!params) return;

    if (params.id !== undefined) this.id = params.id;
    if (params.nombre !== undefined) this.nombre = params.nombre;
    if (params.descripcion !== undefined) {
      this.descripcion = params.descripcion;
    }
    if (params.categoria !== undefined) {
      this.categoria = params.categoria;
    }
    if (params.direccion !== undefined) {
      this.direccion = params.direccion;
    }
    if (params.latitud !== undefined) {
      this.latitud = params.latitud;
    }
    if (params.longitud !== undefined) {
      this.longitud = params.longitud;
    }
    if (params.correoElectronico !== undefined) {
      this.correoElectronico = params.correoElectronico;
    }
    if (params.telefono !== undefined) {
      this.telefono = params.telefono;
    }
    if (params.estadoPublicacion !== undefined) {
      this.estadoPublicacion = params.estadoPublicacion;
    }
    if (params.imagen !== undefined) {
      this.imagen = params.imagen;
    }
  }

  toPublic() {
    return {
      id: this.id,
      nombre: this.nombre,
      descripcion: this.descripcion,
      categoria: this.categoria ? this.categoria.nombre : null,
      direccion: this.direccion,
      latitud: this.latitud,
      longitud: this.longitud,
      correoElectronico: this.correoElectronico,
      telefono: this.telefono,
      estadoPublicacion: this.estadoPublicacion,

      // Se convierte el Buffer a Base64 para ser consumible por el Frontend en etiquetas <img />
      imagen: this.imagen
        ? `data:image/jpeg;base64,${this.imagen.toString('base64')}`
        : null,

      fechaCreacion: this.fechaCreacion,
      fechaActualizacion: this.fechaActualizacion,
    };
  }
}