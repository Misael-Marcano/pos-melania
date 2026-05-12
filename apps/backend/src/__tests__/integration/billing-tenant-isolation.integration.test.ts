/**
 * Aislamiento multi-tenant en billing: GET /billing/status usa el tenant del JWT
 * (bloque `data.tenant`). Con BILLING_PROVIDER=none (default Jest) no hay bloque
 * tenant en la respuesta; se fuerza stripe sin llamar a la API de Stripe.
 * POST checkout/portal exigen cliente Stripe real o mock: ver inventario (N/A integracion tenant).
 *
 * Ejecutar: `npm run test:integration` desde `apps/backend`
 */
import request from 'supertest';
import app from '../../app';
import { AppDataSource, initDatabaseForTests } from '../../config/database';
import { redis } from '../../config/redis';
import { Tenant } from '../../entities/Tenant.entity';
import {
  createOtherTenantAdmin,
  deleteOtherTenantUser,
  OtherTenantFixture,
} from './helpers/other-tenant-auth';

describe('billing - aislamiento por tenant', () => {
  let fixture: OtherTenantFixture;
  let primaryTenantId: number;
  let previousBillingProvider: string | undefined;

  beforeAll(async () => {
    await initDatabaseForTests();
    await redis.connect();

    const row = await AppDataSource.getRepository(Tenant)
      .createQueryBuilder('t')
      .select('t.id', 'id')
      .orderBy('t.id', 'ASC')
      .getRawOne<{ id: number }>();
    if (row?.id == null) throw new Error('Se esperaba al menos un tenant en BD (seed)');
    primaryTenantId = Number(row.id);

    fixture = await createOtherTenantAdmin();
    if (fixture.tenantId === primaryTenantId) {
      throw new Error('Fixture de otra org no debe coincidir con el tenant mas antiguo');
    }

    previousBillingProvider = process.env.BILLING_PROVIDER;
    process.env.BILLING_PROVIDER = 'stripe';
  });

  afterAll(async () => {
    if (previousBillingProvider !== undefined) {
      process.env.BILLING_PROVIDER = previousBillingProvider;
    } else {
      process.env.BILLING_PROVIDER = 'none';
    }
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
        /* sin conexion previa */
      }
    }
  });

  it('GET /billing/status con token de otra organizacion -> 200 y data.tenant.id acotado a su org', async () => {
    const res = await request(app)
      .get('/api/v1/billing/status')
      .set('Authorization', `Bearer ${fixture.token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data?.tenant?.id).toBe(fixture.tenantId);
    expect(res.body.data?.tenant?.id).not.toBe(primaryTenantId);
  });

  it('GET /billing/status con X-Tenant-Id ajeno a la sesion -> 403', async () => {
    const res = await request(app)
      .get('/api/v1/billing/status')
      .set('Authorization', `Bearer ${fixture.token}`)
      .set('X-Tenant-Id', String(primaryTenantId));
    expect(res.status).toBe(403);
  });
});
