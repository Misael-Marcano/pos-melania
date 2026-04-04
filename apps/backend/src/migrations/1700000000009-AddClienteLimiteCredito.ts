import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddClienteLimiteCredito1700000000009 implements MigrationInterface {
  async up(qr: QueryRunner): Promise<void> {
    await qr.query(`
      ALTER TABLE clientes
      ADD limiteCredito DECIMAL(12,2) NOT NULL DEFAULT 0
    `);
  }

  async down(qr: QueryRunner): Promise<void> {
    await qr.query(`ALTER TABLE clientes DROP COLUMN limiteCredito`);
  }
}
