import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn,
} from 'typeorm';
import { Kit } from './Kit.entity';
import { Articulo } from './Articulo.entity';

@Entity('kit_detalles')
export class KitDetalle {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int', default: 1 })
  cantidad: number;

  @ManyToOne(() => Kit, (k) => k.detalles, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'kitId' })
  kit: Kit;

  @ManyToOne(() => Articulo, (a) => a.kitDetalles, { eager: true })
  @JoinColumn({ name: 'articuloId' })
  articulo: Articulo;
}
