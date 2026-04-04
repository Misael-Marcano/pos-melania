import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn,
} from 'typeorm';
import { Rol } from '@pos/shared';

@Entity('usuarios')
export class Usuario {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 200 })
  nombre: string;

  @Column({ length: 200, unique: true })
  email: string;

  @Column({ length: 200 })
  passwordHash: string;

  @Column({ type: 'varchar', length: 20, default: 'cajero' })
  rol: Rol;

  @Column({ nullable: true, length: 500 })
  foto?: string;

  @Column({ nullable: true, length: 20 })
  telefono?: string;

  @Column({ default: true })
  activo: boolean;

  @Column({ nullable: true })
  ultimoAcceso?: Date;

  @Column({ nullable: true, length: 500 })
  refreshToken?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
