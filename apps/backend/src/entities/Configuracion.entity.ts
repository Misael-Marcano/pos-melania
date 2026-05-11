import { Entity, PrimaryGeneratedColumn, Column, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Tenant } from './Tenant.entity';
import { Tienda } from './Tienda.entity';
import { Caja } from './Caja.entity';

@Entity('configuracion')
export class Configuracion {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Tenant, { nullable: false, eager: false })
  @JoinColumn({ name: 'tenantId' })
  tenant: Tenant;

  @Column({ length: 200 })
  nombreCompania: string;

  @Column({ length: 20, nullable: true })
  rnc?: string;

  @Column({ length: 300, nullable: true })
  direccion?: string;

  @Column({ length: 30, nullable: true })
  telefono?: string;

  @Column({ length: 200, nullable: true })
  sitioWeb?: string;

  @Column({ length: 10, default: 'RDS' })
  simboloMoneda: string;

  @Column({ type: 'int', default: 2 })
  numeroDecimales: number;

  @Column({ default: true })
  preciosIncluyenImpuesto: boolean;

  @Column({ length: 50, nullable: true })
  tasaImpuesto1Nombre?: string;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  tasaImpuesto1: number;

  @Column({ length: 50, nullable: true })
  tasaImpuesto2Nombre?: string;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  tasaImpuesto2: number;

  @Column({ nullable: true, length: 500 })
  logotipoUrl?: string;

  /** Texto opcional bajo el pie estándar del recibo (políticas, horario, etc.) */
  @Column({ type: 'nvarchar', length: 'max', nullable: true })
  textoPieRecibo?: string;

  @Column({ length: 10, default: '02' })
  comprobanteDefecto: string;

  /**
   * Si está definido, tiene prioridad sobre `FISCAL_JURISDICTION` del `.env` al emitir NCF.
   * Valores típicos: DO (DGII), NONE (sin comprobante fiscal). NULL = usar solo variable de entorno.
   */
  @Column({ type: 'varchar', length: 16, nullable: true })
  fiscalJurisdiccion?: string;

  @Column({ length: 100, default: 'CAJA 1' })
  nombreCaja: string;

  @ManyToOne(() => Tienda, { nullable: true, eager: false })
  @JoinColumn({ name: 'tiendaId' })
  tienda?: Tienda | null;

  /** Caja del catálogo usada en este punto de venta */
  @ManyToOne(() => Caja, { nullable: true, eager: false })
  @JoinColumn({ name: 'cajaId' })
  caja?: Caja | null;

  @UpdateDateColumn()
  updatedAt: Date;
}
