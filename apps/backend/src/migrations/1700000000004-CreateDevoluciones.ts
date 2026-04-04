import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateDevoluciones1700000000004 implements MigrationInterface {
  name = 'CreateDevoluciones1700000000004';

  public async up(qr: QueryRunner): Promise<void> {
    await qr.query(`
      IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'devoluciones')
      CREATE TABLE devoluciones (
        id              INT IDENTITY(1,1) PRIMARY KEY,
        estado          VARCHAR(20)    NOT NULL DEFAULT 'PENDIENTE',
        motivo          NVARCHAR(200)  NOT NULL,
        notas           NVARCHAR(1000) NULL,
        total           DECIMAL(12,2)  NOT NULL,
        metodoReembolso VARCHAR(20)    NOT NULL DEFAULT 'EFECTIVO',
        ventaId         INT            NOT NULL,
        creadoPorId     INT            NULL,
        revisadoPorId   INT            NULL,
        createdAt       DATETIME2      NOT NULL DEFAULT GETDATE(),
        CONSTRAINT FK_dev_venta      FOREIGN KEY (ventaId)       REFERENCES ventas(id)    ON DELETE NO ACTION,
        CONSTRAINT FK_dev_creadoPor  FOREIGN KEY (creadoPorId)   REFERENCES usuarios(id)  ON DELETE NO ACTION,
        CONSTRAINT FK_dev_revisadoPor FOREIGN KEY (revisadoPorId) REFERENCES usuarios(id) ON DELETE NO ACTION
      )
    `);

    await qr.query(`
      IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'devolucion_detalles')
      CREATE TABLE devolucion_detalles (
        id                 INT IDENTITY(1,1) PRIMARY KEY,
        cantidad           INT           NOT NULL,
        precioUnitario     DECIMAL(10,2) NOT NULL,
        total              DECIMAL(12,2) NOT NULL,
        regresaAInventario BIT           NOT NULL DEFAULT 1,
        devolucionId       INT           NOT NULL,
        articuloId         INT           NOT NULL,
        CONSTRAINT FK_dd_devolucion FOREIGN KEY (devolucionId) REFERENCES devoluciones(id) ON DELETE CASCADE,
        CONSTRAINT FK_dd_articulo   FOREIGN KEY (articuloId)   REFERENCES articulos(id)    ON DELETE NO ACTION
      )
    `);
  }

  public async down(qr: QueryRunner): Promise<void> {
    await qr.query(`IF EXISTS (SELECT * FROM sys.tables WHERE name = 'devolucion_detalles') DROP TABLE devolucion_detalles`);
    await qr.query(`IF EXISTS (SELECT * FROM sys.tables WHERE name = 'devoluciones') DROP TABLE devoluciones`);
  }
}
