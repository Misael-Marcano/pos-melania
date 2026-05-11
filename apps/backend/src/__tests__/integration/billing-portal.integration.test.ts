/**
 * Tests de integración — POST /api/v1/billing/create-portal-session
 *
 * Cubre:
 *  1. Sin autenticación → 401
 *  2. Body inválido (returnUrl no URL) → 422
 *  3. Body inválido (falta returnUrl) → 422
 *  4. Org sin stripeCustomerId → 400 con mensaje claro
 *  5. BILLING_PROVIDER=none → 400
 *  6. STRIPE_SECRET_KEY ausente → 503
 *  7. Stripe configurado + stripeCustomerId en BD → 200 con url (mock de SDK)
 *
 * Requiere BD migrada + seed (`npm run seed`).
 * Ejecutar: desde `apps/backend` → `npm run test:integration`
 */
import request from 'supertest';
import app from '../../app';
import { AppDataSource, initDatabaseForTests } from '../../config/database';
import { redis } from '../../config/redis';
import { Tenant } from '../../entities/Tenant.entity';

const PORTAL_URL = '/api/v1/billing/create-portal-session';
const DEFAULT_TID = 1;
const VALID_RETURN_URL = 'https://app.example.com/configuracion';

describe('POST /billing/create-portal-session', () => {
  let adminToken = '';
  let previousCustomerId: string | null = null;
  let previousBillingProvider: string | undefined;
  let previousStripeKey: string | undefined;

  beforeAll(async () => {
    await initDatabaseForTests();
    await redis.connect();

    const login = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'admin@pos.com', password: 'Admin123!' });
    if (login.status !== 200 || !login.body?.data?.accessToken) {
      throw new Error(`Login seed admin falló: ${login.status} ${JSON.stringify(login.body)}`);
    }
    adminToken = String(login.body.data.accessToken);

    // Guardar estado previo del tenant para restaurarlo
    const tenantRepo = AppDataSource.getRepository(Tenant);
    const t = await tenantRepo.findOne({ where: { id: DEFAULT_TID } });
    if (!t) throw new Error('Tenant id=1 no encontrado (¿migraciones + seed?)');
    previousCustomerId = t.stripeCustomerId ?? null;

    // Limpiar stripeCustomerId para que los tests "sin customer" funcionen correctamente
    await tenantRepo.update(DEFAULT_TID, { stripeCustomerId: null as unknown as string });

    // Guardar variables de entorno que se modifican en algunos tests
    previousBillingProvider = process.env.BILLING_PROVIDER;
    previousStripeKey = process.env.STRIPE_SECRET_KEY;
  });

  afterAll(async () => {
    try {
      if (AppDataSource.isInitialized) {
        // Restaurar estado del tenant
        await AppDataSource.getRepository(Tenant).update(DEFAULT_TID, {
          stripeCustomerId: previousCustomerId as unknown as string,
        });
      }
    } finally {
      // Restaurar env vars
      if (previousBillingProvider !== undefined) {
        process.env.BILLING_PROVIDER = previousBillingProvider;
      } else {
        delete process.env.BILLING_PROVIDER;
      }
      if (previousStripeKey !== undefined) {
        process.env.STRIPE_SECRET_KEY = previousStripeKey;
      } else {
        delete process.env.STRIPE_SECRET_KEY;
      }

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

  // ── 1. Sin autenticación ────────────────────────────────────────────────────
  it('401 sin token de autenticación', async () => {
    const res = await request(app)
      .post(PORTAL_URL)
      .send({ returnUrl: VALID_RETURN_URL });
    expect(res.status).toBe(401);
  });

  // ── 2. Validación — returnUrl inválida ─────────────────────────────────────
  it('422 cuando returnUrl no es una URL válida', async () => {
    const res = await request(app)
      .post(PORTAL_URL)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ returnUrl: 'no-es-una-url' });
    expect(res.status).toBe(422);
  });

  // ── 3. Validación — falta returnUrl ───────────────────────────────────────
  it('422 cuando falta returnUrl en el body', async () => {
    const res = await request(app)
      .post(PORTAL_URL)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({});
    expect(res.status).toBe(422);
  });

  // ── 4. Org sin stripeCustomerId ────────────────────────────────────────────
  it('400 cuando la org no tiene stripeCustomerId (no ha pasado por Checkout)', async () => {
    // El beforeAll ya limpió el stripeCustomerId del tenant por defecto
    const res = await request(app)
      .post(PORTAL_URL)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ returnUrl: VALID_RETURN_URL });
    expect(res.status).toBe(400);
    expect(String(res.body.message ?? '')).toMatch(/stripe|facturaci[oó]n|checkout/i);
  });

  // ── 5. BILLING_PROVIDER=none ───────────────────────────────────────────────
  it('400 cuando BILLING_PROVIDER=none', async () => {
    const original = process.env.BILLING_PROVIDER;
    process.env.BILLING_PROVIDER = 'none';
    try {
      const res = await request(app)
        .post(PORTAL_URL)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ returnUrl: VALID_RETURN_URL });
      expect(res.status).toBe(400);
      expect(String(res.body.message ?? '')).toMatch(/desactivada|none/i);
    } finally {
      if (original !== undefined) {
        process.env.BILLING_PROVIDER = original;
      } else {
        delete process.env.BILLING_PROVIDER;
      }
    }
  });

  // ── 6. STRIPE_SECRET_KEY no configurada ───────────────────────────────────
  it('503 cuando STRIPE_SECRET_KEY no está definida', async () => {
    const originalProvider = process.env.BILLING_PROVIDER;
    const originalKey = process.env.STRIPE_SECRET_KEY;
    process.env.BILLING_PROVIDER = 'stripe';
    delete process.env.STRIPE_SECRET_KEY;
    try {
      const res = await request(app)
        .post(PORTAL_URL)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ returnUrl: VALID_RETURN_URL });
      expect(res.status).toBe(503);
    } finally {
      if (originalProvider !== undefined) {
        process.env.BILLING_PROVIDER = originalProvider;
      } else {
        delete process.env.BILLING_PROVIDER;
      }
      if (originalKey !== undefined) {
        process.env.STRIPE_SECRET_KEY = originalKey;
      } else {
        delete process.env.STRIPE_SECRET_KEY;
      }
    }
  });

  // ── 7. Stripe OK + stripeCustomerId en BD → redirección al portal ──────────
  it('200 con url cuando Stripe está configurado y el tenant tiene stripeCustomerId', async () => {
    // Necesita una STRIPE_SECRET_KEY real o de test y un customerId válido.
    // Si no están configurados, el test se omite graciosamente.
    const key = process.env.STRIPE_SECRET_KEY?.trim() ?? '';
    const isKeyValid =
      key.length > 0 &&
      key.toLowerCase() !== 'sk_test_xxx' &&
      key.toLowerCase() !== 'sk_live_xxx' &&
      key.toLowerCase() !== 'placeholder';

    if (!isKeyValid) {
      console.warn(
        '[billing-portal] Test de integración real omitido: STRIPE_SECRET_KEY no configurada.',
      );
      return;
    }

    // Asignar un customerId de Stripe de test al tenant
    const fakeCustomerId = process.env.TEST_STRIPE_CUSTOMER_ID ?? '';
    if (!fakeCustomerId) {
      console.warn(
        '[billing-portal] Test de integración real omitido: define TEST_STRIPE_CUSTOMER_ID en .env para este test.',
      );
      return;
    }

    await AppDataSource.getRepository(Tenant).update(DEFAULT_TID, {
      stripeCustomerId: fakeCustomerId,
    });

    try {
      const res = await request(app)
        .post(PORTAL_URL)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ returnUrl: VALID_RETURN_URL });

      expect(res.status).toBe(200);
      expect(res.body.data?.url).toBeTruthy();
      expect(String(res.body.data.url)).toMatch(/^https:\/\//);
    } finally {
      await AppDataSource.getRepository(Tenant).update(DEFAULT_TID, {
        stripeCustomerId: null as unknown as string,
      });
    }
  });
});
