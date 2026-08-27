import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';

import { CategoriaEmprendimiento } from './CategoriaEmprendimiento';
import { Usuario } from './Usuario';
import { EmprendimientoImagen } from './EmprendimientoImagen';

export enum EstadoPublicacion {
  BORRADOR = 'borrador',
  NO_PUBLICADO = 'no_publicado',
  PUBLICADO = 'publicado',
  DESACTIVADO = 'desactivado',
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
  // nullable: true para permitir borradores sin categoría asignada aún
  @ManyToOne(
    () => CategoriaEmprendimiento,
    (categoria) => categoria.emprendimientos,
    {
      nullable: true,
      eager: true,
    }
  )
  @JoinColumn({ name: 'categoria_id' })
  categoria?: CategoriaEmprendimiento;

  // Asociado dueño del emprendimiento. Null cuando lo registra un
  // administrador sin asignarlo a un asociado en particular.
  @Index('IDX_EMPRENDIMIENTOS_ASOCIADO')
  @ManyToOne(() => Usuario, {
    nullable: true,
    eager: false,
  })
  @JoinColumn({ name: 'asociado_id' })
  asociado?: Usuario | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  direccion?: string;

  
 @Column({ type: 'varchar', length: 100, nullable: true })
provincia?: string | null;

@Column({ type: 'varchar', length: 100, nullable: true })
canton?: string | null;

@Column({ type: 'varchar', length: 100, nullable: true })
distrito?: string | null;

  @Column({ type: 'decimal', precision: 10, scale: 8, nullable: true })
  latitud!: number | null;

  @Column({ type: 'decimal', precision: 11, scale: 8, nullable: true })
  longitud?: number | null;

  @Column({
    type: 'varchar',
    length: 150,
    name: 'correo_electronico',
    nullable: true,
  })
  correoElectronico?: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  telefono?: string;

  @Index('IDX_EMPRENDIMIENTOS_ESTADO_PUBLICACION')
  @Column({
    type: 'enum',
    enum: EstadoPublicacion,
    default: EstadoPublicacion.BORRADOR,
    name: 'estado_publicacion',
  })
  estadoPublicacion!: EstadoPublicacion;

  @Column({
    type: 'datetime',
    precision: 6,
    nullable: true,
    name: 'fecha_publicacion',
  })
  fechaPublicacion!: Date | null;

  // Imagen almacenada directamente en MySQL
  @Column({
    type: 'longblob',
    nullable: true,
  })
  imagen?: Buffer;

  @OneToMany(
    () => EmprendimientoImagen,
    (imagen) => imagen.emprendimiento,
  )
  imagenes!: EmprendimientoImagen[];

  @CreateDateColumn({ name: 'fecha_creacion' })
  fechaCreacion!: Date;

  @UpdateDateColumn({ name: 'fecha_actualizacion' })
  fechaActualizacion!: Date;

  constructor(params?: {
    id?: number;
    nombre?: string;
    descripcion?: string | undefined;
    categoria?: CategoriaEmprendimiento | undefined;
    asociado?: Usuario | null | undefined;
    direccion?: string | undefined;
    latitud?: number |null| undefined;
    longitud?: number | null | undefined;
    correoElectronico?: string | undefined;
    telefono?: string | undefined;
    estadoPublicacion?: EstadoPublicacion;
    imagen?: Buffer | undefined;
provincia?: string | null;
canton?: string | null;
distrito?: string | null;

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
    if (params.asociado !== undefined) {
      this.asociado = params.asociado;
    }
    if (params.direccion !== undefined) {
  this.direccion = params.direccion;
}

if (params.provincia !== undefined) {
  this.provincia = params.provincia;
}

if (params.canton !== undefined) {
  this.canton = params.canton;
}

if (params.distrito !== undefined) {
  this.distrito = params.distrito;
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

  toPublic(incluirGaleria = true) {
    return {
      id: this.id,
      nombre: this.nombre,
      descripcion: this.descripcion,
      categoria: this.categoria ? this.categoria.nombre : null,
      asociadoId: this.asociado ? this.asociado.id : null,
      direccion: this.direccion,
      provincia: this.provincia,
canton: this.canton,
distrito: this.distrito,
      latitud: this.latitud,
      longitud: this.longitud,
      correoElectronico: this.correoElectronico,
      telefono: this.telefono,
      estadoPublicacion: this.estadoPublicacion,

      // Se convierte el Buffer a Base64 para ser consumible por el Frontend en etiquetas <img />
      imagen: this.imagen
        ? `data:image/jpeg;base64,${this.imagen.toString('base64')}`
        : null,

      ...(incluirGaleria
        ? {
            imagenes: (this.imagenes ?? []).map((imagen) => ({
              id: imagen.id,
              imagen: `data:${imagen.tipoMime};base64,${imagen.imagen.toString('base64')}`,
              esPortada: imagen.esPortada,
            })),
          }
        : {}),

      fechaCreacion: this.fechaCreacion,
      fechaActualizacion: this.fechaActualizacion,
    };
  }
}