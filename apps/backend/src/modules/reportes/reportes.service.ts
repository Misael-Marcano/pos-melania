import { AppDataSource } from '../../config/database';

export class ReportesService {
  private ds = AppDataSource;

  async ventasPorDia(desde: string, hasta: string) {
    return this.ds.query(
      `SELECT CAST(fecha AS DATE) AS dia,
              COUNT(*)            AS totalVentas,
              SUM(total)          AS totalMonto
       FROM ventas
       WHERE CAST(fecha AS DATE) BETWEEN @0 AND @1
       GROUP BY CAST(fecha AS DATE)
       ORDER BY dia ASC`,
      [desde, hasta]
    );
  }

  async cierreCaja(aperturaId: number) {
    const ventas = await this.ds.query(
      `SELECT metodoPago, COUNT(*) AS cantidad, SUM(total) AS total
       FROM ventas v
       INNER JOIN caja_aperturas ca ON ca.id = @0
       WHERE v.fecha >= ca.fechaApertura
         AND (ca.fechaCierre IS NULL OR v.fecha <= ca.fechaCierre)
       GROUP BY metodoPago`,
      [aperturaId]
    );
    return ventas;
  }

  async resumenDia(fecha: string) {
    const [ventas]  = await this.ds.query(
      `SELECT COUNT(*) AS totalTransacciones, ISNULL(SUM(total),0) AS totalVentas
       FROM ventas WHERE CAST(fecha AS DATE) = @0`,
      [fecha]
    );
    const [efectivo] = await this.ds.query(
      `SELECT ISNULL(SUM(total),0) AS totalEfectivo
       FROM ventas WHERE CAST(fecha AS DATE) = @0 AND metodoPago = 'EFECTIVO'`,
      [fecha]
    );
    const [gastos] = await this.ds.query(
      `SELECT ISNULL(SUM(cantidad),0) AS totalGastos
       FROM gastos WHERE CAST(fecha AS DATE) = @0`,
      [fecha]
    );
    return { ...ventas, ...efectivo, ...gastos };
  }

  async topProductos(desde: string, hasta: string, limit = 10) {
    return this.ds.query(
      `SELECT TOP (@2) a.nombre,
              SUM(vd.cantidad)         AS unidadesVendidas,
              SUM(vd.total)            AS totalVentas
       FROM venta_detalles vd
       INNER JOIN articulos a ON a.id = vd.articuloId
       INNER JOIN ventas    v ON v.id = vd.ventaId
       WHERE CAST(v.fecha AS DATE) BETWEEN @0 AND @1
       GROUP BY a.id, a.nombre
       ORDER BY totalVentas DESC`,
      [desde, hasta, limit]
    );
  }

  // ── P&L ──────────────────────────────────────────────────────────────────
  async ganancias(desde: string, hasta: string) {
    const [ingresos] = await this.ds.query(
      `SELECT ISNULL(SUM(total),0) AS ingresos
       FROM ventas
       WHERE CAST(fecha AS DATE) BETWEEN @0 AND @1
         AND notas NOT LIKE '[ANULADA]%'`,
      [desde, hasta]
    );

    const [costo] = await this.ds.query(
      `SELECT ISNULL(SUM(vd.cantidad * a.costo),0) AS costoVentas
       FROM venta_detalles vd
       INNER JOIN articulos a ON a.id = vd.articuloId
       INNER JOIN ventas    v ON v.id = vd.ventaId
       WHERE CAST(v.fecha AS DATE) BETWEEN @0 AND @1
         AND v.notas NOT LIKE '[ANULADA]%'`,
      [desde, hasta]
    );

    const [gastos] = await this.ds.query(
      `SELECT ISNULL(SUM(cantidad),0) AS gastos
       FROM gastos
       WHERE CAST(fecha AS DATE) BETWEEN @0 AND @1`,
      [desde, hasta]
    );

    const [devoluciones] = await this.ds.query(
      `SELECT ISNULL(SUM(total),0) AS devoluciones
       FROM devoluciones
       WHERE estado = 'APROBADA'
         AND CAST(createdAt AS DATE) BETWEEN @0 AND @1`,
      [desde, hasta]
    );

    // Ventas por método de pago
    const ventasPorMetodo = await this.ds.query(
      `SELECT metodoPago,
              COUNT(*) AS cantidad,
              ISNULL(SUM(total),0) AS total
       FROM ventas
       WHERE CAST(fecha AS DATE) BETWEEN @0 AND @1
         AND notas NOT LIKE '[ANULADA]%'
       GROUP BY metodoPago
       ORDER BY total DESC`,
      [desde, hasta]
    );

    // Gastos por categoría
    const gastosPorCategoria = await this.ds.query(
      `SELECT categoria,
              COUNT(*) AS cantidad,
              ISNULL(SUM(cantidad),0) AS total
       FROM gastos
       WHERE CAST(fecha AS DATE) BETWEEN @0 AND @1
       GROUP BY categoria
       ORDER BY total DESC`,
      [desde, hasta]
    );

    const ingresosN    = Number(ingresos.ingresos);
    const costoN       = Number(costo.costoVentas);
    const gastosN      = Number(gastos.gastos);
    const devolucionesN = Number(devoluciones.devoluciones);
    const utilidadBruta = ingresosN - costoN - devolucionesN;
    const utilidadNeta  = utilidadBruta - gastosN;
    const margenBruto   = ingresosN > 0 ? (utilidadBruta / ingresosN) * 100 : 0;
    const margenNeto    = ingresosN > 0 ? (utilidadNeta  / ingresosN) * 100 : 0;

    return {
      desde,
      hasta,
      ingresos:       ingresosN,
      costoVentas:    costoN,
      devoluciones:   devolucionesN,
      utilidadBruta,
      gastos:         gastosN,
      utilidadNeta,
      margenBruto:    Number(margenBruto.toFixed(2)),
      margenNeto:     Number(margenNeto.toFixed(2)),
      ventasPorMetodo,
      gastosPorCategoria,
    };
  }

