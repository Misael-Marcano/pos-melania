import {
  Entity, PrimaryGeneratedColumn, Column,
  ManyToOne, JoinColumn,
} from 'typeorm';
import { OrdenCompra } from './OrdenCompra.entity';
import { Articulo } from './Articulo.entity';

@Entity('orden_compra_detalles')
export class OrdenCompraDetalle {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  cantidad: number;

  @Column({ type: 'int', default: 0 })
  cantidadRecibida: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  costoUnitario: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  total: number;

  @ManyToOne(() => OrdenCompra, (o) => o.detalles, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ordenId' })
  orden: OrdenCompra;

  @ManyToOne(() => Articulo, { eager: true })
  @JoinColumn({ name: 'articuloId' })
  articulo: Articulo;
}
