import {
  Entity, PrimaryGeneratedColumn, Column,
  OneToMany, CreateDateColumn,
} from 'typeorm';
import { KitDetalle } from './KitDetalle.entity';

@Entity('kits')
export class Kit {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 200 })
  nombre: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  precio: number;

  @Column({ nullable: true, length: 500 })
  descripcion?: string;

  @Column({ default: true })
  activo: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @OneToMany(() => KitDetalle, (k) => k.kit, { cascade: true, eager: true })
  detalles: KitDetalle[];
}