  // ── Inventario valorizado ─────────────────────────────────────────────────
  async inventarioValorizado() {
    const articulos = await this.ds.query(
      `SELECT a.nombre,
              a.codigoBarras,
              a.cantidad,
              a.costo,
              a.precioVenta,
              ISNULL(a.cantidad,0) * a.costo        AS valorCosto,
              ISNULL(a.cantidad,0) * a.precioVenta  AS valorVenta,
              c.nombre AS categoria
       FROM articulos a
       LEFT JOIN categorias c ON c.id = a.categoriaId
       WHERE a.activo = 1
       ORDER BY valorCosto DESC`
    );

    const [totales] = await this.ds.query(
      `SELECT ISNULL(SUM(ISNULL(cantidad,0) * costo),0)       AS totalCosto,
              ISNULL(SUM(ISNULL(cantidad,0) * precioVenta),0) AS totalVenta,
              COUNT(*)                                         AS totalArticulos,
              ISNULL(SUM(ISNULL(cantidad,0)),0)               AS totalUnidades
       FROM articulos
       WHERE activo = 1`
    );

    // Por categoría
    const porCategoria = await this.ds.query(
      `SELECT c.nombre AS categoria,
              COUNT(a.id) AS articulos,
              ISNULL(SUM(ISNULL(a.cantidad,0) * a.costo),0) AS valorCosto
       FROM articulos a
       LEFT JOIN categorias c ON c.id = a.categoriaId
       WHERE a.activo = 1
       GROUP BY c.nombre
       ORDER BY valorCosto DESC`
    );

    return {
      articulos,
      totales: {
        totalCosto:      Number(totales.totalCosto),
        totalVenta:      Number(totales.totalVenta),
        totalArticulos:  Number(totales.totalArticulos),
        totalUnidades:   Number(totales.totalUnidades),
        gananciaLatente: Number(totales.totalVenta) - Number(totales.totalCosto),
      },
      porCategoria,
    };
  }

  // ── DGII 607 — Registro de Ventas ─────────────────────────────────────────
  async dgii607(periodo: string): Promise<string> {
    const year  = parseInt(periodo.substring(0, 4));
    const month = parseInt(periodo.substring(4, 6));
    const desde = new Date(year, month - 1, 1);
    const hasta = new Date(year, month, 0, 23, 59, 59, 999);

    const ventas = await this.ds.query(
      `SELECT v.total, v.metodoPago, v.comprobante, v.fecha,
              c.tipoIdentificacion, c.numeroIdentificacion
       FROM ventas v
       LEFT JOIN clientes c ON c.id = v.clienteId
       WHERE v.fecha >= @0 AND v.fecha <= @1
         AND v.notas NOT LIKE '[ANULADA]%'
       ORDER BY v.fecha`,
      [desde, hasta]
    );

    const [cfg] = await this.ds.query(`SELECT TOP 1 rnc FROM configuracion`).catch(() => [{}]);
    const rncEmpresa = cfg?.rnc ?? '';

    const fmtDate = (d: Date | string) => {
      const dt = new Date(d);
      return `${dt.getFullYear()}${String(dt.getMonth()+1).padStart(2,'0')}${String(dt.getDate()).padStart(2,'0')}`;
    };
    const fmtNum = (n: number) => n === 0 ? '' : n.toFixed(2);
    const metodoMap: Record<string, string> = {
      EFECTIVO: '1', TRANSFERENCIA: '2', TARJETA: '3', CREDITO: '4',
    };
    const tipoIdMap: Record<string, string> = {
      RNC: '1', CEDULA: '2', PASAPORTE: '3',
    };

    const lines: string[] = [];
    for (const v of ventas) {
      const total  = Number(v.total);
      const itbis  = Number((total - total / 1.18).toFixed(2));
      const base   = Number((total / 1.18).toFixed(2));
      const tipoNCF = v.comprobante ? v.comprobante.substring(1, 3) : '';
      const rnc    = v.numeroIdentificacion ?? '';
      const tipoId = v.tipoIdentificacion   ? (tipoIdMap[v.tipoIdentificacion] ?? '') : '';
      const forma  = metodoMap[v.metodoPago] ?? '1';
      const fecha  = fmtDate(v.fecha);

      lines.push([
        rnc, tipoId, tipoNCF,
        v.comprobante ?? '', '',
        fecha, fecha,
        '', fmtNum(base), fmtNum(total),
        fmtNum(itbis), '', '', '', '', '', '', '', '',
        forma,
      ].join('|'));
    }

    return [`607|${rncEmpresa}|${periodo}|${lines.length}`, ...lines].join('\r\n');
  }

