import { MigrationInterface, QueryRunner } from 'typeorm';

/** Ventas ligadas a sesión de caja; sucursal (tienda) en caja, gastos y configuración */
export class CajaVentaTiendaGastos1700000000017 implements MigrationInterface {
  name = 'CajaVentaTiendaGastos1700000000017';

  public async up(qr: QueryRunner): Promise<void> {
    await qr.query(`
      IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'ventas' AND COLUMN_NAME = 'cajaAperturaId')
      BEGIN
        ALTER TABLE ventas ADD cajaAperturaId INT NULL;
        ALTER TABLE ventas ADD CONSTRAINT FK_ventas_caja_apertura
          FOREIGN KEY (cajaAperturaId) REFERENCES caja_aperturas(id) ON DELETE NO ACTION;
        CREATE INDEX IX_ventas_cajaAperturaId ON ventas(cajaAperturaId);
      END
    `);

    await qr.query(`
      IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'caja_aperturas' AND COLUMN_NAME = 'tiendaId')
      BEGIN
        ALTER TABLE caja_aperturas ADD tiendaId INT NULL;
        ALTER TABLE caja_aperturas ADD CONSTRAINT FK_caja_aperturas_tienda
          FOREIGN KEY (tiendaId) REFERENCES tiendas(id) ON DELETE NO ACTION;
        CREATE INDEX IX_caja_aperturas_tiendaId ON caja_aperturas(tiendaId);
      END
    `);

    await qr.query(`
      IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'gastos' AND COLUMN_NAME = 'tiendaId')
      BEGIN
        ALTER TABLE gastos ADD tiendaId INT NULL;
        ALTER TABLE gastos ADD CONSTRAINT FK_gastos_tienda
          FOREIGN KEY (tiendaId) REFERENCES tiendas(id) ON DELETE NO ACTION;
        CREATE INDEX IX_gastos_tiendaId ON gastos(tiendaId);
      END
    `);

    await qr.query(`
      IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'configuracion' AND COLUMN_NAME = 'tiendaId')
      BEGIN
        ALTER TABLE configuracion ADD tiendaId INT NULL;
        ALTER TABLE configuracion ADD CONSTRAINT FK_configuracion_tienda
          FOREIGN KEY (tiendaId) REFERENCES tiendas(id) ON DELETE NO ACTION;
      END
    `);
  }

  public async down(qr: QueryRunner): Promise<void> {
    await qr.query(`
      IF EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'configuracion' AND COLUMN_NAME = 'tiendaId')
      BEGIN
        ALTER TABLE configuracion DROP CONSTRAINT FK_configuracion_tienda;
        ALTER TABLE configuracion DROP COLUMN tiendaId;
      END
    `);
    await qr.query(`
      IF EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'gastos' AND COLUMN_NAME = 'tiendaId')
      BEGIN
        ALTER TABLE gastos DROP CONSTRAINT FK_gastos_tienda;
        DROP INDEX IX_gastos_tiendaId ON gastos;
        ALTER TABLE gastos DROP COLUMN tiendaId;
      END
    `);
    await qr.query(`
      IF EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'caja_aperturas' AND COLUMN_NAME = 'tiendaId')
      BEGIN
        ALTER TABLE caja_aperturas DROP CONSTRAINT FK_caja_aperturas_tienda;
        DROP INDEX IX_caja_aperturas_tiendaId ON caja_aperturas;
        ALTER TABLE caja_aperturas DROP COLUMN tiendaId;
      END
    `);
    await qr.query(`
      IF EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'ventas' AND COLUMN_NAME = 'cajaAperturaId')
      BEGIN
        ALTER TABLE ventas DROP CONSTRAINT FK_ventas_caja_apertura;
        DROP INDEX IX_ventas_cajaAperturaId ON ventas;
        ALTER TABLE ventas DROP COLUMN cajaAperturaId;
      END
    `);
  }
}
