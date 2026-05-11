import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Multi-tenant: catálogo (categorías, artículos), clientes y gastos por organización.
 * Unicidad de nombre/código pasa a ser por tenant (índices compuestos).
 *
 * SQL Server: ADD + UPDATE sobre la nueva columna deben ir en lotes separados (véase 0025).
 */
export class TenantCatalogoClientesGastos1700000000026 implements MigrationInterface {
  async up(qr: QueryRunner): Promise<void> {
    await qr.query(`
      DECLARE @sql NVARCHAR(MAX) = N'';
      SELECT @sql += N'ALTER TABLE categorias DROP CONSTRAINT ' + QUOTENAME(kc.name) + N';'
      FROM sys.key_constraints kc
      INNER JOIN sys.tables t ON kc.parent_object_id = t.object_id
      WHERE t.name = N'categorias' AND kc.type = N'UQ';
      IF LEN(@sql) > 0 EXEC sp_executesql @sql;
    `);

    await qr.query(`
      IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('categorias') AND name = 'tenantId')
      ALTER TABLE categorias ADD tenantId INT NULL;
    `);
    await qr.query(`UPDATE categorias SET tenantId = 1 WHERE tenantId IS NULL;`);
    await qr.query(`
      IF EXISTS (
        SELECT 1 FROM sys.columns c
        WHERE c.object_id = OBJECT_ID('categorias') AND c.name = 'tenantId' AND c.is_nullable = 1
      )
      ALTER TABLE categorias ALTER COLUMN tenantId INT NOT NULL;
    `);
    await qr.query(`
      IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_categorias_tenant' AND parent_object_id = OBJECT_ID('categorias'))
      ALTER TABLE categorias ADD CONSTRAINT FK_categorias_tenant FOREIGN KEY (tenantId) REFERENCES tenants(id);
    `);
    await qr.query(`
      IF NOT EXISTS (SELECT name FROM sys.indexes WHERE name = 'UQ_categorias_tenant_nombre' AND object_id = OBJECT_ID('categorias'))
      CREATE UNIQUE INDEX UQ_categorias_tenant_nombre ON categorias(tenantId, nombre);
    `);

    await qr.query(`
      DECLARE @sql2 NVARCHAR(MAX) = N'';
      SELECT @sql2 += N'ALTER TABLE articulos DROP CONSTRAINT ' + QUOTENAME(kc.name) + N';'
      FROM sys.key_constraints kc
      INNER JOIN sys.tables t ON kc.parent_object_id = t.object_id
      WHERE t.name = N'articulos' AND kc.type = N'UQ';
      IF LEN(@sql2) > 0 EXEC sp_executesql @sql2;
    `);

    await qr.query(`
      IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('articulos') AND name = 'tenantId')
      ALTER TABLE articulos ADD tenantId INT NULL;
    `);
    await qr.query(`UPDATE articulos SET tenantId = 1 WHERE tenantId IS NULL;`);
    await qr.query(`
      IF EXISTS (
        SELECT 1 FROM sys.columns c
        WHERE c.object_id = OBJECT_ID('articulos') AND c.name = 'tenantId' AND c.is_nullable = 1
      )
      ALTER TABLE articulos ALTER COLUMN tenantId INT NOT NULL;
    `);
    await qr.query(`
      IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_articulos_tenant' AND parent_object_id = OBJECT_ID('articulos'))
      ALTER TABLE articulos ADD CONSTRAINT FK_articulos_tenant FOREIGN KEY (tenantId) REFERENCES tenants(id);
    `);
    await qr.query(`
      IF NOT EXISTS (SELECT name FROM sys.indexes WHERE name = 'UQ_articulos_tenant_codigo' AND object_id = OBJECT_ID('articulos'))
      CREATE UNIQUE INDEX UQ_articulos_tenant_codigo ON articulos(tenantId, codigoBarras);
    `);

    await qr.query(`
      IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('clientes') AND name = 'tenantId')
      ALTER TABLE clientes ADD tenantId INT NULL;
    `);
    await qr.query(`UPDATE clientes SET tenantId = 1 WHERE tenantId IS NULL;`);
    await qr.query(`
      IF EXISTS (
        SELECT 1 FROM sys.columns c
        WHERE c.object_id = OBJECT_ID('clientes') AND c.name = 'tenantId' AND c.is_nullable = 1
      )
      ALTER TABLE clientes ALTER COLUMN tenantId INT NOT NULL;
    `);
    await qr.query(`
      IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_clientes_tenant' AND parent_object_id = OBJECT_ID('clientes'))
      ALTER TABLE clientes ADD CONSTRAINT FK_clientes_tenant FOREIGN KEY (tenantId) REFERENCES tenants(id);
    `);

    await qr.query(`
      IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('gastos') AND name = 'tenantId')
      ALTER TABLE gastos ADD tenantId INT NULL;
    `);
    await qr.query(`UPDATE gastos SET tenantId = 1 WHERE tenantId IS NULL;`);
    await qr.query(`
      IF EXISTS (
        SELECT 1 FROM sys.columns c
        WHERE c.object_id = OBJECT_ID('gastos') AND c.name = 'tenantId' AND c.is_nullable = 1
      )
      ALTER TABLE gastos ALTER COLUMN tenantId INT NOT NULL;
    `);
    await qr.query(`
      IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_gastos_tenant' AND parent_object_id = OBJECT_ID('gastos'))
      ALTER TABLE gastos ADD CONSTRAINT FK_gastos_tenant FOREIGN KEY (tenantId) REFERENCES tenants(id);
    `);
  }

  async down(qr: QueryRunner): Promise<void> {
    await qr.query(`
      IF EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_gastos_tenant')
        ALTER TABLE gastos DROP CONSTRAINT FK_gastos_tenant;
      IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('gastos') AND name = 'tenantId')
        ALTER TABLE gastos DROP COLUMN tenantId;
    `);
    await qr.query(`
      IF EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_clientes_tenant')
        ALTER TABLE clientes DROP CONSTRAINT FK_clientes_tenant;
      IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('clientes') AND name = 'tenantId')
        ALTER TABLE clientes DROP COLUMN tenantId;
    `);
    await qr.query(`IF EXISTS (SELECT name FROM sys.indexes WHERE name = 'UQ_articulos_tenant_codigo' AND object_id = OBJECT_ID('articulos')) DROP INDEX UQ_articulos_tenant_codigo ON articulos;`);
    await qr.query(`
      IF EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_articulos_tenant')
        ALTER TABLE articulos DROP CONSTRAINT FK_articulos_tenant;
      IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('articulos') AND name = 'tenantId')
        ALTER TABLE articulos DROP COLUMN tenantId;
    `);
    await qr.query(`IF EXISTS (SELECT name FROM sys.indexes WHERE name = 'UQ_categorias_tenant_nombre' AND object_id = OBJECT_ID('categorias')) DROP INDEX UQ_categorias_tenant_nombre ON categorias;`);
    await qr.query(`
      IF EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_categorias_tenant')
        ALTER TABLE categorias DROP CONSTRAINT FK_categorias_tenant;
      IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('categorias') AND name = 'tenantId')
        ALTER TABLE categorias DROP COLUMN tenantId;
    `);
  }
}
