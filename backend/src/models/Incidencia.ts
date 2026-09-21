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

import { Usuario } from './Usuario';
import { IncidenciaEvidencia } from './IncidenciaEvidencia';

export enum CategoriaIncidencia {
  SEGURIDAD = 'seguridad',
  INCENDIO = 'incendio',
  FLORA_FAUNA = 'flora_fauna',
  AMBIENTAL = 'ambiental',
  INFRAESTRUCTURA = 'infraestructura',
  SENDEROS = 'senderos',
  SERVICIOS = 'servicios',
  OTRO = 'otro',
}

export enum PrioridadIncidencia {
  BAJA = 'baja',
  MEDIA = 'media',
  ALTA = 'alta',
  CRITICA = 'critica',
}

export enum EstadoIncidencia {
  PENDIENTE = 'pendiente',
  EN_REVISION = 'en_revision',
  EN_PROCESO = 'en_proceso',
  RESUELTA = 'resuelta',
  RECHAZADA = 'rechazada',
  CERRADA = 'cerrada',
}

@Entity('incidencias')
export class Incidencia {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({
    type: 'varchar',
    length: 150,
  })
  titulo!: string;

  @Column({
    type: 'text',
  })
  descripcion!: string;

  @Index('IDX_INCIDENCIAS_CATEGORIA')
  @Column({
    type: 'enum',
    enum: CategoriaIncidencia,
  })
  categoria!: CategoriaIncidencia;

  @Index('IDX_INCIDENCIAS_PRIORIDAD')
  @Column({
    type: 'enum',
    enum: PrioridadIncidencia,
  })
  prioridad!: PrioridadIncidencia;

  @Index('IDX_INCIDENCIAS_ESTADO')
  @Column({
    type: 'enum',
    enum: EstadoIncidencia,
    default: EstadoIncidencia.PENDIENTE,
  })
  estado!: EstadoIncidencia;

  // Usuario que reportó la incidencia.
  // Puede ser null cuando el reporte es anónimo.
  @Index('IDX_INCIDENCIAS_USUARIO_REPORTA')
  @ManyToOne(() => Usuario, {
    nullable: true,
    eager: false,
  })
  @JoinColumn({ name: 'usuario_reporta_id' })
  usuarioReporta?: Usuario | null;

  // Administrador que realizó el último cambio de estado.
  @Index('IDX_INCIDENCIAS_ADMIN_ACTUALIZA')
  @ManyToOne(() => Usuario, {
    nullable: true,
    eager: false,
  })
  @JoinColumn({ name: 'admin_actualiza_id' })
  adminActualiza?: Usuario | null;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  ubicacion?: string | null;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 8,
    nullable: true,
  })
  latitud?: number | null;

  @Column({
    type: 'decimal',
    precision: 11,
    scale: 8,
    nullable: true,
  })
  longitud?: number | null;

  @Column({
    type: 'text',
    nullable: true,
    name: 'observaciones_admin',
  })
  observacionesAdmin?: string | null;

  @Column({
    type: 'datetime',
    nullable: true,
    name: 'fecha_resolucion',
  })
  fechaResolucion?: Date | null;

  @OneToMany(
    () => IncidenciaEvidencia,
    (evidencia) => evidencia.incidencia,
  )
  evidencias!: IncidenciaEvidencia[];

  @CreateDateColumn({
    name: 'fecha_registro',
  })
  fechaRegistro!: Date;

  @UpdateDateColumn({
    name: 'fecha_actualizacion',
  })
  fechaActualizacion!: Date;

  constructor(params?: {
    id?: number;
    titulo?: string;
    descripcion?: string;
    categoria?: CategoriaIncidencia;
    prioridad?: PrioridadIncidencia;
    estado?: EstadoIncidencia;
    usuarioReporta?: Usuario | null;
    adminActualiza?: Usuario | null;
    ubicacion?: string | null;
    latitud?: number | null;
    longitud?: number | null;
    observacionesAdmin?: string | null;
    fechaResolucion?: Date | null;
  }) {
    if (!params) return;

    if (params.id !== undefined) {
      this.id = params.id;
    }

    if (params.titulo !== undefined) {
      this.titulo = params.titulo;
    }

    if (params.descripcion !== undefined) {
      this.descripcion = params.descripcion;
    }

    if (params.categoria !== undefined) {
      this.categoria = params.categoria;
    }

    if (params.prioridad !== undefined) {
      this.prioridad = params.prioridad;
    }

    if (params.estado !== undefined) {
      this.estado = params.estado;
    }

    if (params.usuarioReporta !== undefined) {
      this.usuarioReporta = params.usuarioReporta;
    }

    if (params.adminActualiza !== undefined) {
      this.adminActualiza = params.adminActualiza;
    }

    if (params.ubicacion !== undefined) {
      this.ubicacion = params.ubicacion;
    }

    if (params.latitud !== undefined) {
      this.latitud = params.latitud;
    }

    if (params.longitud !== undefined) {
      this.longitud = params.longitud;
    }

    if (params.observacionesAdmin !== undefined) {
      this.observacionesAdmin = params.observacionesAdmin;
    }

    if (params.fechaResolucion !== undefined) {
      this.fechaResolucion = params.fechaResolucion;
    }
  }
}