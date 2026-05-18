import { AppDataSource } from '../../config/database';
import { AppError } from '../../middlewares/error.middleware';
import { resolveFiscalProvider } from '../../fiscal';
import type { FiscalTaxSplit } from '../../fiscal';
import {
  VENTA_ACTIVA_SQL,
  sqlTiendaOpcional,
  aggregateVentasPorMetodo,
  dgiiPeriodoBounds,
  computeGananciasResumen,
  mesMtdBounds,
  mesAnteriorMtdBounds,
  mesEtiqueta,
  pctVariacion,
  aggregateCarteraBuckets,
  carteraBucketId,
  CARTERA_BUCKETS,
} from './reportes-query';
import type { ReportesStockAlertaQuery } from './dto/reportes.dto';
import type { InventarioValorizadoQuery } from './dto/reportes.dto';
import {
  fetchConciliacionCaja,
  listConciliacionCaja,
} from './conciliacion-caja';
import { sqlFechaDia, reportesTimezone } from './reportes-timezone';
import { computeCotizacionConversion } from './reportes-query';
import { buildVentasResumenPdf } from './reportes-pdf';

type FiscalTaxSplitFn = (total: number) => FiscalTaxSplit;

export class ReportesService {
  private ds = AppDataSource;

  /** Fragmento SQL: fecha calendario en zona del negocio (`REPORTES_TIMEZONE`). */
  private fd(column: string): string {
    return sqlFechaDia(column);
  }

  /** ITBIS/base según jurisdicción fiscal del tenant (`FiscalProvider` + `tasaImpuesto1`). */
  private async fiscalTaxSplitForTenant(tenantId: number): Promise<FiscalTaxSplitFn> {
    const [cfg] = await this.ds
      .query(
        `SELECT TOP 1 fiscalJurisdiccion, tasaImpuesto1 FROM configuracion WHERE tenantId = @0`,
        [tenantId],
      )
      .catch(() => [{}]);
    const provider = resolveFiscalProvider(cfg?.fiscalJurisdiccion ?? null);
    const tasa =
      cfg?.tasaImpuesto1 != null && Number(cfg.tasaImpuesto1) > 0
        ? Number(cfg.tasaImpuesto1)
        : null;
    const ctx = { tasaImpuestoPct: tasa };
    return (total: number) => provider.splitItbisIncluido(total, ctx);
  }

  private async ventasPorMetodoEnRango(
    desde: string,
    hasta: string,
    tenantId: number,
    tiendaId: number | null,
  ) {
    const filas = await this.ds.query(
      `SELECT v.metodoPago, v.total, v.metodosPago
       FROM ventas v
       INNER JOIN caja_aperturas ca ON ca.id = v.cajaAperturaId
       INNER JOIN tiendas t ON t.id = ca.tiendaId
       WHERE ${this.fd('v.fecha')} BETWEEN @0 AND @1
         AND t.tenantId = @2
         AND ${VENTA_ACTIVA_SQL}
         AND ${sqlTiendaOpcional(3)}`,
      [desde, hasta, tenantId, tiendaId],
    );
    return aggregateVentasPorMetodo(filas);
  }

  async ventasPorDia(
    desde: string,
    hasta: string,
    tenantId: number,
    tiendaId: number | null = null,
  ) {
    return this.ds.query(
      `SELECT ${this.fd('v.fecha')} AS dia,
              COUNT(*)            AS totalVentas,
              SUM(v.total)          AS totalMonto
       FROM ventas v
       INNER JOIN caja_aperturas ca ON ca.id = v.cajaAperturaId
       INNER JOIN tiendas t ON t.id = ca.tiendaId
       WHERE ${this.fd('v.fecha')} BETWEEN @0 AND @1
         AND t.tenantId = @2
         AND ${VENTA_ACTIVA_SQL}
         AND ${sqlTiendaOpcional(3)}
       GROUP BY ${this.fd('v.fecha')}
       ORDER BY dia ASC`,
      [desde, hasta, tenantId, tiendaId],
    );
  }

  async conciliacionCaja(aperturaId: number, tenantId: number) {
    return fetchConciliacionCaja(this.ds, aperturaId, tenantId);
  }

  async conciliacionCajaLista(
    desde: string,
    hasta: string,
    tenantId: number,
    tiendaId: number | null = null,
    limit = 50,
  ) {
    return listConciliacionCaja(this.ds, desde, hasta, tenantId, tiendaId, limit);
  }

