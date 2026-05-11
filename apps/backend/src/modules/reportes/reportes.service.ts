import { AppDataSource } from '../../config/database';
import { AppError } from '../../middlewares/error.middleware';

export class ReportesService {
  private ds = AppDataSource;

  async ventasPorDia(desde: string, hasta: string, tenantId: number) {
    return this.ds.query(
      `SELECT CAST(v.fecha AS DATE) AS dia,
              COUNT(*)            AS totalVentas,
              SUM(v.total)          AS totalMonto
       FROM ventas v
       INNER JOIN caja_aperturas ca ON ca.id = v.cajaAperturaId
       INNER JOIN tiendas t ON t.id = ca.tiendaId
       WHERE CAST(v.fecha AS DATE) BETWEEN @0 AND @1
         AND t.tenantId = @2
       GROUP BY CAST(v.fecha AS DATE)
       ORDER BY dia ASC`,
      [desde, hasta, tenantId]
    );
  }

  async cierreCaja(aperturaId: number, tenantId: number) {
    const apRows = await this.ds.query(
      `SELECT 1 AS ok FROM caja_aperturas ca
       INNER JOIN tiendas t ON t.id = ca.tiendaId
       WHERE ca.id = @0 AND t.tenantId = @1`,
      [aperturaId, tenantId]
    );
    if (!apRows?.length) throw new AppError('Sesión de caja no encontrada', 404);

    const ventas = await this.ds.query(
      `SELECT v.metodoPago, COUNT(*) AS cantidad, SUM(v.total) AS total
       FROM ventas v
       INNER JOIN caja_aperturas ca ON ca.id = v.cajaAperturaId
       INNER JOIN tiendas t ON t.id = ca.tiendaId AND t.tenantId = @1
       WHERE ca.id = @0
         AND v.fecha >= ca.fechaApertura
         AND (ca.fechaCierre IS NULL OR v.fecha <= ca.fechaCierre)
         AND CHARINDEX('[ANULADA]', ISNULL(v.notas, '')) = 0
       GROUP BY v.metodoPago`,
      [aperturaId, tenantId]
    );
    return ventas;
  }

  async resumenDia(fecha: string, tenantId: number) {
    const [ventas]  = await this.ds.query(
      `SELECT COUNT(*) AS totalTransacciones, ISNULL(SUM(v.total),0) AS totalVentas
       FROM ventas v
       INNER JOIN caja_aperturas ca ON ca.id = v.cajaAperturaId
       INNER JOIN tiendas t ON t.id = ca.tiendaId
       WHERE CAST(v.fecha AS DATE) = @0 AND t.tenantId = @1`,
      [fecha, tenantId]
    );
    const [efectivo] = await this.ds.query(
      `SELECT ISNULL(SUM(v.total),0) AS totalEfectivo
       FROM ventas v
       INNER JOIN caja_aperturas ca ON ca.id = v.cajaAperturaId
       INNER JOIN tiendas t ON t.id = ca.tiendaId
       WHERE CAST(v.fecha AS DATE) = @0 AND v.metodoPago = 'EFECTIVO' AND t.tenantId = @1`,
      [fecha, tenantId]
    );
    const [gastos] = await this.ds.query(
      `SELECT ISNULL(SUM(cantidad),0) AS totalGastos
       FROM gastos WHERE CAST(fecha AS DATE) = @0 AND tenantId = @1`,
      [fecha, tenantId]
    );
    return { ...ventas, ...efectivo, ...gastos };
  }

  async topProductos(desde: string, hasta: string, limit = 10, tenantId: number) {
    return this.ds.query(
      `SELECT TOP (@2) a.nombre,
              SUM(vd.cantidad)         AS unidadesVendidas,
              SUM(vd.total)            AS totalVentas
       FROM venta_detalles vd
       INNER JOIN articulos a ON a.id = vd.articuloId
       INNER JOIN ventas    v ON v.id = vd.ventaId
       INNER JOIN caja_aperturas ca ON ca.id = v.cajaAperturaId
       INNER JOIN tiendas t ON t.id = ca.tiendaId
       WHERE CAST(v.fecha AS DATE) BETWEEN @0 AND @1
         AND a.tenantId = @3
         AND t.tenantId = @3
       GROUP BY a.id, a.nombre
       ORDER BY totalVentas DESC`,
      [desde, hasta, limit, tenantId]
    );
  }

