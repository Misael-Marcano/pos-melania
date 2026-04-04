import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn,
} from 'typeorm';
import { Venta } from './Venta.entity';
import { Articulo } from './Articulo.entity';

@Entity('venta_detalles')
export class VentaDetalle {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  cantidad: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  precioUnitario: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  descuento: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  total: number;

  @ManyToOne(() => Venta, (v) => v.detalles, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ventaId' })
  venta: Venta;

  @ManyToOne(() => Articulo, (a) => a.ventaDetalles, { eager: true })
  @JoinColumn({ name: 'articuloId' })
  articulo: Articulo;
}
