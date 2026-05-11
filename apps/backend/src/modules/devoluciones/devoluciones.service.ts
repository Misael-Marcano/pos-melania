import { AuthUser } from '@pos/shared';
import { AppDataSource }      from '../../config/database';
import { Devolucion }         from '../../entities/Devolucion.entity';
import { DevolucionDetalle }  from '../../entities/DevolucionDetalle.entity';
import { Venta }              from '../../entities/Venta.entity';
import { Articulo }           from '../../entities/Articulo.entity';
import { Tenant }             from '../../entities/Tenant.entity';
import { AppError }           from '../../middlewares/error.middleware';
import { MetodoPago }         from '@pos/shared';
import { assertTenantMatch, tenantIdOrThrow } from '../../utils/tenant-access';
import { registrarMovimiento } from '../inventario/inventario.service';

const repo = () => AppDataSource.getRepository(Devolucion);

export interface DetalleDevolucionInput {
  articuloId:          number;
  cantidad:            number;
  precioUnitario:      number;
  regresaAInventario?: boolean;
}

export interface CreateDevolucionInput {
  ventaId:          number;
  motivo:           string;
  notas?:           string;
  metodoReembolso?: MetodoPago;
  detalles:         DetalleDevolucionInput[];
}

export class DevolucionesService {

  async findAll(user: AuthUser, estado?: string) {
    const tid = tenantIdOrThrow(user);
    const qb = repo()
      .createQueryBuilder('d')
      .leftJoinAndSelect('d.venta',       'v')
      .leftJoinAndSelect('v.cliente',     'vc')
      .leftJoinAndSelect('d.creadoPor',   'cp')
      .leftJoinAndSelect('d.revisadoPor', 'rp')
      .leftJoinAndSelect('d.detalles',    'dd')
      .leftJoinAndSelect('dd.articulo',   'art')
      .where('d.tenantId = :tid', { tid })
      .orderBy('d.createdAt', 'DESC');

    if (estado) qb.andWhere('d.estado = :estado', { estado });
    return qb.getMany();
  }

  async findById(id: number, user: AuthUser): Promise<Devolucion> {
    const tid = tenantIdOrThrow(user);
    const d = await repo().findOne({
      where: { id, tenant: { id: tid } },
      relations: ['venta', 'venta.cliente', 'venta.detalles', 'venta.detalles.articulo',
                  'creadoPor', 'revisadoPor', 'detalles', 'detalles.articulo'],
    });
    if (!d) throw new AppError('Devolución no encontrada', 404);
    return d;
  }

  async findByVenta(ventaId: number, user: AuthUser): Promise<Devolucion[]> {
    const tid = tenantIdOrThrow(user);
    return repo().find({
      where: { venta: { id: ventaId }, tenant: { id: tid } },
      relations: ['detalles', 'detalles.articulo', 'creadoPor'],
      order: { createdAt: 'DESC' },
    });
  }

  async create(data: CreateDevolucionInput, user: AuthUser): Promise<Devolucion> {
    const tid = tenantIdOrThrow(user);
    const usuarioId = user.id;
    if (!data.detalles || data.detalles.length === 0) {
      throw new AppError('La devolución debe tener al menos un artículo', 400);
    }

    const ventaRepo = AppDataSource.getRepository(Venta);
    const venta = await ventaRepo.findOne({
      where: { id: data.ventaId },
      relations: [
        'detalles', 'detalles.articulo',
        'cajaApertura', 'cajaApertura.tienda', 'cajaApertura.tienda.tenant',
      ],
    });
    if (!venta) throw new AppError('Venta no encontrada', 404);
    if (venta.notas?.startsWith('[ANULADA]')) {
      throw new AppError('No se puede devolver una venta anulada', 400);
    }
    const ventaTid = venta.cajaApertura?.tienda?.tenant?.id;
    if (ventaTid == null) {
      throw new AppError('La venta no tiene sesión de caja/tienda asociada; no se puede devolver', 400);
    }
    assertTenantMatch(user, ventaTid);

    const artRepo = AppDataSource.getRepository(Articulo);
    for (const line of data.detalles) {
      const art = await artRepo.findOne({
        where: { id: line.articuloId, tenant: { id: tid } },
      });
      if (!art) throw new AppError(`Artículo ${line.articuloId} no encontrado en su organización`, 404);
    }

    const detRepo = AppDataSource.getRepository(DevolucionDetalle);
    const detalles = data.detalles.map((d) =>
      detRepo.create({
        cantidad:           d.cantidad,
        precioUnitario:     d.precioUnitario,
        total:              d.cantidad * d.precioUnitario,
        regresaAInventario: d.regresaAInventario !== false,
        articulo:           { id: d.articuloId } as Articulo,
      })
    );

    const total = detalles.reduce((s, d) => s + Number(d.total), 0);

    const devolucion = repo().create({
      tenant:          { id: tid } as Tenant,
      estado:          'PENDIENTE',
      motivo:          data.motivo,
      notas:           data.notas,
      metodoReembolso: data.metodoReembolso ?? 'EFECTIVO',
      total,
      venta:           { id: data.ventaId } as Venta,
      creadoPor:       { id: usuarioId } as Devolucion['creadoPor'],
      detalles,
    });

    return repo().save(devolucion);
  }

  async aprobar(id: number, user: AuthUser): Promise<Devolucion> {
    const tid = tenantIdOrThrow(user);
    const usuarioId = user.id;
    const devolucion = await this.findById(id, user);

    if (devolucion.estado !== 'PENDIENTE') {
      throw new AppError('Solo se pueden aprobar devoluciones pendientes', 400);
    }

    await AppDataSource.transaction(async (em) => {
      const artRepo = em.getRepository(Articulo);
      for (const det of devolucion.detalles) {
        if (!det.regresaAInventario) continue;
        const art = await artRepo.findOne({
          where: { id: det.articulo.id, tenant: { id: tid } },
        });
        if (art) {
          const stockAntes = art.cantidad ?? 0;
          art.cantidad = stockAntes + det.cantidad;
          await artRepo.save(art);
          await registrarMovimiento({
            articuloId:    art.id,
            tipo:          'DEVOLUCION',
            cantidad:      det.cantidad,
            stockAntes,
            stockDespues:  art.cantidad,
            referenciaId:  id,
            referenciaTipo: 'Devolucion',
            usuarioId,
            manager:       em,
          });
        }
      }

      devolucion.estado      = 'APROBADA';
      devolucion.revisadoPor = { id: usuarioId } as Devolucion['revisadoPor'];
      await em.save(Devolucion, devolucion);
    });

    return this.findById(id, user);
  }

  async rechazar(id: number, user: AuthUser, motivo?: string): Promise<Devolucion> {
    const usuarioId = user.id;
    const devolucion = await this.findById(id, user);

    if (devolucion.estado !== 'PENDIENTE') {
      throw new AppError('Solo se pueden rechazar devoluciones pendientes', 400);
    }

    if (motivo) devolucion.notas = `[RECHAZO] ${motivo}${devolucion.notas ? ` | ${devolucion.notas}` : ''}`;
    devolucion.estado      = 'RECHAZADA';
    devolucion.revisadoPor = { id: usuarioId } as Devolucion['revisadoPor'];

    return repo().save(devolucion);
  }
}
