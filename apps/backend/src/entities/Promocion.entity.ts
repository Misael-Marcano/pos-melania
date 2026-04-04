import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn,
} from 'typeorm';

export type TipoPromocion = 'PORCENTAJE' | 'MONTO_FIJO';

@Entity('promociones')
export class Promocion {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 50, unique: true })
  codigo: string;

  @Column({ length: 200 })
  nombre: string;

  @Column({ type: 'varchar', length: 20, default: 'PORCENTAJE' })
  tipo: TipoPromocion;

  /** Porcentaje (0-100) o monto fijo */
  @Column({ type: 'decimal', precision: 10, scale: 2 })
  valor: number;

  /** Monto mínimo de compra para aplicar (0 = sin mínimo) */
  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  montoMinimo: number;

  /** null = sin límite de usos */
  @Column({ type: 'int', nullable: true })
  usoMaximo?: number;

  @Column({ type: 'int', default: 0 })
  usosActuales: number;

  @Column({ type: 'date', nullable: true })
  fechaInicio?: Date;

  @Column({ type: 'date', nullable: true })
  fechaFin?: Date;

  @Column({ default: true })
  activa: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
