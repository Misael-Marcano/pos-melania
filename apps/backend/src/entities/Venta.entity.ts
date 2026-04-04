import {
  Entity, PrimaryGeneratedColumn, Column,
  ManyToOne, OneToMany, CreateDateColumn, JoinColumn,
} from 'typeorm';
import { Cliente } from './Cliente.entity';
import { Usuario } from './Usuario.entity';
import { VentaDetalle } from './VentaDetalle.entity';
import { MetodoPago } from '@pos/shared';

@Entity('ventas')
export class Venta {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  subtotal: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  descuento: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  impuesto: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  total: number;

  @Column({ type: 'varchar', length: 20, default: 'EFECTIVO' })
  metodoPago: MetodoPago;

  @Column({ type: 'nvarchar', nullable: true })
  metodosPago?: string; // JSON: [{metodo, monto}]

  @Column({ nullable: true, length: 30 })
  comprobante?: string;

  @Column({ nullable: true, length: 500 })
  notas?: string;

  @CreateDateColumn()
  fecha: Date;

  @ManyToOne(() => Cliente, (c) => c.ventas, { nullable: true, eager: false })
  @JoinColumn({ name: 'clienteId' })
  cliente?: Cliente;

  @ManyToOne(() => Usuario, { eager: false })
  @JoinColumn({ name: 'usuarioId' })
  usuario: Usuario;

  @OneToMany(() => VentaDetalle, (d) => d.venta, { cascade: true, eager: true })
  detalles: VentaDetalle[];
}
