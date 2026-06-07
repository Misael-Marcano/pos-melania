import { AppDataSource } from '../../config/database';
import { Comprobante } from '../../entities/Comprobante.entity';
import { AppError } from '../../middlewares/error.middleware';
import { assertTenantMatch, tenantIdOrThrow } from '../../utils/tenant-access';
import { AuthUser, TipoComprobante } from '@pos/shared';
import {
  assertSecuenciaEnRango,
  normalizeSecuenciaActual,
} from '../../utils/ncf';

const repo = () => AppDataSource.getRepository(Comprobante);

function sanitizePayload(data: Partial<Comprobante>, existing?: Comprobante): Partial<Comprobante> {
  const series = (data.series ?? existing?.series ?? 'B').trim().toUpperCase();
  const tipo = (data.tipo ?? existing?.tipo) as TipoComprobante | undefined;
  const desde = data.desde ?? existing?.desde;
  const hasta = data.hasta ?? existing?.hasta;
  let secuenciaActual = data.secuenciaActual ?? existing?.secuenciaActual;

  if (!tipo) throw new AppError('Tipo de comprobante requerido', 400);
  if (!desde?.trim() || !hasta?.trim()) {
    throw new AppError('Rango "desde" y "hasta" son obligatorios', 400);
  }
  if (!secuenciaActual?.trim()) {
    secuenciaActual = desde;
  }

  secuenciaActual = normalizeSecuenciaActual(series, tipo, secuenciaActual);
  assertSecuenciaEnRango(secuenciaActual, desde, hasta);

  return {
    ...data,
    series,
    tipo,
    desde,
    hasta,
    secuenciaActual,
  };
}

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
    const payload = sanitizePayload(data);
    const c = repo().create({ ...payload, tenant: { id: tid } as any });
    return repo().save(c);
  }

  async update(id: number, data: Partial<Comprobante>, user: AuthUser): Promise<Comprobante> {
    const c = await this.findById(id, user);
    Object.assign(c, sanitizePayload(data, c));
    return repo().save(c);
  }
}
