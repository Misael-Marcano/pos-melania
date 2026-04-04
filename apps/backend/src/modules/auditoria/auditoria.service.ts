import { AppDataSource } from '../../config/database';
import { AuditLog }      from '../../entities/AuditLog.entity';
import { Request }       from 'express';
import { getPagination } from '../../utils/pagination';

const repo = () => AppDataSource.getRepository(AuditLog);

export class AuditoriaService {

  async findAll(req: Request) {
    const { page, limit, skip } = getPagination(req);
    const { tabla, operacion, usuarioId, desde, hasta } = req.query as Record<string, string>;

    const qb = repo()
      .createQueryBuilder('a')
      .orderBy('a.createdAt', 'DESC')
      .skip(skip)
      .take(limit);

    if (tabla)     qb.andWhere('a.tabla = :tabla',          { tabla });
    if (operacion) qb.andWhere('a.operacion = :operacion',  { operacion });
    if (usuarioId) qb.andWhere('a.usuarioId = :usuarioId',  { usuarioId: Number(usuarioId) });
    if (desde)     qb.andWhere('a.createdAt >= :desde',     { desde: new Date(desde) });
    if (hasta)     qb.andWhere('a.createdAt <= :hasta',     { hasta: new Date(hasta + 'T23:59:59') });

    const [data, total] = await qb.getManyAndCount();
    return { data, total, page, limit };
  }

  async getTablas(): Promise<string[]> {
    const rows = await repo()
      .createQueryBuilder('a')
      .select('DISTINCT a.tabla', 'tabla')
      .getRawMany();
    return rows.map((r) => r.tabla).sort();
  }
}
