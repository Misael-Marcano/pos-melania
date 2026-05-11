/**
 * Aislamiento multi-tenant en inventario: GET /inventario/:id con JWT de otra org → 404.
 * Requiere SQL Server + Redis + migraciones. Si hay al menos un artículo en BD, valida el caso.
 *
 * Ejecutar: `npm run test:integration` desde `apps/backend`
 */
import request from 'supertest';
import app from '../../app';
import { AppDataSource, initDatabaseForTests } from '../../config/database';
import { redis } from '../../config/redis';
import { Articulo } from '../../entities/Articulo.entity';
import {
  createOtherTenantAdmin,
  deleteOtherTenantUser,
  OtherTenantFixture,
} from './helpers/other-tenant-auth';

describe('inventario — aislamiento por tenant', () => {
  let fixture: OtherTenantFixture;
  /** Cualquier artículo en BD (típicamente tenant default) */
  let anyArticuloId: number | null = null;

  beforeAll(async () => {
    await initDatabaseForTests();
    await redis.connect();

    const first = await AppDataSource.getRepository(Articulo).findOne({
      order: { id: 'ASC' },
      select: ['id'],
    });
    anyArticuloId = first?.id ?? null;

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

  it('GET /inventario/:id con token de otra organización → 404 si existe un artículo en BD', async () => {
    if (anyArticuloId == null) {
      console.warn(
        '[inventario-tenant-isolation] Sin filas en `articulos`: omitido (seed o catálogo mínimo).',
      );
      return;
    }
    const res = await request(app)
      .get(`/api/v1/inventario/${anyArticuloId}`)
      .set('Authorization', `Bearer ${fixture.token}`);
    expect(res.status).toBe(404);
  });
});
