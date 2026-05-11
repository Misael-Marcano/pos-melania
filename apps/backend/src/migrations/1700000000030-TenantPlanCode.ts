import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Plan comercial por organización (base para límites / billing futuro).
 */
export class TenantPlanCode1700000000030 implements MigrationInterface {
  async up(qr: QueryRunner): Promise<void> {
    await qr.query(`
      IF NOT EXISTS (
        SELECT 1 FROM sys.columns
        WHERE object_id = OBJECT_ID('tenants') AND name = 'planCode'
      )
      ALTER TABLE tenants ADD planCode NVARCHAR(32) NULL;
    `);

    await qr.query(`
      UPDATE tenants SET planCode = 'standard' WHERE planCode IS NULL OR LTRIM(RTRIM(planCode)) = '';
    `);

    await qr.query(`
      IF EXISTS (
        SELECT 1 FROM sys.columns c
        WHERE c.object_id = OBJECT_ID('tenants') AND c.name = 'planCode' AND c.is_nullable = 1
      )
      ALTER TABLE tenants ALTER COLUMN planCode NVARCHAR(32) NOT NULL;
    `);
  }

  async down(qr: QueryRunner): Promise<void> {
    await qr.query(`
      IF EXISTS (
        SELECT 1 FROM sys.columns
        WHERE object_id = OBJECT_ID('tenants') AND name = 'planCode'
      )
      ALTER TABLE tenants DROP COLUMN planCode;
    `);
  }
}
