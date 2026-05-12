/**
 * Aislamiento multi-tenant en gastos: GET /gastos/:id con JWT de otra org → 403
 * (el gasto existe pero `assertTenantMatch` rechaza el acceso).
 *
 * Ejecutar: `npm run test:integration` desde `apps/backend`
 */
import request from 'supertest';
import app from '../../app';
import { AppDataSource, initDatabaseForTests } from '../../config/database';
import { redis } from '../../config/redis';
import { Gasto } from '../../entities/Gasto.entity';
import {
  createOtherTenantAdmin,
  deleteOtherTenantUser,
  OtherTenantFixture,
} from './helpers/other-tenant-auth';

describe('gastos - aislamiento por tenant', () => {
  let fixture: OtherTenantFixture;
  let anyGastoId: number | null = null;

  beforeAll(async () => {
    await initDatabaseForTests();
    await redis.connect();

    const row = await AppDataSource.getRepository(Gasto)
      .createQueryBuilder('g')
      .select('g.id', 'id')
      .orderBy('g.id', 'ASC')
      .getRawOne<{ id: number }>();
    anyGastoId = row?.id != null ? Number(row.id) : null;

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

  it('GET /gastos/:id con token de otra organización → 403 si existe un gasto en BD', async () => {
    if (anyGastoId == null) {
      console.warn(
        '[gastos-tenant-isolation] Sin filas en `gastos`: omitido (seed o datos de prueba).',
      );
      return;
    }
    const res = await request(app)
      .get(`/api/v1/gastos/${anyGastoId}`)
      .set('Authorization', `Bearer ${fixture.token}`);
    expect(res.status).toBe(403);
    expect(String(res.body?.message ?? '')).toContain('organización');
  });
});
