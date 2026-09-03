import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { EventosCapacitaciones } from './EventosCapacitaciones';

@Entity('eventos_capacitaciones_imagenes')
export class EventoCapacitacionImagen {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({
    type: 'longblob',
  })
  imagen!: Buffer;

  @Column({
    type: 'varchar',
    length: 100,
    name: 'tipo_mime',
  })
  tipoMime!: string;

  @Column({
    type: 'varchar',
    length: 255,
    name: 'nombre_archivo',
    nullable: true,
  })
  nombreArchivo?: string | null;

  @Column({
    type: 'int',
    name: 'tamano_bytes',
    nullable: true,
  })
  tamanoBytes?: number | null;

  @Index('IDX_eventos_capacitaciones_imagenes_evento')
  @Column({
    type: 'int',
    name: 'evento_capacitacion_id',
  })
  eventoCapacitacionId!: number;

  @ManyToOne(
    () => EventosCapacitaciones,
    (evento) => evento.imagenes,
    {
      onDelete: 'CASCADE',
    },
  )
  @JoinColumn({
    name: 'evento_capacitacion_id',
  })
  eventoCapacitacion!: EventosCapacitaciones;

  @CreateDateColumn({
    name: 'fecha_creacion',
  })
  fechaCreacion!: Date;
}