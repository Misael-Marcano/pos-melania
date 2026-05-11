import { ILike } from 'typeorm';
import { AppDataSource } from '../../config/database';
import { Promocion, TipoPromocion } from '../../entities/Promocion.entity';
import { AppError } from '../../middlewares/error.middleware';
import { assertTenantMatch, tenantIdOrThrow } from '../../utils/tenant-access';
import { assertFeatureEnabled } from '../../saas/enforce-plan';
import { AuthUser } from '@pos/shared';

const repo = () => AppDataSource.getRepository(Promocion);

export class PromocionesService {

  async findAll(q: string | undefined, user: AuthUser) {
    const tid = tenantIdOrThrow(user);
    if (q) {
      return repo().find({
        where: [
          { tenant: { id: tid }, codigo: ILike(`%${q}%`) },
          { tenant: { id: tid }, nombre: ILike(`%${q}%`) },
        ],
        order: { createdAt: 'DESC' },
      });
    }
    return repo().find({ where: { tenant: { id: tid } }, order: { createdAt: 'DESC' } });
  }

  async findById(id: number, user: AuthUser): Promise<Promocion> {
    const p = await repo().findOne({ where: { id }, relations: ['tenant'] });
    if (!p) throw new AppError('Promoción no encontrada', 404);
    assertTenantMatch(user, p.tenant?.id);
    return p;
  }

  async findByCodigo(codigo: string, user: AuthUser): Promise<Promocion> {
    const tid = tenantIdOrThrow(user);
    const p = await repo().findOne({
      where: { codigo: codigo.toUpperCase(), tenant: { id: tid } },
    });
    if (!p) throw new AppError('Código de descuento no válido', 404);
    return p;
  }

  async validar(codigo: string, totalCompra: number, user: AuthUser): Promise<{
    promocion: Promocion;
    descuentoMonto: number;
  }> {
    const p = await this.findByCodigo(codigo, user);

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
  }, user: AuthUser): Promise<Promocion> {
    const tid = tenantIdOrThrow(user);
    await assertFeatureEnabled(tid, 'promociones');
    const cod = data.codigo.toUpperCase();
    const existing = await repo().findOne({ where: { codigo: cod, tenant: { id: tid } } });
    if (existing) throw new AppError('Ya existe una promoción con ese código', 400);

    const p = repo().create({
      ...data,
      codigo: cod,
      tenant: { id: tid } as any,
    });
    return repo().save(p);
  }

  async update(
    id: number,
    data: Partial<{
      codigo: string; nombre: string; tipo: TipoPromocion; valor: number;
      montoMinimo?: number; usoMaximo?: number; fechaInicio?: string; fechaFin?: string; activa?: boolean;
    }>,
    user: AuthUser,
  ): Promise<Promocion> {
    const p = await this.findById(id, user);
    if (data.codigo) data.codigo = data.codigo.toUpperCase();
    Object.assign(p, data);
    return repo().save(p);
  }

  async delete(id: number, user: AuthUser): Promise<void> {
    const p = await this.findById(id, user);
    p.activa = false;
    await repo().save(p);
  }

  async incrementarUso(id: number, user: AuthUser): Promise<void> {
    await this.findById(id, user);
    await repo().increment({ id }, 'usosActuales', 1);
  }
}
