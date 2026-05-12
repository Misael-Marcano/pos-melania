/**
 * Aislamiento multi-tenant en tarjetas-regalo: GET /tarjetas-regalo/:id con JWT de otra org → 403
 * (la tarjeta existe pero assertTenantMatch rechaza el acceso).
 *
 * Ejecutar: `npm run test:integration` desde `apps/backend`
 */
import request from 'supertest';
import app from '../../app';
import { AppDataSource, initDatabaseForTests } from '../../config/database';
import { redis } from '../../config/redis';
import { TarjetaRegalo } from '../../entities/TarjetaRegalo.entity';
import {
  createOtherTenantAdmin,
  deleteOtherTenantUser,
  OtherTenantFixture,
} from './helpers/other-tenant-auth';

describe('tarjetas-regalo - aislamiento por tenant', () => {
  let fixture: OtherTenantFixture;
  let anyTarjetaId: number | null = null;

  beforeAll(async () => {
    await initDatabaseForTests();
    await redis.connect();

    const row = await AppDataSource.getRepository(TarjetaRegalo)
      .createQueryBuilder('t')
      .select('t.id', 'id')
      .orderBy('t.id', 'ASC')
      .getRawOne<{ id: number }>();
    anyTarjetaId = row?.id != null ? Number(row.id) : null;

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

  it('GET /tarjetas-regalo/:id con token de otra organizacion → 403 si existe una tarjeta en BD', async () => {
    if (anyTarjetaId == null) {
      console.warn(
        '[tarjetas-regalo-tenant-isolation] Sin filas en `tarjetas_regalo`: omitido (seed o datos de prueba).',
      );
      return;
    }
    const res = await request(app)
      .get(`/api/v1/tarjetas-regalo/${anyTarjetaId}`)
      .set('Authorization', `Bearer ${fixture.token}`);
    expect(res.status).toBe(403);
    expect(String(res.body?.message ?? '')).toContain('organización');
  });
});
