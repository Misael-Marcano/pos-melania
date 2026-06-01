/**
 * Límites `plan-limits` + `enforce-plan.ts` (starter: ver `PLAN_LIMITS.starter`).
 * Requiere BD migrada + seed (`npm run seed`). Ejecutar: `npm run test:integration`
 */
import request from 'supertest';
import app from '../../app';
import { AppDataSource, initDatabaseForTests } from '../../config/database';
import { redis } from '../../config/redis';
import { Tenant } from '../../entities/Tenant.entity';
import { resolvePlanLimits } from '../../saas/plan-limits';
import { countSeatsForTenant, countTiendasActivasForTenant } from '../../saas/tenant-usage';

const DEFAULT_TID = 1;

function newIdList(): number[] {
  return [];
}

describe('enforce-plan (starter)', () => {
  /** Rellenados en `beforeAll`; vacío si no hubo login. */
  let adminToken = '';
  let previousPlan = '';
  const createdEmpleadoIds = newIdList();
  const createdTiendaIds = newIdList();
  const ts = Date.now();

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

    const tenantRepo = AppDataSource.getRepository(Tenant);
    const t = await tenantRepo.findOne({ where: { id: DEFAULT_TID } });
    if (!t) throw new Error('Tenant id=1 no encontrado (¿migraciones + seed?)');
    previousPlan = t.planCode;
    await tenantRepo.update(DEFAULT_TID, { planCode: 'starter' });
  });

  afterAll(async () => {
    try {
      if (AppDataSource.isInitialized && adminToken) {
        const bearer = `Bearer ${adminToken}`;
        for (const id of [...createdTiendaIds].reverse()) {
          await request(app).delete(`/api/v1/tiendas/${id}`).set('Authorization', bearer);
        }
        for (const id of [...createdEmpleadoIds].reverse()) {
          await request(app).delete(`/api/v1/empleados/${id}`).set('Authorization', bearer);
        }
      }
      if (AppDataSource.isInitialized && previousPlan !== '') {
        await AppDataSource.getRepository(Tenant).update(DEFAULT_TID, { planCode: previousPlan });
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

  it('403 al crear usuario cuando no hay asientos libres (plan starter)', async () => {
    const maxUsers = resolvePlanLimits('starter').maxUsers;
    if (maxUsers == null) return;

    const c = await countSeatsForTenant(DEFAULT_TID);
    for (let i = 0; i < maxUsers - c; i++) {
      const res = await request(app)
        .post('/api/v1/empleados')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          nombre:   `PlanSeat ${i}`,
          correo:   `plan-seat-${ts}-${i}@example.com`,
          rol:      'admin',
          password: 'Test1234!',
        });
      expect(res.status).toBe(201);
      expect(res.body.data?.id).toBeDefined();
      createdEmpleadoIds.push(Number(res.body.data.id));
    }

    const over = await request(app)
      .post('/api/v1/empleados')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        nombre:   'PlanSeat overflow',
        correo:   `plan-seat-overflow-${ts}@example.com`,
        rol:      'admin',
        password: 'Test1234!',
      });
    expect(over.status).toBe(403);
    expect(String(over.body.message ?? '')).toMatch(/L[ií]mite de usuarios/i);
  });

  it('403 al crear sucursal cuando ya está el máximo de sucursales activas (starter)', async () => {
    const maxT = resolvePlanLimits('starter').maxTiendas;
    if (maxT == null) return;

    const c = await countTiendasActivasForTenant(DEFAULT_TID);
    for (let i = 0; i < maxT - c; i++) {
      const res = await request(app)
        .post('/api/v1/tiendas')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          nombre:    `INTEG-PLAN-${ts}-${i}`,
          direccion: 'test',
        });
      expect(res.status).toBe(201);
      expect(res.body.data?.id).toBeDefined();
      createdTiendaIds.push(Number(res.body.data.id));
    }

    const over = await request(app)
      .post('/api/v1/tiendas')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        nombre:    `INTEG-PLAN-OVER-${ts}`,
        direccion: 'test',
      });
    expect(over.status).toBe(403);
    expect(String(over.body.message ?? '')).toMatch(/L[ií]mite de sucursales/i);
  });
});
