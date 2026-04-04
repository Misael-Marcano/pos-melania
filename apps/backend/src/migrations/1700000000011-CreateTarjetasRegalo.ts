import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTarjetasRegalo1700000000011 implements MigrationInterface {
  async up(qr: QueryRunner) {
    await qr.query(`
      IF NOT EXISTS (
        SELECT 1 FROM INFORMATION_SCHEMA.TABLES
        WHERE TABLE_NAME = 'tarjetas_regalo'
      )
      CREATE TABLE tarjetas_regalo (
        id               INT IDENTITY(1,1) PRIMARY KEY,
        codigo           NVARCHAR(20)    NOT NULL UNIQUE,
        saldoInicial     DECIMAL(12,2)   NOT NULL,
        saldoActual      DECIMAL(12,2)   NOT NULL,
        estado           NVARCHAR(20)    NOT NULL DEFAULT 'ACTIVA',
        fechaVencimiento DATE            NULL,
        notas            NVARCHAR(500)   NULL,
        movimientosJson  NVARCHAR(MAX)   NULL,
        creadoPorId      INT             NULL,
        createdAt        DATETIME2       NOT NULL DEFAULT GETDATE(),
        updatedAt        DATETIME2       NOT NULL DEFAULT GETDATE(),
        CONSTRAINT FK_tarjetas_creadoPor
          FOREIGN KEY (creadoPorId) REFERENCES usuarios(id)
      )
    `);
  }

  async down(qr: QueryRunner) {
    await qr.query(`DROP TABLE IF EXISTS tarjetas_regalo`);
  }
}
