import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddClienteIdentificacion1700000000007 implements MigrationInterface {
  async up(qr: QueryRunner): Promise<void> {
    await qr.query(`
      IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('clientes') AND name = 'tipoIdentificacion')
      ALTER TABLE clientes ADD tipoIdentificacion VARCHAR(20) NULL
    `);
    await qr.query(`
      IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('clientes') AND name = 'numeroIdentificacion')
      ALTER TABLE clientes ADD numeroIdentificacion NVARCHAR(30) NULL
    `);
  }

  async down(qr: QueryRunner): Promise<void> {
    await qr.query(`ALTER TABLE clientes DROP COLUMN IF EXISTS tipoIdentificacion`);
    await qr.query(`ALTER TABLE clientes DROP COLUMN IF EXISTS numeroIdentificacion`);
  }
}
