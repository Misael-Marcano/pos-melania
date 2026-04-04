import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMetodosPagoVenta1700000000010 implements MigrationInterface {
  async up(qr: QueryRunner) {
    await qr.query(`
      IF NOT EXISTS (
        SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_NAME='ventas' AND COLUMN_NAME='metodosPago'
      )
      ALTER TABLE ventas ADD metodosPago NVARCHAR(MAX) NULL
    `);
  }
  async down(qr: QueryRunner) {
    await qr.query(`ALTER TABLE ventas DROP COLUMN metodosPago`);
  }
}
