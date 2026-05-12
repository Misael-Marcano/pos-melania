import { AppDataSource } from '../../config/database';
import { Venta }         from '../../entities/Venta.entity';
import { VentaDetalle }  from '../../entities/VentaDetalle.entity';
import { Articulo }      from '../../entities/Articulo.entity';
import { Cliente }       from '../../entities/Cliente.entity';
import { CajaApertura }  from '../../entities/CajaApertura.entity';
import { Configuracion } from '../../entities/Configuracion.entity';
import { Caja }          from '../../entities/Caja.entity';
import { Tienda }        from '../../entities/Tienda.entity';
import { Gasto }         from '../../entities/Gasto.entity';
import { AppError }      from '../../middlewares/error.middleware';
import { getPagination } from '../../utils/pagination';
import { resolveFiscalProvider } from '../../fiscal';
import { registrarMovimiento } from '../inventario/inventario.service';
import { CreateVentaDto, UpdateVentaDto, FullUpdateVentaDto, AperturaCajaDto, CierreCajaDto, CAJA_DENOMINACIONES } from './dto/ventas.dto';
import { computeFullUpdateVentaTotals, fullUpdateVentaTotalViolationMessage } from './ventas-full-update-totals';
import { stripVentaDetalleParentRef, syncFullUpdateVentaDetalleGraph } from './ventas-full-update-detail-graph';
import { AuthUser } from '@pos/shared';
import { AuthRequest } from '../../middlewares/auth.middleware';
import { Brackets, EntityManager, SelectQueryBuilder } from 'typeorm';
import { assertTiendaCaja, isAdmin, tiendaIdForUserOrThrow } from '../../utils/tienda-access';
import { assertTenantForTienda, tenantIdOrThrow } from '../../utils/tenant-access';

const ventaRepo   = () => AppDataSource.getRepository(Venta);
const artRepo     = () => AppDataSource.getRepository(Articulo);
const clienteRepo = () => AppDataSource.getRepository(Cliente);
const cajaRepo    = () => AppDataSource.getRepository(CajaApertura);
const cajaCatalog = () => AppDataSource.getRepository(Caja);

// Denominaciones RD$
export const DENOMINACIONES = [...CAJA_DENOMINACIONES];

export class VentasService {
  private static readonly MAX_CAJA_AMOUNT = 10_000_000;

  private static roundCurrency(value: number): number {
    return Math.round(Number(value) * 100) / 100;
  }

  private static denominacionesTotal(denominaciones: Record<string, number>): number {
    return VentasService.roundCurrency(
      DENOMINACIONES.reduce(
        (total, denominacion) => total + (denominaciones[denominacion] ?? 0) * Number(denominacion),
        0,
      ),
    );
  }

  private assertCajaSessionAccess(user: AuthUser, apertura: CajaApertura): void {
    assertTiendaCaja(user, apertura.tienda?.id ?? apertura.caja?.tienda?.id);
    assertTenantForTienda(user, apertura.tienda ?? apertura.caja?.tienda);

    if (user.rol === 'cajero') {
      const ownerId = apertura.usuario?.id ?? (apertura as { usuarioId?: number }).usuarioId;
      if (ownerId == null || Number(ownerId) !== Number(user.id)) {
        throw new AppError('Esta sesión de caja pertenece a otro cajero.', 403);
      }
    }
  }

  private assertMontoCajaValido(monto: number, denominaciones: Record<string, number>, campo: string): number {
    const rounded = VentasService.roundCurrency(monto);
    if (!Number.isFinite(rounded) || rounded < 0 || rounded > VentasService.MAX_CAJA_AMOUNT) {
      throw new AppError(`${campo} inválido`, 422);
    }
    const total = VentasService.denominacionesTotal(denominaciones);
    if (Math.abs(total - rounded) > 0.001) {
      throw new AppError(`${campo} no coincide con el conteo de denominaciones`, 422);
    }
    return rounded;
  }

  /**
   * Aislamiento multi-tenant: venta con sesión de caja → tienda de la sesión (apertura o catálogo caja);
   * venta sin sesión → organización del usuario que registró la venta.
   */
  private scopeVentasPorTenant(
    qb: SelectQueryBuilder<Venta>,
    user: AuthUser,
    ventaAlias: string,
  ): void {
    const tid = tenantIdOrThrow(user);
    qb.leftJoin(`${ventaAlias}.cajaApertura`, 'vt_ca')
      .leftJoin('vt_ca.caja', 'vt_caja')
      .leftJoin('vt_ca.tienda', 'vt_ca_tienda')
      .leftJoin('vt_caja.tienda', 'vt_caja_tienda')
      .leftJoin(`${ventaAlias}.usuario`, 'vt_u')
      .andWhere(
        new Brackets((w) => {
          w.where(
            `(${ventaAlias}.cajaAperturaId IS NOT NULL AND (\
(vt_ca_tienda.id IS NOT NULL AND vt_ca_tienda.tenantId = :vt_tid) OR \
(vt_caja_tienda.id IS NOT NULL AND vt_caja_tienda.tenantId = :vt_tid)\
))`,
            { vt_tid: tid },
          ).orWhere(`(${ventaAlias}.cajaAperturaId IS NULL AND vt_u.tenantId = :vt_tid)`, {
            vt_tid: tid,
          });
        }),
      );
  }

