import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn,
} from 'typeorm';
import { Tenant } from './Tenant.entity';

@Entity('proveedores')
export class Proveedor {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Tenant, { nullable: false, eager: false })
  @JoinColumn({ name: 'tenantId' })
  tenant: Tenant;

  @Column({ length: 200 })
  nombre: string;

  @Column({ length: 200, nullable: true })
  contacto?: string;

  @Column({ length: 20, nullable: true })
  telefono?: string;

  @Column({ length: 200, nullable: true })
  correo?: string;

  @Column({ length: 500, nullable: true })
  direccion?: string;

  @Column({ length: 20, nullable: true })
  rnc?: string;

  @Column({ default: true })
  activo: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
