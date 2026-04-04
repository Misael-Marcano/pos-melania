import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAuditLog1700000000006 implements MigrationInterface {
  async up(qr: QueryRunner): Promise<void> {
    await qr.query(`
      CREATE TABLE audit_logs (
        id           INT IDENTITY(1,1) PRIMARY KEY,
        tabla        NVARCHAR(100) NOT NULL,
        operacion    VARCHAR(10)   NOT NULL,
        registroId   INT           NULL,
        descripcion  NVARCHAR(500) NOT NULL,
        valorAnterior NVARCHAR(MAX) NULL,
        valorNuevo    NVARCHAR(MAX) NULL,
        usuarioId    INT           NULL,
        usuarioNombre NVARCHAR(200) NULL,
        ip           VARCHAR(45)   NULL,
        createdAt    DATETIME2     NOT NULL DEFAULT GETDATE(),
        CONSTRAINT FK_audit_usuario FOREIGN KEY (usuarioId)
          REFERENCES usuarios(id) ON DELETE SET NULL
      )
    `);
    await qr.query(`CREATE INDEX IX_audit_tabla      ON audit_logs(tabla)`);
    await qr.query(`CREATE INDEX IX_audit_registroId ON audit_logs(registroId)`);
    await qr.query(`CREATE INDEX IX_audit_usuarioId  ON audit_logs(usuarioId)`);
    await qr.query(`CREATE INDEX IX_audit_createdAt  ON audit_logs(createdAt)`);
  }

  async down(qr: QueryRunner): Promise<void> {
    await qr.query(`DROP TABLE audit_logs`);
  }
}
