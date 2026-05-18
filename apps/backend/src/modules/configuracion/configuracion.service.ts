import { AuthUser } from '@pos/shared';
import { AppDataSource } from '../../config/database';
import { Configuracion } from '../../entities/Configuracion.entity';
import { Tienda } from '../../entities/Tienda.entity';
import { Caja } from '../../entities/Caja.entity';
import { Tenant } from '../../entities/Tenant.entity';
import { assertTenantForTienda, tenantIdOrThrow } from '../../utils/tenant-access';
import { UpdateConfiguracionDto } from './dto/configuracion.dto';

const repo = () => AppDataSource.getRepository(Configuracion);
const tiendaRepo = () => AppDataSource.getRepository(Tienda);
const cajaRepo = () => AppDataSource.getRepository(Caja);

function mapConfig(cfg: Configuracion): Configuracion {
  (cfg as Configuracion & { tiendaId?: number | null }).tiendaId = cfg.tienda?.id ?? null;
  (cfg as Configuracion & { cajaId?: number | null }).cajaId = cfg.caja?.id ?? null;
  (cfg as Configuracion & { tenantId?: number }).tenantId = cfg.tenant?.id;
  return cfg;
}

export class ConfiguracionService {
  async get(user: AuthUser): Promise<Configuracion> {
    const tid = tenantIdOrThrow(user);
    let cfg = await repo().findOne({
      where: { tenant: { id: tid } },
      relations: ['tenant', 'tienda', 'caja', 'caja.tienda'],
    });
    if (!cfg) {
      cfg = repo().create({
        nombreCompania: 'Mi Empresa',
        simboloMoneda: 'RDS',
        tasaImpuesto1Nombre: 'ITBIS',
        tasaImpuesto1: 18,
        preciosIncluyenImpuesto: true,
        comprobanteDefecto: '02',
        tenant: { id: tid } as Tenant,
      });
      cfg = await repo().save(cfg);
      cfg = (await repo().findOne({
        where: { id: cfg.id },
        relations: ['tenant', 'tienda', 'caja', 'caja.tienda'],
      })) ?? cfg;
    }
    return mapConfig(cfg);
  }

  async update(user: AuthUser, dto: UpdateConfiguracionDto): Promise<Configuracion> {
    const cfg = await this.get(user);
    const { tiendaId, cajaId, ...scalar } = dto;

    Object.assign(cfg, scalar);
    if (dto.tasaImpuesto2 == null) {
      cfg.tasaImpuesto2 = 0;
    }

    if (tiendaId !== undefined) {
      if (tiendaId === null) {
        cfg.tienda = null;
      } else {
        const tienda = await tiendaRepo().findOne({
          where: { id: tiendaId },
          relations: ['tenant'],
        });
        assertTenantForTienda(user, tienda);
        cfg.tienda = tienda ?? null;
      }
    }
    if (cajaId !== undefined) {
      if (cajaId === null) {
        cfg.caja = null;
      } else {
        const caja = await cajaRepo().findOne({
          where: { id: cajaId },
          relations: ['tienda', 'tienda.tenant'],
        });
        assertTenantForTienda(user, caja?.tienda);
        cfg.caja = caja ?? null;
      }
    }
    await repo().save(cfg);
    const fresh = await repo().findOne({
      where: { id: cfg.id },
      relations: ['tenant', 'tienda', 'caja', 'caja.tienda'],
    });
    return mapConfig(fresh ?? cfg);
  }
}
