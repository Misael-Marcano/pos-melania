import { MigrationInterface, QueryRunner } from 'typeorm';

/** Unidad de venta/stock opcional (kg, lb, ml, und, etc.) — Fase B POS genérico */
export class ArticuloUnidadMedida1700000000023 implements MigrationInterface {
  async up(qr: QueryRunner): Promise<void> {
    await qr.query(`
      IF NOT EXISTS (
        SELECT 1 FROM sys.columns
        WHERE object_id = OBJECT_ID('articulos') AND name = 'unidadMedida'
      )
      BEGIN
        ALTER TABLE articulos ADD unidadMedida VARCHAR(20) NULL;
      END
    `);
  }

  async down(qr: QueryRunner): Promise<void> {
    await qr.query(`
      IF EXISTS (
        SELECT 1 FROM sys.columns
        WHERE object_id = OBJECT_ID('articulos') AND name = 'unidadMedida'
      )
      BEGIN
        ALTER TABLE articulos DROP COLUMN unidadMedida;
      END
    `);
  }
}
