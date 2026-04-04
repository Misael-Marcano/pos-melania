import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';

export class CreateBaseTables1700000000001 implements MigrationInterface {
  name = 'CreateBaseTables1700000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {

    // ── usuarios ────────────────────────────────────────────────────────────
    await queryRunner.createTable(new Table({
      name: 'usuarios',
      columns: [
        { name: 'id',            type: 'int',          isPrimary: true, isGenerated: true, generationStrategy: 'increment' },
        { name: 'nombre',        type: 'varchar',       length: '200' },
        { name: 'email',         type: 'varchar',       length: '200', isUnique: true },
        { name: 'passwordHash',  type: 'varchar',       length: '200' },
        { name: 'rol',           type: 'varchar',       length: '20',  default: "'cajero'" },
        { name: 'foto',          type: 'varchar',       length: '500', isNullable: true },
        { name: 'telefono',      type: 'varchar',       length: '20',  isNullable: true },
        { name: 'activo',        type: 'bit',           default: 1 },
        { name: 'ultimoAcceso',  type: 'datetime2',     isNullable: true },
        { name: 'refreshToken',  type: 'varchar',       length: '500', isNullable: true },
        { name: 'createdAt',     type: 'datetime2',     default: 'GETDATE()' },
        { name: 'updatedAt',     type: 'datetime2',     default: 'GETDATE()' },
      ],
    }), true);

    // ── tiendas ─────────────────────────────────────────────────────────────
    await queryRunner.createTable(new Table({
      name: 'tiendas',
      columns: [
        { name: 'id',        type: 'int',     isPrimary: true, isGenerated: true, generationStrategy: 'increment' },
        { name: 'nombre',    type: 'varchar', length: '200' },
        { name: 'direccion', type: 'varchar', length: '500', isNullable: true },
        { name: 'telefono',  type: 'varchar', length: '20',  isNullable: true },
        { name: 'email',     type: 'varchar', length: '200', isNullable: true },
        { name: 'activo',    type: 'bit',     default: 1 },
      ],
    }), true);

    // ── categorias ──────────────────────────────────────────────────────────
    await queryRunner.createTable(new Table({
      name: 'categorias',
      columns: [
        { name: 'id',     type: 'int',     isPrimary: true, isGenerated: true, generationStrategy: 'increment' },
        { name: 'nombre', type: 'varchar', length: '100', isUnique: true },
        { name: 'activo', type: 'bit',     default: 1 },
      ],
    }), true);

    // ── articulos ───────────────────────────────────────────────────────────
    await queryRunner.createTable(new Table({
      name: 'articulos',
      columns: [
        { name: 'id',           type: 'int',            isPrimary: true, isGenerated: true, generationStrategy: 'increment' },
        { name: 'codigoBarras', type: 'varchar',         length: '50',  isUnique: true },
        { name: 'nombre',       type: 'varchar',         length: '200' },
        { name: 'costo',        type: 'decimal',         precision: 10, scale: 2, default: 0 },
        { name: 'precioVenta',  type: 'decimal',         precision: 10, scale: 2 },
        { name: 'cantidad',     type: 'int',             isNullable: true },
        { name: 'tamanio',      type: 'varchar',         length: '50',  isNullable: true },
        { name: 'foto',         type: 'varchar',         length: '500', isNullable: true },
        { name: 'activo',       type: 'bit',             default: 1 },
        { name: 'categoriaId',  type: 'int',             isNullable: true },
        { name: 'createdAt',    type: 'datetime2',       default: 'GETDATE()' },
        { name: 'updatedAt',    type: 'datetime2',       default: 'GETDATE()' },
      ],
    }), true);

    await queryRunner.createIndex('articulos', new TableIndex({ name: 'IDX_articulos_nombre',       columnNames: ['nombre'] }));
    await queryRunner.createIndex('articulos', new TableIndex({ name: 'IDX_articulos_codigoBarras', columnNames: ['codigoBarras'] }));

    await queryRunner.createForeignKey('articulos', new TableForeignKey({
      columnNames:            ['categoriaId'],
      referencedTableName:    'categorias',
      referencedColumnNames:  ['id'],
      onDelete:               'SET NULL',
    }));

