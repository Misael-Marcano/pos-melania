import { MigrationInterface, QueryRunner } from 'typeorm';

/** Sucursal asignada al usuario (cajero/soporte); admin suele ir sin asignación = acceso global */
export class UsuarioTienda1700000000019 implements MigrationInterface {
  name = 'UsuarioTienda1700000000019';

  public async up(qr: QueryRunner): Promise<void> {
    await qr.query(`
      IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'usuarios' AND COLUMN_NAME = 'tiendaId')
      BEGIN
        ALTER TABLE usuarios ADD tiendaId INT NULL;
        ALTER TABLE usuarios ADD CONSTRAINT FK_usuarios_tienda
          FOREIGN KEY (tiendaId) REFERENCES tiendas(id) ON DELETE NO ACTION;
        CREATE INDEX IX_usuarios_tiendaId ON usuarios(tiendaId);
      END
    `);
  }

  public async down(qr: QueryRunner): Promise<void> {
    await qr.query(`
      IF EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'usuarios' AND COLUMN_NAME = 'tiendaId')
      BEGIN
        ALTER TABLE usuarios DROP CONSTRAINT FK_usuarios_tienda;
        DROP INDEX IX_usuarios_tiendaId ON usuarios;
        ALTER TABLE usuarios DROP COLUMN tiendaId;
      END
    `);
  }
}
