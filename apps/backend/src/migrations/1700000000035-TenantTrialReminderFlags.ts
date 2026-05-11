import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Idempotencia de recordatorios por email antes de que venza `trialEndsAt`.
 */
export class TenantTrialReminderFlags1700000000035 implements MigrationInterface {
  async up(qr: QueryRunner): Promise<void> {
    await qr.query(`
      IF NOT EXISTS (
        SELECT 1 FROM sys.columns
        WHERE object_id = OBJECT_ID('tenants') AND name = 'trialReminderWeekSent'
      )
      ALTER TABLE tenants ADD trialReminderWeekSent BIT NOT NULL CONSTRAINT DF_tenants_trialRw DEFAULT 0;
    `);
    await qr.query(`
      IF NOT EXISTS (
        SELECT 1 FROM sys.columns
        WHERE object_id = OBJECT_ID('tenants') AND name = 'trialReminderLastDaySent'
      )
      ALTER TABLE tenants ADD trialReminderLastDaySent BIT NOT NULL CONSTRAINT DF_tenants_trialRl DEFAULT 0;
    `);
  }

  async down(qr: QueryRunner): Promise<void> {
    await qr.query(`
      IF EXISTS (
        SELECT 1 FROM sys.columns
        WHERE object_id = OBJECT_ID('tenants') AND name = 'trialReminderLastDaySent'
      )
      ALTER TABLE tenants DROP COLUMN trialReminderLastDaySent;
    `);
    await qr.query(`
      IF EXISTS (
        SELECT 1 FROM sys.columns
        WHERE object_id = OBJECT_ID('tenants') AND name = 'trialReminderWeekSent'
      )
      ALTER TABLE tenants DROP COLUMN trialReminderWeekSent;
    `);
  }
}
