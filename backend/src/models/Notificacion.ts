import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';

import { Usuario } from '../models/Usuario';

export enum TipoNotificacion {
  NUEVO_EVENTO = 'nuevo_evento',
  NUEVA_CAPACITACION = 'nueva_capacitacion',
  NUEVO_EMPRENDIMIENTO = 'nuevo_emprendimiento',
  NUEVO_COMUNICADO = 'nuevo_comunicado',

  // Notificaciones de reservas
  RESERVA_REALIZADA = 'reserva_realizada',
  NUEVA_RESERVA_ADMIN = 'nueva_reserva_admin',
  RESERVA_APROBADA = 'reserva_aprobada',
  RESERVA_RECHAZADA = 'reserva_rechazada',

  // Notificaciones de incidencias
  NUEVA_INCIDENCIA = 'nueva_incidencia',
  SEGUIMIENTO_INCIDENCIA = 'seguimiento_incidencia',
  INCIDENCIA_COMPARTIDA = 'incidencia_compartida',
}

export enum EstadoNotificacion {
  ACTIVA = 'activa',
  ELIMINADA = 'eliminada',
}

@Entity('notificaciones')
export class Notificacion {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Usuario, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'usuario_id' })
  usuario!: Usuario;

  @Column({
    type: 'int',
    name: 'usuario_id',
  })
  usuarioId!: number;

  @Column({
    type: 'enum',
    enum: TipoNotificacion,
  })
  tipo!: TipoNotificacion;

  @Column({
    type: 'varchar',
    length: 200,
  })
  titulo!: string;

  @Column({
    type: 'text',
  })
  mensaje!: string;

  @Column({
    type: 'boolean',
    default: false,
  })
  leida!: boolean;

  @Column({
    type: 'enum',
    enum: EstadoNotificacion,
    default: EstadoNotificacion.ACTIVA,
  })
  estado!: EstadoNotificacion;

  @Column({
    type: 'int',
    nullable: true,
    name: 'referencia_id',
  })
  referenciaId!: number | null;

  @Column({
    type: 'varchar',
    length: 50,
    nullable: true,
    name: 'referencia_tipo',
  })
  referenciaTipo!: string | null;

  @CreateDateColumn({
    name: 'created_at',
  })
  createdAt!: Date;

  constructor(params?: {
    id?: number;
    usuarioId?: number;
    tipo?: TipoNotificacion;
    titulo?: string;
    mensaje?: string;
    leida?: boolean;
    estado?: EstadoNotificacion;
    referenciaId?: number | null;
    referenciaTipo?: string | null;
  }) {
    if (!params) return;

    if (params.id !== undefined) {
      this.id = params.id;
    }

    if (params.usuarioId !== undefined) {
      this.usuarioId = params.usuarioId;
    }

    if (params.tipo !== undefined) {
      this.tipo = params.tipo;
    }

    if (params.titulo !== undefined) {
      this.titulo = params.titulo;
    }

    if (params.mensaje !== undefined) {
      this.mensaje = params.mensaje;
    }

    if (params.leida !== undefined) {
      this.leida = params.leida;
    }

    if (params.estado !== undefined) {
      this.estado = params.estado;
    }

    if (params.referenciaId !== undefined) {
      this.referenciaId = params.referenciaId;
    }

    if (params.referenciaTipo !== undefined) {
      this.referenciaTipo = params.referenciaTipo;
    }
  }

  toPublic() {
    return {
      id: this.id,
      usuarioId: this.usuarioId,
      tipo: this.tipo,
      titulo: this.titulo,
      mensaje: this.mensaje,
      leida: this.leida,
      estado: this.estado,
      referenciaId: this.referenciaId,
      referenciaTipo: this.referenciaTipo,
      createdAt: this.createdAt,
    };
  }
}
