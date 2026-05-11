import { MigrationInterface, QueryRunner } from 'typeorm';

/** Catálogo de cajas por sucursal; vínculo en sesiones y configuración POS */
export class CajasCatalogo1700000000018 implements MigrationInterface {
  name = 'CajasCatalogo1700000000018';

  public async up(qr: QueryRunner): Promise<void> {
    await qr.query(`
      IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'cajas')
      BEGIN
        CREATE TABLE cajas (
          id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
          nombre NVARCHAR(100) NOT NULL,
          tiendaId INT NOT NULL,
          activo BIT NOT NULL CONSTRAINT DF_cajas_activo DEFAULT 1,
          notas NVARCHAR(MAX) NULL,
          createdAt DATETIME2 NOT NULL CONSTRAINT DF_cajas_createdAt DEFAULT GETUTCDATE(),
          updatedAt DATETIME2 NOT NULL CONSTRAINT DF_cajas_updatedAt DEFAULT GETUTCDATE(),
          CONSTRAINT FK_cajas_tienda FOREIGN KEY (tiendaId) REFERENCES tiendas(id) ON DELETE NO ACTION
        );
        CREATE UNIQUE INDEX UQ_cajas_tienda_nombre ON cajas(tiendaId, nombre);
        CREATE INDEX IX_cajas_tiendaId ON cajas(tiendaId);
      END
    `);

    await qr.query(`
      IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'caja_aperturas' AND COLUMN_NAME = 'cajaId')
      BEGIN
        ALTER TABLE caja_aperturas ADD cajaId INT NULL;
        ALTER TABLE caja_aperturas ADD CONSTRAINT FK_caja_aperturas_caja
          FOREIGN KEY (cajaId) REFERENCES cajas(id) ON DELETE NO ACTION;
        CREATE INDEX IX_caja_aperturas_cajaId ON caja_aperturas(cajaId);
      END
    `);

    await qr.query(`
      IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'configuracion' AND COLUMN_NAME = 'cajaId')
      BEGIN
        ALTER TABLE configuracion ADD cajaId INT NULL;
        ALTER TABLE configuracion ADD CONSTRAINT FK_configuracion_caja
          FOREIGN KEY (cajaId) REFERENCES cajas(id) ON DELETE NO ACTION;
      END
    `);
  }

  public async down(qr: QueryRunner): Promise<void> {
    await qr.query(`
      IF EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'configuracion' AND COLUMN_NAME = 'cajaId')
      BEGIN
        ALTER TABLE configuracion DROP CONSTRAINT FK_configuracion_caja;
        ALTER TABLE configuracion DROP COLUMN cajaId;
      END
    `);
    await qr.query(`
      IF EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'caja_aperturas' AND COLUMN_NAME = 'cajaId')
      BEGIN
        ALTER TABLE caja_aperturas DROP CONSTRAINT FK_caja_aperturas_caja;
        DROP INDEX IX_caja_aperturas_cajaId ON caja_aperturas;
        ALTER TABLE caja_aperturas DROP COLUMN cajaId;
      END
    `);
    await qr.query(`
      IF EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'cajas')
      BEGIN
        DROP TABLE cajas;
      END
    `);
  }
}
