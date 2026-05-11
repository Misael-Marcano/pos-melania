/**
 * Bloqueo 402 — BILLING_ENFORCE_PAYMENT / TRIAL_ENFORCE_EXPIRED + exenciones.
 * Requiere BD + seed + Redis. `npm run test:integration` desde apps/backend.
 */
import request from 'supertest';
import app from '../../app';
import { AppDataSource, initDatabaseForTests } from '../../config/database';
import { redis } from '../../config/redis';
import { Tenant } from '../../entities/Tenant.entity';
import { invalidateBillingStatusCache } from '../../middlewares/billing-guard.middleware';

const TID = 1;

describe('billingGuard (402)', () => {
  let adminToken = '';
  let prevBillingEnforce: string | undefined;
  let prevTrialEnforce: string | undefined;
  let prevBillingStatus: string | null | undefined;
  let prevTrialEndsAt: Date | null | undefined;

  beforeAll(async () => {
    await initDatabaseForTests();
    await redis.connect();

    const login = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'admin@pos.com', password: 'Admin123!' });
    if (login.status !== 200 || !login.body?.data?.accessToken) {
      throw new Error(`Login falló: ${login.status}`);
    }
    adminToken = login.body.data.accessToken;

    const t = await AppDataSource.getRepository(Tenant).findOne({ where: { id: TID } });
    if (!t) throw new Error('Tenant 1 no encontrado');
    prevBillingStatus = t.billingStatus ?? null;
    prevTrialEndsAt = t.trialEndsAt ?? null;

    prevBillingEnforce = process.env.BILLING_ENFORCE_PAYMENT;
    prevTrialEnforce = process.env.TRIAL_ENFORCE_EXPIRED;
  });

  afterEach(async () => {
    process.env.BILLING_ENFORCE_PAYMENT = prevBillingEnforce;
    process.env.TRIAL_ENFORCE_EXPIRED = prevTrialEnforce;
    await AppDataSource.getRepository(Tenant).update(TID, {
      billingStatus: prevBillingStatus ?? null,
      trialEndsAt: prevTrialEndsAt ?? null,
    });
    await invalidateBillingStatusCache(TID);
  });

  afterAll(async () => {
    if (AppDataSource.isInitialized) await AppDataSource.destroy();
    try {
      await redis.quit();
    } catch {
      /* */
    }
  });

  it('402 + BILLING_SUSPENDED cuando BILLING_ENFORCE y past_due', async () => {
    process.env.BILLING_ENFORCE_PAYMENT = 'true';
    delete process.env.TRIAL_ENFORCE_EXPIRED;

    await AppDataSource.getRepository(Tenant).update(TID, { billingStatus: 'past_due' });
    await invalidateBillingStatusCache(TID);

    const res = await request(app)
      .get('/api/v1/inventario?page=1&limit=5')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(402);
    expect(res.body.success).toBe(false);
    expect(res.body.data?.code).toBe('BILLING_SUSPENDED');
  });

  it('402 + TRIAL_EXPIRED cuando TRIAL_ENFORCE y trial vencido sin suscripción activa', async () => {
    delete process.env.BILLING_ENFORCE_PAYMENT;
    process.env.TRIAL_ENFORCE_EXPIRED = 'true';

    await AppDataSource.getRepository(Tenant).update(TID, {
      billingStatus: null,
      trialEndsAt: new Date('2020-01-01T00:00:00.000Z'),
    });
    await invalidateBillingStatusCache(TID);

    const res = await request(app)
      .get('/api/v1/inventario?page=1&limit=5')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(402);
    expect(res.body.data?.code).toBe('TRIAL_EXPIRED');
  });

  it('GET /saas/context permitido con mora (exento)', async () => {
    process.env.BILLING_ENFORCE_PAYMENT = 'true';
    delete process.env.TRIAL_ENFORCE_EXPIRED;

    await AppDataSource.getRepository(Tenant).update(TID, { billingStatus: 'past_due' });
    await invalidateBillingStatusCache(TID);

    const res = await request(app)
      .get('/api/v1/saas/context')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
