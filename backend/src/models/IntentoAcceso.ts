import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
} from 'typeorm';

@Entity('intentos_acceso')
export class IntentoAcceso {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'usuario_id', type: 'int', nullable: true })
  usuarioId!: number | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  correo!: string | null;

  @Column({ type: 'boolean', default: false })
  exitoso!: boolean;

  @Column({ type: 'varchar', length: 255, nullable: true })
  motivo!: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  ip!: string | null;

  @Column({
    name: 'fecha_hora',
    type: 'datetime',
    default: () => 'CURRENT_TIMESTAMP',
  })
  fechaHora!: Date;
}

export default IntentoAcceso;