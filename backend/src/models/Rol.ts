import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { Usuario } from './Usuario';

export type NombreRol =
  | 'administrador'
  | 'asociado'
  | 'visitante'
  | 'super_admin';

@Entity('roles')
export class Rol {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({
    type: 'enum',
    enum: ['administrador', 'asociado', 'visitante', 'super_admin'],
    unique: true,
  })
  nombre!: NombreRol;

  @Column({ type: 'varchar', length: 255, nullable: true })
  descripcion!: string;

  // Relación uno a muchos: Un rol pertenece a muchos usuarios
  @OneToMany(() => Usuario, (usuario) => usuario.rol)
  usuarios!: Usuario[];
}