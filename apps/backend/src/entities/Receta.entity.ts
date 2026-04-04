import {
  Entity, PrimaryGeneratedColumn, Column,
  ManyToOne, OneToMany, JoinColumn,
  CreateDateColumn, UpdateDateColumn,
} from 'typeorm';
import { Articulo } from './Articulo.entity';

@Entity('recetas')
export class Receta {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 200 })
  nombre: string;

  @Column({ type: 'text', nullable: true })
  descripcion?: string;

  /** Artículo que se produce */
  @ManyToOne(() => Articulo, { eager: true })
  @JoinColumn({ name: 'articuloResultadoId' })
  articuloResultado: Articulo;

  /** Cantidad producida por lote */
  @Column({ type: 'decimal', precision: 10, scale: 3, default: 1 })
  cantidadResultado: number;

  @Column({ default: true })
  activa: boolean;

  @OneToMany(() => RecetaIngrediente, (r) => r.receta, { cascade: true, eager: true })
  ingredientes: RecetaIngrediente[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

@Entity('receta_ingredientes')
export class RecetaIngrediente {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Receta, (r) => r.ingredientes, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'recetaId' })
  receta: Receta;

  @ManyToOne(() => Articulo, { eager: true })
  @JoinColumn({ name: 'articuloId' })
  articulo: Articulo;

  @Column({ type: 'decimal', precision: 10, scale: 3 })
  cantidad: number;
}