  async cierreCaja(aperturaId: number, tenantId: number) {
    const apRows = await this.ds.query(
      `SELECT 1 AS ok FROM caja_aperturas ca
       INNER JOIN tiendas t ON t.id = ca.tiendaId
       WHERE ca.id = @0 AND t.tenantId = @1`,
      [aperturaId, tenantId],
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
         AND ${VENTA_ACTIVA_SQL}
       GROUP BY v.metodoPago`,
      [aperturaId, tenantId],
    );
    return ventas;
  }

  async resumenDia(
    fecha: string,
    tenantId: number,
    tiendaId: number | null = null,
  ) {
    const baseJoin = `
       FROM ventas v
       INNER JOIN caja_aperturas ca ON ca.id = v.cajaAperturaId
       INNER JOIN tiendas t ON t.id = ca.tiendaId
       WHERE ${this.fd('v.fecha')} = @0
         AND t.tenantId = @1
         AND ${VENTA_ACTIVA_SQL}
         AND ${sqlTiendaOpcional(2)}`;

    const [ventas] = await this.ds.query(
      `SELECT COUNT(*) AS totalTransacciones, ISNULL(SUM(v.total),0) AS totalVentas
       ${baseJoin}`,
      [fecha, tenantId, tiendaId],
    );
    const [efectivo] = await this.ds.query(
      `SELECT ISNULL(SUM(v.total),0) AS totalEfectivo
       ${baseJoin}
         AND v.metodoPago = 'EFECTIVO'`,
      [fecha, tenantId, tiendaId],
    );
    const [gastos] = await this.ds.query(
      `SELECT ISNULL(SUM(cantidad),0) AS totalGastos
       FROM gastos
       WHERE ${this.fd('fecha')} = @0
         AND tenantId = @1
         AND (@2 IS NULL OR tiendaId IS NULL OR tiendaId = @2)`,
      [fecha, tenantId, tiendaId],
    );
    return { ...ventas, ...efectivo, ...gastos };
  }

  async topProductos(
    desde: string,
    hasta: string,
    limit = 10,
    tenantId: number,
    tiendaId: number | null = null,
  ) {
    return this.ds.query(
      `SELECT TOP (@2) a.nombre,
              SUM(vd.cantidad)         AS unidadesVendidas,
              SUM(vd.total)            AS totalVentas
       FROM venta_detalles vd
       INNER JOIN articulos a ON a.id = vd.articuloId
       INNER JOIN ventas    v ON v.id = vd.ventaId
       INNER JOIN caja_aperturas ca ON ca.id = v.cajaAperturaId
       INNER JOIN tiendas t ON t.id = ca.tiendaId
       WHERE ${this.fd('v.fecha')} BETWEEN @0 AND @1
         AND a.tenantId = @3
         AND t.tenantId = @3
         AND ${VENTA_ACTIVA_SQL}
         AND ${sqlTiendaOpcional(4)}
       GROUP BY a.id, a.nombre
       ORDER BY totalVentas DESC`,
      [desde, hasta, limit, tenantId, tiendaId],
    );
  }

  private async ventasResumenEnRango(
    desde: string,
    hasta: string,
    tenantId: number,
    tiendaId: number | null,
  ) {
    const [row] = await this.ds.query(
      `SELECT COUNT(*) AS totalVentas, ISNULL(SUM(v.total),0) AS totalMonto
       FROM ventas v
       INNER JOIN caja_aperturas ca ON ca.id = v.cajaAperturaId
       INNER JOIN tiendas t ON t.id = ca.tiendaId
       WHERE ${this.fd('v.fecha')} BETWEEN @0 AND @1
         AND t.tenantId = @2
         AND ${VENTA_ACTIVA_SQL}
         AND ${sqlTiendaOpcional(3)}`,
      [desde, hasta, tenantId, tiendaId],
    );
    const totalVentas = Number(row?.totalVentas ?? 0);
    const totalMonto = Number(row?.totalMonto ?? 0);
    return {
      totalVentas,
      totalMonto,
      ticketPromedio: totalVentas > 0 ? Number((totalMonto / totalVentas).toFixed(2)) : 0,
    };
  }

  private async gananciasInputs(
    desde: string,
    hasta: string,
    tenantId: number,
    tiendaId: number | null,
  ) {
    const ventaScope = `
       FROM ventas v
       INNER JOIN caja_aperturas ca ON ca.id = v.cajaAperturaId
       INNER JOIN tiendas t ON t.id = ca.tiendaId
       WHERE ${this.fd('v.fecha')} BETWEEN @0 AND @1
         AND t.tenantId = @2
         AND ${VENTA_ACTIVA_SQL}
         AND ${sqlTiendaOpcional(3)}`;

    const [ingresos] = await this.ds.query(
      `SELECT ISNULL(SUM(v.total),0) AS ingresos ${ventaScope}`,
      [desde, hasta, tenantId, tiendaId],
    );

    const [costo] = await this.ds.query(
      `SELECT ISNULL(SUM(vd.cantidad * a.costo),0) AS costoVentas
       FROM venta_detalles vd
       INNER JOIN articulos a ON a.id = vd.articuloId
       INNER JOIN ventas    v ON v.id = vd.ventaId
       INNER JOIN caja_aperturas ca ON ca.id = v.cajaAperturaId
       INNER JOIN tiendas t ON t.id = ca.tiendaId
       WHERE ${this.fd('v.fecha')} BETWEEN @0 AND @1
         AND ${VENTA_ACTIVA_SQL}
         AND a.tenantId = @2
         AND t.tenantId = @2
         AND ${sqlTiendaOpcional(3)}`,
      [desde, hasta, tenantId, tiendaId],
    );

    const [gastos] = await this.ds.query(
      `SELECT ISNULL(SUM(cantidad),0) AS gastos
       FROM gastos
       WHERE ${this.fd('fecha')} BETWEEN @0 AND @1
         AND tenantId = @2
         AND (@3 IS NULL OR tiendaId IS NULL OR tiendaId = @3)`,
      [desde, hasta, tenantId, tiendaId],
    );

    const [devoluciones] = await this.ds.query(
      `SELECT ISNULL(SUM(d.total),0) AS devoluciones
       FROM devoluciones d
       INNER JOIN ventas v ON v.id = d.ventaId
       INNER JOIN caja_aperturas ca ON ca.id = v.cajaAperturaId
       INNER JOIN tiendas t ON t.id = ca.tiendaId
       WHERE d.estado = 'APROBADA'
         AND ${this.fd('d.createdAt')} BETWEEN @0 AND @1
         AND d.tenantId = @2
         AND t.tenantId = @2
         AND ${sqlTiendaOpcional(3)}`,
      [desde, hasta, tenantId, tiendaId],
    );

    return computeGananciasResumen({
      ingresos: Number(ingresos.ingresos),
      costoVentas: Number(costo.costoVentas),
      gastos: Number(gastos.gastos),
      devoluciones: Number(devoluciones.devoluciones),
    });
  }

  async compararPeriodos(
    referencia: string,
    tenantId: number,
    tiendaId: number | null = null,
  ) {
    const actualBounds = mesMtdBounds(referencia);
    const anteriorBounds = mesAnteriorMtdBounds(referencia);

    const [actualVentas, anteriorVentas, actualPnl, anteriorPnl] = await Promise.all([
      this.ventasResumenEnRango(actualBounds.desde, actualBounds.hasta, tenantId, tiendaId),
      this.ventasResumenEnRango(anteriorBounds.desde, anteriorBounds.hasta, tenantId, tiendaId),
      this.gananciasInputs(actualBounds.desde, actualBounds.hasta, tenantId, tiendaId),
      this.gananciasInputs(anteriorBounds.desde, anteriorBounds.hasta, tenantId, tiendaId),
    ]);

    const periodo = (bounds: { desde: string; hasta: string }, ventas: typeof actualVentas, pnl: typeof actualPnl) => ({
      ...bounds,
      etiqueta: mesEtiqueta(bounds.desde),
      ventas,
      pnl: {
        ingresos: pnl.ingresos,
        utilidadBruta: pnl.utilidadBruta,
        utilidadNeta: pnl.utilidadNeta,
        margenNeto: pnl.margenNeto,
        gastos: pnl.gastos,
      },
    });

    return {
      referencia,
      nota: 'Comparación MTD: mismos días del mes actual vs mes anterior.',
      actual: periodo(actualBounds, actualVentas, actualPnl),
      anterior: periodo(anteriorBounds, anteriorVentas, anteriorPnl),
      variacion: {
        totalMontoPct: pctVariacion(actualVentas.totalMonto, anteriorVentas.totalMonto),
        transaccionesPct: pctVariacion(actualVentas.totalVentas, anteriorVentas.totalVentas),
        ticketPromedioPct: pctVariacion(actualVentas.ticketPromedio, anteriorVentas.ticketPromedio),
        ingresosPct: pctVariacion(actualPnl.ingresos, anteriorPnl.ingresos),
        utilidadNetaPct: pctVariacion(actualPnl.utilidadNeta, anteriorPnl.utilidadNeta),
        margenNetoPts: Number((actualPnl.margenNeto - anteriorPnl.margenNeto).toFixed(1)),
      },
    };
  }

  async ganancias(
    desde: string,
    hasta: string,
    tenantId: number,
    tiendaId: number | null = null,
  ) {
    const resumen = await this.gananciasInputs(desde, hasta, tenantId, tiendaId);
    const ventasPorMetodo = await this.ventasPorMetodoEnRango(desde, hasta, tenantId, tiendaId);

    const gastosPorCategoria = await this.ds.query(
      `SELECT categoria,
              COUNT(*) AS cantidad,
              ISNULL(SUM(cantidad),0) AS total
       FROM gastos
       WHERE ${this.fd('fecha')} BETWEEN @0 AND @1
         AND tenantId = @2
         AND (@3 IS NULL OR tiendaId IS NULL OR tiendaId = @3)
       GROUP BY categoria
       ORDER BY total DESC`,
      [desde, hasta, tenantId, tiendaId],
    );

    return {
      desde,
      hasta,
      ...resumen,
      ventasPorMetodo,
      gastosPorCategoria,
    };
  }

  private async inventarioTotalesYCategorias(tenantId: number) {
    const [totales] = await this.ds.query(
      `SELECT ISNULL(SUM(ISNULL(cantidad,0) * costo),0)       AS totalCosto,
              ISNULL(SUM(ISNULL(cantidad,0) * precioVenta),0) AS totalVenta,
              COUNT(*)                                         AS totalArticulos,
              ISNULL(SUM(ISNULL(cantidad,0)),0)               AS totalUnidades
       FROM articulos
       WHERE activo = 1 AND tenantId = @0`,
      [tenantId],
    );

    const porCategoria = await this.ds.query(
      `SELECT c.nombre AS categoria,
              COUNT(a.id) AS articulos,
              ISNULL(SUM(ISNULL(a.cantidad,0) * a.costo),0) AS valorCosto
       FROM articulos a
       LEFT JOIN categorias c ON c.id = a.categoriaId AND c.tenantId = @0
       WHERE a.activo = 1 AND a.tenantId = @0
       GROUP BY c.nombre
       ORDER BY valorCosto DESC`,
      [tenantId],
    );

    return {
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

  private inventarioWhereSql(q: string): { clause: string; params: unknown[] } {
    const term = q.trim();
    if (!term) return { clause: '', params: [] };
    const like = `%${term.replace(/[%_\[\]]/g, '')}%`;
    return {
      clause: ` AND (a.nombre LIKE @1 OR ISNULL(c.nombre, '') LIKE @1)`,
      params: [like],
    };
  }

  async inventarioValorizado(tenantId: number, query: InventarioValorizadoQuery) {
    const { totales, porCategoria } = await this.inventarioTotalesYCategorias(tenantId);
    const { clause, params } = this.inventarioWhereSql(query.q);
    const offset = (query.page - 1) * query.limit;

    const [{ total }] = await this.ds.query(
      `SELECT COUNT(*) AS total
       FROM articulos a
       LEFT JOIN categorias c ON c.id = a.categoriaId AND c.tenantId = @0
       WHERE a.activo = 1 AND a.tenantId = @0${clause}`,
      [tenantId, ...params],
    );

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
       WHERE a.activo = 1 AND a.tenantId = @0${clause}
       ORDER BY valorCosto DESC
       OFFSET @${params.length + 1} ROWS FETCH NEXT @${params.length + 2} ROWS ONLY`,
      [tenantId, ...params, offset, query.limit],
    );

    return {
      totales,
      porCategoria,
      articulos: {
        items: articulos,
        total: Number(total),
        page: query.page,
        limit: query.limit,
      },
    };
  }

