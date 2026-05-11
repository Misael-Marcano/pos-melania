import {
  Entity, PrimaryGeneratedColumn, Column,
  ManyToOne, CreateDateColumn, UpdateDateColumn, JoinColumn,
} from 'typeorm';
import { Usuario } from './Usuario.entity';
import { Tenant } from './Tenant.entity';

export type EstadoTarjeta = 'ACTIVA' | 'AGOTADA' | 'VENCIDA' | 'CANCELADA';

export interface MovimientoTarjeta {
  tipo:   'CREACION' | 'RECARGA' | 'USO' | 'CANCELACION';
  monto:  number;
  fecha:  string;
  notas?: string;
}

@Entity('tarjetas_regalo')
export class TarjetaRegalo {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Tenant, { nullable: false, eager: false })
  @JoinColumn({ name: 'tenantId' })
  tenant: Tenant;

  @Column({ length: 20 })
  codigo: string;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  saldoInicial: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  saldoActual: number;

  @Column({ length: 20, default: 'ACTIVA' })
  estado: EstadoTarjeta;

  @Column({ type: 'date', nullable: true })
  fechaVencimiento?: Date | null;

  @Column({ length: 500, nullable: true })
  notas?: string;

  @Column({ type: 'nvarchar', length: 'max', nullable: true })
  movimientosJson?: string;

  @ManyToOne(() => Usuario, { eager: false, nullable: true })
  @JoinColumn({ name: 'creadoPorId' })
  creadoPor?: Usuario;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
