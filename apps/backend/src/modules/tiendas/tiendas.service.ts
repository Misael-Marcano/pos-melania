import { AppDataSource } from '../../config/database';
import { Tienda } from '../../entities/Tienda.entity';
import { AppError } from '../../middlewares/error.middleware';

const repo = () => AppDataSource.getRepository(Tienda);

export class TiendasService {
  async findAll() { return repo().find({ where: { activo: true } }); }
  async findById(id: number): Promise<Tienda> {
    const t = await repo().findOne({ where: { id } });
    if (!t) throw new AppError('Tienda no encontrada', 404);
    return t;
  }
  async create(data: Partial<Tienda>) { return repo().save(repo().create(data)); }
  async update(id: number, data: Partial<Tienda>) {
    const t = await this.findById(id);
    Object.assign(t, data);
    return repo().save(t);
  }
  async delete(id: number): Promise<void> {
    const t = await this.findById(id);
    t.activo = false;
    await repo().save(t);
  }
}
