/**
 * Aislamiento multi-tenant en cajas: GET /cajas/:id con JWT de otra org -> 403
 * (caja existe pero assertTenantMatch rechaza el acceso; admin omite assertTiendaCaja).
 *
 * Ejecutar: `npm run test:integration` desde `apps/backend`
 */
import request from 'supertest';
import app from '../../app';
import { AppDataSource, initDatabaseForTests } from '../../config/database';
import { redis } from '../../config/redis';
import { Caja } from '../../entities/Caja.entity';
import {
  createOtherTenantAdmin,
  deleteOtherTenantUser,
  OtherTenantFixture,
} from './helpers/other-tenant-auth';

describe('cajas - aislamiento por tenant', () => {
  let fixture: OtherTenantFixture;
  let anyCajaId: number | null = null;

  beforeAll(async () => {
    await initDatabaseForTests();
    await redis.connect();

    const row = await AppDataSource.getRepository(Caja)
      .createQueryBuilder('c')
      .select('c.id', 'id')
      .orderBy('c.id', 'ASC')
      .getRawOne<{ id: number }>();
    anyCajaId = row?.id != null ? Number(row.id) : null;

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
        /* sin conexion previa */
      }
    }
  });

  it('GET /cajas/:id con token de otra organizacion -> 403 si existe una caja en BD', async () => {
    if (anyCajaId == null) {
      console.warn(
        '[cajas-tenant-isolation] Sin filas en `cajas`: omitido (seed o datos de prueba).',
      );
      return;
    }
    const res = await request(app)
      .get(`/api/v1/cajas/${anyCajaId}`)
      .set('Authorization', `Bearer ${fixture.token}`);
    expect(res.status).toBe(403);
    expect(String(res.body?.message ?? '')).toContain('organización');
  });
});
