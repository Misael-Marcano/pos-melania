import { AppDataSource } from '../../config/database';
import { OrdenCompra, EstadoOrden } from '../../entities/OrdenCompra.entity';
import { OrdenCompraDetalle } from '../../entities/OrdenCompraDetalle.entity';
import { Articulo } from '../../entities/Articulo.entity';
import { Proveedor } from '../../entities/Proveedor.entity';
import { AppError } from '../../middlewares/error.middleware';
import { registrarMovimiento } from '../inventario/inventario.service';
import { assertTenantMatch, tenantIdOrThrow } from '../../utils/tenant-access';
import { assertFeatureEnabled } from '../../saas/enforce-plan';
import { AuthUser } from '@pos/shared';

const repo        = () => AppDataSource.getRepository(OrdenCompra);
const detalleRepo = () => AppDataSource.getRepository(OrdenCompraDetalle);
const artRepo     = () => AppDataSource.getRepository(Articulo);
const provRepo    = () => AppDataSource.getRepository(Proveedor);

export interface DetalleInput {
  articuloId:    number;
  cantidad:      number;
  costoUnitario: number;
}

export interface CreateOrdenInput {
  proveedorId?:   number;
  notas?:         string;
  fechaEsperada?: string;
  detalles:       DetalleInput[];
}

export interface RecibirDetalleInput {
  detalleId:        number;
  cantidadRecibida: number;
}

export class ComprasService {

  async findAll(estado: string | undefined, user: AuthUser) {
    const tid = tenantIdOrThrow(user);
    const qb = repo()
      .createQueryBuilder('o')
      .leftJoinAndSelect('o.proveedor', 'prov')
      .leftJoinAndSelect('o.creadoPor', 'usr')
      .leftJoinAndSelect('o.detalles', 'd')
      .leftJoinAndSelect('d.articulo', 'art')
      .where('o.tenantId = :tid', { tid })
      .orderBy('o.createdAt', 'DESC');

    if (estado) qb.andWhere('o.estado = :estado', { estado });

    return qb.getMany();
  }

  async findById(id: number, user: AuthUser): Promise<OrdenCompra> {
    const o = await repo().findOne({
      where: { id },
      relations: ['proveedor', 'creadoPor', 'detalles', 'detalles.articulo', 'tenant'],
    });
    if (!o) throw new AppError('Orden no encontrada', 404);
    assertTenantMatch(user, o.tenant?.id);
    return o;
  }

  async create(data: CreateOrdenInput, usuarioId: number, user: AuthUser): Promise<OrdenCompra> {
    if (!data.detalles || data.detalles.length === 0) {
      throw new AppError('La orden debe tener al menos un artículo', 400);
    }

    const tid = tenantIdOrThrow(user);
    await assertFeatureEnabled(tid, 'compras');

    if (data.proveedorId) {
      const prov = await provRepo().findOne({ where: { id: data.proveedorId, tenant: { id: tid } } });
      if (!prov) throw new AppError('Proveedor no encontrado', 404);
    }

    for (const d of data.detalles) {
      const art = await artRepo().findOne({ where: { id: d.articuloId, tenant: { id: tid } } });
      if (!art) throw new AppError(`Artículo ID ${d.articuloId} no encontrado en su organización`, 404);
    }

    const orden = repo().create({
      estado:        'BORRADOR',
      notas:         data.notas,
      fechaEsperada: data.fechaEsperada,
      tenant:        { id: tid } as any,
      proveedor:     data.proveedorId ? { id: data.proveedorId } as any : undefined,
      creadoPor:     { id: usuarioId } as any,
    });

    orden.detalles = data.detalles.map((d) => {
      const det = detalleRepo().create({
        cantidad:      d.cantidad,
        costoUnitario: d.costoUnitario,
        total:         d.cantidad * d.costoUnitario,
        articulo:      { id: d.articuloId } as any,
      });
      return det;
    });

    orden.total = orden.detalles.reduce((s, d) => s + Number(d.total), 0);

    return repo().save(orden);
  }

