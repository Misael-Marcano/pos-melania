import {
  Entity, PrimaryGeneratedColumn, Column,
  ManyToOne, OneToMany, JoinColumn, CreateDateColumn,
} from 'typeorm';
import { Tenant } from './Tenant.entity';
import { Venta }   from './Venta.entity';
import { Usuario } from './Usuario.entity';
import { DevolucionDetalle } from './DevolucionDetalle.entity';
import { MetodoPago } from '@pos/shared';

export type EstadoDevolucion = 'PENDIENTE' | 'APROBADA' | 'RECHAZADA';

@Entity('devoluciones')
export class Devolucion {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Tenant, { nullable: false, eager: false })
  @JoinColumn({ name: 'tenantId' })
  tenant: Tenant;

  @Column({ type: 'varchar', length: 20, default: 'PENDIENTE' })
  estado: EstadoDevolucion;

  @Column({ length: 200 })
  motivo: string;

  @Column({ nullable: true, length: 1000 })
  notas?: string;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  total: number;

  @Column({ type: 'varchar', length: 20, default: 'EFECTIVO' })
  metodoReembolso: MetodoPago;

  @ManyToOne(() => Venta, { eager: true })
  @JoinColumn({ name: 'ventaId' })
  venta: Venta;

  @ManyToOne(() => Usuario, { nullable: true, eager: true })
  @JoinColumn({ name: 'creadoPorId' })
  creadoPor?: Usuario;

  @ManyToOne(() => Usuario, { nullable: true, eager: true })
  @JoinColumn({ name: 'revisadoPorId' })
  revisadoPor?: Usuario;

  @OneToMany(() => DevolucionDetalle, (d) => d.devolucion, { cascade: true, eager: true })
  detalles: DevolucionDetalle[];

  @CreateDateColumn()
  createdAt: Date;
}
