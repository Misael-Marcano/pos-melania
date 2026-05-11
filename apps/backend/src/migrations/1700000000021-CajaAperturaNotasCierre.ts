import { MigrationInterface, QueryRunner } from 'typeorm';

export class CajaAperturaNotasCierre1700000000021 implements MigrationInterface {
  async up(qr: QueryRunner): Promise<void> {
    await qr.query(`
      IF NOT EXISTS (
        SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_NAME = 'caja_aperturas' AND COLUMN_NAME = 'notasCierre'
      )
      BEGIN
        ALTER TABLE caja_aperturas ADD notasCierre NVARCHAR(MAX) NULL
      END
    `);
  }

  async down(qr: QueryRunner): Promise<void> {
    await qr.query(`
      IF EXISTS (
        SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_NAME = 'caja_aperturas' AND COLUMN_NAME = 'notasCierre'
      )
      BEGIN
        ALTER TABLE caja_aperturas DROP COLUMN notasCierre
      END
    `);
  }
}
