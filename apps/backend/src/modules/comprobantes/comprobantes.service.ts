import { AppDataSource } from '../../config/database';
import { Comprobante } from '../../entities/Comprobante.entity';
import { AppError } from '../../middlewares/error.middleware';

const repo = () => AppDataSource.getRepository(Comprobante);

export class ComprobantesService {
  async findAll() {
    return repo().find({ order: { tipo: 'ASC' } });
  }

  async findById(id: number): Promise<Comprobante> {
    const c = await repo().findOne({ where: { id } });
    if (!c) throw new AppError('Comprobante no encontrado', 404);
    return c;
  }

  async create(data: Partial<Comprobante>): Promise<Comprobante> {
    const c = repo().create(data);
    return repo().save(c);
  }

  async update(id: number, data: Partial<Comprobante>): Promise<Comprobante> {
    const c = await this.findById(id);
    Object.assign(c, data);
    return repo().save(c);
  }
}
