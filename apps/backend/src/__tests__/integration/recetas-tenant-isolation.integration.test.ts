/**
 * Aislamiento multi-tenant en recetas: GET /recetas/:id con JWT de otra org → 404
 * (findById filtra por tenant en la query; id ajeno no visible).
 *
 * Ejecutar: `npm run test:integration` desde `apps/backend`
 */
import request from 'supertest';
import app from '../../app';
import { AppDataSource, initDatabaseForTests } from '../../config/database';
import { redis } from '../../config/redis';
import { Receta } from '../../entities/Receta.entity';
import {
  createOtherTenantAdmin,
  deleteOtherTenantUser,
  OtherTenantFixture,
} from './helpers/other-tenant-auth';

describe('recetas - aislamiento por tenant', () => {
  let fixture: OtherTenantFixture;
  let anyRecetaId: number | null = null;

  beforeAll(async () => {
    await initDatabaseForTests();
    await redis.connect();

    const row = await AppDataSource.getRepository(Receta)
      .createQueryBuilder('r')
      .select('r.id', 'id')
      .orderBy('r.id', 'ASC')
      .getRawOne<{ id: number }>();
    anyRecetaId = row?.id != null ? Number(row.id) : null;

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

  it('GET /recetas/:id con token de otra organizacion → 404 si existe una receta en BD', async () => {
    if (anyRecetaId == null) {
      console.warn(
        '[recetas-tenant-isolation] Sin filas en `recetas`: omitido (seed o datos de prueba).',
      );
      return;
    }
    const res = await request(app)
      .get(`/api/v1/recetas/${anyRecetaId}`)
      .set('Authorization', `Bearer ${fixture.token}`);
    expect(res.status).toBe(404);
  });
});