  async update(id: number, data: Partial<CreateOrdenInput>, user: AuthUser): Promise<OrdenCompra> {
    const tid = tenantIdOrThrow(user);
    const orden = await this.findById(id, user);
    if (orden.estado !== 'BORRADOR') {
      throw new AppError('Solo se pueden editar órdenes en estado BORRADOR', 400);
    }

    if (data.proveedorId) {
      const prov = await provRepo().findOne({ where: { id: data.proveedorId, tenant: { id: tid } } });
      if (!prov) throw new AppError('Proveedor no encontrado', 404);
    }

    if (data.notas         !== undefined) orden.notas         = data.notas;
    if (data.fechaEsperada !== undefined) orden.fechaEsperada = data.fechaEsperada;
    if (data.proveedorId   !== undefined) {
      orden.proveedor = data.proveedorId ? { id: data.proveedorId } as any : undefined;
    }

    if (data.detalles && data.detalles.length > 0) {
      for (const d of data.detalles) {
        const art = await artRepo().findOne({ where: { id: d.articuloId, tenant: { id: tid } } });
        if (!art) throw new AppError(`Artículo ID ${d.articuloId} no encontrado en su organización`, 404);
      }
      await detalleRepo().delete({ orden: { id } });
      orden.detalles = data.detalles.map((d) =>
        detalleRepo().create({
          cantidad:      d.cantidad,
          costoUnitario: d.costoUnitario,
          total:         d.cantidad * d.costoUnitario,
          articulo:      { id: d.articuloId } as any,
        })
      );
      orden.total = orden.detalles.reduce((s, d) => s + Number(d.total), 0);
    }

    return repo().save(orden);
  }

  async cambiarEstado(id: number, nuevoEstado: EstadoOrden, user: AuthUser): Promise<OrdenCompra> {
    const orden = await this.findById(id, user);

    const transiciones: Record<EstadoOrden, EstadoOrden[]> = {
      BORRADOR:  ['ENVIADA', 'CANCELADA'],
      ENVIADA:   ['RECIBIDA', 'CANCELADA'],
      RECIBIDA:  [],
      CANCELADA: [],
    };

    if (!transiciones[orden.estado].includes(nuevoEstado)) {
      throw new AppError(
        `No se puede cambiar de ${orden.estado} a ${nuevoEstado}`, 400
      );
    }

    orden.estado = nuevoEstado;
    return repo().save(orden);
  }

  async recibirOrden(
    id: number,
    recepciones: RecibirDetalleInput[],
    user: AuthUser,
  ): Promise<OrdenCompra> {
    const tid = tenantIdOrThrow(user);
    const orden = await this.findById(id, user);

    if (orden.estado !== 'ENVIADA' && orden.estado !== 'BORRADOR') {
      throw new AppError('Solo se pueden recibir órdenes ENVIADAS o BORRADORES', 400);
    }

    await AppDataSource.transaction(async (em) => {
      for (const rec of recepciones) {
        const detalle = orden.detalles.find((d) => d.id === rec.detalleId);
        if (!detalle) continue;

        const recibir = Math.min(rec.cantidadRecibida, detalle.cantidad - detalle.cantidadRecibida);
        if (recibir <= 0) continue;

        detalle.cantidadRecibida += recibir;
        await em.save(OrdenCompraDetalle, detalle);

        const art = await em.findOne(Articulo, {
          where: { id: detalle.articulo.id, tenant: { id: tid } },
        });
        if (art) {
          const stockAntes = art.cantidad ?? 0;
          const costoAntes = Number(art.costo ?? 0);
          const nuevoCosto = stockAntes > 0
            ? (costoAntes * stockAntes + Number(detalle.costoUnitario) * recibir) / (stockAntes + recibir)
            : Number(detalle.costoUnitario);
          art.cantidad  = stockAntes + recibir;
          art.costo     = Math.round(nuevoCosto * 100) / 100;
          await em.save(Articulo, art);
          await registrarMovimiento({
            articuloId:    art.id,
            tipo:          'COMPRA',
            cantidad:      recibir,
            stockAntes,
            stockDespues:  art.cantidad,
            referenciaId:  id,
            referenciaTipo: 'OrdenCompra',
            manager:       em,
          });
        }
      }

      const todosRecibidos = orden.detalles.every(
        (d) => d.cantidadRecibida >= d.cantidad
      );
      if (todosRecibidos) {
        orden.estado        = 'RECIBIDA';
        orden.fechaRecibida = new Date();
      } else {
        orden.estado = 'ENVIADA';
      }

      await em.save(OrdenCompra, orden);
    });

    return this.findById(id, user);
  }

  async cancelar(id: number, user: AuthUser): Promise<OrdenCompra> {
    return this.cambiarEstado(id, 'CANCELADA', user);
  }
}
