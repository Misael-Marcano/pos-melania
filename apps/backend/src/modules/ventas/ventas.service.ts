import { AppDataSource } from '../../config/database';
import { Venta }         from '../../entities/Venta.entity';
import { VentaDetalle }  from '../../entities/VentaDetalle.entity';
import { Articulo }      from '../../entities/Articulo.entity';
import { Cliente }       from '../../entities/Cliente.entity';
import { CajaApertura }  from '../../entities/CajaApertura.entity';
import { AppError }      from '../../middlewares/error.middleware';
import { getPagination } from '../../utils/pagination';
import { generarNCF }    from '../../utils/ncf';
import { registrarMovimiento } from '../inventario/inventario.service';
import { CreateVentaDto, UpdateVentaDto, FullUpdateVentaDto, AperturaCajaDto, CierreCajaDto } from './dto/ventas.dto';
import { AuthUser } from '@pos/shared';
import { Request }  from 'express';
import { Between } from 'typeorm';

const ventaRepo   = () => AppDataSource.getRepository(Venta);
const artRepo     = () => AppDataSource.getRepository(Articulo);
const clienteRepo = () => AppDataSource.getRepository(Cliente);
const cajaRepo    = () => AppDataSource.getRepository(CajaApertura);

// Denominaciones RD$
export const DENOMINACIONES = ['2000','1000','500','200','100','50','25','10','5','1'];

export class VentasService {

  // ── Listar ventas ─────────────────────────────────────────────────────────
  async findAll(req: Request) {
    const { page, limit, skip } = getPagination(req);
    const { desde, hasta, clienteId, estado } = req.query as Record<string, string>;

    const qb = ventaRepo()
      .createQueryBuilder('v')
      .leftJoinAndSelect('v.cliente', 'cliente')
      .leftJoinAndSelect('v.usuario', 'usuario')
      .leftJoinAndSelect('v.detalles', 'detalles')
      .leftJoinAndSelect('detalles.articulo', 'articulo')
      .orderBy('v.fecha', 'DESC')
      .skip(skip)
      .take(limit);

    if (desde && hasta) {
      qb.andWhere('v.fecha BETWEEN :desde AND :hasta', { desde: new Date(desde), hasta: new Date(hasta + 'T23:59:59') });
    } else if (desde) {
      qb.andWhere('v.fecha >= :desde', { desde: new Date(desde) });
    } else if (hasta) {
      qb.andWhere('v.fecha <= :hasta', { hasta: new Date(hasta + 'T23:59:59') });
    }
    if (clienteId) qb.andWhere('cliente.id = :clienteId', { clienteId: parseInt(clienteId) });
    if (estado === 'anulada') qb.andWhere("CHARINDEX('[ANULADA]', ISNULL(v.notas, '')) = 1");
    else if (estado === 'activa') qb.andWhere("CHARINDEX('[ANULADA]', ISNULL(v.notas, '')) != 1");

    const [data, total] = await qb.getManyAndCount();
    return { data, total, page, limit };
  }

  // ── Detalle de venta ──────────────────────────────────────────────────────
  async findById(id: number): Promise<Venta> {
    const v = await ventaRepo().findOne({
      where: { id },
      relations: ['cliente', 'usuario', 'detalles', 'detalles.articulo', 'detalles.articulo.categoria'],
    });
    if (!v) throw new AppError('Venta no encontrada', 404);
    return v;
  }

