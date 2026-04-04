import { ILike } from 'typeorm';
import { Request } from 'express';
import { AppDataSource } from '../../config/database';
import { Gasto } from '../../entities/Gasto.entity';
import { AppError } from '../../middlewares/error.middleware';
import { getPagination } from '../../utils/pagination';
import { CreateGastoDto, UpdateGastoDto } from './dto/gastos.dto';
import { AuthUser } from '@pos/shared';

const repo = () => AppDataSource.getRepository(Gasto);

export class GastosService {
  async findAll(req: Request) {
    const { page, limit, skip } = getPagination(req);
    const q = req.query.q as string | undefined;

    const [data, total] = await repo().findAndCount({
      where: q ? { escribe: ILike(`%${q}%`) } : {},
      relations: ['aprobadoPor'],
      order: { createdAt: 'DESC' },
      skip,
      take: limit,
    });
    return { data, total, page, limit };
  }

  async findById(id: number): Promise<Gasto> {
    const g = await repo().findOne({ where: { id }, relations: ['aprobadoPor'] });
    if (!g) throw new AppError('Gasto no encontrado', 404);
    return g;
  }

  async create(dto: CreateGastoDto, user: AuthUser): Promise<Gasto> {
    const g = repo().create({
      ...dto,
      fecha:       new Date(dto.fecha),
      aprobadoPor: { id: user.id } as any,
    });
    return repo().save(g);
  }

  async update(id: number, dto: UpdateGastoDto): Promise<Gasto> {
    await this.findById(id); // valida existencia
    const { fecha, ...rest } = dto;
    const updateData: Record<string, unknown> = { ...rest };
    if (fecha) updateData.fecha = fecha; // SQL Server date column acepta string YYYY-MM-DD
    await repo().update(id, updateData);
    return this.findById(id);
  }

  async delete(id: number): Promise<void> {
    const g = await this.findById(id);
    await repo().remove(g);
  }
}
