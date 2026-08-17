import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('token_blacklist')
export class TokenBlacklist {
  @PrimaryGeneratedColumn()
  id!: number;

  @Index()
  @Column({ type: 'varchar', length: 512 })
  token!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  motivo!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @Column({ type: 'datetime', nullable: true })
  expiracion!: Date | null;
}

export default TokenBlacklist;