  private async assertVentaEnTenant(
    id: number,
    user: AuthUser,
    manager?: EntityManager,
  ): Promise<void> {
    const tid = tenantIdOrThrow(user);
    const r = manager ? manager.getRepository(Venta) : ventaRepo();
    const cnt = await r
      .createQueryBuilder('v')
      .leftJoin('v.cajaApertura', 'vt_ca')
      .leftJoin('vt_ca.caja', 'vt_caja')
      .leftJoin('vt_ca.tienda', 'vt_ca_tienda')
      .leftJoin('vt_caja.tienda', 'vt_caja_tienda')
      .leftJoin('v.usuario', 'vt_u')
      .where('v.id = :id', { id })
      .andWhere(
        new Brackets((w) => {
          w.where(
            `(v.cajaAperturaId IS NOT NULL AND (\
(vt_ca_tienda.id IS NOT NULL AND vt_ca_tienda.tenantId = :vt_tid) OR \
(vt_caja_tienda.id IS NOT NULL AND vt_caja_tienda.tenantId = :vt_tid)\
))`,
            { vt_tid: tid },
          ).orWhere('(v.cajaAperturaId IS NULL AND vt_u.tenantId = :vt_tid)', { vt_tid: tid });
        }),
      )
      .getCount();
    if (cnt === 0) throw new AppError('Venta no encontrada', 404);
  }

  // ── Listar ventas ─────────────────────────────────────────────────────────
  async findAll(req: AuthRequest) {
    const user = req.user;
    if (!user) throw new AppError('No autenticado', 401);

    const { page, limit, skip } = getPagination(req);
    const { desde, hasta, clienteId, estado } = req.query as Record<string, string>;

    const qb = ventaRepo()
      .createQueryBuilder('v')
      .leftJoinAndSelect('v.cliente', 'cliente')
      .leftJoinAndSelect('v.usuario', 'usuario')
      .leftJoinAndSelect('v.cajaApertura', 'cajaApertura')
      .leftJoinAndSelect('cajaApertura.caja', 'cajaCat')
      .leftJoinAndSelect('cajaApertura.tienda', 'cajaTienda')
      .leftJoinAndSelect('v.detalles', 'detalles')
      .leftJoinAndSelect('detalles.articulo', 'articulo')
      .orderBy('v.fecha', 'DESC')
      .skip(skip)
      .take(limit);

    this.scopeVentasPorTenant(qb, user, 'v');

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
    for (const row of data) {
      stripVentaDetalleParentRef(row);
    }
    return { data, total, page, limit };
  }

  // ── Detalle de venta ──────────────────────────────────────────────────────
  async findById(id: number, user: AuthUser): Promise<Venta> {
    await this.assertVentaEnTenant(id, user);
    const v = await ventaRepo().findOne({
      where: { id },
      relations: [
        'cliente', 'usuario',
        'cajaApertura', 'cajaApertura.caja', 'cajaApertura.tienda',
        'detalles', 'detalles.articulo', 'detalles.articulo.categoria',
      ],
    });
    if (!v) throw new AppError('Venta no encontrada', 404);
    stripVentaDetalleParentRef(v);
    return v;
  }

