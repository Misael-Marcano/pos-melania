import { Entity, PrimaryGeneratedColumn, Column, UpdateDateColumn } from 'typeorm';

@Entity('configuracion')
export class Configuracion {
  @PrimaryGeneratedColumn()
  id: number;

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

  @Column({ length: 10, default: '02' })
  comprobanteDefecto: string;

  @Column({ length: 100, default: 'CAJA 1' })
  nombreCaja: string;

  @UpdateDateColumn()
  updatedAt: Date;
}
