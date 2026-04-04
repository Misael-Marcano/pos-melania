import {
  Entity, PrimaryGeneratedColumn, Column,
  ManyToOne, CreateDateColumn,
} from 'typeorm';
import { Articulo } from './Articulo.entity';
import { Usuario } from './Usuario.entity';

export type TipoMovimiento =
  | 'VENTA'
  | 'DEVOLUCION'
  | 'AJUSTE'
  | 'COMPRA'
  | 'ENTRADA_MANUAL'
  | 'SALIDA_MANUAL';

@Entity('movimientos_inventario')
export class MovimientoInventario {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Articulo, { onDelete: 'CASCADE' })
  articulo: Articulo;

  @Column({ type: 'varchar', length: 30 })
  tipo: TipoMovimiento;

  /** Positivo = entrada, negativo = salida */
  @Column({ type: 'int' })
  cantidad: number;

  @Column({ type: 'int' })
  stockAntes: number;

  @Column({ type: 'int' })
  stockDespues: number;

  /** Referencia opcional: ID de venta, compra, etc. */
  @Column({ type: 'int', nullable: true })
  referenciaId?: number;

  @Column({ type: 'varchar', length: 100, nullable: true })
  referenciaTipo?: string;

  @Column({ type: 'nvarchar', length: 500, nullable: true })
  notas?: string;

  @ManyToOne(() => Usuario, { nullable: true, onDelete: 'SET NULL' })
  usuario?: Usuario;

  @CreateDateColumn()
  createdAt: Date;
}