  // ── Registrar venta (transacción atómica) ─────────────────────────────────
  async create(dto: CreateVentaDto, currentUser: AuthUser): Promise<Venta> {
    return AppDataSource.transaction(async (manager) => {
      const detallesEntidades: VentaDetalle[] = [];
      let subtotal = 0;

      for (const d of dto.detalles) {
        // Bloquea el registro para evitar condición de carrera
        const art = await manager.findOne(Articulo, {
          where: { id: d.articuloId, activo: true },
          lock: { mode: 'pessimistic_write' },
        });
        if (!art) throw new AppError(`Artículo ID ${d.articuloId} no encontrado`, 404);

        // Control de stock (solo si el artículo tiene cantidad configurada)
        if (art.cantidad !== null && art.cantidad !== undefined) {
          if (art.cantidad < d.cantidad) {
            throw new AppError(
              `Stock insuficiente para "${art.nombre}". Disponible: ${art.cantidad}, solicitado: ${d.cantidad}`,
              400
            );
          }
          const stockAntes = art.cantidad;
          art.cantidad -= d.cantidad;
          await manager.save(Articulo, art);
          await registrarMovimiento({
            articuloId:    art.id,
            tipo:          'VENTA',
            cantidad:      -d.cantidad,
            stockAntes,
            stockDespues:  art.cantidad,
            referenciaTipo: 'venta',
            usuarioId:     currentUser.id,
            manager,
          });
        }

        const lineaTotal = d.precioUnitario * d.cantidad * (1 - (d.descuento ?? 0) / 100);
        subtotal += lineaTotal;

        const det = manager.create(VentaDetalle, {
          articulo:       art,
          cantidad:       d.cantidad,
          precioUnitario: d.precioUnitario,
          descuento:      d.descuento ?? 0,
          total:          lineaTotal,
        });
        detallesEntidades.push(det);
      }

      const descuentoGlobal = dto.descuento ?? 0;
      const total = subtotal - descuentoGlobal;

      // Pago mixto: validar que la suma de pagos = total
      if (dto.pagos && dto.pagos.length > 0) {
        const sumaPagos = dto.pagos.reduce((s, p) => s + p.monto, 0);
        if (Math.abs(sumaPagos - total) > 0.01) {
          throw new AppError(`La suma de los pagos (${sumaPagos.toFixed(2)}) no coincide con el total (${total.toFixed(2)})`, 400);
        }
        // El metodoPago principal es el de mayor monto
        const principal = dto.pagos.reduce((a, b) => a.monto >= b.monto ? a : b);
        dto.metodoPago = principal.metodo;
      }

      // Generar NCF dentro de la transacción (si falla, el número NO se quema)
      let comprobante: string | undefined;
      if (dto.usarNCF && dto.tipoNCF) {
        comprobante = await generarNCF(dto.tipoNCF, manager);
      }

      // Si es crédito, validar límite y actualizar saldo del cliente
      if (dto.metodoPago === 'CREDITO' && dto.clienteId) {
        const cliente = await manager.findOne(Cliente, { where: { id: dto.clienteId } });
        if (cliente) {
          if (cliente.limiteCredito > 0) {
            const nuevoSaldo = Number(cliente.saldo) + total;
            if (nuevoSaldo > Number(cliente.limiteCredito)) {
              throw new AppError(
                `El cliente "${cliente.nombre}" superaría su límite de crédito de ${cliente.limiteCredito.toLocaleString('es-DO', { style: 'currency', currency: 'DOP' })}. Saldo actual: ${Number(cliente.saldo).toLocaleString('es-DO', { style: 'currency', currency: 'DOP' })}`,
                400
              );
            }
          }
          cliente.saldo += total;
          await manager.save(Cliente, cliente);
        }
      }

      const venta = manager.create(Venta, {
        subtotal,
        descuento:  descuentoGlobal,
        impuesto:   0,
        total,
        metodoPago: dto.metodoPago,
        metodosPago: dto.pagos && dto.pagos.length > 1 ? JSON.stringify(dto.pagos) : undefined,
        comprobante,
        notas:      dto.notas,
        usuario:    { id: currentUser.id } as any,
        cliente:    dto.clienteId ? { id: dto.clienteId } as any : undefined,
        detalles:   detallesEntidades,
        ...(dto.fechaVenta && currentUser.rol === 'admin'
          ? { fecha: new Date(dto.fechaVenta) }
          : {}),
      });

      return manager.save(Venta, venta);
    });
  }

  // ── Resumen del día (para el panel) ──────────────────────────────────────
  async resumenHoy() {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const manana = new Date(hoy);
    manana.setDate(manana.getDate() + 1);

    const [ventas, countRes] = await Promise.all([
      ventaRepo()
        .createQueryBuilder('v')
        .select('SUM(v.total)', 'totalMonto')
        .addSelect('COUNT(v.id)',  'totalTransacciones')
        .where('v.fecha >= :hoy AND v.fecha < :manana', { hoy, manana })
        .getRawOne(),
      ventaRepo().count({ where: { fecha: Between(hoy, manana) } }),
    ]);

    return {
      totalMonto:          Number(ventas?.totalMonto ?? 0),
      totalTransacciones:  countRes,
    };
  }

