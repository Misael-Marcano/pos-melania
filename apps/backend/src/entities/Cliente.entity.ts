import {
  Entity, PrimaryGeneratedColumn, Column,
  OneToMany, CreateDateColumn, UpdateDateColumn,
  ManyToOne, JoinColumn,
} from 'typeorm';
import { Venta } from './Venta.entity';
import { Tenant } from './Tenant.entity';

@Entity('clientes')
export class Cliente {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Tenant, { nullable: false, eager: false })
  @JoinColumn({ name: 'tenantId' })
  tenant: Tenant;

  @Column({ length: 200 })
  nombre: string;

  @Column({ length: 200, nullable: true })
  compania?: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  tipoIdentificacion?: 'CEDULA' | 'RNC' | 'PASAPORTE';

  @Column({ length: 30, nullable: true })
  numeroIdentificacion?: string;

  @Column({ length: 200, nullable: true })
  correo?: string;

  @Column({ length: 20, nullable: true })
  telefono?: string;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  saldo: number;

  /** 0 = sin límite */
  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  limiteCredito: number;

  /** Descuento automático en % aplicado en POS al seleccionar este cliente (0 = sin descuento) */
  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  descuentoCliente: number;

  @Column({ default: true })
  activo: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => Venta, (v) => v.cliente)
  ventas: Venta[];
}
