import { MigrationInterface, QueryRunner } from 'typeorm';

export class TenantStripeBilling1700000000031 implements MigrationInterface {
  name = 'TenantStripeBilling1700000000031';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('tenants') AND name = 'stripeCustomerId')
        ALTER TABLE tenants ADD stripeCustomerId NVARCHAR(255) NULL;
      IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('tenants') AND name = 'stripeSubscriptionId')
        ALTER TABLE tenants ADD stripeSubscriptionId NVARCHAR(255) NULL;
      IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('tenants') AND name = 'billingStatus')
        ALTER TABLE tenants ADD billingStatus NVARCHAR(32) NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('tenants') AND name = 'billingStatus')
        ALTER TABLE tenants DROP COLUMN billingStatus;
      IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('tenants') AND name = 'stripeSubscriptionId')
        ALTER TABLE tenants DROP COLUMN stripeSubscriptionId;
      IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('tenants') AND name = 'stripeCustomerId')
        ALTER TABLE tenants DROP COLUMN stripeCustomerId;
    `);
  }
}
