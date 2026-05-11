import {
  Entity, PrimaryGeneratedColumn, Column,
  ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn,
} from 'typeorm';
import { Tienda } from './Tienda.entity';

@Entity('cajas')
export class Caja {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 100 })
  nombre: string;

  @ManyToOne(() => Tienda, { nullable: false, eager: false })
  @JoinColumn({ name: 'tiendaId' })
  tienda: Tienda;

  @Column({ default: true })
  activo: boolean;

  @Column({ type: 'nvarchar', length: 'max', nullable: true })
  notas?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
