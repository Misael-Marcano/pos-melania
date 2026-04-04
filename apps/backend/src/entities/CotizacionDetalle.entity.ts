import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn,
} from 'typeorm';
import { Cotizacion } from './Cotizacion.entity';
import { Articulo }   from './Articulo.entity';

@Entity('cotizacion_detalles')
export class CotizacionDetalle {
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

  @ManyToOne(() => Cotizacion, (c) => c.detalles, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'cotizacionId' })
  cotizacion: Cotizacion;

  @ManyToOne(() => Articulo, { eager: true })
  @JoinColumn({ name: 'articuloId' })
  articulo: Articulo;
}
