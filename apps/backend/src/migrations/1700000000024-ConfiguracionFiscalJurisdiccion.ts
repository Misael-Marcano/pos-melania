import { MigrationInterface, QueryRunner } from 'typeorm';

/** Opcional: sobrescribe `FISCAL_JURISDICTION` del servidor por instancia (Fase C). */
export class ConfiguracionFiscalJurisdiccion1700000000024 implements MigrationInterface {
  async up(qr: QueryRunner): Promise<void> {
    await qr.query(`
      IF NOT EXISTS (
        SELECT 1 FROM sys.columns
        WHERE object_id = OBJECT_ID('configuracion') AND name = 'fiscalJurisdiccion'
      )
      BEGIN
        ALTER TABLE configuracion ADD fiscalJurisdiccion VARCHAR(16) NULL;
      END
    `);
  }

  async down(qr: QueryRunner): Promise<void> {
    await qr.query(`
      IF EXISTS (
        SELECT 1 FROM sys.columns
        WHERE object_id = OBJECT_ID('configuracion') AND name = 'fiscalJurisdiccion'
      )
      BEGIN
        ALTER TABLE configuracion DROP COLUMN fiscalJurisdiccion;
      END
    `);
  }
}
