import {
  Entity, PrimaryGeneratedColumn, Column, UpdateDateColumn, ManyToOne, JoinColumn,
} from 'typeorm';
import { TipoComprobante } from '@pos/shared';
import { Tenant } from './Tenant.entity';

@Entity('comprobantes')
export class Comprobante {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Tenant, { nullable: false, eager: false })
  @JoinColumn({ name: 'tenantId' })
  tenant: Tenant;

  @Column({ length: 100 })
  descripcion: string;

  @Column({ length: 5, default: 'B' })
  series: string;

  @Column({ type: 'varchar', length: 2 })
  tipo: TipoComprobante;

  @Column({ length: 20 })
  desde: string;

  @Column({ length: 20 })
  hasta: string;

  @Column({ length: 20 })
  secuenciaActual: string;

  @Column({ default: true })
  activo: boolean;

  @UpdateDateColumn()
  updatedAt: Date;
}
