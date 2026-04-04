import {
  Entity, PrimaryGeneratedColumn, Column,
  ManyToOne, JoinColumn, CreateDateColumn,
} from 'typeorm';
import { Usuario } from './Usuario.entity';

@Entity('caja_aperturas')
export class CajaApertura {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 50 })
  cajaNombre: string;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  montoApertura: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  montoCierre?: number;

  @Column({ type: 'nvarchar', length: 'max', nullable: true })
  denominacionesApertura?: string;    // JSON stringificado

  @Column({ type: 'nvarchar', length: 'max', nullable: true })
  denominacionesCierre?: string;

  @Column({ nullable: true })
  fechaCierre?: Date;

  @Column({ default: true })
  abierta: boolean;

  @ManyToOne(() => Usuario)
  @JoinColumn({ name: 'usuarioId' })
  usuario: Usuario;

  @CreateDateColumn()
  fechaApertura: Date;
}
