import { MigrationInterface, QueryRunner } from 'typeorm';

/** Zona horaria IANA por tenant para agregaciones diarias en reportes. */
export class ConfiguracionZonaHoraria1700000000036 implements MigrationInterface {
  async up(qr: QueryRunner): Promise<void> {
    await qr.query(`
      IF NOT EXISTS (
        SELECT 1 FROM sys.columns
        WHERE object_id = OBJECT_ID('configuracion') AND name = 'zonaHoraria'
      )
      BEGIN
        ALTER TABLE configuracion
          ADD zonaHoraria VARCHAR(64) NOT NULL
          CONSTRAINT DF_configuracion_zonaHoraria DEFAULT 'America/Santo_Domingo';
      END
    `);
  }

  async down(qr: QueryRunner): Promise<void> {
    await qr.query(`
      IF EXISTS (
        SELECT 1 FROM sys.default_constraints dc
        INNER JOIN sys.columns c ON c.default_object_id = dc.object_id
        WHERE c.object_id = OBJECT_ID('configuracion') AND c.name = 'zonaHoraria'
      )
      BEGIN
        DECLARE @df NVARCHAR(256);
        SELECT @df = dc.name
        FROM sys.default_constraints dc
        INNER JOIN sys.columns c ON c.default_object_id = dc.object_id
        WHERE c.object_id = OBJECT_ID('configuracion') AND c.name = 'zonaHoraria';
        EXEC('ALTER TABLE configuracion DROP CONSTRAINT ' + @df);
      END
    `);
    await qr.query(`
      IF EXISTS (
        SELECT 1 FROM sys.columns
        WHERE object_id = OBJECT_ID('configuracion') AND name = 'zonaHoraria'
      )
      BEGIN
        ALTER TABLE configuracion DROP COLUMN zonaHoraria;
      END
    `);
  }
}
