import { AppDataSource }     from '../../config/database';
import { Cotizacion }        from '../../entities/Cotizacion.entity';
import { CotizacionDetalle } from '../../entities/CotizacionDetalle.entity';
import { Articulo }          from '../../entities/Articulo.entity';
import { Venta }             from '../../entities/Venta.entity';
import { VentaDetalle }      from '../../entities/VentaDetalle.entity';
import { AppError }          from '../../middlewares/error.middleware';
import { getPagination }     from '../../utils/pagination';
import { CreateCotizacionDto, UpdateCotizacionDto, CambiarEstadoDto } from './dto/cotizaciones.dto';
import { AuthUser }          from '@pos/shared';
import { Request }           from 'express';
import { LessThan }          from 'typeorm';

const cotizRepo  = () => AppDataSource.getRepository(Cotizacion);
const artRepo    = () => AppDataSource.getRepository(Articulo);
const ventaRepo  = () => AppDataSource.getRepository(Venta);

export class CotizacionesService {

  // ── Listar ────────────────────────────────────────────────────────────────
  async findAll(req: Request) {
    const { page, limit, skip } = getPagination(req);
    const { estado, clienteId } = req.query as Record<string, string>;

    const qb = cotizRepo()
      .createQueryBuilder('c')
      .leftJoinAndSelect('c.cliente',    'cliente')
      .leftJoinAndSelect('c.creadoPor',  'creadoPor')
      .leftJoinAndSelect('c.detalles',   'detalles')
      .leftJoinAndSelect('detalles.articulo', 'articulo')
      .orderBy('c.createdAt', 'DESC')
      .skip(skip)
      .take(limit);

    if (estado)    qb.andWhere('c.estado = :estado',       { estado });
    if (clienteId) qb.andWhere('cliente.id = :clienteId', { clienteId: parseInt(clienteId) });

    const [data, total] = await qb.getManyAndCount();
    return { data, total, page, limit };
  }

  // ── Detalle ───────────────────────────────────────────────────────────────
  async findById(id: number): Promise<Cotizacion> {
    const c = await cotizRepo().findOne({
      where: { id },
      relations: ['cliente', 'creadoPor', 'detalles', 'detalles.articulo', 'detalles.articulo.categoria'],
    });
    if (!c) throw new AppError('Cotización no encontrada', 404);
    return c;
  }

  // ── Crear ─────────────────────────────────────────────────────────────────
  async create(dto: CreateCotizacionDto, usuarioId: number): Promise<Cotizacion> {
    return AppDataSource.transaction(async (manager) => {
      let subtotal = 0;
      const detallesEntidades: CotizacionDetalle[] = [];

      for (const d of dto.detalles) {
        const art = await manager.findOne(Articulo, { where: { id: d.articuloId, activo: true } });
        if (!art) throw new AppError(`Artículo ID ${d.articuloId} no encontrado`, 404);

        const lineaTotal = d.precioUnitario * d.cantidad * (1 - (d.descuento ?? 0) / 100);
        subtotal += lineaTotal;

        const det = manager.create(CotizacionDetalle, {
          articulo:       art,
          cantidad:       d.cantidad,
          precioUnitario: d.precioUnitario,
          descuento:      d.descuento ?? 0,
          total:          lineaTotal,
        });
        detallesEntidades.push(det);
      }

      const descuentoGlobal = dto.descuento ?? 0;
      const total = subtotal * (1 - descuentoGlobal / 100);

      const cotiz = manager.create(Cotizacion, {
        estado:      'BORRADOR',
        notas:       dto.notas,
        validezDias: dto.validezDias ?? 30,
        subtotal,
        descuento:   descuentoGlobal,
        total,
        cliente:     dto.clienteId ? { id: dto.clienteId } as any : undefined,
        creadoPor:   { id: usuarioId } as any,
        detalles:    detallesEntidades,
      });

      return manager.save(Cotizacion, cotiz);
    });
  }