  // ── Registrar venta (transacción atómica) ─────────────────────────────────
  async create(dto: CreateVentaDto, currentUser: AuthUser): Promise<Venta> {
    return AppDataSource.transaction(async (manager) => {
      const tid = tenantIdOrThrow(currentUser);
      const detallesEntidades: VentaDetalle[] = [];
      let subtotal = 0;

      for (const d of dto.detalles) {
        // Bloquea el registro para evitar condición de carrera
        const art = await manager.findOne(Articulo, {
          where: { id: d.articuloId, activo: true, tenant: { id: tid } },
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
      const deliveryCargo   = dto.esDelivery ? (dto.deliveryCargo ?? 0) : 0;
      const total = subtotal - descuentoGlobal + deliveryCargo;

      const ap = await manager.findOne(CajaApertura, {
        where: { id: dto.cajaAperturaId },
        relations: ['tienda', 'tienda.tenant', 'caja', 'caja.tienda', 'caja.tienda.tenant'],
      });
      if (!ap) throw new AppError('Sesión de caja no encontrada', 404);
      if (!ap.abierta) {
        throw new AppError(
          'La sesión de caja está cerrada. Abre caja para registrar ventas.',
          400
        );
      }
      const apTid = ap.tienda?.id ?? ap.caja?.tienda?.id ?? (ap as { tiendaId?: number }).tiendaId;
      assertTiendaCaja(currentUser, apTid);
      const tiendaAp = ap.tienda ?? ap.caja?.tienda;
      assertTenantForTienda(currentUser, tiendaAp ?? undefined);

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
        const cfgRow = await manager.findOne(Configuracion, { where: { tenant: { id: tid } } });
        comprobante = await resolveFiscalProvider(cfgRow?.fiscalJurisdiccion ?? null).nextComprobanteFiscal(
          dto.tipoNCF,
          manager,
          tid,
        );
      }

      // Cliente (misma organización); si es crédito, validar límite y actualizar saldo
      if (dto.clienteId) {
        const cliente = await manager.findOne(Cliente, {
          where: { id: dto.clienteId, tenant: { id: tid } },
          lock: dto.metodoPago === 'CREDITO' ? { mode: 'pessimistic_write' } : undefined,
        });
        if (!cliente) throw new AppError('Cliente no encontrado', 404);
        if (dto.metodoPago === 'CREDITO') {
          if (cliente.limiteCredito > 0) {
            const nuevoSaldo = Number(cliente.saldo) + total;
            if (nuevoSaldo > Number(cliente.limiteCredito)) {
              throw new AppError(
                `El cliente "${cliente.nombre}" superaría su límite de crédito de ${cliente.limiteCredito.toLocaleString('es-DO', { style: 'currency', currency: 'DOP' })}. Saldo actual: ${Number(cliente.saldo).toLocaleString('es-DO', { style: 'currency', currency: 'DOP' })}`,
                400
              );
            }
          }
          cliente.saldo = Number(cliente.saldo) + total;
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
        efectivoRecibido: dto.efectivoRecibido ?? null,
        cambio: (dto.metodoPago === 'EFECTIVO' && dto.efectivoRecibido != null)
          ? Math.max(0, dto.efectivoRecibido - total)
          : null,
        esDelivery:       dto.esDelivery ?? false,
        deliveryCargo,
        deliveryDireccion: dto.esDelivery ? (dto.deliveryDireccion ?? null) : null,
        usuario:    { id: currentUser.id } as any,
        cliente:    dto.clienteId ? { id: dto.clienteId } as any : undefined,
        cajaApertura: { id: dto.cajaAperturaId } as any,
        detalles:   detallesEntidades,
        ...(dto.fechaVenta && isAdmin(currentUser)
          ? { fecha: new Date(dto.fechaVenta) }
          : {}),
      });

      const saved = await manager.save(Venta, venta);
      stripVentaDetalleParentRef(saved);
      return saved;
    });
  }

  // ── Resumen del día (para el panel) ──────────────────────────────────────
  async resumenHoy(user: AuthUser) {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const manana = new Date(hoy);
    manana.setDate(manana.getDate() + 1);

    const base = () =>
      ventaRepo()
        .createQueryBuilder('v')
        .where('v.fecha >= :hoy AND v.fecha < :manana', { hoy, manana });

    const qbSum = base();
    this.scopeVentasPorTenant(qbSum, user, 'v');
    const qbCount = base();
    this.scopeVentasPorTenant(qbCount, user, 'v');

    const [ventas, countRes] = await Promise.all([
      qbSum
        .select('SUM(v.total)', 'totalMonto')
        .addSelect('COUNT(v.id)', 'totalTransacciones')
        .getRawOne(),
      qbCount.getCount(),
    ]);

    return {
      totalMonto:          Number(ventas?.totalMonto ?? 0),
      totalTransacciones:  countRes,
    };
  }

  // ── Editar venta (solo admin) ─────────────────────────────────────────────
  async update(id: number, dto: UpdateVentaDto, user: AuthUser): Promise<Venta> {
    return AppDataSource.transaction(async (manager) => {
      await this.assertVentaEnTenant(id, user, manager);
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
      const descuento = dto.descuento ?? Number(venta.descuento ?? 0);
      const {
        esDelivery,
        deliveryCargo,
        deliveryDireccion,
        total,
      } = computeFullUpdateVentaTotals({
        subtotal: Number(venta.subtotal ?? 0),
        descuento,
        venta: {
          esDelivery: venta.esDelivery,
          deliveryCargo: venta.deliveryCargo,
          deliveryDireccion: venta.deliveryDireccion,
        },
        dto: {
          esDelivery: dto.esDelivery,
          deliveryCargo: dto.deliveryCargo,
          deliveryDireccion: dto.deliveryDireccion,
        },
      });
      const totalViolation = fullUpdateVentaTotalViolationMessage(total);
      if (totalViolation) throw new AppError(totalViolation, 400);
      venta.descuento = descuento;
      venta.esDelivery = esDelivery;
      venta.deliveryCargo = deliveryCargo;
      venta.deliveryDireccion = deliveryDireccion;
      venta.total = total;

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

      const saved = await manager.save(Venta, venta);
      stripVentaDetalleParentRef(saved);
      return saved;
    });
  }

  // ── Editar venta completa (ítems + cabecera) ──────────────────────────────────
  async fullUpdate(id: number, dto: FullUpdateVentaDto, user: AuthUser): Promise<Venta> {
    return AppDataSource.transaction(async (manager) => {
      await this.assertVentaEnTenant(id, user, manager);
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
      syncFullUpdateVentaDetalleGraph(venta, nuevosDetalles);

      // 5. Actualizar cabecera
      const descuento = dto.descuento ?? 0;
      const {
        esDelivery,
        deliveryCargo,
        deliveryDireccion,
        total,
      } = computeFullUpdateVentaTotals({
        subtotal,
        descuento,
        venta: {
          esDelivery: venta.esDelivery,
          deliveryCargo: venta.deliveryCargo,
          deliveryDireccion: venta.deliveryDireccion,
        },
        dto: {
          esDelivery: dto.esDelivery,
          deliveryCargo: dto.deliveryCargo,
          deliveryDireccion: dto.deliveryDireccion,
        },
      });
      const totalViolation = fullUpdateVentaTotalViolationMessage(total);
      if (totalViolation) throw new AppError(totalViolation, 400);
      venta.subtotal  = subtotal;
      venta.descuento = descuento;
      venta.esDelivery = esDelivery;
      venta.deliveryCargo = deliveryCargo;
      venta.deliveryDireccion = deliveryDireccion;
      venta.total     = total;
      venta.metodoPago = dto.metodoPago;
      if ('clienteId' in dto) {
        venta.cliente = dto.clienteId ? { id: dto.clienteId } as any : null as any;
      }
      if ('notas' in dto) venta.notas = dto.notas ?? undefined;

      // 6. Aplicar nuevo saldo crédito (misma noción de cliente efectivo que update())
      const clienteIdCredito =
        'clienteId' in dto ? dto.clienteId : (venta.cliente?.id ?? null);
      if (venta.metodoPago === 'CREDITO' && clienteIdCredito) {
        const cli = await manager.findOne(Cliente, { where: { id: clienteIdCredito } });
        if (cli) { cli.saldo += venta.total; await manager.save(Cliente, cli); }
      }

      const saved = await manager.save(Venta, venta);
      stripVentaDetalleParentRef(saved);
      return saved;
    });
  }

  // ── Anular venta (solo admin) ─────────────────────────────────────────────
  async anular(id: number, user: AuthUser, usuarioId?: number): Promise<void> {
    return AppDataSource.transaction(async (manager) => {
      await this.assertVentaEnTenant(id, user, manager);
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
    const montoApertura = this.assertMontoCajaValido(dto.montoApertura, dto.denominaciones, 'Monto de apertura');

    return AppDataSource.transaction('SERIALIZABLE', async (manager) => {
      let nombre: string;
      let tiendaRef: { id: number };
      let cajaEnt: Caja | undefined;

      if (dto.cajaId) {
        const caja = await manager.findOne(Caja, {
          where: { id: dto.cajaId },
          relations: ['tienda', 'tienda.tenant'],
        });
        if (!caja) throw new AppError('Caja no encontrada', 404);
        if (!caja.activo) throw new AppError('La caja está desactivada', 400);
        nombre = caja.nombre.trim();
        const tid = caja.tienda?.id ?? (caja as { tiendaId?: number }).tiendaId;
        assertTiendaCaja(user, tid);
        assertTenantForTienda(user, caja.tienda ?? undefined);
        if (tid == null) throw new AppError('La caja no tiene sucursal asignada.', 400);
        tiendaRef = { id: tid };
        cajaEnt = caja;
      } else {
        if (!dto.tiendaId) throw new AppError('Seleccione una sucursal para abrir caja', 422);
        nombre = dto.cajaNombre!.trim();
        const tienda = await manager.findOne(Tienda, {
          where: { id: dto.tiendaId },
          relations: ['tenant'],
        });
        if (!tienda) throw new AppError('Sucursal no encontrada', 404);
        assertTiendaCaja(user, tienda.id);
        assertTenantForTienda(user, tienda);
        tiendaRef = { id: tienda.id };
      }

      const abierta = await manager.findOne(CajaApertura, {
        where: cajaEnt
          ? { caja: { id: cajaEnt.id }, abierta: true }
          : { cajaNombre: nombre, tienda: { id: tiendaRef.id }, abierta: true },
        relations: ['caja', 'tienda'],
      });
      if (abierta) throw new AppError(`La caja "${nombre}" ya está abierta`, 409);

      const apertura = manager.create(CajaApertura, {
        cajaNombre:             nombre,
        montoApertura,
        denominacionesApertura: JSON.stringify(dto.denominaciones),
        usuario:                { id: user.id } as any,
        tienda:                 tiendaRef as any,
        caja:                   cajaEnt ? ({ id: cajaEnt.id } as any) : undefined,
      });
      return manager.save(CajaApertura, apertura);
    });
  }

  async cerrarCaja(dto: CierreCajaDto, user: AuthUser): Promise<CajaApertura & { resumen: any }> {
    const montoCierre = this.assertMontoCajaValido(dto.montoCierre, dto.denominaciones, 'Monto de cierre');
    const tenantId = tenantIdOrThrow(user);

    return AppDataSource.transaction('SERIALIZABLE', async (manager) => {
      const apertura = await manager.findOne(CajaApertura, {
        where: { id: dto.aperturaId },
        relations: ['usuario', 'tienda', 'tienda.tenant', 'caja', 'caja.tienda', 'caja.tienda.tenant'],
        lock: { mode: 'pessimistic_write' },
      });
      if (!apertura) throw new AppError('Apertura no encontrada', 404);
      if (!apertura.abierta) throw new AppError('Esta sesión de caja ya está cerrada', 409);
      this.assertCajaSessionAccess(user, apertura);

      const hoy = apertura.fechaApertura;
      const ahora = new Date();
      const vw = VentasService.VENTAS_SESION_WHERE;
      const params = [hoy, ahora, dto.aperturaId, tenantId];

      const resumenVentas = await manager.query(
        `SELECT v.metodoPago, COUNT(v.id) AS cantidad, ISNULL(SUM(v.total), 0) AS total
         FROM ventas v
         WHERE ${vw}
         GROUP BY v.metodoPago`,
        params,
      );

      apertura.montoCierre           = montoCierre;
      apertura.denominacionesCierre  = JSON.stringify(dto.denominaciones);
      apertura.fechaCierre           = ahora;
      apertura.abierta               = false;
      if (dto.notas !== undefined && String(dto.notas).trim() !== '')
        apertura.notasCierre = String(dto.notas).trim();
      else apertura.notasCierre = null;
      const saved = await manager.save(CajaApertura, apertura);

      const [deliveryRow] = await manager.query(
        `SELECT ISNULL(SUM(v.deliveryCargo), 0) AS total
         FROM ventas v
         WHERE ${vw} AND v.esDelivery = 1`,
        params,
      );
      const totalDelivery = Number(deliveryRow?.total ?? 0);
      if (totalDelivery > 0) {
        const tiendaId = (apertura as { tiendaId?: number }).tiendaId
          ?? apertura.tienda?.id
          ?? apertura.caja?.tienda?.id;
        const gasto = manager.create(Gasto, {
          escribe:    `Pago delivery — cierre caja #${dto.aperturaId}`,
          categoria:  'Delivery',
          fecha:      ahora,
          cantidad:   VentasService.roundCurrency(totalDelivery),
          impuesto:   0,
          tenant:     { id: tenantId } as any,
          tienda:     tiendaId ? { id: tiendaId } as any : undefined,
          aprobadoPor: { id: user.id } as any,
        });
        await manager.save(Gasto, gasto);
      }

      return { ...saved, resumen: resumenVentas };
    });
  }

  async getCajaActiva(cajaNombre: string, user: AuthUser): Promise<CajaApertura | null> {
    const tenantId = tenantIdOrThrow(user);
    const qb = cajaRepo()
      .createQueryBuilder('ca')
      .leftJoinAndSelect('ca.usuario', 'u')
      .leftJoinAndSelect('ca.tienda', 't')
      .leftJoinAndSelect('t.tenant', 'tt')
      .leftJoinAndSelect('ca.caja', 'c')
      .leftJoinAndSelect('c.tienda', 'ct')
      .leftJoinAndSelect('ct.tenant', 'ctt')
      .where('ca.cajaNombre = :cajaNombre', { cajaNombre })
      .andWhere('ca.abierta = :abierta', { abierta: true })
      .andWhere('((t.id IS NOT NULL AND tt.id = :tenantId) OR (ct.id IS NOT NULL AND ctt.id = :tenantId))', { tenantId });
    const tiendaId = tiendaIdForUserOrThrow(user);
    if (tiendaId != null) qb.andWhere('(t.id = :tiendaId OR ct.id = :tiendaId)', { tiendaId });
    const s = await qb.getOne();
    if (!s) return null;
    this.assertCajaSessionAccess(user, s);
    return s;
  }

  /** Sesión abierta ligada a una caja del catálogo */
  async getCajaActivaPorCajaId(cajaId: number, user: AuthUser): Promise<CajaApertura | null> {
    const cat = await cajaCatalog().findOne({
      where: { id: cajaId },
      relations: ['tienda', 'tienda.tenant'],
    });
    if (!cat) return null;
    assertTiendaCaja(user, cat.tienda?.id ?? (cat as { tiendaId?: number }).tiendaId);
    assertTenantForTienda(user, cat.tienda ?? undefined);
    const s = await cajaRepo().findOne({
      where: { caja: { id: cajaId }, abierta: true },
      relations: ['usuario', 'tienda', 'tienda.tenant', 'caja', 'caja.tienda', 'caja.tienda.tenant'],
    });
    if (!s) return null;
    this.assertCajaSessionAccess(user, s);
    return s;
  }

  /** @0 desde @1 hasta @2 aperturaId @3 tenantId */
  private static readonly VENTAS_SESION_WHERE = `
    v.fecha >= @0 AND v.fecha <= @1
    AND CHARINDEX('[ANULADA]', ISNULL(v.notas, '')) = 0
    AND EXISTS (
      SELECT 1 FROM usuarios vu
      WHERE vu.id = v.usuarioId AND vu.tenantId = @3
    )
    AND (
      v.cajaAperturaId = @2
      OR (
        v.cajaAperturaId IS NULL
        AND NOT EXISTS (
          SELECT 1 FROM ventas t
          WHERE t.cajaAperturaId = @2
            AND t.fecha >= @0 AND t.fecha <= @1
        )
      )
    )`;

  // ── Resumen de sesión de caja (detallado por método, pagos mixtos, gastos) ───
  async resumenCaja(aperturaId: number, user: AuthUser): Promise<{
    totalEfectivo: number;
    totalGastos:   number;
    totalDelivery: number;
    fechaApertura: Date;
    fechaCierrePeriodo: Date;
    cajaNombre:    string;
    tiendaNombre:  string | null;
    porMetodo:     { metodoPago: string; total: number; cantidad: number }[];
    /** Suma de montos por método incluyendo desglose de ventas con pago mixto (metodosPago JSON) */
    totalesPorMetodoReal: { metodo: string; total: number }[];
    gastos:        { id: number; escribe: string; categoria: string; cantidad: number; fecha: string }[];
    cantidadVentas: number;
    totalVentas:   number;
    totalDescuentosVentas: number;
    totalImpuestosVentas: number;
    ventasAnuladasEnSesion: number;
  }> {
    const apertura = await cajaRepo().findOne({
      where: { id: aperturaId },
      relations: ['usuario', 'tienda', 'tienda.tenant', 'caja', 'caja.tienda', 'caja.tienda.tenant'],
    });
    if (!apertura) throw new AppError('Apertura no encontrada', 404);
    this.assertCajaSessionAccess(user, apertura);

    const desde = apertura.fechaApertura;
    /** Cierre contable: si la sesión ya cerró, no incluir ventas/gastos posteriores al cierre */
    const hasta = !apertura.abierta && apertura.fechaCierre ? apertura.fechaCierre : new Date();
    const ds = AppDataSource;
    const vw = VentasService.VENTAS_SESION_WHERE;
    const tenantId = tenantIdOrThrow(user);
    const p = [desde, hasta, aperturaId, tenantId];

    const [efectivo] = await ds.query(
      `SELECT ISNULL(SUM(v.total), 0) AS totalEfectivo
       FROM ventas v
       WHERE ${vw}
         AND v.metodoPago = 'EFECTIVO'`,
      p
    );

    const [deliveryRow] = await ds.query(
      `SELECT ISNULL(SUM(v.deliveryCargo), 0) AS totalDelivery
       FROM ventas v
       WHERE ${vw}
         AND v.esDelivery = 1`,
      p
    );

    const tiendaId =
      (apertura as { tiendaId?: number }).tiendaId ??
      apertura.tienda?.id ??
      apertura.caja?.tienda?.id;
    const [gastosSum] = tiendaId
      ? await ds.query(
        `SELECT ISNULL(SUM(g.cantidad), 0) AS totalGastos
         FROM gastos g
         WHERE g.fecha >= @0 AND g.fecha <= @1
           AND g.tenantId = @3
           AND (g.tiendaId IS NULL OR g.tiendaId = @2)`,
        [desde, hasta, tiendaId, tenantId]
      )
      : await ds.query(
        `SELECT ISNULL(SUM(g.cantidad), 0) AS totalGastos
         FROM gastos g WHERE g.fecha >= @0 AND g.fecha <= @1 AND g.tenantId = @2`,
        [desde, hasta, tenantId]
      );

    const porMetodo = await ds.query(
      `SELECT v.metodoPago, ISNULL(SUM(v.total), 0) AS total, COUNT(*) AS cantidad
       FROM ventas v
       WHERE ${vw}
       GROUP BY v.metodoPago`,
      p
    );

    const listaGastos = tiendaId
      ? await ds.query(
        `SELECT g.id, g.escribe, g.categoria, g.cantidad, g.fecha AS fecha
         FROM gastos g
         WHERE g.fecha >= @0 AND g.fecha <= @1
           AND g.tenantId = @3
           AND (g.tiendaId IS NULL OR g.tiendaId = @2)
         ORDER BY g.fecha ASC, g.id ASC`,
        [desde, hasta, tiendaId, tenantId]
      )
      : await ds.query(
        `SELECT g.id, g.escribe, g.categoria, g.cantidad, g.fecha AS fecha
         FROM gastos g
         WHERE g.fecha >= @0 AND g.fecha <= @1 AND g.tenantId = @2
         ORDER BY g.fecha ASC, g.id ASC`,
        [desde, hasta, tenantId]
      );

    const [cnt] = await ds.query(
      `SELECT COUNT(*) AS n, ISNULL(SUM(v.total), 0) AS t FROM ventas v WHERE ${vw}`,
      p
    );

    const [sumDesc] = await ds.query(
      `SELECT ISNULL(SUM(v.descuento), 0) AS d, ISNULL(SUM(v.impuesto), 0) AS i FROM ventas v WHERE ${vw}`,
      p
    );

    const [anul] = await ds.query(
      `SELECT COUNT(*) AS n FROM ventas v
       WHERE v.fecha >= @0 AND v.fecha <= @1
         AND CHARINDEX('[ANULADA]', ISNULL(v.notas, '')) > 0
         AND v.cajaAperturaId = @2
         AND EXISTS (
           SELECT 1 FROM usuarios vu
           WHERE vu.id = v.usuarioId AND vu.tenantId = @3
         )`,
      p
    );

    const ventasMix = await ds.query(
      `SELECT v.metodosPago AS metodosPago
       FROM ventas v
       WHERE ${vw} AND v.metodosPago IS NOT NULL AND LEN(ISNULL(v.metodosPago,'')) > 2`,
      p
    );

    const acumuladoMix: Record<string, number> = {};
    for (const row of ventasMix ?? []) {
      try {
        const arr = JSON.parse(row.metodosPago as string) as { metodo: string; monto: number }[];
        if (!Array.isArray(arr)) continue;
        for (const p of arr) {
          const k = p.metodo ?? 'OTRO';
          acumuladoMix[k] = (acumuladoMix[k] ?? 0) + Number(p.monto);
        }
      } catch { /* ignore */ }
    }

    const porMetodoArr = (porMetodo ?? []).map((r: any) => ({
      metodoPago: r.metodoPago,
      total:      Number(r.total),
      cantidad:   Number(r.cantidad),
    }));

    const totalesPorMetodoReal: { metodo: string; total: number }[] = [];
    const seen = new Set<string>();
    for (const m of porMetodoArr) {
      totalesPorMetodoReal.push({ metodo: m.metodoPago, total: m.total });
      seen.add(m.metodoPago);
    }
    for (const [metodo, total] of Object.entries(acumuladoMix)) {
      if (!seen.has(metodo)) {
        totalesPorMetodoReal.push({ metodo, total });
        seen.add(metodo);
      }
    }
    totalesPorMetodoReal.sort((a, b) => a.metodo.localeCompare(b.metodo));

    return {
      totalEfectivo: Number(efectivo?.totalEfectivo ?? 0),
      totalGastos:   Number(gastosSum?.totalGastos ?? 0),
      totalDelivery: Number(deliveryRow?.totalDelivery ?? 0),
      fechaApertura: desde,
      fechaCierrePeriodo: hasta,
      cajaNombre:    apertura.cajaNombre,
      tiendaNombre:  apertura.tienda?.nombre ?? apertura.caja?.tienda?.nombre ?? null,
      porMetodo:     porMetodoArr,
      totalesPorMetodoReal,
      gastos: (listaGastos ?? []).map((g: any) => ({
        id:        Number(g.id),
        escribe:   g.escribe,
        categoria: g.categoria,
        cantidad:  Number(g.cantidad),
        fecha:     g.fecha instanceof Date ? g.fecha.toISOString() : String(g.fecha),
      })),
      cantidadVentas: Number(cnt?.n ?? 0),
      totalVentas:    Number(cnt?.t ?? 0),
      totalDescuentosVentas: Number(sumDesc?.d ?? 0),
      totalImpuestosVentas:  Number(sumDesc?.i ?? 0),
      ventasAnuladasEnSesion: Number(anul?.n ?? 0),
    };
  }

  async generarPDFCierre(aperturaId: number, user: AuthUser): Promise<Buffer> {
    const resumen = await this.resumenCaja(aperturaId, user);
    const apertura = await cajaRepo().findOne({
      where: { id: aperturaId },
      relations: ['usuario', 'tienda', 'caja', 'caja.tienda'],
    });
    if (!apertura) throw new AppError('Apertura no encontrada', 404);

    const tidCfg = tenantIdOrThrow(user);
    const cfg = await AppDataSource.getRepository(Configuracion).findOne({
      where: { tenant: { id: tidCfg } },
    });

    const montoCierre = Number(apertura.montoCierre ?? 0);
    const efectivoEsperado = Number(apertura.montoApertura) + resumen.totalEfectivo - resumen.totalGastos;
    const diferencia = montoCierre - efectivoEsperado;

    const denominaciones: Record<string, number> = apertura.denominacionesCierre
      ? JSON.parse(apertura.denominacionesCierre)
      : {};
    const denomApertura: Record<string, number> = apertura.denominacionesApertura
      ? JSON.parse(apertura.denominacionesApertura)
      : {};

    const METODO_ES: Record<string, string> = {
      EFECTIVO:        'Efectivo',
      TARJETA:         'Tarjeta / débito / crédito',
      TRANSFERENCIA:   'Transferencia',
      CREDITO:         'Crédito a cliente',
      TARJETA_REGALO:  'Tarjeta de regalo',
      OTRO:            'Otro',
    };

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
    const fmtDuracion = (ini: Date, fin: Date) => {
      const ms = fin.getTime() - ini.getTime();
      if (ms < 0) return '—';
      const min = Math.floor(ms / 60000);
      const h = Math.floor(min / 60);
      const m = min % 60;
      return h > 0 ? `${h} h ${m} min` : `${m} min`;
    };
    const tIni = new Date(apertura.fechaApertura);
    const tFin = apertura.fechaCierre ? new Date(apertura.fechaCierre) : new Date();

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const PDFDocument = require('pdfkit');
    const doc = new PDFDocument({ size: 'A4', margin: 42 });
    doc.lineGap(0);
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));

    return new Promise((resolve, reject) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const X0 = 42;
      const X1 = 330;
      const W_LABEL = 275;
      const W_VAL = 213;
      const LH = 10;
      const LH_SM = 9;

      const row = (label: string, value: string, bold = false) => {
        const y = doc.y;
        doc.fontSize(8).font(bold ? 'Helvetica-Bold' : 'Helvetica').fillColor('#000');
        doc.text(label, X0, y, { width: W_LABEL, lineHeight: LH });
        doc.text(value, X1, y, { width: W_VAL, align: 'right', lineHeight: LH });
        doc.y = y + LH + 1;
      };

      const hr = () => {
        doc.moveDown(0.08);
        const yl = doc.y;
        doc.moveTo(X0, yl).lineTo(553, yl).stroke('#ccc');
        doc.y = yl + 4;
      };

      const section = (title: string, subtitle?: string) => {
        doc.moveDown(0.14);
        doc.fontSize(9).font('Helvetica-Bold').fillColor('#1a1a1a').text(title);
        if (subtitle) {
          doc.fontSize(7.5).font('Helvetica').fillColor('#555').text(subtitle, { width: 511, lineHeight: LH_SM });
        }
        doc.fillColor('#000').moveDown(0.06);
      };

      // ── Cabecera ─────────────────────────────────────────────────────────────
      if (cfg?.nombreCompania) {
        doc.fontSize(11).font('Helvetica-Bold').fillColor('#1a1a1a').text(cfg.nombreCompania, { align: 'center' });
        doc.moveDown(0.1);
      }
      const subLines: string[] = [];
      if (cfg?.rnc) subLines.push(`RNC: ${cfg.rnc}`);
      if (cfg?.direccion) subLines.push(cfg.direccion);
      if (cfg?.telefono) subLines.push(`Tel. ${cfg.telefono}`);
      if (subLines.length) {
        doc.fontSize(7.5).font('Helvetica').fillColor('#555').text(subLines.join(' · '), { align: 'center', lineHeight: LH_SM });
        doc.moveDown(0.12);
      }
      doc.fontSize(13).font('Helvetica-Bold').fillColor('#000').text('REPORTE DE CIERRE DE CAJA', { align: 'center' });
      doc.moveDown(0.1);
      doc.fontSize(8).font('Helvetica').text(
        `Sesión N° ${aperturaId} · ${apertura.fechaCierre ? 'Cerrada' : 'En curso'}`,
        { align: 'center', lineHeight: LH }
      );

      doc.fontSize(8).font('Helvetica').text(
        [
          `Caja: ${apertura.cajaNombre}`,
          apertura.caja?.id ? `Catálogo ID: ${apertura.caja.id}` : null,
          resumen.tiendaNombre ? `Sucursal: ${resumen.tiendaNombre}` : null,
          `Responsable: ${apertura.usuario?.nombre ?? '—'}`,
        ].filter(Boolean).join(' · '),
        X0,
        doc.y + 4,
        { width: 511, lineHeight: LH_SM }
      );

      doc.fontSize(8).font('Helvetica').text(
        [
          `Apertura: ${fmtDate(apertura.fechaApertura)}`,
          `Cierre: ${apertura.fechaCierre ? fmtDate(apertura.fechaCierre) : '—'}`,
          `Duración: ${fmtDuracion(tIni, tFin)}`,
          `Tope informe: ${fmtDate(resumen.fechaCierrePeriodo)}`,
        ].join('\n'),
        X0,
        doc.y + 4,
        { width: 511, lineHeight: LH_SM }
      );

      // ── Conteo al abrir ───────────────────────────────────────────────────────
      section('Conteo al abrir', 'Denominaciones registradas al abrir (referencia).');
      doc.fontSize(8).font('Helvetica');
      let sumApertura = 0;
      for (const den of DENS) {
        const cant = Number(denomApertura[den.value] ?? 0);
        const sub = cant * Number(den.value);
        sumApertura += sub;
        const y = doc.y;
        doc.text(den.label, X0, y, { width: 200, lineHeight: LH_SM });
        doc.text(String(cant), 250, y, { width: 70, lineHeight: LH_SM });
        doc.text(fmt(sub), X1, y, { width: W_VAL, align: 'right', lineHeight: LH_SM });
        doc.y = y + LH_SM + 0.5;
      }
      {
        const yTot = doc.y;
        doc.font('Helvetica-Bold').fontSize(8);
        doc.text('Total contado al abrir', X0, yTot, { width: 260, lineHeight: LH });
        doc.text(fmt(sumApertura), X1, yTot, { width: W_VAL, align: 'right', lineHeight: LH });
        doc.font('Helvetica');
        doc.y = yTot + LH + 1;
      }
      row('Monto apertura declarado', fmt(Number(apertura.montoApertura)), true);

      // ── Cuadre cierre ───────────────────────────────────────────────────────
      section('Cuadre de efectivo al cierre');
      row('Monto apertura', fmt(Number(apertura.montoApertura)));
      row('Ventas en efectivo (sesión)', fmt(resumen.totalEfectivo));
      row('Gastos del período (sucursal)', `- ${fmt(resumen.totalGastos)}`);
      if (resumen.totalDelivery > 0) {
        row('Cargo delivery cobrado (pagar repartidor)', fmt(resumen.totalDelivery));
      }
      hr();
      row('Efectivo esperado en caja', fmt(efectivoEsperado), true);
      row('Efectivo contado al cerrar', fmt(montoCierre), true);
      hr();
      doc.fillColor(diferencia >= 0 ? '#059669' : '#dc2626');
      row('Diferencia (contado − esperado)', `${diferencia >= 0 ? '+' : ''}${fmt(diferencia)}`, true);
      doc.fillColor('#000');

      section('Totales de ventas en la sesión');
      row('Facturas válidas', String(resumen.cantidadVentas));
      row('Total facturado', fmt(resumen.totalVentas), true);
      if (resumen.totalDescuentosVentas > 0)
        row('Descuentos en facturas', `- ${fmt(resumen.totalDescuentosVentas)}`);
      if (resumen.totalImpuestosVentas > 0)
        row('Impuestos (referencia)', fmt(resumen.totalImpuestosVentas));
      row('Ventas anuladas (sesión)', String(resumen.ventasAnuladasEnSesion));

      if (resumen.porMetodo?.length) {
        section(
          'Facturación por método principal',
          'Una línea por factura, según método principal.'
        );
        const totalCab = resumen.porMetodo.reduce((s, m) => s + m.total, 0);
        for (const m of resumen.porMetodo) {
          row(`${METODO_ES[m.metodoPago] ?? m.metodoPago} (${m.cantidad} fact.)`, fmt(m.total));
        }
        hr();
        row('Subtotal cabeceras', fmt(totalCab), true);
      }

      if (resumen.totalesPorMetodoReal?.length) {
        section(
          'Ingresos por método (incl. pagos mixtos)',
          'Montos repartidos por método cuando hay pago mixto.'
        );
        const sumReal = resumen.totalesPorMetodoReal.reduce((s, x) => s + x.total, 0);
        for (const x of resumen.totalesPorMetodoReal) {
          row(METODO_ES[x.metodo] ?? x.metodo, fmt(x.total));
        }
        hr();
        row('Suma por método (referencia)', fmt(sumReal), true);
      }

      if (resumen.gastos?.length) {
        section(`Gastos del período (${resumen.gastos.length})`);
        doc.fontSize(7.5).font('Helvetica');
        for (const g of resumen.gastos.slice(0, 80)) {
          const fh = g.fecha ? fmtDate(g.fecha) : '';
          const line = `${fh} · ${g.categoria} — ${g.escribe}: ${fmt(g.cantidad)}`;
          const y = doc.y;
          doc.text(line, X0, y, { width: 511, lineHeight: LH_SM });
          doc.y = y + LH_SM + 0.5;
        }
        if (resumen.gastos.length > 80) {
          doc.fontSize(7.5).text(`… y ${resumen.gastos.length - 80} más.`, X0, doc.y, { lineHeight: LH_SM });
          doc.moveDown(0.05);
        }
      }

      section('Conteo al cerrar', 'Denominaciones al cierre.');
      doc.fontSize(8).font('Helvetica');
      let anyCierre = false;
      for (const den of DENS) {
        const cant = Number(denominaciones[den.value] ?? 0);
        if (cant > 0) anyCierre = true;
        const sub = cant * Number(den.value);
        const y = doc.y;
        doc.text(den.label, X0, y, { width: 200, lineHeight: LH_SM });
        doc.text(String(cant), 250, y, { width: 70, lineHeight: LH_SM });
        doc.text(cant > 0 ? fmt(sub) : '—', X1, y, { width: W_VAL, align: 'right', lineHeight: LH_SM });
        doc.y = y + LH_SM + 0.5;
      }
      if (!anyCierre) {
        doc.fontSize(7.5).fillColor('#666').text(
          '(Sin detalle de billetes/monedas en cierre.)',
          X0,
          doc.y,
          { width: 511, lineHeight: LH_SM }
        );
        doc.fillColor('#000');
        doc.moveDown(0.02);
      }

      if (apertura.notasCierre?.trim()) {
        section('Observaciones del cierre');
        doc.fontSize(8).font('Helvetica').text(apertura.notasCierre.trim(), {
          width: 511,
          lineHeight: LH,
        });
      }

      doc.moveDown(0.25);
      const yRule = doc.y;
      doc.moveTo(X0, yRule).lineTo(553, yRule).stroke('#bbb');
      doc.y = yRule + 6;
      doc.fontSize(7.5).fillColor('#888').text(`Generado · ${fmtDate(new Date())}`, { align: 'center', lineHeight: LH_SM });

      doc.end();
    });
  }

  async getHistorialCajas(page = 1, limit = 20, user?: AuthUser) {
    const skip = (page - 1) * limit;
    const qb = cajaRepo()
      .createQueryBuilder('ca')
      .leftJoinAndSelect('ca.usuario', 'u')
      .leftJoinAndSelect('ca.tienda', 't')
      .leftJoinAndSelect('t.tenant', 'tt')
      .leftJoinAndSelect('ca.caja', 'c')
      .leftJoinAndSelect('c.tienda', 'ct')
      .leftJoinAndSelect('ct.tenant', 'ctt')
      .orderBy('ca.fechaApertura', 'DESC');

    if (user) {
      const myOrg = tenantIdOrThrow(user);
      qb.andWhere(
        '( (ca.tiendaId IS NOT NULL AND tt.id = :oid) OR (ca.cajaId IS NOT NULL AND ctt.id = :oid) )',
        { oid: myOrg },
      );
      const tid = tiendaIdForUserOrThrow(user);
      if (tid != null) {
        qb.andWhere('(t.id = :tid OR ct.id = :tid)', { tid });
      }
      if (user.rol === 'cajero') {
        qb.andWhere('u.id = :uid', { uid: user.id });
      }
    }

    const [data, total] = await qb.skip(skip).take(limit).getManyAndCount();
    return { data, total, page, limit };
  }

  /** Cajas abiertas (varias sucursales / varias cajas con nombre distinto) */
  async listCajasAbiertas(user: AuthUser): Promise<CajaApertura[]> {
    const myOrg = tenantIdOrThrow(user);
    const tid = tiendaIdForUserOrThrow(user);
    const qb = cajaRepo()
      .createQueryBuilder('ca')
      .leftJoinAndSelect('ca.usuario', 'u')
      .leftJoinAndSelect('ca.tienda', 't')
      .leftJoinAndSelect('t.tenant', 'tt')
      .leftJoinAndSelect('ca.caja', 'c')
      .leftJoinAndSelect('c.tienda', 'ct')
      .leftJoinAndSelect('ct.tenant', 'ctt')
      .where('ca.abierta = :abierta', { abierta: true })
      .andWhere(
        '( (ca.tiendaId IS NOT NULL AND tt.id = :oid) OR (ca.cajaId IS NOT NULL AND ctt.id = :oid) )',
        { oid: myOrg },
      )
      .orderBy('ca.cajaNombre', 'ASC');
    if (tid != null) {
      qb.andWhere('(t.id = :tid OR ct.id = :tid)', { tid });
    }
    if (user.rol === 'cajero') {
      qb.andWhere('u.id = :uid', { uid: user.id });
    }
    return qb.getMany();
  }
}
