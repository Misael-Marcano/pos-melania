import { AppDataSource } from '../../config/database';
import { Tienda } from '../../entities/Tienda.entity';
import { Tenant } from '../../entities/Tenant.entity';
import { AppError } from '../../middlewares/error.middleware';
import { AuthUser } from '@pos/shared';
import { assertTenantMatch, tenantIdOrThrow } from '../../utils/tenant-access';
import { assertTenantCanAddTienda } from '../../saas/enforce-plan';

const repo = () => AppDataSource.getRepository(Tienda);

export class TiendasService {
  async findAll(user: AuthUser) {
    const tid = tenantIdOrThrow(user);
    return repo().find({
      where: { activo: true, tenant: { id: tid } },
      relations: ['tenant'],
    });
  }

  async findById(id: number, user: AuthUser): Promise<Tienda> {
    const t = await repo().findOne({ where: { id }, relations: ['tenant'] });
    if (!t) throw new AppError('Tienda no encontrada', 404);
    assertTenantMatch(user, t.tenant?.id);
    return t;
  }

  async create(data: Partial<Tienda>, user: AuthUser) {
    const tid = tenantIdOrThrow(user);
    await assertTenantCanAddTienda(tid);
    const { tenant: _t, ...rest } = data as Tienda & { tenant?: unknown };
    return repo().save(
      repo().create({
        ...rest,
        tenant: { id: tid } as Tenant,
      }),
    );
  }

  async update(id: number, data: Partial<Tienda>, user: AuthUser) {
    const t = await this.findById(id, user);
    const { tenant: _t, tenantId: _tid, ...rest } = data as Record<string, unknown>;
    Object.assign(t, rest);
    return repo().save(t);
  }

  async delete(id: number, user: AuthUser): Promise<void> {
    const t = await this.findById(id, user);
    t.activo = false;
    await repo().save(t);
  }
}
