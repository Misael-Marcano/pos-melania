import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { Articulo } from './Articulo.entity';

@Entity('categorias')
export class Categoria {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 100, unique: true })
  nombre: string;

  @Column({ default: true })
  activo: boolean;

  @OneToMany(() => Articulo, (a) => a.categoria)
  articulos: Articulo[];
}
