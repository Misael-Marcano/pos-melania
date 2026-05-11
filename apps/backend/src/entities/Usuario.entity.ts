import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn,
} from 'typeorm';
import { Rol } from '@pos/shared';
import { Tienda } from './Tienda.entity';
import { Tenant } from './Tenant.entity';

@Entity('usuarios')
export class Usuario {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Tenant, { nullable: false, eager: false })
  @JoinColumn({ name: 'tenantId' })
  tenant: Tenant;

  @Column({ length: 200 })
  nombre: string;

  @Column({ length: 200, unique: true })
  email: string;

  @Column({ length: 200 })
  passwordHash: string;

  @Column({ type: 'varchar', length: 20, default: 'cajero' })
  rol: Rol;

  /** Sucursal asignada (obligatoria para cajero/soporte en operaciones de caja; admin suele ser null) */
  @ManyToOne(() => Tienda, { nullable: true, eager: false })
  @JoinColumn({ name: 'tiendaId' })
  tienda?: Tienda | null;

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
