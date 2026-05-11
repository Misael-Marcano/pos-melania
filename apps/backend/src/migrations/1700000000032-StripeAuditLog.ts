import { MigrationInterface, QueryRunner } from 'typeorm';

export class StripeAuditLog1700000000032 implements MigrationInterface {
  name = 'StripeAuditLog1700000000032';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      IF NOT EXISTS (SELECT 1 FROM sys.objects WHERE object_id = OBJECT_ID('stripe_audit_logs') AND type = 'U')
      BEGIN
        CREATE TABLE stripe_audit_logs (
          id                   INT IDENTITY(1,1) PRIMARY KEY,
          stripeEventId        NVARCHAR(255)    NOT NULL,
          eventType            NVARCHAR(100)    NOT NULL,
          tenantId             INT              NULL,
          stripeCustomerId     NVARCHAR(255)    NULL,
          stripeSubscriptionId NVARCHAR(255)    NULL,
          planCode             NVARCHAR(32)     NULL,
          billingStatus        NVARCHAR(32)     NULL,
          rawPayload           NVARCHAR(MAX)    NOT NULL,
          processedAt          DATETIME2        NOT NULL DEFAULT GETUTCDATE()
        );

        -- Índice único en stripeEventId para idempotencia
        CREATE UNIQUE INDEX UQ_stripe_audit_logs_eventId
          ON stripe_audit_logs (stripeEventId);

        -- Índice por tenant para consultas de historial
        CREATE INDEX IX_stripe_audit_logs_tenantId
          ON stripe_audit_logs (tenantId)
          WHERE tenantId IS NOT NULL;
      END
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      IF EXISTS (SELECT 1 FROM sys.objects WHERE object_id = OBJECT_ID('stripe_audit_logs') AND type = 'U')
        DROP TABLE stripe_audit_logs;
    `);
  }
}
