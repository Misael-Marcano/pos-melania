import { AppDataSource } from '../../config/database';
import { Configuracion } from '../../entities/Configuracion.entity';

const repo = () => AppDataSource.getRepository(Configuracion);

export class ConfiguracionService {
  async get(): Promise<Configuracion> {
    let cfg = await repo().findOne({ where: {} });
    if (!cfg) {
      cfg = repo().create({ nombreCompania: 'Mi Empresa', simboloMoneda: 'RDS' });
      cfg = await repo().save(cfg);
    }
    return cfg;
  }

  async update(data: Partial<Configuracion>): Promise<Configuracion> {
    const cfg = await this.get();
    Object.assign(cfg, data);
    return repo().save(cfg);
  }
}
