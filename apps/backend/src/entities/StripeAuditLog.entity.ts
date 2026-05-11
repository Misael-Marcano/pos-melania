import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, Index,
} from 'typeorm';

/**
 * Registro inmutable de cada evento Stripe procesado por el webhook.
 * Permite depurar discrepancias de facturación y auditar cambios de plan.
 */
@Entity('stripe_audit_logs')
export class StripeAuditLog {
  @PrimaryGeneratedColumn()
  id: number;

  /**
   * ID único del evento Stripe (evt_…). Índice único para idempotencia:
   * si Stripe reenvía el mismo evento, el INSERT falla silenciosamente.
   */
  @Index({ unique: true })
  @Column({ type: 'nvarchar', length: 255 })
  stripeEventId: string;

  @Column({ type: 'nvarchar', length: 100 })
  eventType: string;

  /** Organización afectada, null si no se pudo resolver el tenant del evento. */
  @Column({ type: 'int', nullable: true })
  tenantId?: number | null;

  @Column({ type: 'nvarchar', length: 255, nullable: true })
  stripeCustomerId?: string | null;

  @Column({ type: 'nvarchar', length: 255, nullable: true })
  stripeSubscriptionId?: string | null;

  /** Plan resultante tras procesar el evento (si aplica). */
  @Column({ type: 'nvarchar', length: 32, nullable: true })
  planCode?: string | null;

  /** Estado de facturación resultante (active, past_due, canceled, …). */
  @Column({ type: 'nvarchar', length: 32, nullable: true })
  billingStatus?: string | null;

  /** Payload completo del evento serializado como JSON. */
  @Column({ type: 'nvarchar', length: 'max' })
  rawPayload: string;

  @CreateDateColumn()
  processedAt: Date;
}
