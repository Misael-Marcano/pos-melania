import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
} from 'typeorm';

@Entity('proveedores')
export class Proveedor {
  @PrimaryGeneratedColumn()
  id: number;

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
