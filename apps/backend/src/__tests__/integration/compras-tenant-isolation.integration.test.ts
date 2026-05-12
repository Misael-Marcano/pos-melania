/**
 * Aislamiento multi-tenant en compras: GET /compras/:id con JWT de otra org → 403
 * (orden existe pero pertenece a otra organización).
 *
 * Ejecutar: `npm run test:integration` desde `apps/backend`
 */
import request from 'supertest';
import app from '../../app';
import { AppDataSource, initDatabaseForTests } from '../../config/database';
import { redis } from '../../config/redis';
import { OrdenCompra } from '../../entities/OrdenCompra.entity';
import {
  createOtherTenantAdmin,
  deleteOtherTenantUser,
  OtherTenantFixture,
} from './helpers/other-tenant-auth';

describe('compras — aislamiento por tenant', () => {
  let fixture: OtherTenantFixture;
  let anyOrdenId: number | null = null;

  beforeAll(async () => {
    await initDatabaseForTests();
    await redis.connect();

    const row = await AppDataSource.getRepository(OrdenCompra)
      .createQueryBuilder('o')
      .select('o.id', 'id')
      .orderBy('o.id', 'ASC')
      .getRawOne<{ id: number }>();
    anyOrdenId = row?.id != null ? Number(row.id) : null;

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

  it('GET /compras/:id con token de otra organización → 403 si existe una orden en BD', async () => {
    if (anyOrdenId == null) {
      console.warn(
        '[compras-tenant-isolation] Sin filas en `ordenes_compra`: omitido.',
      );
      return;
    }
    const res = await request(app)
      .get(`/api/v1/compras/${anyOrdenId}`)
      .set('Authorization', `Bearer ${fixture.token}`);
    expect(res.status).toBe(403);
    expect(String(res.body?.message ?? '')).toContain('organización');
  });
});
