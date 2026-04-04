import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn,
} from 'typeorm';
import { Rol } from '@pos/shared';

@Entity('empleados')
export class Empleado {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 200 })
  nombre: string;

  @Column({ length: 200, unique: true })
  correo: string;

  @Column({ length: 20, nullable: true })
  telefono?: string;

  @Column({ type: 'varchar', length: 20, default: 'cajero' })
  rol: Rol;

  @Column({ nullable: true, length: 500 })
  foto?: string;

  @Column({ default: true })
  activo: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
