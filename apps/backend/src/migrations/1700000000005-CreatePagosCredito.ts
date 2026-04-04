import { MigrationInterface, QueryRunner, Table, TableForeignKey } from 'typeorm';

export class CreatePagosCredito1700000000005 implements MigrationInterface {
  name = 'CreatePagosCredito1700000000005';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(new Table({
      name: 'pagos_credito',
      columns: [
        { name: 'id',          type: 'int',      isPrimary: true, isGenerated: true, generationStrategy: 'increment' },
        { name: 'monto',       type: 'decimal',  precision: 12, scale: 2 },
        { name: 'notas',       type: 'varchar',  length: '500', isNullable: true },
        { name: 'clienteId',   type: 'int' },
        { name: 'creadoPorId', type: 'int',      isNullable: true },
        { name: 'createdAt',   type: 'datetime2', default: 'GETDATE()' },
      ],
    }), true);

    await queryRunner.createForeignKey('pagos_credito', new TableForeignKey({
      columnNames: ['clienteId'],
      referencedTableName: 'clientes',
      referencedColumnNames: ['id'],
      onDelete: 'CASCADE',
    }));
    await queryRunner.createForeignKey('pagos_credito', new TableForeignKey({
      columnNames: ['creadoPorId'],
      referencedTableName: 'usuarios',
      referencedColumnNames: ['id'],
      onDelete: 'SET NULL',
    }));
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('pagos_credito', true);
  }
}
