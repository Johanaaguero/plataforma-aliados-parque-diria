
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';

import { Usuario } from '../models/Usuario';

export enum TipoReporte {
  USUARIOS = 'usuarios',
  RESERVAS = 'reservas',
  EMPRENDIMIENTOS = 'emprendimientos',
  EVENTOS = 'eventos',
  INCIDENCIAS = 'incidencias',
}

@Entity('reportes')
export class Reporte {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({
    name: 'numero_reporte',
    type: 'varchar',
    length: 30,
    unique: true,
  })
  numeroReporte!: string;

  @Column({
    name: 'tipo_reporte',
    type: 'enum',
    enum: TipoReporte,
  })
  tipoReporte!: TipoReporte;

  @CreateDateColumn({
    name: 'fecha_generacion',
    type: 'datetime',
  })
  fechaGeneracion!: Date;

  @ManyToOne(() => Usuario, {
    nullable: false,
    eager: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({
    name: 'usuario_genero_id',
  })
  usuarioGenero!: Usuario;

  @Column({ type: 'json', nullable: true })
  contenido?: Record<string, unknown> | null;

  constructor(params?: {
    id?: number;
    numeroReporte?: string;
    tipoReporte?: TipoReporte;
    usuarioGenero?: Usuario;
    usuarioGeneroId?: number;
    contenido?: Record<string, unknown> | null;
  }) {
    if (!params) return;

    if (params.id !== undefined) {
      this.id = params.id;
    }

    if (params.numeroReporte !== undefined) {
      this.numeroReporte = params.numeroReporte;
    }

    if (params.tipoReporte !== undefined) {
      this.tipoReporte = params.tipoReporte;
    }

    if (params.usuarioGenero !== undefined) {
      this.usuarioGenero = params.usuarioGenero;
    } else if (params.usuarioGeneroId !== undefined) {
      this.usuarioGenero = {
        id: params.usuarioGeneroId,
      } as Usuario;
    }

    if (params.contenido !== undefined) {
      this.contenido = params.contenido;
    }
  }
}
