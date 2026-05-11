import {
  Entity, PrimaryGeneratedColumn, Column,
  ManyToOne, OneToMany, CreateDateColumn, UpdateDateColumn, JoinColumn,
} from 'typeorm';
import { Cliente }  from './Cliente.entity';
import { Usuario }  from './Usuario.entity';
import { Tenant } from './Tenant.entity';
import { CotizacionDetalle } from './CotizacionDetalle.entity';

export type EstadoCotizacion = 'BORRADOR' | 'ENVIADA' | 'ACEPTADA' | 'RECHAZADA' | 'VENCIDA';

@Entity('cotizaciones')
export class Cotizacion {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Tenant, { nullable: false, eager: false })
  @JoinColumn({ name: 'tenantId' })
  tenant: Tenant;

  @Column({ type: 'varchar', length: 20, default: 'BORRADOR' })
  estado: EstadoCotizacion;

  @Column({ nullable: true, length: 500 })
  notas?: string;

  @Column({ type: 'int', default: 30 })
  validezDias: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  subtotal: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  descuento: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  total: number;

  @ManyToOne(() => Cliente, { nullable: true, eager: false })
  @JoinColumn({ name: 'clienteId' })
  cliente?: Cliente;

  @ManyToOne(() => Usuario, { nullable: false, eager: false })
  @JoinColumn({ name: 'creadoPorId' })
  creadoPor: Usuario;

  @OneToMany(() => CotizacionDetalle, (d) => d.cotizacion, { cascade: true, eager: true })
  detalles: CotizacionDetalle[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
