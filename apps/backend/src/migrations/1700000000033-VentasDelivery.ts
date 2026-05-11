import { MigrationInterface, QueryRunner } from 'typeorm';

export class VentasDelivery1700000000033 implements MigrationInterface {
  async up(qr: QueryRunner): Promise<void> {
    // Efectivo recibido y cambio (para mostrar en recibo)
    await qr.query(`
      IF NOT EXISTS (
        SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_NAME='ventas' AND COLUMN_NAME='efectivoRecibido'
      )
      ALTER TABLE ventas ADD efectivoRecibido DECIMAL(12,2) NULL
    `);
    await qr.query(`
      IF NOT EXISTS (
        SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_NAME='ventas' AND COLUMN_NAME='cambio'
      )
      ALTER TABLE ventas ADD cambio DECIMAL(12,2) NULL
    `);
    // Delivery
    await qr.query(`
      IF NOT EXISTS (
        SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_NAME='ventas' AND COLUMN_NAME='esDelivery'
      )
      ALTER TABLE ventas ADD esDelivery BIT NOT NULL DEFAULT 0
    `);
    await qr.query(`
      IF NOT EXISTS (
        SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_NAME='ventas' AND COLUMN_NAME='deliveryCargo'
      )
      ALTER TABLE ventas ADD deliveryCargo DECIMAL(12,2) NOT NULL DEFAULT 0
    `);
    await qr.query(`
      IF NOT EXISTS (
        SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_NAME='ventas' AND COLUMN_NAME='deliveryDireccion'
      )
      ALTER TABLE ventas ADD deliveryDireccion NVARCHAR(300) NULL
    `);
  }

  async down(qr: QueryRunner): Promise<void> {
    for (const col of ['efectivoRecibido', 'cambio', 'esDelivery', 'deliveryCargo', 'deliveryDireccion']) {
      await qr.query(`
        IF EXISTS (
          SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
          WHERE TABLE_NAME='ventas' AND COLUMN_NAME='${col}'
        )
        ALTER TABLE ventas DROP COLUMN ${col}
      `);
    }
  }
}
