import { AppDataSource } from '../../config/database';
import { OrdenCompra, EstadoOrden } from '../../entities/OrdenCompra.entity';
import { OrdenCompraDetalle } from '../../entities/OrdenCompraDetalle.entity';
import { Articulo } from '../../entities/Articulo.entity';
import { AppError } from '../../middlewares/error.middleware';
import { registrarMovimiento } from '../inventario/inventario.service';

const repo       = () => AppDataSource.getRepository(OrdenCompra);
const detalleRepo = () => AppDataSource.getRepository(OrdenCompraDetalle);
const artRepo    = () => AppDataSource.getRepository(Articulo);

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

  async findAll(estado?: string) {
    const qb = repo()
      .createQueryBuilder('o')
      .leftJoinAndSelect('o.proveedor', 'prov')
      .leftJoinAndSelect('o.creadoPor', 'usr')
      .leftJoinAndSelect('o.detalles', 'd')
      .leftJoinAndSelect('d.articulo', 'art')
      .orderBy('o.createdAt', 'DESC');

    if (estado) qb.where('o.estado = :estado', { estado });

    return qb.getMany();
  }

  async findById(id: number): Promise<OrdenCompra> {
    const o = await repo().findOne({
      where: { id },
      relations: ['proveedor', 'creadoPor', 'detalles', 'detalles.articulo'],
    });
    if (!o) throw new AppError('Orden no encontrada', 404);
    return o;
  }

  async create(data: CreateOrdenInput, usuarioId: number): Promise<OrdenCompra> {
    if (!data.detalles || data.detalles.length === 0) {
      throw new AppError('La orden debe tener al menos un artículo', 400);
    }

    const orden = repo().create({
      estado:        'BORRADOR',
      notas:         data.notas,
      fechaEsperada: data.fechaEsperada,
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

  async update(id: number, data: Partial<CreateOrdenInput>): Promise<OrdenCompra> {
    const orden = await this.findById(id);
    if (orden.estado !== 'BORRADOR') {
      throw new AppError('Solo se pueden editar órdenes en estado BORRADOR', 400);
    }

    if (data.notas         !== undefined) orden.notas         = data.notas;
    if (data.fechaEsperada !== undefined) orden.fechaEsperada = data.fechaEsperada;
    if (data.proveedorId   !== undefined) {
      orden.proveedor = data.proveedorId ? { id: data.proveedorId } as any : undefined;
    }

    if (data.detalles && data.detalles.length > 0) {
      // Reemplazar detalles
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

  async cambiarEstado(id: number, nuevoEstado: EstadoOrden): Promise<OrdenCompra> {
    const orden = await this.findById(id);

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
  ): Promise<OrdenCompra> {
    const orden = await this.findById(id);

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

        // Actualizar stock y costo promedio ponderado
        const art = await em.findOne(Articulo, { where: { id: detalle.articulo.id } });
        if (art) {
          const stockAntes = art.cantidad ?? 0;
          const costoAntes = Number(art.costo ?? 0);
          // Costo promedio ponderado: (costoActual * stockActual + nuevoCosto * nuevaCantidad) / stockTotal
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

      // Si todos los detalles están completamente recibidos → RECIBIDA
      const todosRecibidos = orden.detalles.every(
        (d) => d.cantidadRecibida >= d.cantidad
      );
      if (todosRecibidos) {
        orden.estado        = 'RECIBIDA';
        orden.fechaRecibida = new Date();
      } else {
        // Recepción parcial → dejar en ENVIADA
        orden.estado = 'ENVIADA';
      }

      await em.save(OrdenCompra, orden);
    });

    return this.findById(id);
  }

  async cancelar(id: number): Promise<OrdenCompra> {
    return this.cambiarEstado(id, 'CANCELADA');
  }
}