  /** Listado completo para export CSV (máx. 15 000 filas). */
  async inventarioValorizadoExport(tenantId: number, q = '') {
    const { clause, params } = this.inventarioWhereSql(q);
    const articulos = await this.ds.query(
      `SELECT TOP 15000 a.nombre,
              a.codigoBarras,
              a.cantidad,
              a.costo,
              a.precioVenta,
              ISNULL(a.cantidad,0) * a.costo        AS valorCosto,
              ISNULL(a.cantidad,0) * a.precioVenta  AS valorVenta,
              c.nombre AS categoria
       FROM articulos a
       LEFT JOIN categorias c ON c.id = a.categoriaId AND c.tenantId = @0
       WHERE a.activo = 1 AND a.tenantId = @0${clause}
       ORDER BY valorCosto DESC`,
      [tenantId, ...params],
    );
    return articulos;
  }

  /** Stock bajo (≤ umbral) y artículos activos sin movimiento en N días. */
  async inventarioAlertas(tenantId: number, query: ReportesStockAlertaQuery) {
    const { umbral, diasSinMovimiento, limit } = query;

    const [counts] = await this.ds.query(
      `SELECT
         SUM(CASE WHEN ISNULL(a.cantidad, 0) = 0 THEN 1 ELSE 0 END) AS sinStock,
         SUM(CASE WHEN ISNULL(a.cantidad, 0) > 0 AND ISNULL(a.cantidad, 0) <= @1 THEN 1 ELSE 0 END) AS bajoUmbral,
         COUNT(*) AS totalBajo
       FROM articulos a
       WHERE a.activo = 1 AND a.tenantId = @0
         AND a.cantidad IS NOT NULL
         AND ISNULL(a.cantidad, 0) <= @1`,
      [tenantId, umbral],
    );

    const stockBajo = await this.ds.query(
      `SELECT TOP (@2) a.id,
              a.nombre,
              a.codigoBarras,
              a.cantidad,
              a.costo,
              a.precioVenta,
              c.nombre AS categoria
       FROM articulos a
       LEFT JOIN categorias c ON c.id = a.categoriaId AND c.tenantId = @0
       WHERE a.activo = 1 AND a.tenantId = @0
         AND a.cantidad IS NOT NULL
         AND ISNULL(a.cantidad, 0) <= @1
       ORDER BY a.cantidad ASC, a.nombre ASC`,
      [tenantId, umbral, limit],
    );

    const sinMovimiento = await this.ds.query(
      `SELECT TOP (@2) a.id,
              a.nombre,
              a.codigoBarras,
              a.cantidad,
              c.nombre AS categoria,
              ult.ultimoMovimiento
       FROM articulos a
       LEFT JOIN categorias c ON c.id = a.categoriaId AND c.tenantId = @0
       OUTER APPLY (
         SELECT MAX(m.createdAt) AS ultimoMovimiento
         FROM movimientos_inventario m
         WHERE m.articuloId = a.id
       ) ult
       WHERE a.activo = 1 AND a.tenantId = @0
         AND ISNULL(a.cantidad, 0) > 0
         AND (
           ult.ultimoMovimiento IS NULL
           OR ult.ultimoMovimiento < DATEADD(day, -@1, GETDATE())
         )
       ORDER BY ult.ultimoMovimiento ASC, a.nombre ASC`,
      [tenantId, diasSinMovimiento, limit],
    );

    return {
      umbral,
      diasSinMovimiento,
      resumen: {
        sinStock:     Number(counts?.sinStock ?? 0),
        bajoUmbral:   Number(counts?.bajoUmbral ?? 0),
        totalBajo:    Number(counts?.totalBajo ?? 0),
        sinMovimiento: sinMovimiento.length,
      },
      stockBajo,
      sinMovimiento,
    };
  }

