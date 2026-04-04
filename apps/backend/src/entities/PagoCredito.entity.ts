import {
  Entity, PrimaryGeneratedColumn, Column,
  ManyToOne, JoinColumn, CreateDateColumn,
} from 'typeorm';
import { Cliente } from './Cliente.entity';
import { Usuario } from './Usuario.entity';

@Entity('pagos_credito')
export class PagoCredito {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  monto: number;

  @Column({ nullable: true, length: 500 })
  notas?: string;

  @ManyToOne(() => Cliente, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'clienteId' })
  cliente: Cliente;

  @ManyToOne(() => Usuario, { nullable: true, eager: true })
  @JoinColumn({ name: 'creadoPorId' })
  creadoPor?: Usuario;

  @CreateDateColumn()
  createdAt: Date;
}
