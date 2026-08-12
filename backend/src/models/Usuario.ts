import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Rol } from './Rol';

@Entity('usuarios')
export class Usuario {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', length: 50, unique: true, name: 'nombre_usuario' })
  nombreUsuario!: string;

  @Column({ type: 'varchar', length: 100 })
  nombre!: string;

  @Column({ type: 'varchar', length: 100 })
  apellidos!: string;

  @Column({ type: 'varchar', length: 150, unique: true, name: 'correo_electronico' })
  correo!: string;

  @Column({ type: 'varchar', length: 8 })
  telefono!: string;

  @Column({ type: 'varchar', length: 255 })
  contraseña!: string;

  // Clave foránea referenciando a la tabla 'roles'
  @ManyToOne(() => Rol, (rol) => rol.usuarios, { nullable: false, eager: true })
  @JoinColumn({ name: 'rol_id' })
  rol!: Rol;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  constructor(params?: {
    id?: number;
    nombreUsuario?: string;
    nombre?: string;
    apellidos?: string;
    correo?: string;
    telefono?: string;
    contraseña?: string;
    rol?: Rol;
  }) {
    if (!params) return;

    if (params.id !== undefined) this.id = params.id;
    if (params.nombreUsuario !== undefined) this.nombreUsuario = params.nombreUsuario;
    if (params.nombre !== undefined) this.nombre = params.nombre;
    if (params.apellidos !== undefined) this.apellidos = params.apellidos;
    if (params.correo !== undefined) this.correo = params.correo;
    if (params.telefono !== undefined) this.telefono = params.telefono;
    if (params.contraseña !== undefined) this.contraseña = params.contraseña;
    if (params.rol !== undefined) this.rol = params.rol;
  }

  toPublic() {
    return {
      id: this.id,
      nombreUsuario: this.nombreUsuario,
      nombre: this.nombre,
      apellidos: this.apellidos,
      correo: this.correo,
      telefono: this.telefono,
      rol: this.rol ? this.rol.nombre : null,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}