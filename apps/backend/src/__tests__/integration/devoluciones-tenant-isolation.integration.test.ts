/**
 * Aislamiento multi-tenant en devoluciones: GET /devoluciones/:id con JWT de otra org → 404.
 *
 * Ejecutar: `npm run test:integration` desde `apps/backend`
 */
import request from 'supertest';
import app from '../../app';
import { AppDataSource, initDatabaseForTests } from '../../config/database';
import { redis } from '../../config/redis';
import { Devolucion } from '../../entities/Devolucion.entity';
import {
  createOtherTenantAdmin,
  deleteOtherTenantUser,
  OtherTenantFixture,
} from './helpers/other-tenant-auth';

describe('devoluciones — aislamiento por tenant', () => {
  let fixture: OtherTenantFixture;
  let anyDevolucionId: number | null = null;

  beforeAll(async () => {
    await initDatabaseForTests();
    await redis.connect();

    const first = await AppDataSource.getRepository(Devolucion).findOne({
      order: { id: 'ASC' },
      select: ['id'],
    });
    anyDevolucionId = first?.id ?? null;

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

  it('GET /devoluciones/:id con token de otra organización → 404 si existe una devolución en BD', async () => {
    if (anyDevolucionId == null) {
      console.warn(
        '[devoluciones-tenant-isolation] Sin filas en `devoluciones`: omitido.',
      );
      return;
    }
    const res = await request(app)
      .get(`/api/v1/devoluciones/${anyDevolucionId}`)
      .set('Authorization', `Bearer ${fixture.token}`);
    expect(res.status).toBe(404);
  });
});
