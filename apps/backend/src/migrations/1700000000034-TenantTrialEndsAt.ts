import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Fin de periodo de prueba (trial) por organización — nullable hasta que producto asigne fechas.
 */
export class TenantTrialEndsAt1700000000034 implements MigrationInterface {
  async up(qr: QueryRunner): Promise<void> {
    await qr.query(`
      IF NOT EXISTS (
        SELECT 1 FROM sys.columns
        WHERE object_id = OBJECT_ID('tenants') AND name = 'trialEndsAt'
      )
      ALTER TABLE tenants ADD trialEndsAt DATETIME2 NULL;
    `);
  }

  async down(qr: QueryRunner): Promise<void> {
    await qr.query(`
      IF EXISTS (
        SELECT 1 FROM sys.columns
        WHERE object_id = OBJECT_ID('tenants') AND name = 'trialEndsAt'
      )
      ALTER TABLE tenants DROP COLUMN trialEndsAt;
    `);
  }
}
