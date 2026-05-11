import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn,
} from 'typeorm';

/** Organización / inquilino — base para multi-tenant (Fase D). */
@Entity('tenants')
export class Tenant {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 200 })
  nombre: string;

  @Column({ length: 64, unique: true })
  slug: string;

  /**
   * Plan comercial (SaaS). Valores típicos: `standard`, `starter`, `enterprise`.
   * Límites asociados: ver `saas/plan-limits.ts` y `GET /api/v1/saas/context`.
   */
  @Column({ length: 32, default: 'standard' })
  planCode: string;

  @Column({ default: true })
  activo: boolean;

  /** Stripe Customer (facturación SaaS). */
  @Column({ type: 'nvarchar', length: 255, nullable: true })
  stripeCustomerId?: string | null;

  /** Suscripción activa en Stripe (modo subscription). */
  @Column({ type: 'nvarchar', length: 255, nullable: true })
  stripeSubscriptionId?: string | null;

  /** Estado devuelto por webhooks (active, past_due, canceled, …). */
  @Column({ type: 'nvarchar', length: 32, nullable: true })
  billingStatus?: string | null;

  /**
   * Fin del periodo de prueba (trial) para la organización. Null = sin trial definido en BD.
   * La UI usa `GET /saas/context` → `trial` (activo / días restantes / expirado).
   */
  @Column({ type: 'datetime2', nullable: true })
  trialEndsAt?: Date | null;

  /** Recordatorio “queda ~una semana” (rango 2–7 días de trial). */
  @Column({ type: 'bit', default: false })
  trialReminderWeekSent!: boolean;

  /** Recordatorio último día (0–1 días restantes). */
  @Column({ type: 'bit', default: false })
  trialReminderLastDaySent!: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
