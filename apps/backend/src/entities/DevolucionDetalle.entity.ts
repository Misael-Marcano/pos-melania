import {
  Entity, PrimaryGeneratedColumn, Column,
  ManyToOne, JoinColumn,
} from 'typeorm';
import { Devolucion } from './Devolucion.entity';
import { Articulo }   from './Articulo.entity';

@Entity('devolucion_detalles')
export class DevolucionDetalle {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  cantidad: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  precioUnitario: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  total: number;

  @Column({ default: true })
  regresaAInventario: boolean;

  @ManyToOne(() => Devolucion, (d) => d.detalles, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'devolucionId' })
  devolucion: Devolucion;

  @ManyToOne(() => Articulo, { eager: true })
  @JoinColumn({ name: 'articuloId' })
  articulo: Articulo;
}
