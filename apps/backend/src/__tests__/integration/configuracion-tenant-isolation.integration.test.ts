/**
 * Aislamiento multi-tenant en configuración: no hay `GET /configuracion/:id`; la API
 * devuelve una fila por organización. Se comprueba que un JWT de otra org no recibe
 * el `id` ni el `tenantId` de la fila más antigua en BD (típicamente otra organización).
 *
 * Ejecutar: `npm run test:integration` desde `apps/backend`
 */
import request from 'supertest';
import app from '../../app';
import { AppDataSource, initDatabaseForTests } from '../../config/database';
import { redis } from '../../config/redis';
import { Configuracion } from '../../entities/Configuracion.entity';
import {
  createOtherTenantAdmin,
  deleteOtherTenantUser,
  OtherTenantFixture,
} from './helpers/other-tenant-auth';

describe('configuracion — aislamiento por tenant', () => {
  let fixture: OtherTenantFixture;
  /** Fila más antigua en `configuracion` antes de crear el fixture (casi siempre otra org). */
  let baseline: Configuracion | null = null;

  beforeAll(async () => {
    await initDatabaseForTests();
    await redis.connect();

    baseline = await AppDataSource.getRepository(Configuracion)
      .createQueryBuilder('c')
      .leftJoinAndSelect('c.tenant', 'tenant')
      .orderBy('c.id', 'ASC')
      .getOne();

    fixture = await createOtherTenantAdmin();
  });

  afterAll(async () => {
    try {
      if (AppDataSource.isInitialized && fixture) {
        await deleteOtherTenantUser(fixture);
      }
    } finally {
      if (AppDataSource.isInitialized) {
        await AppDataSource.destroy();
      }
      try {
        await redis.quit();
      } catch {
        /* sin conexión previa */
      }
    }
  });

  it('GET /configuracion con token de otra organización → 200 y fila acotada a su tenant', async () => {
    expect(baseline).not.toBeNull();
    expect(baseline!.tenant?.id).toBeDefined();
    expect(baseline!.tenant!.id).not.toBe(fixture.tenantId);

    const res = await request(app)
      .get('/api/v1/configuracion')
      .set('Authorization', `Bearer ${fixture.token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data?.tenantId).toBe(fixture.tenantId);
    expect(res.body.data?.id).not.toBe(baseline!.id);
  });
});
