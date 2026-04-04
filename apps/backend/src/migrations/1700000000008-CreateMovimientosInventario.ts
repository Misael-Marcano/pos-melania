import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateMovimientosInventario1700000000008 implements MigrationInterface {
  async up(qr: QueryRunner): Promise<void> {
    await qr.query(`
      CREATE TABLE movimientos_inventario (
        id             INT IDENTITY(1,1) PRIMARY KEY,
        articuloId     INT           NOT NULL,
        tipo           VARCHAR(30)   NOT NULL,
        cantidad       INT           NOT NULL,
        stockAntes     INT           NOT NULL,
        stockDespues   INT           NOT NULL,
        referenciaId   INT           NULL,
        referenciaTipo VARCHAR(100)  NULL,
        notas          NVARCHAR(500) NULL,
        usuarioId      INT           NULL,
        createdAt      DATETIME2     NOT NULL DEFAULT GETDATE(),
        CONSTRAINT FK_movimiento_articulo FOREIGN KEY (articuloId)
          REFERENCES articulos(id) ON DELETE CASCADE,
        CONSTRAINT FK_movimiento_usuario FOREIGN KEY (usuarioId)
          REFERENCES usuarios(id) ON DELETE SET NULL
      )
    `);
    await qr.query(`CREATE INDEX IX_movimientos_articuloId ON movimientos_inventario(articuloId)`);
    await qr.query(`CREATE INDEX IX_movimientos_tipo       ON movimientos_inventario(tipo)`);
    await qr.query(`CREATE INDEX IX_movimientos_createdAt  ON movimientos_inventario(createdAt)`);
  }

  async down(qr: QueryRunner): Promise<void> {
    await qr.query(`DROP TABLE movimientos_inventario`);
  }
}