  /** Cartera: clientes con saldo pendiente y antigüedad por venta a crédito más antigua. */
  async cartera(tenantId: number) {
    const filas = await this.ds.query(
      `SELECT c.id,
              c.nombre,
              c.compania,
              c.saldo,
              c.limiteCredito,
              MIN(v.fecha) AS fechaDeudaMasAntigua
       FROM clientes c
       LEFT JOIN ventas v ON v.clienteId = c.id
         AND v.metodoPago = 'CREDITO'
         AND ${VENTA_ACTIVA_SQL}
       WHERE c.tenantId = @0
         AND ISNULL(c.saldo, 0) > 0
       GROUP BY c.id, c.nombre, c.compania, c.saldo, c.limiteCredito
       ORDER BY c.saldo DESC`,
      [tenantId],
    );

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    type CarteraClienteRow = {
      id: number;
      nombre: string;
      compania: string | null;
      saldo: number;
      limiteCredito: number | null;
      fechaDeudaMasAntigua: string | null;
      diasAntiguedad: number | null;
      bucketId: ReturnType<typeof carteraBucketId>;
      bucketEtiqueta: string;
    };

    const clientes: CarteraClienteRow[] = (filas as Record<string, unknown>[]).map((row) => {
      const saldo = Number(row.saldo);
      const rawFecha = row.fechaDeudaMasAntigua as Date | string | null;
      let diasAntiguedad: number | null = null;
      if (rawFecha) {
        const f = new Date(rawFecha);
        f.setHours(0, 0, 0, 0);
        diasAntiguedad = Math.max(0, Math.round((hoy.getTime() - f.getTime()) / 86_400_000));
      }
      const bucketId = carteraBucketId(diasAntiguedad);
      const bucket = CARTERA_BUCKETS.find((b) => b.id === bucketId)!;
      return {
        id:                 Number(row.id),
        nombre:             String(row.nombre),
        compania:           row.compania != null ? String(row.compania) : null,
        saldo,
        limiteCredito:      row.limiteCredito != null ? Number(row.limiteCredito) : null,
        fechaDeudaMasAntigua: rawFecha
          ? (rawFecha instanceof Date ? rawFecha.toISOString() : String(rawFecha))
          : null,
        diasAntiguedad,
        bucketId,
        bucketEtiqueta: bucket.etiqueta,
      };
    });

    const totalCartera = clientes.reduce((s: number, c: CarteraClienteRow) => s + c.saldo, 0);
    const buckets = aggregateCarteraBuckets(
      clientes.map((c: CarteraClienteRow) => ({ saldo: c.saldo, diasAntiguedad: c.diasAntiguedad })),
    );

    return {
      resumen: {
        totalCartera,
        clientesConSaldo: clientes.length,
      },
      buckets,
      clientes,
    };
  }

