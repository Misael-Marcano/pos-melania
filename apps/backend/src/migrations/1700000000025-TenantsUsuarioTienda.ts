import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Fase D — cimientos multi-tenant: organización por fila + FK en usuarios y tiendas.
 * Instalaciones existentes quedan en tenant id = 1 («default»).
 *
 * Nota SQL Server: ADD COLUMN y UPDATE sobre esa columna no pueden ir en el mismo lote
 * (resolución de nombres diferida → "Invalid column name 'tenantId'"). Se ejecutan en lotes separados.
 */
export class TenantsUsuarioTienda1700000000025 implements MigrationInterface {
  async up(qr: QueryRunner): Promise<void> {
    await qr.query(`
      IF OBJECT_ID('tenants', 'U') IS NULL
      BEGIN
        CREATE TABLE tenants (
          id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
          nombre NVARCHAR(200) NOT NULL,
          slug NVARCHAR(64) NOT NULL,
          activo BIT NOT NULL DEFAULT 1,
          createdAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
          updatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
          CONSTRAINT UQ_tenants_slug UNIQUE (slug)
        );
        SET IDENTITY_INSERT tenants ON;
        INSERT INTO tenants (id, nombre, slug, activo) VALUES (1, N'Organización por defecto', N'default', 1);
        SET IDENTITY_INSERT tenants OFF;
      END
    `);

    await qr.query(`
      IF NOT EXISTS (
        SELECT 1 FROM sys.columns
        WHERE object_id = OBJECT_ID('usuarios') AND name = 'tenantId'
      )
      ALTER TABLE usuarios ADD tenantId INT NULL;
    `);

    await qr.query(`
      UPDATE usuarios SET tenantId = 1 WHERE tenantId IS NULL;
    `);

    await qr.query(`
      IF EXISTS (
        SELECT 1 FROM sys.columns c
        WHERE c.object_id = OBJECT_ID('usuarios') AND c.name = 'tenantId' AND c.is_nullable = 1
      )
      ALTER TABLE usuarios ALTER COLUMN tenantId INT NOT NULL;
    `);

    await qr.query(`
      IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_usuarios_tenant' AND parent_object_id = OBJECT_ID('usuarios'))
      ALTER TABLE usuarios ADD CONSTRAINT FK_usuarios_tenant FOREIGN KEY (tenantId) REFERENCES tenants(id);
    `);

    await qr.query(`
      IF NOT EXISTS (
        SELECT 1 FROM sys.columns
        WHERE object_id = OBJECT_ID('tiendas') AND name = 'tenantId'
      )
      ALTER TABLE tiendas ADD tenantId INT NULL;
    `);

    await qr.query(`
      UPDATE tiendas SET tenantId = 1 WHERE tenantId IS NULL;
    `);

    await qr.query(`
      IF EXISTS (
        SELECT 1 FROM sys.columns c
        WHERE c.object_id = OBJECT_ID('tiendas') AND c.name = 'tenantId' AND c.is_nullable = 1
      )
      ALTER TABLE tiendas ALTER COLUMN tenantId INT NOT NULL;
    `);

    await qr.query(`
      IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_tiendas_tenant' AND parent_object_id = OBJECT_ID('tiendas'))
      ALTER TABLE tiendas ADD CONSTRAINT FK_tiendas_tenant FOREIGN KEY (tenantId) REFERENCES tenants(id);
    `);
  }

  async down(qr: QueryRunner): Promise<void> {
    await qr.query(`
      IF EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_tiendas_tenant')
        ALTER TABLE tiendas DROP CONSTRAINT FK_tiendas_tenant;
      IF EXISTS (
        SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('tiendas') AND name = 'tenantId'
      )
        ALTER TABLE tiendas DROP COLUMN tenantId;
    `);
    await qr.query(`
      IF EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_usuarios_tenant')
        ALTER TABLE usuarios DROP CONSTRAINT FK_usuarios_tenant;
      IF EXISTS (
        SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('usuarios') AND name = 'tenantId'
      )
        ALTER TABLE usuarios DROP COLUMN tenantId;
    `);
    await qr.query(`
      IF OBJECT_ID('tenants', 'U') IS NOT NULL DROP TABLE tenants;
    `);
  }
}
