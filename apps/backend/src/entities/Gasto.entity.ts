import {
  Entity, PrimaryGeneratedColumn, Column,
  ManyToOne, CreateDateColumn, JoinColumn,
} from 'typeorm';
import { Usuario } from './Usuario.entity';

@Entity('gastos')
export class Gasto {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 200 })
  escribe: string;

  @Column({ length: 500, nullable: true })
  descripcion?: string;

  @Column({ length: 100 })
  categoria: string;

  @Column({ type: 'date' })
  fecha: Date;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  cantidad: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  impuesto: number;

  @Column({ length: 200, nullable: true })
  nombreRecipiente?: string;

  @ManyToOne(() => Usuario, { eager: false })
  @JoinColumn({ name: 'aprobadoPorId' })
  aprobadoPor: Usuario;

  @CreateDateColumn()
  createdAt: Date;
}
