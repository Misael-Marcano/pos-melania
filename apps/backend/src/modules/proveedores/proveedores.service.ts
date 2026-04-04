import { AppDataSource } from '../../config/database';
import { Proveedor } from '../../entities/Proveedor.entity';
import { AppError } from '../../middlewares/error.middleware';

const repo = () => AppDataSource.getRepository(Proveedor);

export class ProveedoresService {
  async findAll() {
    return repo().find({ where: { activo: true }, order: { nombre: 'ASC' } });
  }
  async findById(id: number): Promise<Proveedor> {
    const p = await repo().findOne({ where: { id } });
    if (!p) throw new AppError('Proveedor no encontrado', 404);
    return p;
  }
  async create(data: Partial<Proveedor>): Promise<Proveedor> {
    return repo().save(repo().create(data));
  }
  async update(id: number, data: Partial<Proveedor>): Promise<Proveedor> {
    const p = await this.findById(id);
    Object.assign(p, data);
    return repo().save(p);
  }
  async delete(id: number): Promise<void> {
    const p = await this.findById(id);
    p.activo = false;
    await repo().save(p);
  }
}
