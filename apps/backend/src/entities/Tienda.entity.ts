import {
  Entity, PrimaryGeneratedColumn, Column,
} from 'typeorm';

@Entity('tiendas')
export class Tienda {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 200 })
  nombre: string;

  @Column({ length: 500, nullable: true })
  direccion?: string;

  @Column({ length: 20, nullable: true })
  telefono?: string;

  @Column({ length: 200, nullable: true })
  email?: string;

  @Column({ default: true })
  activo: boolean;
}
