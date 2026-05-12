/**
 * Aislamiento multi-tenant en kits: GET /kits/:id con JWT de otra org → 403
 * (el kit existe pero assertTenantMatch rechaza el acceso).
 *
 * Ejecutar: `npm run test:integration` desde `apps/backend`
 */
import request from 'supertest';
import app from '../../app';
import { AppDataSource, initDatabaseForTests } from '../../config/database';
import { redis } from '../../config/redis';
import { Kit } from '../../entities/Kit.entity';
import {
  createOtherTenantAdmin,
  deleteOtherTenantUser,
  OtherTenantFixture,
} from './helpers/other-tenant-auth';

describe('kits - aislamiento por tenant', () => {
  let fixture: OtherTenantFixture;
  let anyKitId: number | null = null;

  beforeAll(async () => {
    await initDatabaseForTests();
    await redis.connect();

    const row = await AppDataSource.getRepository(Kit)
      .createQueryBuilder('k')
      .select('k.id', 'id')
      .orderBy('k.id', 'ASC')
      .getRawOne<{ id: number }>();
    anyKitId = row?.id != null ? Number(row.id) : null;

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

  it('GET /kits/:id con token de otra organizacion → 403 si existe un kit en BD', async () => {
    if (anyKitId == null) {
      console.warn(
        '[kits-tenant-isolation] Sin filas en `kits`: omitido (seed o datos de prueba).',
      );
      return;
    }
    const res = await request(app)
      .get(`/api/v1/kits/${anyKitId}`)
      .set('Authorization', `Bearer ${fixture.token}`);
    expect(res.status).toBe(403);
    expect(String(res.body?.message ?? '')).toContain('organización');
  });
});
