import { MigrationInterface, QueryRunner } from 'typeorm';

export class ConfiguracionTextoPieRecibo1700000000020 implements MigrationInterface {
  async up(qr: QueryRunner): Promise<void> {
    await qr.query(`
      IF NOT EXISTS (
        SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_NAME = 'configuracion' AND COLUMN_NAME = 'textoPieRecibo'
      )
      BEGIN
        ALTER TABLE configuracion ADD textoPieRecibo NVARCHAR(MAX) NULL
      END
    `);
  }

  async down(qr: QueryRunner): Promise<void> {
    await qr.query(`
      IF EXISTS (
        SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_NAME = 'configuracion' AND COLUMN_NAME = 'textoPieRecibo'
      )
      BEGIN
        ALTER TABLE configuracion DROP COLUMN textoPieRecibo
      END
    `);
  }
}
