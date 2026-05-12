/**
 * Tests de integración — feature flags por plan (`assertFeatureEnabled`).
 *
 * Verifica que los módulos bloqueados en el plan `starter` devuelven 403
 * con un mensaje que apunta a actualizar el plan.
 *
 * Módulos testeados: kits, cotizaciones, promociones, tarjetas-regalo, recetas, compras.
 *
 * Requiere BD migrada + seed (`npm run seed`).
 * Ejecutar: desde `apps/backend` → `npm run test:integration`
 */
import request from 'supertest';
import app from '../../app';
import { AppDataSource, initDatabaseForTests } from '../../config/database';
import { redis } from '../../config/redis';
import { Tenant } from '../../entities/Tenant.entity';
import { Articulo } from '../../entities/Articulo.entity';
import { Categoria } from '../../entities/Categoria.entity';

const DEFAULT_TID = 1;

describe('enforce-features (starter — módulos bloqueados)', () => {
  let adminToken = '';
  let previousPlan = '';
  let articuloId: number | null = null;
  let categoriaId: number | null = null;
  const ts = Date.now();

  beforeAll(async () => {
    await initDatabaseForTests();
    await redis.connect();

    const login = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'admin@pos.com', password: 'Admin123!' });
    if (login.status !== 200 || !login.body?.data?.accessToken) {
      throw new Error(`Login falló: ${login.status} ${JSON.stringify(login.body)}`);
    }
    adminToken = String(login.body.data.accessToken);

    // Forzar plan starter
    const tenantRepo = AppDataSource.getRepository(Tenant);
    const t = await tenantRepo.findOne({ where: { id: DEFAULT_TID } });
    if (!t) throw new Error('Tenant id=1 no encontrado');
    previousPlan = t.planCode;
    await tenantRepo.update(DEFAULT_TID, { planCode: 'starter' });

    // Buscar categoría y artículo existentes para usarlos en requests
    const cat = await AppDataSource.getRepository(Categoria).findOne({
      where: { tenant: { id: DEFAULT_TID } },
    });
    categoriaId = cat?.id ?? null;

    const art = await AppDataSource.getRepository(Articulo).findOne({
      where: { tenant: { id: DEFAULT_TID }, activo: true },
    });
    articuloId = art?.id ?? null;
  });

  afterAll(async () => {
    try {
      if (AppDataSource.isInitialized && previousPlan) {
        await AppDataSource.getRepository(Tenant).update(DEFAULT_TID, { planCode: previousPlan });
      }
    } finally {
      if (AppDataSource.isInitialized) await AppDataSource.destroy();
      try { await redis.quit(); } catch { /* ignorar */ }
    }
  });

  const bearer = () => `Bearer ${adminToken}`;

  // ── Kits ──────────────────────────────────────────────────────────────────
  it('403 al crear kit en plan starter', async () => {
    const res = await request(app)
      .post('/api/v1/kits')
      .set('Authorization', bearer())
      .send({ nombre: `Kit-${ts}`, precio: 100, detalles: [] });
    expect(res.status).toBe(403);
    expect(String(res.body.message ?? '')).toMatch(/Kits|plan|Standard/i);
  });

  // ── Cotizaciones ──────────────────────────────────────────────────────────
  it('403 al crear cotización en plan starter', async () => {
    if (!articuloId) {
      console.warn('[enforce-features] Sin artículo disponible — cotizaciones test omitido');
      return;
    }
    const res = await request(app)
      .post('/api/v1/cotizaciones')
      .set('Authorization', bearer())
      .send({
        detalles: [{ articuloId, cantidad: 1, precioUnitario: 100 }],
      });
    expect(res.status).toBe(403);
    expect(String(res.body.message ?? '')).toMatch(/Cotizaciones|plan|Standard/i);
  });

  // ── Promociones ───────────────────────────────────────────────────────────
  it('403 al crear promoción en plan starter', async () => {
    const res = await request(app)
      .post('/api/v1/promociones')
      .set('Authorization', bearer())
      .send({
        codigo:  `PROMO-${ts}`,
        nombre:  `Test ${ts}`,
        tipo:    'PORCENTAJE',
        valor:   10,
      });
    expect(res.status).toBe(403);
    expect(String(res.body.message ?? '')).toMatch(/Promociones|plan|Standard/i);
  });

  // ── Tarjetas de regalo ────────────────────────────────────────────────────
  it('403 al crear tarjeta de regalo en plan starter', async () => {
    const res = await request(app)
      .post('/api/v1/tarjetas-regalo')
      .set('Authorization', bearer())
      .send({ saldoInicial: 500, notas: `test-${ts}` });
    expect(res.status).toBe(403);
    expect(String(res.body.message ?? '')).toMatch(/Tarjetas de regalo|plan|Standard/i);
  });

  // ── Recetas ───────────────────────────────────────────────────────────────
  it('403 al crear receta en plan starter', async () => {
    if (!articuloId) {
      console.warn('[enforce-features] Sin artículo disponible — recetas test omitido');
      return;
    }
    const res = await request(app)
      .post('/api/v1/recetas')
      .set('Authorization', bearer())
      .send({
        nombre:              `Receta-${ts}`,
        articuloResultadoId: articuloId,
        ingredientes:        [{ articuloId, cantidad: 1 }],
      });
    expect(res.status).toBe(403);
    expect(String(res.body.message ?? '')).toMatch(/Recetas|plan|Standard/i);
  });

  // ── Compras ───────────────────────────────────────────────────────────────
  it('403 al crear orden de compra en plan starter', async () => {
    if (!articuloId) {
      console.warn('[enforce-features] Sin artículo disponible — compras test omitido');
      return;
    }
    const res = await request(app)
      .post('/api/v1/compras')
      .set('Authorization', bearer())
      .send({
        detalles: [{ articuloId, cantidad: 10, costoUnitario: 50 }],
      });
    expect(res.status).toBe(403);
    expect(String(res.body.message ?? '')).toMatch(/Compras|plan|Standard/i);
  });

  // ── Sanity: plan standard desbloquea (si la BD tiene un artículo/categoría) ─
  it('promoción se puede crear con plan standard', async () => {
    await AppDataSource.getRepository(Tenant).update(DEFAULT_TID, { planCode: 'standard' });
    try {
      const res = await request(app)
        .post('/api/v1/promociones')
        .set('Authorization', bearer())
        .send({
          codigo:  `PROMO-STD-${ts}`,
          nombre:  `Test STD ${ts}`,
          tipo:    'PORCENTAJE',
          valor:   10,
        });
      // 201 creado o 400/409 (validación negocio) — cualquiera indica que NO fue 403
      expect(res.status).not.toBe(403);
    } finally {
      await AppDataSource.getRepository(Tenant).update(DEFAULT_TID, { planCode: 'starter' });
    }
  });
});