    // ── clientes ────────────────────────────────────────────────────────────
    await queryRunner.createTable(new Table({
      name: 'clientes',
      columns: [
        { name: 'id',        type: 'int',     isPrimary: true, isGenerated: true, generationStrategy: 'increment' },
        { name: 'nombre',    type: 'varchar', length: '200' },
        { name: 'compania',  type: 'varchar', length: '200', isNullable: true },
        { name: 'correo',    type: 'varchar', length: '200', isNullable: true },
        { name: 'telefono',  type: 'varchar', length: '20',  isNullable: true },
        { name: 'saldo',     type: 'decimal', precision: 12, scale: 2, default: 0 },
        { name: 'activo',    type: 'bit',     default: 1 },
        { name: 'createdAt', type: 'datetime2', default: 'GETDATE()' },
        { name: 'updatedAt', type: 'datetime2', default: 'GETDATE()' },
      ],
    }), true);

    await queryRunner.createIndex('clientes', new TableIndex({ name: 'IDX_clientes_nombre', columnNames: ['nombre'] }));

    // ── empleados ───────────────────────────────────────────────────────────
    await queryRunner.createTable(new Table({
      name: 'empleados',
      columns: [
        { name: 'id',        type: 'int',     isPrimary: true, isGenerated: true, generationStrategy: 'increment' },
        { name: 'nombre',    type: 'varchar', length: '200' },
        { name: 'correo',    type: 'varchar', length: '200', isUnique: true },
        { name: 'telefono',  type: 'varchar', length: '20',  isNullable: true },
        { name: 'rol',       type: 'varchar', length: '20',  default: "'cajero'" },
        { name: 'foto',      type: 'varchar', length: '500', isNullable: true },
        { name: 'activo',    type: 'bit',     default: 1 },
        { name: 'createdAt', type: 'datetime2', default: 'GETDATE()' },
        { name: 'updatedAt', type: 'datetime2', default: 'GETDATE()' },
      ],
    }), true);

    // ── proveedores ─────────────────────────────────────────────────────────
    await queryRunner.createTable(new Table({
      name: 'proveedores',
      columns: [
        { name: 'id',        type: 'int',     isPrimary: true, isGenerated: true, generationStrategy: 'increment' },
        { name: 'nombre',    type: 'varchar', length: '200' },
        { name: 'contacto',  type: 'varchar', length: '200', isNullable: true },
        { name: 'telefono',  type: 'varchar', length: '20',  isNullable: true },
        { name: 'correo',    type: 'varchar', length: '200', isNullable: true },
        { name: 'direccion', type: 'varchar', length: '500', isNullable: true },
        { name: 'rnc',       type: 'varchar', length: '20',  isNullable: true },
        { name: 'activo',    type: 'bit',     default: 1 },
        { name: 'createdAt', type: 'datetime2', default: 'GETDATE()' },
      ],
    }), true);

    // ── ventas ──────────────────────────────────────────────────────────────
    await queryRunner.createTable(new Table({
      name: 'ventas',
      columns: [
        { name: 'id',          type: 'int',     isPrimary: true, isGenerated: true, generationStrategy: 'increment' },
        { name: 'subtotal',    type: 'decimal', precision: 12, scale: 2 },
        { name: 'descuento',   type: 'decimal', precision: 12, scale: 2, default: 0 },
        { name: 'impuesto',    type: 'decimal', precision: 12, scale: 2, default: 0 },
        { name: 'total',       type: 'decimal', precision: 12, scale: 2 },
        { name: 'metodoPago',  type: 'varchar', length: '20',  default: "'EFECTIVO'" },
        { name: 'comprobante', type: 'varchar', length: '30',  isNullable: true },
        { name: 'notas',       type: 'varchar', length: '500', isNullable: true },
        { name: 'fecha',       type: 'datetime2', default: 'GETDATE()' },
        { name: 'clienteId',   type: 'int', isNullable: true },
        { name: 'usuarioId',   type: 'int', isNullable: true },
      ],
    }), true);

    await queryRunner.createIndex('ventas', new TableIndex({ name: 'IDX_ventas_fecha',     columnNames: ['fecha'] }));
    await queryRunner.createIndex('ventas', new TableIndex({ name: 'IDX_ventas_clienteId', columnNames: ['clienteId'] }));

