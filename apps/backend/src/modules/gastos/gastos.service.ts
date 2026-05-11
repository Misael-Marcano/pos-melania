import { ILike } from 'typeorm';
import { AppDataSource } from '../../config/database';
import { Gasto } from '../../entities/Gasto.entity';
import { AppError } from '../../middlewares/error.middleware';
import { AuthRequest } from '../../middlewares/auth.middleware';
import { getPagination } from '../../utils/pagination';
import { assertTenantMatch, tenantIdOrThrow } from '../../utils/tenant-access';
import { CreateGastoDto, UpdateGastoDto } from './dto/gastos.dto';
import { AuthUser } from '@pos/shared';

const repo = () => AppDataSource.getRepository(Gasto);

export class GastosService {
  async findAll(req: AuthRequest) {
    const { page, limit, skip } = getPagination(req);
    const q = req.query.q as string | undefined;
    const tid  = tenantIdOrThrow(req.user);
    const rol  = req.user?.rol;
    // Admin y plataforma ven todas las sucursales; cajero solo la suya
    const tiendaId = (rol === 'cajero' || rol === 'soporte')
      ? (req.user?.tiendaId ?? null)
      : null;

    const baseWhere: Record<string, any> = { tenant: { id: tid } };
    if (tiendaId != null) baseWhere.tienda = { id: tiendaId };
    if (q) baseWhere.escribe = ILike(`%${q}%`);

    const [data, total] = await repo().findAndCount({
      where: baseWhere,
      relations: ['aprobadoPor'],
      order: { createdAt: 'DESC' },
      skip,
      take: limit,
    });
    return { data, total, page, limit };
  }

  async findById(id: number, user: AuthUser): Promise<Gasto> {
    const g = await repo().findOne({
      where: { id },
      relations: ['aprobadoPor', 'tenant'],
    });
    if (!g) throw new AppError('Gasto no encontrado', 404);
    assertTenantMatch(user, g.tenant?.id);
    return g;
  }

  async create(dto: CreateGastoDto, user: AuthUser): Promise<Gasto> {
    const tid = tenantIdOrThrow(user);
    const g = repo().create({
      ...dto,
      fecha:       new Date(dto.fecha),
      tenant:      { id: tid } as any,
      aprobadoPor: { id: user.id } as any,
    });
    return repo().save(g);
  }

  async update(id: number, dto: UpdateGastoDto, user: AuthUser): Promise<Gasto> {
    await this.findById(id, user);
    const { fecha, ...rest } = dto;
    const updateData: Record<string, unknown> = { ...rest };
    if (fecha) updateData.fecha = fecha; // SQL Server date column acepta string YYYY-MM-DD
    await repo().update(id, updateData);
    return this.findById(id, user);
  }

  async delete(id: number, user: AuthUser): Promise<void> {
    const g = await this.findById(id, user);
    await repo().remove(g);
  }
}
