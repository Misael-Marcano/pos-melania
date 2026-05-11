import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Devoluciones aisladas por organización (denormalizado desde la venta → caja → tienda).
 *
 * SQL Server: ADD / UPDATE / ALTER en lotes separados.
 */
export class DevolucionesTenant1700000000029 implements MigrationInterface {
  async up(qr: QueryRunner): Promise<void> {
    await qr.query(`
      IF NOT EXISTS (
        SELECT 1 FROM sys.columns
        WHERE object_id = OBJECT_ID('devoluciones') AND name = 'tenantId'
      )
      ALTER TABLE devoluciones ADD tenantId INT NULL;
    `);

    await qr.query(`
      UPDATE d
      SET d.tenantId = t.tenantId
      FROM devoluciones d
      INNER JOIN ventas v ON v.id = d.ventaId
      INNER JOIN caja_aperturas ca ON ca.id = v.cajaAperturaId
      INNER JOIN tiendas t ON t.id = ca.tiendaId
      WHERE d.tenantId IS NULL;
    `);

    await qr.query(`
      UPDATE devoluciones SET tenantId = 1 WHERE tenantId IS NULL;
    `);

    await qr.query(`
      IF EXISTS (
        SELECT 1 FROM sys.columns c
        WHERE c.object_id = OBJECT_ID('devoluciones') AND c.name = 'tenantId' AND c.is_nullable = 1
      )
      ALTER TABLE devoluciones ALTER COLUMN tenantId INT NOT NULL;
    `);

    await qr.query(`
      IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_devoluciones_tenant' AND parent_object_id = OBJECT_ID('devoluciones'))
      ALTER TABLE devoluciones ADD CONSTRAINT FK_devoluciones_tenant FOREIGN KEY (tenantId) REFERENCES tenants(id);
    `);
  }

  async down(qr: QueryRunner): Promise<void> {
    await qr.query(`
      IF EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_devoluciones_tenant' AND parent_object_id = OBJECT_ID('devoluciones'))
      ALTER TABLE devoluciones DROP CONSTRAINT FK_devoluciones_tenant;
    `);

    await qr.query(`
      IF EXISTS (
        SELECT 1 FROM sys.columns
        WHERE object_id = OBJECT_ID('devoluciones') AND name = 'tenantId'
      )
      ALTER TABLE devoluciones DROP COLUMN tenantId;
    `);
  }
}
