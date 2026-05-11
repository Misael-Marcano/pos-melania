import { AppDataSource } from '../../config/database';
import { Caja } from '../../entities/Caja.entity';
import { CajaApertura } from '../../entities/CajaApertura.entity';
import { Tienda } from '../../entities/Tienda.entity';
import { AppError } from '../../middlewares/error.middleware';
import { CreateCajaDto, UpdateCajaDto } from './cajas.dto';
import { AuthUser } from '@pos/shared';
import { assertTiendaCaja } from '../../utils/tienda-access';
import { tiendaIdForUserOrThrow } from '../../utils/tienda-access';
import { assertTenantMatch, tenantIdOrThrow } from '../../utils/tenant-access';

const repo = () => AppDataSource.getRepository(Caja);
const tiendaRepo = () => AppDataSource.getRepository(Tienda);
const cajaAperturaRepo = () => AppDataSource.getRepository(CajaApertura);

export class CajasService {
  /** Listado: respeta organización (tenant); admin puede filtrar por query de sucursal */
  async findAll(tiendaIdQuery: number | undefined, user: AuthUser) {
    const myOrg = tenantIdOrThrow(user);
    const restricted = tiendaIdForUserOrThrow(user);
    const tid        = restricted ?? tiendaIdQuery;
    const qb = repo()
      .createQueryBuilder('c')
      .leftJoinAndSelect('c.tienda', 't')
      .leftJoin('t.tenant', 'ten')
      .where('ten.id = :myOrg', { myOrg })
      .orderBy('t.nombre', 'ASC')
      .addOrderBy('c.nombre', 'ASC');
    if (tid) qb.andWhere('c.tiendaId = :tid', { tid });
    return qb.getMany();
  }

  private async getById(id: number): Promise<Caja> {
    const c = await repo().findOne({
      where: { id },
      relations: ['tienda', 'tienda.tenant'],
    });
    if (!c) throw new AppError('Caja no encontrada', 404);
    return c;
  }

  async findById(id: number, user: AuthUser): Promise<Caja> {
    const c = await this.getById(id);
    assertTenantMatch(user, c.tienda?.tenant?.id);
    assertTiendaCaja(user, c.tienda?.id);
    return c;
  }

  async create(dto: CreateCajaDto, user: AuthUser): Promise<Caja> {
    const tienda = await tiendaRepo().findOne({
      where: { id: dto.tiendaId },
      relations: ['tenant'],
    });
    if (!tienda) throw new AppError('Sucursal no encontrada', 404);
    assertTenantMatch(user, tienda.tenant?.id);

    const dup = await repo()
      .createQueryBuilder('c')
      .where('c.nombre = :nombre AND c.tiendaId = :tid', { nombre: dto.nombre, tid: dto.tiendaId })
      .getOne();
    if (dup) throw new AppError('Ya existe una caja con ese nombre en la sucursal', 400);
    const c = repo().create({
      nombre: dto.nombre,
      notas:  dto.notas,
      tienda: { id: dto.tiendaId } as any,
    });
    return repo().save(c);
  }

  async update(id: number, dto: UpdateCajaDto, user: AuthUser): Promise<Caja> {
    const c = await this.getById(id);
    assertTenantMatch(user, c.tienda?.tenant?.id);
    assertTiendaCaja(user, c.tienda?.id);

    if (dto.tiendaId != null) {
      const t = await tiendaRepo().findOne({ where: { id: dto.tiendaId }, relations: ['tenant'] });
      if (!t) throw new AppError('Sucursal no encontrada', 404);
      assertTenantMatch(user, t.tenant?.id);
    }

    const nextTiendaId = dto.tiendaId ?? c.tienda.id;
    const nextNombre   = dto.nombre ?? c.nombre;
    if (dto.nombre !== undefined || dto.tiendaId !== undefined) {
      const dup = await repo()
        .createQueryBuilder('c')
        .where('c.nombre = :nombre AND c.tiendaId = :tid AND c.id != :id', {
          nombre: nextNombre, tid: nextTiendaId, id,
        })
        .getOne();
      if (dup) throw new AppError('Ya existe una caja con ese nombre en la sucursal', 400);
    }
    if (dto.nombre !== undefined) c.nombre = dto.nombre;
    if (dto.tiendaId !== undefined) c.tienda = { id: dto.tiendaId } as any;
    if (dto.activo !== undefined) c.activo = dto.activo;
    if (dto.notas !== undefined) c.notas = dto.notas ?? undefined;
    return repo().save(c);
  }

  async delete(id: number, user: AuthUser): Promise<void> {
    await this.findById(id, user);
    const c = await repo().findOne({ where: { id }, relations: ['tienda'] });
    if (!c) throw new AppError('Caja no encontrada', 404);
    const open = await cajaAperturaRepo().findOne({
      where: { caja: { id }, abierta: true },
    });
    if (open) throw new AppError('No se puede desactivar: hay una sesión de caja abierta', 400);
    c.activo = false;
    await repo().save(c);
  }
}
