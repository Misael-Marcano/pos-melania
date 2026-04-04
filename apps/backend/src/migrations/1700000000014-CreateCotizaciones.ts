import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCotizaciones1700000000014 implements MigrationInterface {
  async up(qr: QueryRunner) {
    await qr.query(`
      IF NOT EXISTS (
        SELECT 1 FROM INFORMATION_SCHEMA.TABLES
        WHERE TABLE_NAME = 'cotizaciones'
      )
      CREATE TABLE cotizaciones (
        id           INT IDENTITY(1,1) PRIMARY KEY,
        estado       NVARCHAR(20)    NOT NULL DEFAULT 'BORRADOR',
        notas        NVARCHAR(500)   NULL,
        validezDias  INT             NOT NULL DEFAULT 30,
        subtotal     DECIMAL(12,2)   NOT NULL,
        descuento    DECIMAL(12,2)   NOT NULL DEFAULT 0,
        total        DECIMAL(12,2)   NOT NULL,
        clienteId    INT             NULL,
        creadoPorId  INT             NOT NULL,
        createdAt    DATETIME2       NOT NULL DEFAULT GETDATE(),
        updatedAt    DATETIME2       NOT NULL DEFAULT GETDATE(),
        CONSTRAINT FK_cotizaciones_cliente
          FOREIGN KEY (clienteId) REFERENCES clientes(id),
        CONSTRAINT FK_cotizaciones_creadoPor
          FOREIGN KEY (creadoPorId) REFERENCES usuarios(id)
      )
    `);

    await qr.query(`
      IF NOT EXISTS (
        SELECT 1 FROM INFORMATION_SCHEMA.TABLES
        WHERE TABLE_NAME = 'cotizacion_detalles'
      )
      CREATE TABLE cotizacion_detalles (
        id              INT IDENTITY(1,1) PRIMARY KEY,
        cantidad        INT             NOT NULL,
        precioUnitario  DECIMAL(10,2)   NOT NULL,
        descuento       DECIMAL(5,2)    NOT NULL DEFAULT 0,
        total           DECIMAL(12,2)   NOT NULL,
        cotizacionId    INT             NOT NULL,
        articuloId      INT             NOT NULL,
        CONSTRAINT FK_cotizacion_detalles_cotizacion
          FOREIGN KEY (cotizacionId) REFERENCES cotizaciones(id) ON DELETE CASCADE,
        CONSTRAINT FK_cotizacion_detalles_articulo
          FOREIGN KEY (articuloId) REFERENCES articulos(id)
      )
    `);
  }

  async down(qr: QueryRunner) {
    await qr.query(`DROP TABLE IF EXISTS cotizacion_detalles`);
    await qr.query(`DROP TABLE IF EXISTS cotizaciones`);
  }
}
