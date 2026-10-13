import { Column, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

export type EpocaParque = 'seca' | 'lluviosa';

@Entity('configuracion_visual')
export class ConfiguracionVisual {
  @PrimaryColumn({ type: 'tinyint', default: 1 }) id!: number;
  @Column({ type: 'enum', enum: ['seca', 'lluviosa'], default: 'seca' }) epoca!: EpocaParque;
  @Column({ name: 'hero_imagenes', type: 'json', nullable: true }) heroImagenes!: string[] | null;
  @Column({ name: 'hero_leyendas', type: 'json', nullable: true }) heroLeyendas!: string[] | null;
  @Column({ name: 'hero_titulo', type: 'varchar', length: 180, nullable: true }) heroTitulo!: string | null;
  @Column({ name: 'hero_eslogan', type: 'varchar', length: 280, nullable: true }) heroEslogan!: string | null;
  @Column({ name: 'sobre_imagen', type: 'varchar', length: 500, nullable: true }) sobreImagen!: string | null;
  @Column({ name: 'galeria_imagenes', type: 'json', nullable: true }) galeriaImagenes!: string[] | null;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt!: Date;
}
