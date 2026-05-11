import { AppDataSource } from '../../config/database';
import { Kit } from '../../entities/Kit.entity';
import { Articulo } from '../../entities/Articulo.entity';
import { AppError } from '../../middlewares/error.middleware';
import { tenantIdOrThrow, assertTenantMatch } from '../../utils/tenant-access';
import { assertFeatureEnabled } from '../../saas/enforce-plan';
import { AuthUser } from '@pos/shared';

const repo = () => AppDataSource.getRepository(Kit);

async function assertArticulosKitTenant(detalles: unknown[] | undefined, tid: number): Promise<void> {
  if (!detalles?.length) return;
  const artRepo = AppDataSource.getRepository(Articulo);
  for (const raw of detalles) {
    const d = raw as { articuloId?: number; articulo?: { id?: number } };
    const aid = d.articuloId ?? d.articulo?.id;
    if (!aid) continue;
    const ok = await artRepo.findOne({ where: { id: aid, tenant: { id: tid } } });
    if (!ok) throw new AppError(`Artículo ${aid} no disponible en su organización`, 404);
  }
}

export class KitsService {
  async findAll(user: AuthUser) {
    const tid = tenantIdOrThrow(user);
    return repo().find({
      where: { activo: true, tenant: { id: tid } },
      relations: ['detalles', 'detalles.articulo'],
    });
  }

  async findById(id: number, user: AuthUser): Promise<Kit> {
    const k = await repo().findOne({
      where: { id },
      relations: ['detalles', 'detalles.articulo', 'tenant'],
    });
    if (!k) throw new AppError('Kit no encontrado', 404);
    assertTenantMatch(user, k.tenant?.id);
    return k;
  }

  async create(data: Partial<Kit> & { detalles?: unknown[] }, user: AuthUser): Promise<Kit> {
    const tid = tenantIdOrThrow(user);
    await assertFeatureEnabled(tid, 'kits');
    await assertArticulosKitTenant(data.detalles, tid);
    const k = repo().create({ ...data, tenant: { id: tid } as any });
    return repo().save(k);
  }

  async update(id: number, data: Partial<Kit> & { detalles?: unknown[] }, user: AuthUser): Promise<Kit> {
    const tid = tenantIdOrThrow(user);
    await this.findById(id, user);
    if (data.detalles) await assertArticulosKitTenant(data.detalles, tid);
    const k = await repo().findOne({ where: { id, tenant: { id: tid } }, relations: ['detalles'] });
    if (!k) throw new AppError('Kit no encontrado', 404);
    Object.assign(k, { ...data, tenant: { id: tid } as any });
    return repo().save(k);
  }

  async delete(id: number, user: AuthUser): Promise<void> {
    const k = await this.findById(id, user);
    k.activo = false;
    await repo().save(k);
  }
}