    await queryRunner.createForeignKey('ventas', new TableForeignKey({ columnNames: ['clienteId'],  referencedTableName: 'clientes',  referencedColumnNames: ['id'], onDelete: 'SET NULL' }));
    await queryRunner.createForeignKey('ventas', new TableForeignKey({ columnNames: ['usuarioId'],  referencedTableName: 'usuarios',  referencedColumnNames: ['id'], onDelete: 'SET NULL' }));

    // ── venta_detalles ──────────────────────────────────────────────────────
    await queryRunner.createTable(new Table({
      name: 'venta_detalles',
      columns: [
        { name: 'id',             type: 'int',     isPrimary: true, isGenerated: true, generationStrategy: 'increment' },
        { name: 'cantidad',       type: 'int' },
        { name: 'precioUnitario', type: 'decimal', precision: 10, scale: 2 },
        { name: 'descuento',      type: 'decimal', precision: 5,  scale: 2, default: 0 },
        { name: 'total',          type: 'decimal', precision: 12, scale: 2 },
        { name: 'ventaId',        type: 'int' },
        { name: 'articuloId',     type: 'int', isNullable: true },
      ],
    }), true);

    await queryRunner.createForeignKey('venta_detalles', new TableForeignKey({ columnNames: ['ventaId'],    referencedTableName: 'ventas',    referencedColumnNames: ['id'], onDelete: 'CASCADE' }));
    await queryRunner.createForeignKey('venta_detalles', new TableForeignKey({ columnNames: ['articuloId'], referencedTableName: 'articulos', referencedColumnNames: ['id'], onDelete: 'SET NULL' }));

    // ── gastos ──────────────────────────────────────────────────────────────
    await queryRunner.createTable(new Table({
      name: 'gastos',
      columns: [
        { name: 'id',               type: 'int',     isPrimary: true, isGenerated: true, generationStrategy: 'increment' },
        { name: 'escribe',          type: 'varchar', length: '200' },
        { name: 'descripcion',      type: 'varchar', length: '500', isNullable: true },
        { name: 'categoria',        type: 'varchar', length: '100' },
        { name: 'fecha',            type: 'date' },
        { name: 'cantidad',         type: 'decimal', precision: 12, scale: 2 },
        { name: 'impuesto',         type: 'decimal', precision: 12, scale: 2, default: 0 },
        { name: 'nombreRecipiente', type: 'varchar', length: '200', isNullable: true },
        { name: 'aprobadoPorId',    type: 'int',     isNullable: true },
        { name: 'createdAt',        type: 'datetime2', default: 'GETDATE()' },
      ],
    }), true);

    await queryRunner.createIndex('gastos', new TableIndex({ name: 'IDX_gastos_fecha',     columnNames: ['fecha'] }));
    await queryRunner.createIndex('gastos', new TableIndex({ name: 'IDX_gastos_categoria', columnNames: ['categoria'] }));
    await queryRunner.createForeignKey('gastos', new TableForeignKey({ columnNames: ['aprobadoPorId'], referencedTableName: 'usuarios', referencedColumnNames: ['id'], onDelete: 'SET NULL' }));

    // ── kits ────────────────────────────────────────────────────────────────
    await queryRunner.createTable(new Table({
      name: 'kits',
      columns: [
        { name: 'id',          type: 'int',     isPrimary: true, isGenerated: true, generationStrategy: 'increment' },
        { name: 'nombre',      type: 'varchar', length: '200' },
        { name: 'precio',      type: 'decimal', precision: 10, scale: 2 },
        { name: 'descripcion', type: 'varchar', length: '500', isNullable: true },
        { name: 'activo',      type: 'bit',     default: 1 },
        { name: 'createdAt',   type: 'datetime2', default: 'GETDATE()' },
      ],
    }), true);

    await queryRunner.createTable(new Table({
      name: 'kit_detalles',
      columns: [
        { name: 'id',         type: 'int', isPrimary: true, isGenerated: true, generationStrategy: 'increment' },
        { name: 'cantidad',   type: 'int', default: 1 },
        { name: 'kitId',      type: 'int' },
        { name: 'articuloId', type: 'int', isNullable: true },
      ],
    }), true);

