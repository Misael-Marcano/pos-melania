import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePromociones1700000000015 implements MigrationInterface {
  async up(qr: QueryRunner): Promise<void> {
    await qr.query(`
      IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'promociones')
      BEGIN
        CREATE TABLE promociones (
          id            INT IDENTITY(1,1) PRIMARY KEY,
          codigo        NVARCHAR(50)  NOT NULL UNIQUE,
          nombre        NVARCHAR(200) NOT NULL,
          tipo          NVARCHAR(20)  NOT NULL DEFAULT 'PORCENTAJE',
          valor         DECIMAL(10,2) NOT NULL,
          montoMinimo   DECIMAL(12,2) NOT NULL DEFAULT 0,
          usoMaximo     INT           NULL,
          usosActuales  INT           NOT NULL DEFAULT 0,
          fechaInicio   DATE          NULL,
          fechaFin      DATE          NULL,
          activa        BIT           NOT NULL DEFAULT 1,
          createdAt     DATETIME2     NOT NULL DEFAULT GETDATE(),
          updatedAt     DATETIME2     NOT NULL DEFAULT GETDATE()
        )
      END
    `);
  }

  async down(qr: QueryRunner): Promise<void> {
    await qr.query(`IF EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'promociones') DROP TABLE promociones`);
  }
}
