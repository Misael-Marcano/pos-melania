import {
  Entity, PrimaryGeneratedColumn, Column,
  ManyToOne, JoinColumn, CreateDateColumn,
} from 'typeorm';
import { Usuario } from './Usuario.entity';
import { Tienda } from './Tienda.entity';
import { Caja } from './Caja.entity';

@Entity('caja_aperturas')
export class CajaApertura {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 50 })
  cajaNombre: string;

  /** Catálogo de caja (opcional; sesiones antiguas solo tienen nombre) */
  @ManyToOne(() => Caja, { nullable: true, eager: false })
  @JoinColumn({ name: 'cajaId' })
  caja?: Caja | null;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  montoApertura: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  montoCierre?: number;

  @Column({ type: 'nvarchar', length: 'max', nullable: true })
  denominacionesApertura?: string;    // JSON stringificado

  @Column({ type: 'nvarchar', length: 'max', nullable: true })
  denominacionesCierre?: string;

  /** Observaciones registradas al cerrar la sesión (PDF / auditoría) */
  @Column({ type: 'nvarchar', length: 'max', nullable: true })
  notasCierre?: string | null;

  @Column({ nullable: true })
  fechaCierre?: Date;

  @Column({ default: true })
  abierta: boolean;

  @ManyToOne(() => Usuario)
  @JoinColumn({ name: 'usuarioId' })
  usuario: Usuario;

  @ManyToOne(() => Tienda, { nullable: true, eager: false })
  @JoinColumn({ name: 'tiendaId' })
  tienda?: Tienda;

  @CreateDateColumn()
  fechaApertura: Date;
}