  async dgii607Preview(periodo: string, tenantId: number) {
    const { desde, hasta } = dgiiPeriodoBounds(periodo);
    const [row] = await this.ds.query(
      `SELECT COUNT(*) AS lineas,
              ISNULL(SUM(v.total), 0) AS totalVentas,
              SUM(CASE WHEN v.comprobante IS NULL OR LTRIM(RTRIM(v.comprobante)) = ''
                  THEN 1 ELSE 0 END) AS sinNcf,
              SUM(CASE WHEN v.clienteId IS NOT NULL
                  AND (c.numeroIdentificacion IS NULL OR LTRIM(RTRIM(c.numeroIdentificacion)) = '')
                  THEN 1 ELSE 0 END) AS clienteSinIdentificacion
       FROM ventas v
       LEFT JOIN clientes c ON c.id = v.clienteId AND c.tenantId = @2
       INNER JOIN caja_aperturas ca ON ca.id = v.cajaAperturaId
       INNER JOIN tiendas t ON t.id = ca.tiendaId
       WHERE v.fecha >= @0 AND v.fecha <= @1
         AND ${VENTA_ACTIVA_SQL}
         AND t.tenantId = @2`,
      [desde, hasta, tenantId],
    );

    const [cfg] = await this.ds
      .query(`SELECT TOP 1 rnc FROM configuracion WHERE tenantId = @0`, [tenantId])
      .catch(() => [{}]);
    const rncEmpresa = (cfg?.rnc ?? '').trim();
    const splitItbis = await this.fiscalTaxSplitForTenant(tenantId);
    const totalVentas = Number(row.totalVentas);
    const itbisEstimado = splitItbis(totalVentas).itbis;

    const alertas: string[] = [];
    if (!rncEmpresa) alertas.push('Configure el RNC de la empresa en Configuración.');
    if (Number(row.sinNcf) > 0) {
      alertas.push(`${row.sinNcf} venta(s) sin NCF/comprobante fiscal.`);
    }
    if (Number(row.clienteSinIdentificacion) > 0) {
      alertas.push(`${row.clienteSinIdentificacion} venta(s) con cliente sin número de identificación.`);
    }
    if (Number(row.lineas) === 0) {
      alertas.push('No hay ventas activas en este período.');
    }

    return {
      periodo,
      lineas: Number(row.lineas),
      totalVentas,
      itbisEstimado,
      sinNcf: Number(row.sinNcf),
      clienteSinIdentificacion: Number(row.clienteSinIdentificacion),
      rncEmpresa: rncEmpresa || null,
      alertas,
    };
  }

