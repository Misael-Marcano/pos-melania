import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Una fila de `configuracion` por organización (tenant).
 *
 * SQL Server: ADD / UPDATE / ALTER en lotes separados.
 */
export class ConfiguracionTenant1700000000028 implements MigrationInterface {
  async up(qr: QueryRunner): Promise<void> {
    await qr.query(`
      IF OBJECT_ID('configuracion', 'U') IS NOT NULL
        AND (SELECT COUNT(*) FROM configuracion) > 1
      BEGIN
        DELETE FROM configuracion
        WHERE id > (SELECT MIN(id) FROM configuracion);
      END
    `);

    await qr.query(`
      IF NOT EXISTS (
        SELECT 1 FROM sys.columns
        WHERE object_id = OBJECT_ID('configuracion') AND name = 'tenantId'
      )
      ALTER TABLE configuracion ADD tenantId INT NULL;
    `);

    await qr.query(`
      UPDATE configuracion SET tenantId = 1 WHERE tenantId IS NULL;
    `);

    await qr.query(`
      IF EXISTS (
        SELECT 1 FROM sys.columns c
        WHERE c.object_id = OBJECT_ID('configuracion') AND c.name = 'tenantId' AND c.is_nullable = 1
      )
      ALTER TABLE configuracion ALTER COLUMN tenantId INT NOT NULL;
    `);

    await qr.query(`
      IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_configuracion_tenant' AND parent_object_id = OBJECT_ID('configuracion'))
      ALTER TABLE configuracion ADD CONSTRAINT FK_configuracion_tenant FOREIGN KEY (tenantId) REFERENCES tenants(id);
    `);

    await qr.query(`
      IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UQ_configuracion_tenantId' AND object_id = OBJECT_ID('configuracion'))
      ALTER TABLE configuracion ADD CONSTRAINT UQ_configuracion_tenantId UNIQUE (tenantId);
    `);
  }

  async down(qr: QueryRunner): Promise<void> {
    await qr.query(`
      IF EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_configuracion_tenant' AND parent_object_id = OBJECT_ID('configuracion'))
      ALTER TABLE configuracion DROP CONSTRAINT FK_configuracion_tenant;
    `);

    await qr.query(`
      IF EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UQ_configuracion_tenantId' AND object_id = OBJECT_ID('configuracion'))
      ALTER TABLE configuracion DROP CONSTRAINT UQ_configuracion_tenantId;
    `);

    await qr.query(`
      IF EXISTS (
        SELECT 1 FROM sys.columns
        WHERE object_id = OBJECT_ID('configuracion') AND name = 'tenantId'
      )
      ALTER TABLE configuracion DROP COLUMN tenantId;
    `);
  }
}
