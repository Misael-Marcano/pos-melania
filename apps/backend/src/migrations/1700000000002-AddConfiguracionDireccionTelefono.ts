import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddConfiguracionDireccionTelefono1700000000002 implements MigrationInterface {
  name = 'AddConfiguracionDireccionTelefono1700000000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn('configuracion', new TableColumn({
      name: 'direccion',
      type: 'varchar',
      length: '300',
      isNullable: true,
    }));
    await queryRunner.addColumn('configuracion', new TableColumn({
      name: 'telefono',
      type: 'varchar',
      length: '30',
      isNullable: true,
    }));
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('configuracion', 'telefono');
    await queryRunner.dropColumn('configuracion', 'direccion');
  }
}
