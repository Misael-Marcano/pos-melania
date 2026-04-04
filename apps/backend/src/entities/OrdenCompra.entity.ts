import {
  Entity, PrimaryGeneratedColumn, Column,
  ManyToOne, OneToMany, JoinColumn, CreateDateColumn, UpdateDateColumn,
} from 'typeorm';
import { Proveedor } from './Proveedor.entity';
import { Usuario } from './Usuario.entity';
import { OrdenCompraDetalle } from './OrdenCompraDetalle.entity';

export type EstadoOrden = 'BORRADOR' | 'ENVIADA' | 'RECIBIDA' | 'CANCELADA';

@Entity('ordenes_compra')
export class OrdenCompra {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 20, default: 'BORRADOR' })
  estado: EstadoOrden;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  total: number;

  @Column({ nullable: true, length: 1000 })
  notas?: string;

  @Column({ type: 'date', nullable: true })
  fechaEsperada?: string;

  @Column({ type: 'datetime2', nullable: true })
  fechaRecibida?: Date;

  @ManyToOne(() => Proveedor, { nullable: true, eager: true })
  @JoinColumn({ name: 'proveedorId' })
  proveedor?: Proveedor;

  @ManyToOne(() => Usuario, { nullable: true, eager: true })
  @JoinColumn({ name: 'usuarioId' })
  creadoPor?: Usuario;

  @OneToMany(() => OrdenCompraDetalle, (d) => d.orden, { cascade: true, eager: true })
  detalles: OrdenCompraDetalle[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