  async dgii606Preview(periodo: string, tenantId: number) {
    const { desde, hasta } = dgiiPeriodoBounds(periodo);
    const [ord] = await this.ds.query(
      `SELECT COUNT(*) AS lineasOrdenes,
              ISNULL(SUM(oc.total), 0) AS totalOrdenes,
              SUM(CASE WHEN p.rnc IS NULL OR LTRIM(RTRIM(p.rnc)) = ''
                  THEN 1 ELSE 0 END) AS ordenSinRncProveedor
       FROM ordenes_compra oc
       LEFT JOIN proveedores p ON p.id = oc.proveedorId AND p.tenantId = oc.tenantId
       WHERE oc.estado = 'RECIBIDA'
         AND oc.fechaRecibida >= @0 AND oc.fechaRecibida <= @1
         AND oc.tenantId = @2`,
      [desde, hasta, tenantId],
    );
    const [gas] = await this.ds.query(
      `SELECT COUNT(*) AS lineasGastos,
              ISNULL(SUM(cantidad), 0) AS totalGastos
       FROM gastos
       WHERE fecha >= @0 AND fecha <= @1 AND tenantId = @2`,
      [desde, hasta, tenantId],
    );

    const [cfg] = await this.ds
      .query(`SELECT TOP 1 rnc FROM configuracion WHERE tenantId = @0`, [tenantId])
      .catch(() => [{}]);
    const rncEmpresa = (cfg?.rnc ?? '').trim();
    const lineas = Number(ord.lineasOrdenes) + Number(gas.lineasGastos);
    const totalCompras = Number(ord.totalOrdenes) + Number(gas.totalGastos);
    const splitItbis = await this.fiscalTaxSplitForTenant(tenantId);
    const itbisEstimado = splitItbis(totalCompras).itbis;

    const alertas: string[] = [];
    if (!rncEmpresa) alertas.push('Configure el RNC de la empresa en Configuración.');
    if (Number(ord.ordenSinRncProveedor) > 0) {
      alertas.push(`${ord.ordenSinRncProveedor} orden(es) de compra sin RNC de proveedor.`);
    }
    if (lineas === 0) alertas.push('No hay compras ni gastos en este período.');

    return {
      periodo,
      lineas,
      lineasOrdenes: Number(ord.lineasOrdenes),
      lineasGastos: Number(gas.lineasGastos),
      totalCompras,
      itbisEstimado,
      ordenSinRncProveedor: Number(ord.ordenSinRncProveedor),
      rncEmpresa: rncEmpresa || null,
      alertas,
    };
  }

