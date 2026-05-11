import { AppDataSource } from '../../config/database';
import { Comprobante } from '../../entities/Comprobante.entity';
import { AppError } from '../../middlewares/error.middleware';
import { assertTenantMatch, tenantIdOrThrow } from '../../utils/tenant-access';
import { AuthUser } from '@pos/shared';

const repo = () => AppDataSource.getRepository(Comprobante);

export class ComprobantesService {
  async findAll(user: AuthUser) {
    const tid = tenantIdOrThrow(user);
    return repo().find({ where: { tenant: { id: tid } }, order: { tipo: 'ASC' } });
  }

  async findById(id: number, user: AuthUser): Promise<Comprobante> {
    const c = await repo().findOne({ where: { id }, relations: ['tenant'] });
    if (!c) throw new AppError('Comprobante no encontrado', 404);
    assertTenantMatch(user, c.tenant?.id);
    return c;
  }

  async create(data: Partial<Comprobante>, user: AuthUser): Promise<Comprobante> {
    const tid = tenantIdOrThrow(user);
    const c = repo().create({ ...data, tenant: { id: tid } as any });
    return repo().save(c);
  }

  async update(id: number, data: Partial<Comprobante>, user: AuthUser): Promise<Comprobante> {
    const c = await this.findById(id, user);
    Object.assign(c, data);
    return repo().save(c);
  }
}