  // ── Editar venta (solo admin) ─────────────────────────────────────────────
  async update(id: number, dto: UpdateVentaDto): Promise<Venta> {
    return AppDataSource.transaction(async (manager) => {
      const venta = await manager.findOne(Venta, {
        where: { id },
        relations: ['cliente'],
      });
      if (!venta) throw new AppError('Venta no encontrada', 404);
      if (venta.notas?.startsWith('[ANULADA]')) throw new AppError('No se puede editar una venta anulada', 400);

      const viejoMetodo    = venta.metodoPago;
      const viejoClienteId = venta.cliente?.id ?? null;

      // Revertir crédito anterior si aplica
      if (viejoMetodo === 'CREDITO' && viejoClienteId) {
        const clienteViejo = await manager.findOne(Cliente, { where: { id: viejoClienteId } });
        if (clienteViejo) {
          clienteViejo.saldo -= venta.total;
          await manager.save(Cliente, clienteViejo);
        }
      }

      // Aplicar cambios
      if (dto.metodoPago !== undefined) venta.metodoPago = dto.metodoPago;
      if ('clienteId' in dto) {
        venta.cliente = dto.clienteId ? { id: dto.clienteId } as any : null as any;
      }
      if ('notas' in dto) venta.notas = dto.notas ?? undefined;

      const nuevoMetodo    = venta.metodoPago;
      const nuevoClienteId = 'clienteId' in dto ? dto.clienteId : viejoClienteId;

      // Aplicar nuevo crédito si aplica
      if (nuevoMetodo === 'CREDITO' && nuevoClienteId) {
        const clienteNuevo = await manager.findOne(Cliente, { where: { id: nuevoClienteId } });
        if (clienteNuevo) {
          clienteNuevo.saldo += venta.total;
          await manager.save(Cliente, clienteNuevo);
        }
      }

      return manager.save(Venta, venta);
    });
  }

  // ── Editar venta completa (ítems + cabecera) ──────────────────────────────────
  async fullUpdate(id: number, dto: FullUpdateVentaDto): Promise<Venta> {
    return AppDataSource.transaction(async (manager) => {
      const venta = await manager.findOne(Venta, {
        where: { id },
        relations: ['cliente', 'detalles', 'detalles.articulo'],
      });
      if (!venta) throw new AppError('Venta no encontrada', 404);
      if (venta.notas?.startsWith('[ANULADA]')) throw new AppError('No se puede editar una venta anulada', 400);

      // 1. Restaurar stock de ítems existentes
      for (const det of venta.detalles) {
        if (det.articulo && det.articulo.cantidad != null) {
          det.articulo.cantidad += det.cantidad;
          await manager.save(Articulo, det.articulo);
        }
      }

      // 2. Revertir saldo crédito anterior
      if (venta.metodoPago === 'CREDITO' && venta.cliente) {
        const cli = await manager.findOne(Cliente, { where: { id: venta.cliente.id } });
        if (cli) { cli.saldo -= venta.total; await manager.save(Cliente, cli); }
      }

      // 3. Eliminar detalles anteriores
      await manager.delete(VentaDetalle, { venta: { id } });

      // 4. Crear nuevos detalles con deducción de stock
      let subtotal = 0;
      const nuevosDetalles: VentaDetalle[] = [];
      for (const d of dto.detalles) {
        const art = await manager.findOne(Articulo, {
          where: { id: d.articuloId, activo: true },
          lock: { mode: 'pessimistic_write' },
        });
        if (!art) throw new AppError(`Artículo ID ${d.articuloId} no encontrado`, 404);
        if (art.cantidad !== null && art.cantidad !== undefined) {
          if (art.cantidad < d.cantidad)
            throw new AppError(`Stock insuficiente para "${art.nombre}". Disponible: ${art.cantidad}`, 400);
          art.cantidad -= d.cantidad;
          await manager.save(Articulo, art);
        }
        const lineaTotal = d.precioUnitario * d.cantidad * (1 - (d.descuento ?? 0) / 100);
        subtotal += lineaTotal;
        nuevosDetalles.push(manager.create(VentaDetalle, {
          venta:          { id } as any,
          articulo:       art,
          cantidad:       d.cantidad,
          precioUnitario: d.precioUnitario,
          descuento:      d.descuento ?? 0,
          total:          lineaTotal,
        }));
      }
      await manager.save(VentaDetalle, nuevosDetalles);

      // 5. Actualizar cabecera
      const descuento = dto.descuento ?? 0;
      venta.subtotal  = subtotal;
      venta.descuento = descuento;
      venta.total     = subtotal - descuento;
      venta.metodoPago = dto.metodoPago;
      venta.cliente   = dto.clienteId ? { id: dto.clienteId } as any : null as any;
      venta.notas     = dto.notas ?? undefined;

      // 6. Aplicar nuevo saldo crédito
      if (dto.metodoPago === 'CREDITO' && dto.clienteId) {
        const cli = await manager.findOne(Cliente, { where: { id: dto.clienteId } });
        if (cli) { cli.saldo += venta.total; await manager.save(Cliente, cli); }
      }

      return manager.save(Venta, venta);
    });
  }

