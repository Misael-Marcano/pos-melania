import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddClienteDescuento1700000000013 implements MigrationInterface {
  async up(qr: QueryRunner): Promise<void> {
    await qr.query(`
      IF NOT EXISTS (
        SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_NAME = 'clientes' AND COLUMN_NAME = 'descuentoCliente'
      )
      BEGIN
        ALTER TABLE clientes ADD descuentoCliente DECIMAL(5,2) NOT NULL DEFAULT 0
      END
    `);
  }

  async down(qr: QueryRunner): Promise<void> {
    await qr.query(`
      IF EXISTS (
        SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_NAME = 'clientes' AND COLUMN_NAME = 'descuentoCliente'
      )
      BEGIN
        ALTER TABLE clientes DROP COLUMN descuentoCliente
      END
    `);
  }
}
