import { AppDataSource } from '../../config/database';
import { Kit } from '../../entities/Kit.entity';
import { AppError } from '../../middlewares/error.middleware';

const repo = () => AppDataSource.getRepository(Kit);

export class KitsService {
  async findAll() {
    return repo().find({ where: { activo: true }, relations: ['detalles', 'detalles.articulo'] });
  }

  async findById(id: number): Promise<Kit> {
    const k = await repo().findOne({ where: { id }, relations: ['detalles', 'detalles.articulo'] });
    if (!k) throw new AppError('Kit no encontrado', 404);
    return k;
  }

  async create(data: Partial<Kit>): Promise<Kit> {
    const k = repo().create(data);
    return repo().save(k);
  }

  async update(id: number, data: Partial<Kit>): Promise<Kit> {
    const k = await this.findById(id);
    Object.assign(k, data);
    return repo().save(k);
  }

  async delete(id: number): Promise<void> {
    const k = await this.findById(id);
    k.activo = false;
    await repo().save(k);
  }
}