  // ── P&L ──────────────────────────────────────────────────────────────────
  async ganancias(desde: string, hasta: string, tenantId: number) {
    const [ingresos] = await this.ds.query(
      `SELECT ISNULL(SUM(v.total),0) AS ingresos
       FROM ventas v
       INNER JOIN caja_aperturas ca ON ca.id = v.cajaAperturaId
       INNER JOIN tiendas t ON t.id = ca.tiendaId
       WHERE CAST(v.fecha AS DATE) BETWEEN @0 AND @1
         AND v.notas NOT LIKE '[ANULADA]%'
         AND t.tenantId = @2`,
      [desde, hasta, tenantId]
    );

    const [costo] = await this.ds.query(
      `SELECT ISNULL(SUM(vd.cantidad * a.costo),0) AS costoVentas
       FROM venta_detalles vd
       INNER JOIN articulos a ON a.id = vd.articuloId
       INNER JOIN ventas    v ON v.id = vd.ventaId
       INNER JOIN caja_aperturas ca ON ca.id = v.cajaAperturaId
       INNER JOIN tiendas t ON t.id = ca.tiendaId
       WHERE CAST(v.fecha AS DATE) BETWEEN @0 AND @1
         AND v.notas NOT LIKE '[ANULADA]%'
         AND a.tenantId = @2
         AND t.tenantId = @2`,
      [desde, hasta, tenantId]
    );

    const [gastos] = await this.ds.query(
      `SELECT ISNULL(SUM(cantidad),0) AS gastos
       FROM gastos
       WHERE CAST(fecha AS DATE) BETWEEN @0 AND @1
         AND tenantId = @2`,
      [desde, hasta, tenantId]
    );

    const [devoluciones] = await this.ds.query(
      `SELECT ISNULL(SUM(d.total),0) AS devoluciones
       FROM devoluciones d
       INNER JOIN ventas v ON v.id = d.ventaId
       INNER JOIN caja_aperturas ca ON ca.id = v.cajaAperturaId
       INNER JOIN tiendas t ON t.id = ca.tiendaId
       WHERE d.estado = 'APROBADA'
         AND CAST(d.createdAt AS DATE) BETWEEN @0 AND @1
         AND d.tenantId = @2
         AND t.tenantId = @2`,
      [desde, hasta, tenantId]
    );

    // Ventas por método de pago
    const ventasPorMetodo = await this.ds.query(
      `SELECT v.metodoPago,
              COUNT(*) AS cantidad,
              ISNULL(SUM(v.total),0) AS total
       FROM ventas v
       INNER JOIN caja_aperturas ca ON ca.id = v.cajaAperturaId
       INNER JOIN tiendas t ON t.id = ca.tiendaId
       WHERE CAST(v.fecha AS DATE) BETWEEN @0 AND @1
         AND v.notas NOT LIKE '[ANULADA]%'
         AND t.tenantId = @2
       GROUP BY v.metodoPago
       ORDER BY total DESC`,
      [desde, hasta, tenantId]
    );

    // Gastos por categoría
    const gastosPorCategoria = await this.ds.query(
      `SELECT categoria,
              COUNT(*) AS cantidad,
              ISNULL(SUM(cantidad),0) AS total
       FROM gastos
       WHERE CAST(fecha AS DATE) BETWEEN @0 AND @1
         AND tenantId = @2
       GROUP BY categoria
       ORDER BY total DESC`,
      [desde, hasta, tenantId]
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
  async inventarioValorizado(tenantId: number) {
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
       LEFT JOIN categorias c ON c.id = a.categoriaId AND c.tenantId = @0
       WHERE a.activo = 1 AND a.tenantId = @0
       ORDER BY valorCosto DESC`,
      [tenantId]
    );

    const [totales] = await this.ds.query(
      `SELECT ISNULL(SUM(ISNULL(cantidad,0) * costo),0)       AS totalCosto,
              ISNULL(SUM(ISNULL(cantidad,0) * precioVenta),0) AS totalVenta,
              COUNT(*)                                         AS totalArticulos,
              ISNULL(SUM(ISNULL(cantidad,0)),0)               AS totalUnidades
       FROM articulos
       WHERE activo = 1 AND tenantId = @0`,
      [tenantId]
    );

    // Por categoría
    const porCategoria = await this.ds.query(
      `SELECT c.nombre AS categoria,
              COUNT(a.id) AS articulos,
              ISNULL(SUM(ISNULL(a.cantidad,0) * a.costo),0) AS valorCosto
       FROM articulos a
       LEFT JOIN categorias c ON c.id = a.categoriaId AND c.tenantId = @0
       WHERE a.activo = 1 AND a.tenantId = @0
       GROUP BY c.nombre
       ORDER BY valorCosto DESC`,
      [tenantId]
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
  async dgii607(periodo: string, tenantId: number): Promise<string> {
    const year  = parseInt(periodo.substring(0, 4));
    const month = parseInt(periodo.substring(4, 6));
    const desde = new Date(year, month - 1, 1);
    const hasta = new Date(year, month, 0, 23, 59, 59, 999);

    const ventas = await this.ds.query(
      `SELECT v.total, v.metodoPago, v.comprobante, v.fecha,
              c.tipoIdentificacion, c.numeroIdentificacion
       FROM ventas v
       LEFT JOIN clientes c ON c.id = v.clienteId AND c.tenantId = @2
       INNER JOIN caja_aperturas ca ON ca.id = v.cajaAperturaId
       INNER JOIN tiendas t ON t.id = ca.tiendaId
       WHERE v.fecha >= @0 AND v.fecha <= @1
         AND v.notas NOT LIKE '[ANULADA]%'
         AND t.tenantId = @2
       ORDER BY v.fecha`,
      [desde, hasta, tenantId]
    );

    const [cfg] = await this.ds
      .query(`SELECT TOP 1 rnc FROM configuracion WHERE tenantId = @0`, [tenantId])
      .catch(() => [{}]);
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
  async dgii606(periodo: string, tenantId: number): Promise<string> {
    const year  = parseInt(periodo.substring(0, 4));
    const month = parseInt(periodo.substring(4, 6));
    const desde = new Date(year, month - 1, 1);
    const hasta = new Date(year, month, 0, 23, 59, 59, 999);

    const ordenes = await this.ds.query(
      `SELECT oc.total, oc.fechaRecibida, oc.createdAt,
              p.rnc AS proveedorRnc
       FROM ordenes_compra oc
       LEFT JOIN proveedores p ON p.id = oc.proveedorId AND p.tenantId = oc.tenantId
       WHERE oc.estado = 'RECIBIDA'
         AND oc.fechaRecibida >= @0 AND oc.fechaRecibida <= @1
         AND oc.tenantId = @2
       ORDER BY oc.fechaRecibida`,
      [desde, hasta, tenantId]
    );

    // También incluir gastos del período como compras
    const gastos = await this.ds.query(
      `SELECT cantidad AS total, fecha
       FROM gastos
       WHERE fecha >= @0 AND fecha <= @1 AND tenantId = @2`,
      [desde, hasta, tenantId]
    );

    const [cfg] = await this.ds
      .query(`SELECT TOP 1 rnc FROM configuracion WHERE tenantId = @0`, [tenantId])
      .catch(() => [{}]);
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
  async topClientes(desde: string, hasta: string, limit = 10, tenantId: number) {
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
       INNER JOIN caja_aperturas ca ON ca.id = v.cajaAperturaId
       INNER JOIN tiendas t ON t.id = ca.tiendaId
       WHERE CAST(v.fecha AS DATE) BETWEEN @0 AND @1
         AND v.notas NOT LIKE '[ANULADA]%'
         AND c.tenantId = @3
         AND t.tenantId = @3
       GROUP BY c.id, c.nombre, c.compania, c.saldo
       ORDER BY totalCompras DESC`,
      [desde, hasta, limit, tenantId]
    );
  }

  /**
   * Flujos de ventas y gastos por sucursal (ventas ligadas a sesión de caja con esa tienda).
   */
  async resumenPorSucursal(tiendaId: number, desde: string, hasta: string, tenantId: number) {
    const [tienda] = await this.ds.query(
      `SELECT id, nombre FROM tiendas WHERE id = @0 AND tenantId = @1`,
      [tiendaId, tenantId]
    );
    if (!tienda) throw new AppError('Sucursal no encontrada', 404);

    const [ventasAgg] = await this.ds.query(
      `SELECT COUNT(*) AS n, ISNULL(SUM(v.total),0) AS total
       FROM ventas v
       INNER JOIN caja_aperturas ca ON ca.id = v.cajaAperturaId
       INNER JOIN tiendas t ON t.id = ca.tiendaId AND t.tenantId = @3
       WHERE ca.tiendaId = @0
         AND CAST(v.fecha AS DATE) BETWEEN @1 AND @2
         AND CHARINDEX('[ANULADA]', ISNULL(v.notas,'')) = 0`,
      [tiendaId, desde, hasta, tenantId]
    );

    const ventasPorMetodo = await this.ds.query(
      `SELECT v.metodoPago, COUNT(*) AS cantidad, ISNULL(SUM(v.total),0) AS total
       FROM ventas v
       INNER JOIN caja_aperturas ca ON ca.id = v.cajaAperturaId
       INNER JOIN tiendas t ON t.id = ca.tiendaId AND t.tenantId = @3
       WHERE ca.tiendaId = @0
         AND CAST(v.fecha AS DATE) BETWEEN @1 AND @2
         AND CHARINDEX('[ANULADA]', ISNULL(v.notas,'')) = 0
       GROUP BY v.metodoPago
       ORDER BY total DESC`,
      [tiendaId, desde, hasta, tenantId]
    );

    const [gastosAgg] = await this.ds.query(
      `SELECT ISNULL(SUM(cantidad),0) AS total, COUNT(*) AS n
       FROM gastos
       WHERE tiendaId = @0
         AND tenantId = @3
         AND CAST(fecha AS DATE) BETWEEN @1 AND @2`,
      [tiendaId, desde, hasta, tenantId]
    );

    const gastosPorCategoria = await this.ds.query(
      `SELECT categoria, ISNULL(SUM(cantidad),0) AS total, COUNT(*) AS n
       FROM gastos
       WHERE tiendaId = @0
         AND tenantId = @3
         AND CAST(fecha AS DATE) BETWEEN @1 AND @2
       GROUP BY categoria
       ORDER BY total DESC`,
      [tiendaId, desde, hasta, tenantId]
    );

    const cierresDeCaja = await this.ds.query(
      `SELECT ca.id, ca.cajaNombre, ca.cajaId, ca.montoApertura, ca.montoCierre,
              ca.fechaApertura, ca.fechaCierre, ca.abierta
       FROM caja_aperturas ca
       INNER JOIN tiendas t ON t.id = ca.tiendaId AND t.tenantId = @3
       WHERE ca.tiendaId = @0
         AND (
           (ca.abierta = 1 AND CAST(ca.fechaApertura AS DATE) <= @2)
           OR (ca.abierta = 0 AND CAST(ISNULL(ca.fechaCierre, ca.fechaApertura) AS DATE) BETWEEN @1 AND @2)
         )
       ORDER BY ISNULL(ca.fechaCierre, ca.fechaApertura) DESC`,
      [tiendaId, desde, hasta, tenantId]
    );

    return {
      tienda:     { id: tienda.id, nombre: tienda.nombre },
      desde,
      hasta,
      ventas: {
        transacciones: Number(ventasAgg?.n ?? 0),
        total:         Number(ventasAgg?.total ?? 0),
      },
      ventasPorMetodo,
      gastos: {
        registros: Number(gastosAgg?.n ?? 0),
        total:     Number(gastosAgg?.total ?? 0),
      },
      gastosPorCategoria,
      sesionesCaja: cierresDeCaja,
    };
  }

  /**
   * Ventas por usuario (registrador) con sesión de caja — auditoría.
   * `tiendaId` null = todas las sucursales (solo contexto admin).
   */
  async ventasPorUsuario(desde: string, hasta: string, tiendaId: number | null, tenantId: number) {
    if (tiendaId != null) {
      return this.ds.query(
        `SELECT u.id AS usuarioId, u.nombre AS usuarioNombre,
                COUNT(*) AS transacciones, ISNULL(SUM(v.total),0) AS totalMonto
         FROM ventas v
         INNER JOIN usuarios u ON u.id = v.usuarioId AND u.tenantId = @3
         INNER JOIN caja_aperturas ca ON ca.id = v.cajaAperturaId
         INNER JOIN tiendas t ON t.id = ca.tiendaId
         WHERE CAST(v.fecha AS DATE) BETWEEN @0 AND @1
           AND CHARINDEX('[ANULADA]', ISNULL(v.notas,'')) = 0
           AND ca.tiendaId = @2
           AND t.tenantId = @3
         GROUP BY u.id, u.nombre
         ORDER BY totalMonto DESC`,
        [desde, hasta, tiendaId, tenantId]
      );
    }
    return this.ds.query(
      `SELECT u.id AS usuarioId, u.nombre AS usuarioNombre,
              COUNT(*) AS transacciones, ISNULL(SUM(v.total),0) AS totalMonto
       FROM ventas v
       INNER JOIN usuarios u ON u.id = v.usuarioId AND u.tenantId = @2
       INNER JOIN caja_aperturas ca ON ca.id = v.cajaAperturaId
       INNER JOIN tiendas t ON t.id = ca.tiendaId
       WHERE CAST(v.fecha AS DATE) BETWEEN @0 AND @1
         AND CHARINDEX('[ANULADA]', ISNULL(v.notas,'')) = 0
         AND t.tenantId = @2
       GROUP BY u.id, u.nombre
       ORDER BY totalMonto DESC`,
      [desde, hasta, tenantId]
    );
  }

  /** Ventas agrupadas por caja (nombre) y sucursal — auditoría. */
  async ventasPorCaja(desde: string, hasta: string, tiendaId: number | null, tenantId: number) {
    if (tiendaId != null) {
      return this.ds.query(
        `SELECT ISNULL(t.nombre, '') AS tiendaNombre,
                ISNULL(c.nombre, ca.cajaNombre) AS cajaNombre,
                COUNT(*) AS transacciones, ISNULL(SUM(v.total),0) AS totalMonto
         FROM ventas v
         INNER JOIN caja_aperturas ca ON ca.id = v.cajaAperturaId
         LEFT JOIN cajas c ON c.id = ca.cajaId
           AND EXISTS (SELECT 1 FROM tiendas tcx WHERE tcx.id = c.tiendaId AND tcx.tenantId = @3)
         LEFT JOIN tiendas t ON t.id = ca.tiendaId
         WHERE CAST(v.fecha AS DATE) BETWEEN @0 AND @1
           AND CHARINDEX('[ANULADA]', ISNULL(v.notas,'')) = 0
           AND ca.tiendaId = @2
           AND t.tenantId = @3
         GROUP BY ISNULL(t.nombre, ''), ISNULL(c.nombre, ca.cajaNombre)
         ORDER BY totalMonto DESC`,
        [desde, hasta, tiendaId, tenantId]
      );
    }
    return this.ds.query(
      `SELECT ISNULL(t.nombre, '') AS tiendaNombre,
              ISNULL(c.nombre, ca.cajaNombre) AS cajaNombre,
              COUNT(*) AS transacciones, ISNULL(SUM(v.total),0) AS totalMonto
       FROM ventas v
       INNER JOIN caja_aperturas ca ON ca.id = v.cajaAperturaId
       LEFT JOIN cajas c ON c.id = ca.cajaId
         AND EXISTS (SELECT 1 FROM tiendas tcx WHERE tcx.id = c.tiendaId AND tcx.tenantId = @2)
       LEFT JOIN tiendas t ON t.id = ca.tiendaId
       WHERE CAST(v.fecha AS DATE) BETWEEN @0 AND @1
         AND CHARINDEX('[ANULADA]', ISNULL(v.notas,'')) = 0
         AND t.tenantId = @2
       GROUP BY ISNULL(t.nombre, ''), ISNULL(c.nombre, ca.cajaNombre)
       ORDER BY totalMonto DESC`,
      [desde, hasta, tenantId]
    );
  }
}
