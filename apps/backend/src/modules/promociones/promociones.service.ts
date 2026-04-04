import { ILike } from 'typeorm';
import { AppDataSource } from '../../config/database';
import { Promocion, TipoPromocion } from '../../entities/Promocion.entity';
import { AppError } from '../../middlewares/error.middleware';

const repo = () => AppDataSource.getRepository(Promocion);

export class PromocionesService {

  async findAll(q?: string) {
    const where = q ? [{ codigo: ILike(`%${q}%`) }, { nombre: ILike(`%${q}%`) }] : {};
    return repo().find({ where, order: { createdAt: 'DESC' } });
  }

  async findById(id: number): Promise<Promocion> {
    const p = await repo().findOne({ where: { id } });
    if (!p) throw new AppError('Promoción no encontrada', 404);
    return p;
  }

  async findByCodigo(codigo: string): Promise<Promocion> {
    const p = await repo().findOne({ where: { codigo: codigo.toUpperCase() } });
    if (!p) throw new AppError('Código de descuento no válido', 404);
    return p;
  }

  /** Valida y devuelve el descuento calculado para un total dado */
  async validar(codigo: string, totalCompra: number): Promise<{
    promocion: Promocion;
    descuentoMonto: number;
  }> {
    const p = await this.findByCodigo(codigo);

    if (!p.activa) throw new AppError('Esta promoción no está activa', 400);
    if (p.usoMaximo !== null && p.usoMaximo !== undefined && p.usosActuales >= p.usoMaximo) {
      throw new AppError('Esta promoción ya alcanzó el límite de usos', 400);
    }
    const hoy = new Date();
    if (p.fechaInicio && new Date(p.fechaInicio) > hoy) throw new AppError('La promoción aún no está vigente', 400);
    if (p.fechaFin && new Date(p.fechaFin) < hoy)    throw new AppError('La promoción ha vencido', 400);
    if (Number(p.montoMinimo) > 0 && totalCompra < Number(p.montoMinimo)) {
      throw new AppError(`Monto mínimo de compra requerido: ${p.montoMinimo}`, 400);
    }

    const descuentoMonto = p.tipo === 'PORCENTAJE'
      ? (totalCompra * Number(p.valor)) / 100
      : Math.min(Number(p.valor), totalCompra);

    return { promocion: p, descuentoMonto };
  }

  async create(data: {
    codigo: string; nombre: string; tipo: TipoPromocion; valor: number;
    montoMinimo?: number; usoMaximo?: number;
    fechaInicio?: string; fechaFin?: string;
  }): Promise<Promocion> {
    const existing = await repo().findOne({ where: { codigo: data.codigo.toUpperCase() } });
    if (existing) throw new AppError('Ya existe una promoción con ese código', 400);

    const p = repo().create({ ...data, codigo: data.codigo.toUpperCase() });
    return repo().save(p);
  }

  async update(id: number, data: Partial<Parameters<typeof this.create>[0] & { activa?: boolean }>): Promise<Promocion> {
    const p = await this.findById(id);
    if (data.codigo) data.codigo = data.codigo.toUpperCase();
    Object.assign(p, data);
    return repo().save(p);
  }

  async delete(id: number): Promise<void> {
    const p = await this.findById(id);
    p.activa = false;
    await repo().save(p);
  }

  async incrementarUso(id: number): Promise<void> {
    await repo().increment({ id }, 'usosActuales', 1);
  }
}
