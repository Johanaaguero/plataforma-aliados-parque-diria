import {Column, CreateDateColumn,Entity, PrimaryGeneratedColumn, UpdateDateColumn,} from 'typeorm';

@Entity('preguntas_frecuentes')
export class PreguntasFrecuentes {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'text' })
  pregunta!: string;

  @Column({ type: 'text' })
  respuesta!: string;

  @Column({ type: 'json', name: 'palabras_clave' })
  palabrasClave!: string[];

  @CreateDateColumn({
    name: 'created_at',
    type: 'datetime',
    precision: 6,
  })
  createdAt!: Date;

  @UpdateDateColumn({
    name: 'updated_at',
    type: 'datetime',
    precision: 6,
  })
  updatedAt!: Date;
}
