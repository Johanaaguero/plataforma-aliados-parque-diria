import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';

import { Incidencia } from './Incidencia';

export enum TipoEvidenciaIncidencia {
  FOTO = 'foto',
  VIDEO = 'video',
}

@Entity('incidencias_evidencias')
export class IncidenciaEvidencia {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({
    type: 'longblob',
  })
  archivo!: Buffer;

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

  @Column({
    type: 'enum',
    enum: TipoEvidenciaIncidencia,
  })
  tipo!: TipoEvidenciaIncidencia;

  @Index('IDX_INCIDENCIAS_EVIDENCIAS_INCIDENCIA')
  @Column({
    type: 'int',
    name: 'incidencia_id',
  })
  incidenciaId!: number;

  @ManyToOne(
    () => Incidencia,
    (incidencia) => incidencia.evidencias,
    {
      onDelete: 'CASCADE',
    },
  )
  @JoinColumn({
    name: 'incidencia_id',
  })
  incidencia!: Incidencia;

  @CreateDateColumn({
    name: 'fecha_creacion',
  })
  fechaCreacion!: Date;
}