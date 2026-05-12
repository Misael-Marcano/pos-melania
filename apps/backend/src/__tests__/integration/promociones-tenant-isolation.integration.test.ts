/**
 * Aislamiento multi-tenant en promociones: GET /promociones/:id con JWT de otra org → 403
 * (la promoción existe pero assertTenantMatch rechaza el acceso).
 *
 * Ejecutar: `npm run test:integration` desde `apps/backend`
 */
import request from 'supertest';
import app from '../../app';
import { AppDataSource, initDatabaseForTests } from '../../config/database';
import { redis } from '../../config/redis';
import { Promocion } from '../../entities/Promocion.entity';
import {
  createOtherTenantAdmin,
  deleteOtherTenantUser,
  OtherTenantFixture,
} from './helpers/other-tenant-auth';

describe('promociones - aislamiento por tenant', () => {
  let fixture: OtherTenantFixture;
  let anyPromocionId: number | null = null;

  beforeAll(async () => {
    await initDatabaseForTests();
    await redis.connect();

    const row = await AppDataSource.getRepository(Promocion)
      .createQueryBuilder('p')
      .select('p.id', 'id')
      .orderBy('p.id', 'ASC')
      .getRawOne<{ id: number }>();
    anyPromocionId = row?.id != null ? Number(row.id) : null;

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

  it('GET /promociones/:id con token de otra organizacion → 403 si existe una promocion en BD', async () => {
    if (anyPromocionId == null) {
      console.warn(
        '[promociones-tenant-isolation] Sin filas en `promociones`: omitido (seed o datos de prueba).',
      );
      return;
    }
    const res = await request(app)
      .get(`/api/v1/promociones/${anyPromocionId}`)
      .set('Authorization', `Bearer ${fixture.token}`);
    expect(res.status).toBe(403);
    expect(String(res.body?.message ?? '')).toContain('organización');
  });
});