  // ── Anular venta (solo admin) ─────────────────────────────────────────────
  async anular(id: number, usuarioId?: number): Promise<void> {
    return AppDataSource.transaction(async (manager) => {
      const venta = await manager.findOne(Venta, {
        where: { id },
        relations: ['detalles', 'detalles.articulo'],
      });
      if (!venta) throw new AppError('Venta no encontrada', 404);

      // Devolver stock
      for (const det of venta.detalles) {
        if (det.articulo && det.articulo.cantidad != null) {
          const stockAntes = det.articulo.cantidad;
          det.articulo.cantidad += det.cantidad;
          await manager.save(Articulo, det.articulo);
          await registrarMovimiento({
            articuloId:    det.articulo.id,
            tipo:          'DEVOLUCION',
            cantidad:      det.cantidad,
            stockAntes,
            stockDespues:  det.articulo.cantidad,
            referenciaId:  id,
            referenciaTipo: 'venta_anulada',
            usuarioId,
            manager,
          });
        }
      }
      // Marcar como anulada (nota especial)
      venta.notas = `[ANULADA] ${venta.notas ?? ''}`.trim();
      await manager.save(Venta, venta);
    });
  }

  // ── CAJA ──────────────────────────────────────────────────────────────────

  async abrirCaja(dto: AperturaCajaDto, user: AuthUser): Promise<CajaApertura> {
    const abierta = await cajaRepo().findOne({
      where: { cajaNombre: dto.cajaNombre, abierta: true },
    });
    if (abierta) throw new AppError(`La caja "${dto.cajaNombre}" ya está abierta`, 400);

    const apertura = cajaRepo().create({
      cajaNombre:             dto.cajaNombre,
      montoApertura:          dto.montoApertura,
      denominacionesApertura: JSON.stringify(dto.denominaciones),
      usuario:                { id: user.id } as any,
    });
    return cajaRepo().save(apertura);
  }

  async cerrarCaja(dto: CierreCajaDto): Promise<CajaApertura & { resumen: any }> {
    const apertura = await cajaRepo().findOne({
      where: { id: dto.aperturaId, abierta: true },
      relations: ['usuario'],
    });
    if (!apertura) throw new AppError('No se encontró caja abierta con ese ID', 404);

    // Calcular ventas durante la apertura
    const hoy = apertura.fechaApertura;
    const ahora = new Date();

    const resumenVentas = await ventaRepo()
      .createQueryBuilder('v')
      .select('v.metodoPago', 'metodoPago')
      .addSelect('COUNT(v.id)', 'cantidad')
      .addSelect('SUM(v.total)', 'total')
      .where('v.fecha >= :desde AND v.fecha <= :hasta', { desde: hoy, hasta: ahora })
      .groupBy('v.metodoPago')
      .getRawMany();

    apertura.montoCierre           = dto.montoCierre;
    apertura.denominacionesCierre  = JSON.stringify(dto.denominaciones);
    apertura.fechaCierre           = ahora;
    apertura.abierta               = false;
    const saved = await cajaRepo().save(apertura);

    return { ...saved, resumen: resumenVentas };
  }

  async getCajaActiva(cajaNombre: string): Promise<CajaApertura | null> {
    return cajaRepo().findOne({
      where: { cajaNombre, abierta: true },
      relations: ['usuario'],
    });
  }