  async dgii607(periodo: string, tenantId: number): Promise<string> {
    const { desde, hasta } = dgiiPeriodoBounds(periodo);

    const ventas = await this.ds.query(
      `SELECT v.total, v.metodoPago, v.comprobante, v.fecha,
              c.tipoIdentificacion, c.numeroIdentificacion
       FROM ventas v
       LEFT JOIN clientes c ON c.id = v.clienteId AND c.tenantId = @2
       INNER JOIN caja_aperturas ca ON ca.id = v.cajaAperturaId
       INNER JOIN tiendas t ON t.id = ca.tiendaId
       WHERE v.fecha >= @0 AND v.fecha <= @1
         AND ${VENTA_ACTIVA_SQL}
         AND t.tenantId = @2
       ORDER BY v.fecha`,
      [desde, hasta, tenantId],
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

    const splitItbis = await this.fiscalTaxSplitForTenant(tenantId);
    const lines: string[] = [];
    for (const v of ventas) {
      const total  = Number(v.total);
      const { baseImponible: base, itbis } = splitItbis(total);
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

  async dgii606(periodo: string, tenantId: number): Promise<string> {
    const { desde, hasta } = dgiiPeriodoBounds(periodo);

    const ordenes = await this.ds.query(
      `SELECT oc.total, oc.fechaRecibida, oc.createdAt,
              p.rnc AS proveedorRnc
       FROM ordenes_compra oc
       LEFT JOIN proveedores p ON p.id = oc.proveedorId AND p.tenantId = oc.tenantId
       WHERE oc.estado = 'RECIBIDA'
         AND oc.fechaRecibida >= @0 AND oc.fechaRecibida <= @1
         AND oc.tenantId = @2
       ORDER BY oc.fechaRecibida`,
      [desde, hasta, tenantId],
    );

    const gastos = await this.ds.query(
      `SELECT cantidad AS total, fecha
       FROM gastos
       WHERE fecha >= @0 AND fecha <= @1 AND tenantId = @2`,
      [desde, hasta, tenantId],
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

    const splitItbis = await this.fiscalTaxSplitForTenant(tenantId);
    const lines: string[] = [];

    for (const o of ordenes) {
      const total  = Number(o.total);
      const { baseImponible: base, itbis } = splitItbis(total);
      const fecha  = fmtDate(o.fechaRecibida ?? o.createdAt);

      lines.push([
        o.proveedorRnc ?? '', o.proveedorRnc ? '1' : '',
        '5',
        '', '',
        fecha, fecha,
        '', fmtNum(base), fmtNum(total),
        fmtNum(itbis), '', '', '', '', '',
        '', '', '', '', '', '',
        '2',
      ].join('|'));
    }

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

  async topClientes(
    desde: string,
    hasta: string,
    limit = 10,
    tenantId: number,
    tiendaId: number | null = null,
  ) {
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
       WHERE ${this.fd('v.fecha')} BETWEEN @0 AND @1
         AND ${VENTA_ACTIVA_SQL}
         AND c.tenantId = @3
         AND t.tenantId = @3
         AND ${sqlTiendaOpcional(4)}
       GROUP BY c.id, c.nombre, c.compania, c.saldo
       ORDER BY totalCompras DESC`,
      [desde, hasta, limit, tenantId, tiendaId],
    );
  }

  async resumenPorSucursal(tiendaId: number, desde: string, hasta: string, tenantId: number) {
    const [tienda] = await this.ds.query(
      `SELECT id, nombre FROM tiendas WHERE id = @0 AND tenantId = @1`,
      [tiendaId, tenantId],
    );
    if (!tienda) throw new AppError('Sucursal no encontrada', 404);

    const [ventasAgg] = await this.ds.query(
      `SELECT COUNT(*) AS n, ISNULL(SUM(v.total),0) AS total
       FROM ventas v
       INNER JOIN caja_aperturas ca ON ca.id = v.cajaAperturaId
       INNER JOIN tiendas t ON t.id = ca.tiendaId AND t.tenantId = @3
       WHERE ca.tiendaId = @0
         AND ${this.fd('v.fecha')} BETWEEN @1 AND @2
         AND ${VENTA_ACTIVA_SQL}`,
      [tiendaId, desde, hasta, tenantId],
    );

    const ventasPorMetodo = await this.ventasPorMetodoEnRango(desde, hasta, tenantId, tiendaId);

    const [gastosAgg] = await this.ds.query(
      `SELECT ISNULL(SUM(cantidad),0) AS total, COUNT(*) AS n
       FROM gastos
       WHERE tiendaId = @0
         AND tenantId = @3
         AND ${this.fd('fecha')} BETWEEN @1 AND @2`,
      [tiendaId, desde, hasta, tenantId],
    );

    const gastosPorCategoria = await this.ds.query(
      `SELECT categoria, ISNULL(SUM(cantidad),0) AS total, COUNT(*) AS n
       FROM gastos
       WHERE tiendaId = @0
         AND tenantId = @3
         AND ${this.fd('fecha')} BETWEEN @1 AND @2
       GROUP BY categoria
       ORDER BY total DESC`,
      [tiendaId, desde, hasta, tenantId],
    );

    const cierresDeCaja = await this.ds.query(
      `SELECT ca.id, ca.cajaNombre, ca.cajaId, ca.montoApertura, ca.montoCierre,
              ca.fechaApertura, ca.fechaCierre, ca.abierta
       FROM caja_aperturas ca
       INNER JOIN tiendas t ON t.id = ca.tiendaId AND t.tenantId = @3
       WHERE ca.tiendaId = @0
         AND (
           (ca.abierta = 1 AND ${this.fd('ca.fechaApertura')} <= @2)
           OR (ca.abierta = 0 AND ${this.fd('ISNULL(ca.fechaCierre, ca.fechaApertura)')} BETWEEN @1 AND @2)
         )
       ORDER BY ISNULL(ca.fechaCierre, ca.fechaApertura) DESC`,
      [tiendaId, desde, hasta, tenantId],
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

  async ventasPorUsuario(
    desde: string,
    hasta: string,
    tiendaId: number | null,
    tenantId: number,
  ) {
    if (tiendaId != null) {
      return this.ds.query(
        `SELECT u.id AS usuarioId, u.nombre AS usuarioNombre,
                COUNT(*) AS transacciones, ISNULL(SUM(v.total),0) AS totalMonto
         FROM ventas v
         INNER JOIN usuarios u ON u.id = v.usuarioId AND u.tenantId = @3
         INNER JOIN caja_aperturas ca ON ca.id = v.cajaAperturaId
         INNER JOIN tiendas t ON t.id = ca.tiendaId
         WHERE ${this.fd('v.fecha')} BETWEEN @0 AND @1
           AND ${VENTA_ACTIVA_SQL}
           AND ca.tiendaId = @2
           AND t.tenantId = @3
         GROUP BY u.id, u.nombre
         ORDER BY totalMonto DESC`,
        [desde, hasta, tiendaId, tenantId],
      );
    }
    return this.ds.query(
      `SELECT u.id AS usuarioId, u.nombre AS usuarioNombre,
              COUNT(*) AS transacciones, ISNULL(SUM(v.total),0) AS totalMonto
       FROM ventas v
       INNER JOIN usuarios u ON u.id = v.usuarioId AND u.tenantId = @2
       INNER JOIN caja_aperturas ca ON ca.id = v.cajaAperturaId
       INNER JOIN tiendas t ON t.id = ca.tiendaId
       WHERE ${this.fd('v.fecha')} BETWEEN @0 AND @1
         AND ${VENTA_ACTIVA_SQL}
         AND t.tenantId = @2
       GROUP BY u.id, u.nombre
       ORDER BY totalMonto DESC`,
      [desde, hasta, tenantId],
    );
  }

  async ventasPorCaja(
    desde: string,
    hasta: string,
    tiendaId: number | null,
    tenantId: number,
  ) {
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
         WHERE ${this.fd('v.fecha')} BETWEEN @0 AND @1
           AND ${VENTA_ACTIVA_SQL}
           AND ca.tiendaId = @2
           AND t.tenantId = @3
         GROUP BY ISNULL(t.nombre, ''), ISNULL(c.nombre, ca.cajaNombre)
         ORDER BY totalMonto DESC`,
        [desde, hasta, tiendaId, tenantId],
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
       WHERE ${this.fd('v.fecha')} BETWEEN @0 AND @1
         AND ${VENTA_ACTIVA_SQL}
         AND t.tenantId = @2
       GROUP BY ISNULL(t.nombre, ''), ISNULL(c.nombre, ca.cajaNombre)
       ORDER BY totalMonto DESC`,
      [desde, hasta, tenantId],
    );
  }

  async operacionesComerciales(desde: string, hasta: string, tenantId: number) {
    const [ventasAgg] = await this.ds.query(
      `SELECT COUNT(*) AS transacciones, ISNULL(SUM(v.total),0) AS monto
       FROM ventas v
       INNER JOIN caja_aperturas ca ON ca.id = v.cajaAperturaId
       INNER JOIN tiendas t ON t.id = ca.tiendaId
       WHERE ${this.fd('v.fecha')} BETWEEN @0 AND @1
         AND t.tenantId = @2
         AND ${VENTA_ACTIVA_SQL}`,
      [desde, hasta, tenantId],
    );

    const cotizacionesPorEstado = await this.ds.query(
      `SELECT c.estado, COUNT(*) AS cantidad, ISNULL(SUM(c.total),0) AS monto
       FROM cotizaciones c
       WHERE c.tenantId = @2
         AND ${this.fd('c.createdAt')} BETWEEN @0 AND @1
       GROUP BY c.estado`,
      [desde, hasta, tenantId],
    );

    const conversion = computeCotizacionConversion(
      (cotizacionesPorEstado ?? []).map((r: { estado: string; cantidad: number }) => ({
        estado: r.estado,
        cantidad: Number(r.cantidad),
      })),
    );

    const [promos] = await this.ds.query(
      `SELECT COUNT(*) AS activas, ISNULL(SUM(usosActuales),0) AS usosTotales
       FROM promociones WHERE tenantId = @0 AND activa = 1`,
      [tenantId],
    );

    const topPromociones = await this.ds.query(
      `SELECT TOP 5 codigo, nombre, usosActuales, tipo, valor
       FROM promociones
       WHERE tenantId = @0
       ORDER BY usosActuales DESC`,
      [tenantId],
    );

    const [comprasAgg] = await this.ds.query(
      `SELECT COUNT(*) AS ordenes, ISNULL(SUM(o.total),0) AS monto
       FROM ordenes_compra o
       WHERE o.tenantId = @2
         AND o.estado = 'RECIBIDA'
         AND ${this.fd('COALESCE(o.fechaRecibida, o.createdAt)')} BETWEEN @0 AND @1`,
      [desde, hasta, tenantId],
    );

    const montoVentas = Number(ventasAgg?.monto ?? 0);
    const montoCompras = Number(comprasAgg?.monto ?? 0);

    return {
      desde,
      hasta,
      timezone: reportesTimezone(),
      ventas: {
        transacciones: Number(ventasAgg?.transacciones ?? 0),
        monto: montoVentas,
      },
      cotizaciones: {
        porEstado: cotizacionesPorEstado ?? [],
        conversion,
      },
      promociones: {
        activas: Number(promos?.activas ?? 0),
        usosTotales: Number(promos?.usosTotales ?? 0),
        top: topPromociones ?? [],
      },
      compras: {
        ordenesRecibidas: Number(comprasAgg?.ordenes ?? 0),
        monto: montoCompras,
      },
      ratioComprasVentas:
        montoVentas > 0 ? Number(((montoCompras / montoVentas) * 100).toFixed(1)) : null,
    };
  }

  async ventasResumenPdf(
    desde: string,
    hasta: string,
    tenantId: number,
    tiendaId: number | null = null,
  ) {
    const [cfg] = await this.ds
      .query(`SELECT TOP 1 nombreCompania FROM configuracion WHERE tenantId = @0`, [tenantId])
      .catch(() => [{}]);

    const ventasPorDia = await this.ventasPorDia(desde, hasta, tenantId, tiendaId);
    const transacciones = ventasPorDia.reduce(
      (s: number, d: { totalVentas: number }) => s + Number(d.totalVentas),
      0,
    );
    const monto = ventasPorDia.reduce(
      (s: number, d: { totalMonto: number }) => s + Number(d.totalMonto),
      0,
    );

    return buildVentasResumenPdf({
      nombreCompania: cfg?.nombreCompania ?? null,
      desde,
      hasta,
      timezone: reportesTimezone(),
      ventasPorDia,
      totales: {
        transacciones,
        monto,
        ticketPromedio: transacciones > 0 ? monto / transacciones : 0,
      },
    });
  }
}
