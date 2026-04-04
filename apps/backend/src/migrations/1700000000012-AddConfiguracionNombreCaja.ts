import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddConfiguracionNombreCaja1700000000012 implements MigrationInterface {
  async up(qr: QueryRunner): Promise<void> {
    await qr.query(`
      IF NOT EXISTS (
        SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_NAME = 'configuracion' AND COLUMN_NAME = 'nombreCaja'
      )
      BEGIN
        ALTER TABLE configuracion ADD nombreCaja NVARCHAR(100) NOT NULL DEFAULT 'CAJA 1'
      END
    `);
  }

  async down(qr: QueryRunner): Promise<void> {
    await qr.query(`
      IF EXISTS (
        SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_NAME = 'configuracion' AND COLUMN_NAME = 'nombreCaja'
      )
      BEGIN
        ALTER TABLE configuracion DROP COLUMN nombreCaja
      END
    `);
  }
}
