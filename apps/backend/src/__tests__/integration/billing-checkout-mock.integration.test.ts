/**
 * POST /billing/create-checkout-session y create-portal-session con mock Stripe in-process.
 * No llama a la API real de Stripe (Issue 16 backlog SaaS).
 *
 * Ejecutar: `npm run test:integration` desde `apps/backend`
 */
import type Stripe from 'stripe';
import request from 'supertest';
import app from '../../app';
import { AppDataSource, initDatabaseForTests } from '../../config/database';
import { redis } from '../../config/redis';
import { Tenant } from '../../entities/Tenant.entity';
import {
  resetStripeClientForTests,
  setStripeClientForTests,
} from '../../modules/billing/stripe';
import {
  createOtherTenantAdmin,
  deleteOtherTenantUser,
  type OtherTenantFixture,
} from './helpers/other-tenant-auth';

const ADMIN_EMAIL = 'admin@pos.com';
const ADMIN_PASS = 'Admin123!';

function buildMockStripe() {
  const customersCreate = jest.fn().mockResolvedValue({ id: 'cus_integration_test' });
  const checkoutCreate = jest.fn().mockResolvedValue({
    url: 'https://checkout.stripe.test/session',
    id:  'cs_integration_test',
  });
  const portalCreate = jest.fn().mockResolvedValue({
    url: 'https://billing.stripe.test/portal',
    id:  'bps_integration_test',
  });
  return {
    customers:       { create: customersCreate },
    checkout:        { sessions: { create: checkoutCreate } },
    billingPortal:   { sessions: { create: portalCreate } },
    customersCreate,
    checkoutCreate,
    portalCreate,
  };
}

describe('billing — checkout y portal con mock Stripe', () => {
  let adminToken: string;
  let primaryTenantId: number;
  let fixture: OtherTenantFixture;
  let mock: ReturnType<typeof buildMockStripe>;
  const envBackup: Record<string, string | undefined> = {};

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

    const login = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: ADMIN_EMAIL, password: ADMIN_PASS });
    if (login.status !== 200) {
      throw new Error(`Login admin falló: ${login.status} ${JSON.stringify(login.body)}`);
    }
    adminToken = String(login.body.data.accessToken);

    fixture = await createOtherTenantAdmin();
    if (fixture.tenantId === primaryTenantId) {
      throw new Error('Fixture de otra org no debe coincidir con el tenant mas antiguo');
    }

    for (const key of [
      'BILLING_PROVIDER',
      'STRIPE_SECRET_KEY',
      'STRIPE_PRICE_STANDARD',
    ] as const) {
      envBackup[key] = process.env[key];
    }
    process.env.BILLING_PROVIDER = 'stripe';
    process.env.STRIPE_SECRET_KEY = 'sk_test_51IntegrationMockKeyPlaceholder000000';
    process.env.STRIPE_PRICE_STANDARD = 'price_integration_standard';

    mock = buildMockStripe();
    setStripeClientForTests(mock as unknown as Stripe);
  });

  beforeEach(() => {
    mock.customersCreate.mockClear();
    mock.checkoutCreate.mockClear();
    mock.portalCreate.mockClear();
  });

  afterAll(async () => {
    resetStripeClientForTests();
    for (const [key, val] of Object.entries(envBackup)) {
      if (val !== undefined) process.env[key] = val;
      else delete process.env[key];
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

  it('POST /billing/create-checkout-session -> 200 y url de sesión', async () => {
    const res = await request(app)
      .post('/api/v1/billing/create-checkout-session')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        successUrl: 'https://app.test/billing/ok',
        cancelUrl:  'https://app.test/billing/cancel',
        planCode:   'standard',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data?.url).toBe('https://checkout.stripe.test/session');
    expect(mock.checkoutCreate).toHaveBeenCalled();
    expect(mock.customersCreate).toHaveBeenCalled();
  });

  it('POST /billing/create-portal-session -> 200 tras checkout (stripeCustomerId)', async () => {
    const res = await request(app)
      .post('/api/v1/billing/create-portal-session')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ returnUrl: 'https://app.test/configuracion' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data?.url).toBe('https://billing.stripe.test/portal');
    expect(mock.portalCreate).toHaveBeenCalled();
  });

  it('POST checkout con X-Tenant-Id ajeno a la sesion -> 403', async () => {
    const res = await request(app)
      .post('/api/v1/billing/create-checkout-session')
      .set('Authorization', `Bearer ${fixture.token}`)
      .set('X-Tenant-Id', String(primaryTenantId))
      .send({
        successUrl: 'https://app.test/billing/ok',
        cancelUrl:  'https://app.test/billing/cancel',
        planCode:   'standard',
      });

    expect(res.status).toBe(403);
    expect(mock.checkoutCreate).not.toHaveBeenCalled();
  });

  it('POST portal sin stripeCustomerId en otra org -> 400', async () => {
    const res = await request(app)
      .post('/api/v1/billing/create-portal-session')
      .set('Authorization', `Bearer ${fixture.token}`)
      .send({ returnUrl: 'https://app.test/configuracion' });

    expect(res.status).toBe(400);
    expect(String(res.body.message ?? res.body.error ?? '')).toMatch(/cuenta de facturación|Checkout/i);
  });
});