  // ── Resumen de sesión de caja (ventas efectivo + gastos desde apertura) ──────
  async resumenCaja(aperturaId: number): Promise<{
    totalEfectivo: number;
    totalGastos:   number;
    fechaApertura: Date;
    porMetodo:     { metodoPago: string; total: number; cantidad: number }[];
  }> {
    const apertura = await cajaRepo().findOne({ where: { id: aperturaId } });
    if (!apertura) throw new AppError('Apertura no encontrada', 404);

    const desde = apertura.fechaApertura;
    const hasta  = new Date();

    const ds = AppDataSource;

    const [efectivo] = await ds.query(
      `SELECT ISNULL(SUM(total), 0) AS totalEfectivo
       FROM ventas
       WHERE fecha >= @0 AND fecha <= @1
         AND metodoPago = 'EFECTIVO'
         AND CHARINDEX('[ANULADA]', ISNULL(notas, '')) = 0`,
      [desde, hasta]
    );

    const [gastos] = await ds.query(
      `SELECT ISNULL(SUM(cantidad), 0) AS totalGastos
       FROM gastos
       WHERE fecha >= @0 AND fecha <= @1`,
      [desde, hasta]
    );

    const porMetodo = await ds.query(
      `SELECT metodoPago, ISNULL(SUM(total), 0) AS total, COUNT(*) AS cantidad
       FROM ventas
       WHERE fecha >= @0 AND fecha <= @1
         AND CHARINDEX('[ANULADA]', ISNULL(notas, '')) = 0
       GROUP BY metodoPago`,
      [desde, hasta]
    );

    return {
      totalEfectivo: Number(efectivo?.totalEfectivo ?? 0),
      totalGastos:   Number(gastos?.totalGastos   ?? 0),
      fechaApertura: desde,
      porMetodo:     (porMetodo ?? []).map((r: any) => ({
        metodoPago: r.metodoPago,
        total:      Number(r.total),
        cantidad:   Number(r.cantidad),
      })),
    };
  }

