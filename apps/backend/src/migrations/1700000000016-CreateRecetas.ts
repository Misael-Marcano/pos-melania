import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateRecetas1700000000016 implements MigrationInterface {
  async up(qr: QueryRunner): Promise<void> {
    await qr.query(`
      IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'recetas')
      BEGIN
        CREATE TABLE recetas (
          id                  INT IDENTITY(1,1) PRIMARY KEY,
          nombre              NVARCHAR(200) NOT NULL,
          descripcion         NVARCHAR(MAX) NULL,
          articuloResultadoId INT           NOT NULL,
          cantidadResultado   DECIMAL(10,3) NOT NULL DEFAULT 1,
          activa              BIT           NOT NULL DEFAULT 1,
          createdAt           DATETIME2     NOT NULL DEFAULT GETDATE(),
          updatedAt           DATETIME2     NOT NULL DEFAULT GETDATE(),
          CONSTRAINT FK_receta_articulo FOREIGN KEY (articuloResultadoId) REFERENCES articulos(id)
        )
      END
    `);
    await qr.query(`
      IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'receta_ingredientes')
      BEGIN
        CREATE TABLE receta_ingredientes (
          id        INT IDENTITY(1,1) PRIMARY KEY,
          recetaId  INT           NOT NULL,
          articuloId INT          NOT NULL,
          cantidad  DECIMAL(10,3) NOT NULL,
          CONSTRAINT FK_ri_receta   FOREIGN KEY (recetaId)   REFERENCES recetas(id)   ON DELETE CASCADE,
          CONSTRAINT FK_ri_articulo FOREIGN KEY (articuloId) REFERENCES articulos(id)
        )
      END
    `);
  }

  async down(qr: QueryRunner): Promise<void> {
    await qr.query(`IF EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'receta_ingredientes') DROP TABLE receta_ingredientes`);
    await qr.query(`IF EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'recetas') DROP TABLE recetas`);
  }
}
