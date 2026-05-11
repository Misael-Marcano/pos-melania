import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Mejora consultas por sesión de caja + rango de fechas (resúmenes / reportes).
 * Ya existen IX_ventas_cajaAperturaId y IDX_ventas_fecha; el compuesto reduce lecturas.
 */
export class VentasIndexCajaFecha1700000000022 implements MigrationInterface {
  async up(qr: QueryRunner): Promise<void> {
    await qr.query(`
      IF NOT EXISTS (
        SELECT 1 FROM sys.indexes WHERE name = 'IX_ventas_cajaApertura_fecha' AND object_id = OBJECT_ID('ventas')
      )
      BEGIN
        CREATE NONCLUSTERED INDEX IX_ventas_cajaApertura_fecha
        ON ventas(cajaAperturaId, fecha);
      END
    `);
  }

  async down(qr: QueryRunner): Promise<void> {
    await qr.query(`
      IF EXISTS (
        SELECT 1 FROM sys.indexes WHERE name = 'IX_ventas_cajaApertura_fecha' AND object_id = OBJECT_ID('ventas')
      )
      BEGIN
        DROP INDEX IX_ventas_cajaApertura_fecha ON ventas;
      END
    `);
  }
}