  // ── DGII 606 — Registro de Compras ────────────────────────────────────────
  async dgii606(periodo: string): Promise<string> {
    const year  = parseInt(periodo.substring(0, 4));
    const month = parseInt(periodo.substring(4, 6));
    const desde = new Date(year, month - 1, 1);
    const hasta = new Date(year, month, 0, 23, 59, 59, 999);

    const ordenes = await this.ds.query(
      `SELECT oc.total, oc.fechaRecibida, oc.createdAt,
              p.rnc AS proveedorRnc
       FROM ordenes_compra oc
       LEFT JOIN proveedores p ON p.id = oc.proveedorId
       WHERE oc.estado = 'RECIBIDA'
         AND oc.fechaRecibida >= @0 AND oc.fechaRecibida <= @1
       ORDER BY oc.fechaRecibida`,
      [desde, hasta]
    );

    // También incluir gastos del período como compras
    const gastos = await this.ds.query(
      `SELECT cantidad AS total, fecha
       FROM gastos
       WHERE fecha >= @0 AND fecha <= @1`,
      [desde, hasta]
    );

    const [cfg] = await this.ds.query(`SELECT TOP 1 rnc FROM configuracion`).catch(() => [{}]);
    const rncEmpresa = cfg?.rnc ?? '';

    const fmtDate = (d: Date | string) => {
      const dt = new Date(d);
      return `${dt.getFullYear()}${String(dt.getMonth()+1).padStart(2,'0')}${String(dt.getDate()).padStart(2,'0')}`;
    };
    const fmtNum = (n: number) => n === 0 ? '' : n.toFixed(2);

    const lines: string[] = [];

    // Órdenes de compra
    for (const o of ordenes) {
      const total  = Number(o.total);
      const itbis  = Number((total - total / 1.18).toFixed(2));
      const base   = Number((total / 1.18).toFixed(2));
      const fecha  = fmtDate(o.fechaRecibida ?? o.createdAt);

      lines.push([
        o.proveedorRnc ?? '', o.proveedorRnc ? '1' : '',
        '5',           // tipo bienes: inventario
        '', '',        // NCF proveedor (no tenemos)
        fecha, fecha,
        '', fmtNum(base), fmtNum(total),
        fmtNum(itbis), '', '', '', '', '',
        '', '', '', '', '', '',
        '2',           // transferencia/cheque
      ].join('|'));
    }

    // Gastos (tipo 7 = otras deducciones)
    for (const g of gastos) {
      const total = Number(g.total);
      const fecha = fmtDate(g.fecha);
      lines.push([
        '', '', '7', '', '',
        fecha, fecha,
        fmtNum(total), '', fmtNum(total),
        '', '', '', '', '', '',
        '', '', '', '', '', '',
        '1',
      ].join('|'));
    }

    return [`606|${rncEmpresa}|${periodo}|${lines.length}`, ...lines].join('\r\n');
  }

  // ── Top clientes ──────────────────────────────────────────────────────────
  async topClientes(desde: string, hasta: string, limit = 10) {
    return this.ds.query(
      `SELECT TOP (@2)
              c.id,
              c.nombre,
              c.compania,
              c.saldo,
              COUNT(v.id)      AS totalTransacciones,
              ISNULL(SUM(v.total),0) AS totalCompras
       FROM clientes c
       INNER JOIN ventas v ON v.clienteId = c.id
       WHERE CAST(v.fecha AS DATE) BETWEEN @0 AND @1
         AND v.notas NOT LIKE '[ANULADA]%'
       GROUP BY c.id, c.nombre, c.compania, c.saldo
       ORDER BY totalCompras DESC`,
      [desde, hasta, limit]
    );
  }
}
