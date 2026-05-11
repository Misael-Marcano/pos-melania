import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Multi-tenant: kits, cotizaciones, promociones, proveedores, órdenes de compra,
 * tarjetas regalo, recetas, comprobantes (NCF) y empleados.
 * Unicidad global de códigos/correo pasa a ser por tenant donde aplica.
 *
 * SQL Server: ADD + UPDATE sobre tenantId en el mismo lote falla (véase 0025).
 */
export class TenantRestoNegocio1700000000027 implements MigrationInterface {
  async up(qr: QueryRunner): Promise<void> {
    const dropUqOn = async (table: string) => {
      await qr.query(`
        DECLARE @sql NVARCHAR(MAX) = N'';
        SELECT @sql += N'ALTER TABLE ${table} DROP CONSTRAINT ' + QUOTENAME(kc.name) + N';'
        FROM sys.key_constraints kc
        INNER JOIN sys.tables t ON kc.parent_object_id = t.object_id
        WHERE t.name = N'${table}' AND kc.type = N'UQ';
        IF LEN(@sql) > 0 EXEC sp_executesql @sql;
      `);
    };

    await dropUqOn('empleados');
    await dropUqOn('promociones');
    await dropUqOn('tarjetas_regalo');

    const addTenant = async (table: string) => {
      const fk = `FK_${table}_tenant`;
      await qr.query(`
        IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('${table}') AND name = 'tenantId')
        ALTER TABLE ${table} ADD tenantId INT NULL;
      `);
      await qr.query(`UPDATE ${table} SET tenantId = 1 WHERE tenantId IS NULL;`);
      await qr.query(`
        IF EXISTS (
          SELECT 1 FROM sys.columns c
          WHERE c.object_id = OBJECT_ID('${table}') AND c.name = 'tenantId' AND c.is_nullable = 1
        )
        ALTER TABLE ${table} ALTER COLUMN tenantId INT NOT NULL;
      `);
      await qr.query(`
        IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = '${fk}' AND parent_object_id = OBJECT_ID('${table}'))
        ALTER TABLE ${table} ADD CONSTRAINT ${fk} FOREIGN KEY (tenantId) REFERENCES tenants(id);
      `);
    };

    for (const t of [
      'kits',
      'cotizaciones',
      'promociones',
      'proveedores',
      'ordenes_compra',
      'tarjetas_regalo',
      'recetas',
      'comprobantes',
      'empleados',
    ]) {
      await addTenant(t);
    }

    await qr.query(`
      IF NOT EXISTS (SELECT name FROM sys.indexes WHERE name = 'UQ_promociones_tenant_codigo' AND object_id = OBJECT_ID('promociones'))
        CREATE UNIQUE INDEX UQ_promociones_tenant_codigo ON promociones(tenantId, codigo);
    `);
    await qr.query(`
      IF NOT EXISTS (SELECT name FROM sys.indexes WHERE name = 'UQ_tarjetas_regalo_tenant_codigo' AND object_id = OBJECT_ID('tarjetas_regalo'))
        CREATE UNIQUE INDEX UQ_tarjetas_regalo_tenant_codigo ON tarjetas_regalo(tenantId, codigo);
    `);
    await qr.query(`
      IF NOT EXISTS (SELECT name FROM sys.indexes WHERE name = 'UQ_comprobantes_tenant_tipo' AND object_id = OBJECT_ID('comprobantes'))
        CREATE UNIQUE INDEX UQ_comprobantes_tenant_tipo ON comprobantes(tenantId, tipo);
    `);
    await qr.query(`
      IF NOT EXISTS (SELECT name FROM sys.indexes WHERE name = 'UQ_empleados_tenant_correo' AND object_id = OBJECT_ID('empleados'))
        CREATE UNIQUE INDEX UQ_empleados_tenant_correo ON empleados(tenantId, correo);
    `);
  }

  async down(qr: QueryRunner): Promise<void> {
    await qr.query(`IF EXISTS (SELECT name FROM sys.indexes WHERE name = 'UQ_empleados_tenant_correo' AND object_id = OBJECT_ID('empleados')) DROP INDEX UQ_empleados_tenant_correo ON empleados;`);
    await qr.query(`IF EXISTS (SELECT name FROM sys.indexes WHERE name = 'UQ_comprobantes_tenant_tipo' AND object_id = OBJECT_ID('comprobantes')) DROP INDEX UQ_comprobantes_tenant_tipo ON comprobantes;`);
    await qr.query(`IF EXISTS (SELECT name FROM sys.indexes WHERE name = 'UQ_tarjetas_regalo_tenant_codigo' AND object_id = OBJECT_ID('tarjetas_regalo')) DROP INDEX UQ_tarjetas_regalo_tenant_codigo ON tarjetas_regalo;`);
    await qr.query(`IF EXISTS (SELECT name FROM sys.indexes WHERE name = 'UQ_promociones_tenant_codigo' AND object_id = OBJECT_ID('promociones')) DROP INDEX UQ_promociones_tenant_codigo ON promociones;`);

    const dropCol = async (table: string) => {
      const fk = `FK_${table}_tenant`;
      await qr.query(`
        IF EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = '${fk}')
          ALTER TABLE ${table} DROP CONSTRAINT ${fk};
        IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('${table}') AND name = 'tenantId')
          ALTER TABLE ${table} DROP COLUMN tenantId;
      `);
    };

    for (const t of [
      'empleados',
      'comprobantes',
      'recetas',
      'tarjetas_regalo',
      'ordenes_compra',
      'proveedores',
      'promociones',
      'cotizaciones',
      'kits',
    ]) {
      await dropCol(t);
    }
  }
}
