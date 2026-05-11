import { AppDataSource } from '../../config/database';
import { Proveedor } from '../../entities/Proveedor.entity';
import { AppError } from '../../middlewares/error.middleware';
import { assertTenantMatch, tenantIdOrThrow } from '../../utils/tenant-access';
import { AuthUser } from '@pos/shared';

const repo = () => AppDataSource.getRepository(Proveedor);

export class ProveedoresService {
  async findAll(user: AuthUser) {
    const tid = tenantIdOrThrow(user);
    return repo().find({ where: { activo: true, tenant: { id: tid } }, order: { nombre: 'ASC' } });
  }

  async findById(id: number, user: AuthUser): Promise<Proveedor> {
    const p = await repo().findOne({ where: { id }, relations: ['tenant'] });
    if (!p) throw new AppError('Proveedor no encontrado', 404);
    assertTenantMatch(user, p.tenant?.id);
    return p;
  }

  async create(data: Partial<Proveedor>, user: AuthUser): Promise<Proveedor> {
    const tid = tenantIdOrThrow(user);
    return repo().save(repo().create({ ...data, tenant: { id: tid } as any }));
  }

  async update(id: number, data: Partial<Proveedor>, user: AuthUser): Promise<Proveedor> {
    const p = await this.findById(id, user);
    Object.assign(p, data);
    return repo().save(p);
  }

  async delete(id: number, user: AuthUser): Promise<void> {
    const p = await this.findById(id, user);
    p.activo = false;
    await repo().save(p);
  }
}