  // ── Actualizar (solo BORRADOR) ────────────────────────────────────────────
  async update(id: number, dto: UpdateCotizacionDto): Promise<Cotizacion> {
    return AppDataSource.transaction(async (manager) => {
      const cotiz = await manager.findOne(Cotizacion, {
        where: { id },
        relations: ['detalles'],
      });
      if (!cotiz) throw new AppError('Cotización no encontrada', 404);
      if (cotiz.estado !== 'BORRADOR') {
        throw new AppError('Solo se pueden editar cotizaciones en estado BORRADOR', 400);
      }

      // Actualizar detalles si se envían
      if (dto.detalles && dto.detalles.length > 0) {
        await manager.delete(CotizacionDetalle, { cotizacion: { id } });

        let subtotal = 0;
        const nuevosDetalles: CotizacionDetalle[] = [];

        for (const d of dto.detalles) {
          const art = await manager.findOne(Articulo, { where: { id: d.articuloId, activo: true } });
          if (!art) throw new AppError(`Artículo ID ${d.articuloId} no encontrado`, 404);

          const lineaTotal = d.precioUnitario * d.cantidad * (1 - (d.descuento ?? 0) / 100);
          subtotal += lineaTotal;

          nuevosDetalles.push(manager.create(CotizacionDetalle, {
            cotizacion:     { id } as any,
            articulo:       art,
            cantidad:       d.cantidad,
            precioUnitario: d.precioUnitario,
            descuento:      d.descuento ?? 0,
            total:          lineaTotal,
          }));
        }

        await manager.save(CotizacionDetalle, nuevosDetalles);

        const descuentoGlobal = dto.descuento ?? cotiz.descuento ?? 0;
        cotiz.subtotal  = subtotal;
        cotiz.descuento = descuentoGlobal;
        cotiz.total     = subtotal * (1 - Number(descuentoGlobal) / 100);
      } else if (dto.descuento !== undefined) {
        cotiz.descuento = dto.descuento;
        cotiz.total     = Number(cotiz.subtotal) * (1 - dto.descuento / 100);
      }

      if (dto.notas       !== undefined) cotiz.notas       = dto.notas;
      if (dto.validezDias !== undefined) cotiz.validezDias = dto.validezDias;
      if (dto.clienteId   !== undefined) {
        cotiz.cliente = dto.clienteId ? { id: dto.clienteId } as any : undefined;
      }

      return manager.save(Cotizacion, cotiz);
    });
  }

  // ── Cambiar estado ────────────────────────────────────────────────────────
  async cambiarEstado(id: number, dto: CambiarEstadoDto): Promise<Cotizacion> {
    const cotiz = await cotizRepo().findOne({ where: { id } });
    if (!cotiz) throw new AppError('Cotización no encontrada', 404);

    // Validar transiciones
    const transitions: Record<string, string[]> = {
      BORRADOR:  ['ENVIADA', 'RECHAZADA'],
      ENVIADA:   ['ACEPTADA', 'RECHAZADA', 'VENCIDA'],
      ACEPTADA:  [],
      RECHAZADA: [],
      VENCIDA:   [],
    };

    if (!transitions[cotiz.estado]?.includes(dto.estado)) {
      throw new AppError(`No se puede cambiar de ${cotiz.estado} a ${dto.estado}`, 400);
    }

    cotiz.estado = dto.estado;
    return cotizRepo().save(cotiz);
  }

  // ── Convertir a venta ─────────────────────────────────────────────────────
  async convertirAVenta(id: number, currentUser: AuthUser): Promise<Venta> {
    return AppDataSource.transaction(async (manager) => {
      const cotiz = await manager.findOne(Cotizacion, {
        where: { id },
        relations: ['cliente', 'detalles', 'detalles.articulo'],
      });
      if (!cotiz) throw new AppError('Cotización no encontrada', 404);
      if (!['ENVIADA', 'ACEPTADA'].includes(cotiz.estado)) {
        throw new AppError('Solo se pueden convertir cotizaciones en estado ENVIADA o ACEPTADA', 400);
      }

      const ventaDetalles: VentaDetalle[] = [];
      for (const d of cotiz.detalles) {
        ventaDetalles.push(manager.create(VentaDetalle, {
          articulo:       d.articulo,
          cantidad:       d.cantidad,
          precioUnitario: d.precioUnitario,
          descuento:      d.descuento,
          total:          d.total,
        }));
      }

      const venta = manager.create(Venta, {
        subtotal:   cotiz.subtotal,
        descuento:  cotiz.descuento,
        impuesto:   0,
        total:      cotiz.total,
        metodoPago: 'EFECTIVO',
        notas:      `Convertido de cotización #${cotiz.id}${cotiz.notas ? '. ' + cotiz.notas : ''}`,
        usuario:    { id: currentUser.id } as any,
        cliente:    cotiz.cliente ? { id: cotiz.cliente.id } as any : undefined,
        detalles:   ventaDetalles,
      });

      const savedVenta = await manager.save(Venta, venta);

      cotiz.estado = 'ACEPTADA';
      await manager.save(Cotizacion, cotiz);

      return savedVenta;
    });
  }

  // ── Eliminar ──────────────────────────────────────────────────────────────
  async delete(id: number): Promise<void> {
    const cotiz = await cotizRepo().findOne({ where: { id } });
    if (!cotiz) throw new AppError('Cotización no encontrada', 404);
    if (['ACEPTADA'].includes(cotiz.estado)) {
      throw new AppError('No se puede eliminar una cotización aceptada', 400);
    }
    await cotizRepo().remove(cotiz);
  }

  // ── Marcar vencidas ───────────────────────────────────────────────────────
  async checkVencidas(): Promise<number> {
    const hoy = new Date();
    const enviadas = await cotizRepo().find({ where: { estado: 'ENVIADA' } });

    let count = 0;
    for (const c of enviadas) {
      const fechaVencimiento = new Date(c.createdAt);
      fechaVencimiento.setDate(fechaVencimiento.getDate() + c.validezDias);
      if (fechaVencimiento < hoy) {
        c.estado = 'VENCIDA';
        await cotizRepo().save(c);
        count++;
      }
    }
    return count;
  }
}
