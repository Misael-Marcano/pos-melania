import {
  Entity, PrimaryGeneratedColumn, Column,
  ManyToOne, OneToMany, CreateDateColumn, JoinColumn,
} from 'typeorm';
import { Cliente } from './Cliente.entity';
import { Usuario } from './Usuario.entity';
import { VentaDetalle } from './VentaDetalle.entity';
import { CajaApertura } from './CajaApertura.entity';
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

  /** Monto en efectivo entregado por el cliente (solo pago EFECTIVO) */
  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  efectivoRecibido?: number | null;

  /** Vuelto entregado al cliente */
  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  cambio?: number | null;

  /** ¿Es una venta con entrega a domicilio? */
  @Column({ type: 'bit', default: false })
  esDelivery: boolean;

  /** Costo del delivery cobrado al cliente (incluido en `total`) */
  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  deliveryCargo: number;

  /** Dirección o zona de entrega */
  @Column({ type: 'nvarchar', length: 300, nullable: true })
  deliveryDireccion?: string | null;

  @CreateDateColumn()
  fecha: Date;

  @ManyToOne(() => Cliente, (c) => c.ventas, { nullable: true, eager: false })
  @JoinColumn({ name: 'clienteId' })
  cliente?: Cliente;

  @ManyToOne(() => Usuario, { eager: false })
  @JoinColumn({ name: 'usuarioId' })
  usuario: Usuario;

  @ManyToOne(() => CajaApertura, { eager: false, nullable: true })
  @JoinColumn({ name: 'cajaAperturaId' })
  cajaApertura?: CajaApertura;

  @OneToMany(() => VentaDetalle, (d) => d.venta, { cascade: true, eager: true })
  detalles: VentaDetalle[];
}