    await queryRunner.createForeignKey('kit_detalles', new TableForeignKey({ columnNames: ['kitId'],      referencedTableName: 'kits',      referencedColumnNames: ['id'], onDelete: 'CASCADE' }));
    await queryRunner.createForeignKey('kit_detalles', new TableForeignKey({ columnNames: ['articuloId'], referencedTableName: 'articulos', referencedColumnNames: ['id'], onDelete: 'SET NULL' }));

    // ── comprobantes ────────────────────────────────────────────────────────
    await queryRunner.createTable(new Table({
      name: 'comprobantes',
      columns: [
        { name: 'id',               type: 'int',     isPrimary: true, isGenerated: true, generationStrategy: 'increment' },
        { name: 'descripcion',      type: 'varchar', length: '100' },
        { name: 'series',           type: 'varchar', length: '5',   default: "'B'" },
        { name: 'tipo',             type: 'varchar', length: '2' },
        { name: 'desde',            type: 'varchar', length: '20' },
        { name: 'hasta',            type: 'varchar', length: '20' },
        { name: 'secuenciaActual',  type: 'varchar', length: '20' },
        { name: 'activo',           type: 'bit',     default: 1 },
        { name: 'updatedAt',        type: 'datetime2', default: 'GETDATE()' },
      ],
    }), true);

    // ── caja_aperturas ──────────────────────────────────────────────────────
    await queryRunner.createTable(new Table({
      name: 'caja_aperturas',
      columns: [
        { name: 'id',                      type: 'int',    isPrimary: true, isGenerated: true, generationStrategy: 'increment' },
        { name: 'cajaNombre',              type: 'varchar', length: '50' },
        { name: 'montoApertura',           type: 'decimal', precision: 12, scale: 2 },
        { name: 'montoCierre',             type: 'decimal', precision: 12, scale: 2, isNullable: true },
        { name: 'denominacionesApertura',  type: 'nvarchar', length: 'max', isNullable: true },
        { name: 'denominacionesCierre',    type: 'nvarchar', length: 'max', isNullable: true },
        { name: 'fechaCierre',             type: 'datetime2', isNullable: true },
        { name: 'abierta',                 type: 'bit',     default: 1 },
        { name: 'usuarioId',               type: 'int',     isNullable: true },
        { name: 'fechaApertura',           type: 'datetime2', default: 'GETDATE()' },
      ],
    }), true);

    await queryRunner.createForeignKey('caja_aperturas', new TableForeignKey({ columnNames: ['usuarioId'], referencedTableName: 'usuarios', referencedColumnNames: ['id'], onDelete: 'SET NULL' }));

    // ── configuracion ───────────────────────────────────────────────────────
    await queryRunner.createTable(new Table({
      name: 'configuracion',
      columns: [
        { name: 'id',                      type: 'int',     isPrimary: true, isGenerated: true, generationStrategy: 'increment' },
        { name: 'nombreCompania',          type: 'varchar', length: '200' },
        { name: 'rnc',                     type: 'varchar', length: '20',  isNullable: true },
        { name: 'sitioWeb',                type: 'varchar', length: '200', isNullable: true },
        { name: 'simboloMoneda',           type: 'varchar', length: '10',  default: "'RDS'" },
        { name: 'numeroDecimales',         type: 'int',     default: 2 },
        { name: 'preciosIncluyenImpuesto', type: 'bit',     default: 1 },
        { name: 'tasaImpuesto1Nombre',     type: 'varchar', length: '50',  isNullable: true },
        { name: 'tasaImpuesto1',           type: 'decimal', precision: 5,  scale: 2, default: 0 },
        { name: 'tasaImpuesto2Nombre',     type: 'varchar', length: '50',  isNullable: true },
        { name: 'tasaImpuesto2',           type: 'decimal', precision: 5,  scale: 2, default: 0 },
        { name: 'logotipoUrl',             type: 'varchar', length: '500', isNullable: true },
        { name: 'comprobanteDefecto',      type: 'varchar', length: '10',  default: "'02'" },
        { name: 'updatedAt',               type: 'datetime2', default: 'GETDATE()' },
      ],
    }), true);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const tables = [
      'configuracion','caja_aperturas','comprobantes','kit_detalles','kits',
      'gastos','venta_detalles','ventas','proveedores','empleados',
      'clientes','articulos','categorias','tiendas','usuarios',
    ];
    for (const t of tables) {
      await queryRunner.dropTable(t, true, true, true);
    }
  }
}
