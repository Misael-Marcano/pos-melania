import {
  Entity, PrimaryGeneratedColumn, Column,
  ManyToOne, OneToMany, CreateDateColumn, UpdateDateColumn, JoinColumn,
} from 'typeorm';
import { Categoria } from './Categoria.entity';
import { Tenant } from './Tenant.entity';
import { VentaDetalle } from './VentaDetalle.entity';
import { KitDetalle } from './KitDetalle.entity';

@Entity('articulos')
export class Articulo {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Tenant, { nullable: false, eager: false })
  @JoinColumn({ name: 'tenantId' })
  tenant: Tenant;

  @Column({ length: 50 })
  codigoBarras: string;

  @Column({ length: 200 })
  nombre: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  costo: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  precioVenta: number;

  @Column({ type: 'int', nullable: true })
  cantidad?: number;

  @Column({ length: 50, nullable: true })
  tamanio?: string;

  /** Unidad de medida de venta/stock (ej. und, kg, lb, ml) — opcional */
  @Column({ type: 'varchar', length: 20, nullable: true })
  unidadMedida: string | null;

  @Column({ nullable: true, length: 500 })
  foto?: string;

  @Column({ default: true })
  activo: boolean;

  @ManyToOne(() => Categoria, (cat) => cat.articulos, { eager: true })
  categoria: Categoria;

  @OneToMany(() => VentaDetalle, (d) => d.articulo)
  ventaDetalles: VentaDetalle[];

  @OneToMany(() => KitDetalle, (k) => k.articulo)
  kitDetalles: KitDetalle[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
