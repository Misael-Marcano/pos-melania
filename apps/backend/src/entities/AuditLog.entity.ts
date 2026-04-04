import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, ManyToOne, JoinColumn,
} from 'typeorm';
import { Usuario } from './Usuario.entity';

export type AuditOperacion = 'CREATE' | 'UPDATE' | 'DELETE';

@Entity('audit_logs')
export class AuditLog {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 100 })
  tabla: string;

  @Column({ type: 'varchar', length: 10 })
  operacion: AuditOperacion;

  @Column({ nullable: true })
  registroId?: number;

  @Column({ length: 500 })
  descripcion: string;

  @Column({ type: 'nvarchar', length: 'max', nullable: true })
  valorAnterior?: string;

  @Column({ type: 'nvarchar', length: 'max', nullable: true })
  valorNuevo?: string;

  @Column({ nullable: true })
  usuarioId?: number;

  @Column({ length: 200, nullable: true })
  usuarioNombre?: string;

  @Column({ length: 45, nullable: true })
  ip?: string;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => Usuario, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'usuarioId' })
  usuario?: Usuario;
}
