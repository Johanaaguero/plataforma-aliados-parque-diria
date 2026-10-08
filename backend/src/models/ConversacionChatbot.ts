import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Usuario } from './Usuario';

export enum EstadoConversacionChatbot {
  RESUELTA = 'RESUELTA',
  DERIVADA_ADMIN = 'DERIVADA_ADMIN',
  EN_PROCESO = 'EN_PROCESO',
}

@Entity('conversaciones_chatbot')
export class ConversacionChatbot {
  @PrimaryGeneratedColumn()
  id!: number;

  // Usuario/visitante que realizó la consulta
  @ManyToOne(() => Usuario, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'usuario_id' })
  usuario!: Usuario | null;

  // Administrador que atiende la consulta cuando es derivada
  @ManyToOne(() => Usuario, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'administrador_id' })
  administrador!: Usuario | null;

  @Column({
    type: 'text',
    name: 'mensaje_usuario',
  })
  mensajeUsuario!: string;

  @Column({
    type: 'text',
    name: 'respuesta_chatbot',
  })
  respuestaChatbot!: string;

  @Column({
    type: 'enum',
    enum: EstadoConversacionChatbot,
    default: EstadoConversacionChatbot.EN_PROCESO,
  })
  estado!: EstadoConversacionChatbot;

  // Momento en que se registró la consulta
  @Column({
    type: 'datetime',
    name: 'fecha_registro',
    default: () => 'CURRENT_TIMESTAMP',
  })
  fechaRegistro!: Date;

  @CreateDateColumn({
    name: 'created_at',
  })
  createdAt!: Date;

  @UpdateDateColumn({
    name: 'updated_at',
  })
  updatedAt!: Date;

  constructor(params?: {
    id?: number;
    usuario?: Usuario | null;
    administrador?: Usuario | null;
    mensajeUsuario?: string;
    respuestaChatbot?: string;
    estado?: EstadoConversacionChatbot;
    fechaRegistro?: Date;
  }) {
    if (!params) return;

    if (params.id !== undefined) this.id = params.id;
    if (params.usuario !== undefined) this.usuario = params.usuario;
    if (params.administrador !== undefined) {
      this.administrador = params.administrador;
    }
    if (params.mensajeUsuario !== undefined) {
      this.mensajeUsuario = params.mensajeUsuario;
    }
    if (params.respuestaChatbot !== undefined) {
      this.respuestaChatbot = params.respuestaChatbot;
    }
    if (params.estado !== undefined) {
      this.estado = params.estado;
    }
    if (params.fechaRegistro !== undefined) {
      this.fechaRegistro = params.fechaRegistro;
    }
  }
}