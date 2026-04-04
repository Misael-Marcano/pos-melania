import { AppDataSource }      from '../../config/database';
import { Devolucion }         from '../../entities/Devolucion.entity';
import { DevolucionDetalle }  from '../../entities/DevolucionDetalle.entity';
import { Venta }              from '../../entities/Venta.entity';
import { Articulo }           from '../../entities/Articulo.entity';
import { AppError }           from '../../middlewares/error.middleware';
import { MetodoPago }         from '@pos/shared';
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

  async findAll(estado?: string) {
    const qb = repo()
      .createQueryBuilder('d')
      .leftJoinAndSelect('d.venta',       'v')
      .leftJoinAndSelect('v.cliente',     'vc')
      .leftJoinAndSelect('d.creadoPor',   'cp')
      .leftJoinAndSelect('d.revisadoPor', 'rp')
      .leftJoinAndSelect('d.detalles',    'dd')
      .leftJoinAndSelect('dd.articulo',   'art')
      .orderBy('d.createdAt', 'DESC');

    if (estado) qb.where('d.estado = :estado', { estado });
    return qb.getMany();
  }

  async findById(id: number): Promise<Devolucion> {
    const d = await repo().findOne({
      where: { id },
      relations: ['venta', 'venta.cliente', 'venta.detalles', 'venta.detalles.articulo',
                  'creadoPor', 'revisadoPor', 'detalles', 'detalles.articulo'],
    });
    if (!d) throw new AppError('Devolución no encontrada', 404);
    return d;
  }

  async findByVenta(ventaId: number): Promise<Devolucion[]> {
    return repo().find({
      where: { venta: { id: ventaId } },
      relations: ['detalles', 'detalles.articulo', 'creadoPor'],
      order: { createdAt: 'DESC' },
    });
  }

  async create(data: CreateDevolucionInput, usuarioId: number): Promise<Devolucion> {
    if (!data.detalles || data.detalles.length === 0) {
      throw new AppError('La devolución debe tener al menos un artículo', 400);
    }

    // Verificar que la venta existe y no está anulada
    const ventaRepo = AppDataSource.getRepository(Venta);
    const venta = await ventaRepo.findOne({
      where: { id: data.ventaId },
      relations: ['detalles', 'detalles.articulo'],
    });
    if (!venta) throw new AppError('Venta no encontrada', 404);
    if (venta.notas?.startsWith('[ANULADA]')) {
      throw new AppError('No se puede devolver una venta anulada', 400);
    }

    const detRepo = AppDataSource.getRepository(DevolucionDetalle);
    const detalles = data.detalles.map((d) =>
      detRepo.create({
        cantidad:           d.cantidad,
        precioUnitario:     d.precioUnitario,
        total:              d.cantidad * d.precioUnitario,
        regresaAInventario: d.regresaAInventario !== false,
        articulo:           { id: d.articuloId } as any,
      })
    );

    const total = detalles.reduce((s, d) => s + Number(d.total), 0);

    const devolucion = repo().create({
      estado:          'PENDIENTE',
      motivo:          data.motivo,
      notas:           data.notas,
      metodoReembolso: data.metodoReembolso ?? 'EFECTIVO',
      total,
      venta:           { id: data.ventaId } as any,
      creadoPor:       { id: usuarioId } as any,
      detalles,
    });

    return repo().save(devolucion);
  }

  async aprobar(id: number, usuarioId: number): Promise<Devolucion> {
    const devolucion = await this.findById(id);

    if (devolucion.estado !== 'PENDIENTE') {
      throw new AppError('Solo se pueden aprobar devoluciones pendientes', 400);
    }

    await AppDataSource.transaction(async (em) => {
      // Restaurar stock para items marcados
      const artRepo = em.getRepository(Articulo);
      for (const det of devolucion.detalles) {
        if (!det.regresaAInventario) continue;
        const art = await artRepo.findOne({ where: { id: det.articulo.id } });
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
      devolucion.revisadoPor = { id: usuarioId } as any;
      await em.save(Devolucion, devolucion);
    });

    return this.findById(id);
  }

  async rechazar(id: number, usuarioId: number, motivo?: string): Promise<Devolucion> {
    const devolucion = await this.findById(id);

    if (devolucion.estado !== 'PENDIENTE') {
      throw new AppError('Solo se pueden rechazar devoluciones pendientes', 400);
    }

    if (motivo) devolucion.notas = `[RECHAZO] ${motivo}${devolucion.notas ? ` | ${devolucion.notas}` : ''}`;
    devolucion.estado      = 'RECHAZADA';
    devolucion.revisadoPor = { id: usuarioId } as any;

    return repo().save(devolucion);
  }
}