  async generarPDFCierre(aperturaId: number): Promise<Buffer> {
    const apertura = await cajaRepo().findOne({
      where: { id: aperturaId },
      relations: ['usuario'],
    });
    if (!apertura) throw new AppError('Apertura no encontrada', 404);

    const resumen = await this.resumenCaja(aperturaId);
    const montoCierre = Number(apertura.montoCierre ?? 0);
    const efectivoEsperado = Number(apertura.montoApertura) + resumen.totalEfectivo - resumen.totalGastos;
    const diferencia = montoCierre - efectivoEsperado;

    const denominaciones: Record<string, number> = apertura.denominacionesCierre
      ? JSON.parse(apertura.denominacionesCierre)
      : {};

    const DENS = [
      { label: 'RDS 2,000', value: '2000' },
      { label: 'RDS 1,000', value: '1000' },
      { label: 'RDS 500',   value: '500'  },
      { label: 'RDS 200',   value: '200'  },
      { label: 'RDS 100',   value: '100'  },
      { label: 'RDS 50',    value: '50'   },
      { label: 'RDS 25',    value: '25'   },
      { label: 'RDS 10',    value: '10'   },
      { label: 'RDS 5',     value: '5'    },
      { label: 'RDS 1',     value: '1'    },
    ];

    const fmt = (n: number) => `RDS ${n.toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    const fmtDate = (d: Date | string) => new Date(d).toLocaleString('es-DO', { dateStyle: 'short', timeStyle: 'short' });

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const PDFDocument = require('pdfkit');
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));

    return new Promise((resolve, reject) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // ── Header ──────────────────────────────────────────────────────────────
      doc.fontSize(18).font('Helvetica-Bold').text('REPORTE CIERRE DE CAJA', { align: 'center' });
      doc.moveDown(0.3);
      doc.fontSize(11).font('Helvetica').text(`Caja: ${apertura.cajaNombre}`, { align: 'center' });
      doc.fontSize(9).fillColor('#888').text(`Usuario: ${apertura.usuario?.nombre ?? '—'}`, { align: 'center' });
      doc.fillColor('#000').moveDown(0.5);

      doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
      doc.moveDown(0.5);

      // ── Fechas ───────────────────────────────────────────────────────────────
      doc.fontSize(10).font('Helvetica-Bold').text('Período');
      doc.font('Helvetica').fontSize(9);
      doc.text(`Apertura:  ${fmtDate(apertura.fechaApertura)}`);
      doc.text(`Cierre:    ${apertura.fechaCierre ? fmtDate(apertura.fechaCierre) : 'En curso'}`);
      doc.moveDown(0.7);

      // ── Resumen financiero ────────────────────────────────────────────────────
      doc.fontSize(10).font('Helvetica-Bold').text('Resumen Financiero');
      doc.moveDown(0.3);

      const row = (label: string, value: string, bold = false) => {
        const y = doc.y;
        doc.fontSize(9).font(bold ? 'Helvetica-Bold' : 'Helvetica');
        doc.text(label, 50, y, { width: 300 });
        doc.text(value, 350, y, { width: 195, align: 'right' });
        doc.moveDown(0.3);
      };

      row('Monto apertura', fmt(Number(apertura.montoApertura)));
      row('Ventas en efectivo', fmt(resumen.totalEfectivo));
      row('Gastos del período', `- ${fmt(resumen.totalGastos)}`);
      doc.moveTo(50, doc.y + 2).lineTo(545, doc.y + 2).stroke('#ccc');
      doc.moveDown(0.5);
      row('Efectivo esperado', fmt(efectivoEsperado), true);
      row('Monto contado', fmt(montoCierre));
      doc.moveTo(50, doc.y + 2).lineTo(545, doc.y + 2).stroke('#ccc');
      doc.moveDown(0.5);
      doc.fillColor(diferencia >= 0 ? '#059669' : '#dc2626');
      row('Diferencia', `${diferencia >= 0 ? '+' : ''}${fmt(diferencia)}`, true);
      doc.fillColor('#000');
      doc.moveDown(0.7);

      // ── Desglose por método de pago ────────────────────────────────────────
      if (resumen.porMetodo && resumen.porMetodo.length > 0) {
        doc.fontSize(10).font('Helvetica-Bold').text('Ventas por Método de Pago');
        doc.moveDown(0.3);
        const METODO_ES: Record<string, string> = {
          EFECTIVO: 'Efectivo', TARJETA: 'Tarjeta/Débito/Crédito',
          TRANSFERENCIA: 'Transferencia', CREDITO: 'Crédito a cliente',
          TARJETA_REGALO: 'Tarjeta de regalo',
        };
        const totalVentas = resumen.porMetodo.reduce((s: number, m: any) => s + m.total, 0);
        for (const m of resumen.porMetodo) {
          row(`${METODO_ES[m.metodoPago] ?? m.metodoPago} (${m.cantidad} vta${m.cantidad !== 1 ? 's' : ''})`, fmt(m.total));
        }
        doc.moveTo(50, doc.y + 2).lineTo(545, doc.y + 2).stroke('#ccc');
        doc.moveDown(0.3);
        row('Total ventas', fmt(totalVentas), true);
        doc.moveDown(0.5);
      }

      // ── Desglose denominaciones ────────────────────────────────────────────
      doc.fontSize(10).font('Helvetica-Bold').text('Desglose de billetes y monedas');
      doc.moveDown(0.3);
      doc.fontSize(9).font('Helvetica');
      for (const den of DENS) {
        const cant = Number(denominaciones[den.value] ?? 0);
        if (cant > 0) {
          const sub = cant * Number(den.value);
          const y = doc.y;
          doc.text(den.label, 50, y, { width: 200 });
          doc.text(`x ${cant}`, 250, y, { width: 100 });
          doc.text(fmt(sub), 350, y, { width: 195, align: 'right' });
          doc.moveDown(0.25);
        }
      }

      doc.moveDown(0.5);
      doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
      doc.moveDown(0.5);
      doc.fontSize(8).fillColor('#888')
        .text(`Generado: ${fmtDate(new Date())}`, { align: 'center' });

      doc.end();
    });
  }

  async getHistorialCajas(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [data, total] = await cajaRepo().findAndCount({
      relations: ['usuario'],
      order:     { fechaApertura: 'DESC' },
      skip,
      take: limit,
    });
    return { data, total, page, limit };
  }
}
