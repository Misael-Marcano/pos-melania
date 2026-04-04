import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateOrdenesCompra1700000000003 implements MigrationInterface {
  name = 'CreateOrdenesCompra1700000000003';

  public async up(qr: QueryRunner): Promise<void> {
    await qr.query(`
      IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'ordenes_compra')
      CREATE TABLE ordenes_compra (
        id            INT IDENTITY(1,1) PRIMARY KEY,
        estado        VARCHAR(20)    NOT NULL DEFAULT 'BORRADOR',
        total         DECIMAL(10,2)  NOT NULL DEFAULT 0,
        notas         NVARCHAR(1000) NULL,
        fechaEsperada DATE           NULL,
        fechaRecibida DATETIME2      NULL,
        proveedorId   INT            NULL,
        usuarioId     INT            NULL,
        createdAt     DATETIME2      NOT NULL DEFAULT GETDATE(),
        updatedAt     DATETIME2      NOT NULL DEFAULT GETDATE(),
        CONSTRAINT FK_oc_proveedor FOREIGN KEY (proveedorId) REFERENCES proveedores(id) ON DELETE SET NULL,
        CONSTRAINT FK_oc_usuario   FOREIGN KEY (usuarioId)   REFERENCES usuarios(id)    ON DELETE SET NULL
      )
    `);

    await qr.query(`
      IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'orden_compra_detalles')
      CREATE TABLE orden_compra_detalles (
        id               INT IDENTITY(1,1) PRIMARY KEY,
        cantidad         INT           NOT NULL,
        cantidadRecibida INT           NOT NULL DEFAULT 0,
        costoUnitario    DECIMAL(10,2) NOT NULL,
        total            DECIMAL(10,2) NOT NULL,
        ordenId          INT           NOT NULL,
        articuloId       INT           NOT NULL,
        CONSTRAINT FK_ocd_orden    FOREIGN KEY (ordenId)    REFERENCES ordenes_compra(id) ON DELETE CASCADE,
        CONSTRAINT FK_ocd_articulo FOREIGN KEY (articuloId) REFERENCES articulos(id)      ON DELETE NO ACTION
      )
    `);
  }

  public async down(qr: QueryRunner): Promise<void> {
    await qr.query(`IF EXISTS (SELECT * FROM sys.tables WHERE name = 'orden_compra_detalles') DROP TABLE orden_compra_detalles`);
    await qr.query(`IF EXISTS (SELECT * FROM sys.tables WHERE name = 'ordenes_compra') DROP TABLE ordenes_compra`);
  }
}
