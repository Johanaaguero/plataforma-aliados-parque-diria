import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';

import { EventoCapacitacionImagen } from './EventoCapacitacionImagen';
import { serializarFechaCalendario, serializarFechaUtc } from '../utils/fechas';

export enum TipoActividad {
  EVENTO = 'evento',
  CAPACITACION = 'capacitacion',
}

export enum EstadoEventoCapacitacion {
  BORRADOR = 'borrador',
  PUBLICADO = 'publicado',
  NO_PUBLICADO = 'no_publicado',
  DESACTIVADO = 'desactivado',
}

export enum Temporada {
  SECA = 'seca',
  LLUVIOSA = 'lluviosa',
}

@Entity('eventos_capacitaciones')
export class EventosCapacitaciones {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({
    type: 'varchar',
    length: 150,
    nullable: true,
  })
  nombre!: string | null;

  @Column({
    type: 'text',
    nullable: true,
  })
  descripcion!: string | null;

  @Column({
    type: 'date',
    nullable: true,
  })
  fecha!: string | null;

  @Column({
    type: 'time',
    nullable: true,
  })
  hora!: string | null;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  lugar!: string | null;

  @Column({
    type: 'enum',
    enum: TipoActividad,
    name: 'tipo_actividad',
  })
  tipoActividad!: TipoActividad;

  @Column({
    type: 'int',
    nullable: true,
    name: 'cupo_maximo',
  })
  cupoMaximo!: number | null;

  @Column({
    type: 'int',
    nullable: true,
    name: 'cupos_disponibles',
  })
  cuposDisponibles!: number | null;

  @Column({
    type: 'int',
    nullable: true,
    name: 'cupo_minimo',
  })
  cupoMinimo!: number | null;

  @Column({
    type: 'int',
    nullable: true,
    name: 'edad_minima',
  })
  edadMinima!: number | null;

  @Column({
    type: 'int',
    nullable: true,
    name: 'edad_maxima',
  })
  edadMaxima!: number | null;

  @Column({
    type: 'enum',
    enum: EstadoEventoCapacitacion,
    default: EstadoEventoCapacitacion.BORRADOR,
  })
  estado!: EstadoEventoCapacitacion;

  @Column({
    type: 'enum',
    enum: Temporada,
    nullable: true,
  })
  temporada!: Temporada | null;

  @OneToMany(
    () => EventoCapacitacionImagen,
    (imagen) => imagen.eventoCapacitacion,
  )
  imagenes!: EventoCapacitacionImagen[];

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
    nombre?: string | null;
    descripcion?: string | null;
    fecha?: string | null;
    hora?: string | null;
    lugar?: string | null;
    tipoActividad?: TipoActividad;
    cupoMaximo?: number | null;
    cuposDisponibles?: number | null;
    cupoMinimo?: number | null;
    edadMinima?: number | null;
    edadMaxima?: number | null;
    estado?: EstadoEventoCapacitacion;
    temporada?: Temporada | null;
  }) {
    if (!params) return;

    if (params.id !== undefined) {
      this.id = params.id;
    }

    if (params.nombre !== undefined) {
      this.nombre = params.nombre;
    }

    if (params.descripcion !== undefined) {
      this.descripcion = params.descripcion;
    }

    if (params.fecha !== undefined) {
      this.fecha = params.fecha;
    }

    if (params.hora !== undefined) {
      this.hora = params.hora;
    }

    if (params.lugar !== undefined) {
      this.lugar = params.lugar;
    }

    if (params.tipoActividad !== undefined) {
      this.tipoActividad =
        params.tipoActividad;
    }

    if (params.cupoMaximo !== undefined) {
      this.cupoMaximo =
        params.cupoMaximo;
    }

    if (
      params.cuposDisponibles !== undefined
    ) {
      this.cuposDisponibles =
        params.cuposDisponibles;
    }

    if (params.cupoMinimo !== undefined) {
      this.cupoMinimo =
        params.cupoMinimo;
    }

    if (params.edadMinima !== undefined) {
      this.edadMinima =
        params.edadMinima;
    }

    if (params.edadMaxima !== undefined) {
      this.edadMaxima =
        params.edadMaxima;
    }

    if (params.estado !== undefined) {
      this.estado = params.estado;
    }

    if (params.temporada !== undefined) {
      this.temporada = params.temporada;
    }
  }

  toPublic() {
    return {
      id: this.id,
      nombre: this.nombre,
      descripcion: this.descripcion,
      fecha: serializarFechaCalendario(this.fecha),
      hora: this.hora,
      lugar: this.lugar,
      tipoActividad: this.tipoActividad,
      cupoMaximo: this.cupoMaximo,
      cuposDisponibles:
        this.cuposDisponibles ??
        this.cupoMaximo,
      cupoMinimo: this.cupoMinimo,
      edadMinima: this.edadMinima,
      edadMaxima: this.edadMaxima,
      estado: this.estado,
      temporada: this.temporada,
      createdAt: serializarFechaUtc(this.createdAt),
      updatedAt: serializarFechaUtc(this.updatedAt),
    };
  }
}
