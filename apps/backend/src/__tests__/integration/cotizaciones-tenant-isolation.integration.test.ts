/**
 * Aislamiento multi-tenant en cotizaciones: GET /cotizaciones/:id con JWT de otra org → 404
 * (findById filtra por tenant en la query; id ajeno no visible).
 *
 * Ejecutar: `npm run test:integration` desde `apps/backend`
 */
import request from 'supertest';
import app from '../../app';
import { AppDataSource, initDatabaseForTests } from '../../config/database';
import { redis } from '../../config/redis';
import { Cotizacion } from '../../entities/Cotizacion.entity';
import {
  createOtherTenantAdmin,
  deleteOtherTenantUser,
  OtherTenantFixture,
} from './helpers/other-tenant-auth';

describe('cotizaciones - aislamiento por tenant', () => {
  let fixture: OtherTenantFixture;
  let anyCotizacionId: number | null = null;

  beforeAll(async () => {
    await initDatabaseForTests();
    await redis.connect();

    const row = await AppDataSource.getRepository(Cotizacion)
      .createQueryBuilder('c')
      .select('c.id', 'id')
      .orderBy('c.id', 'ASC')
      .getRawOne<{ id: number }>();
    anyCotizacionId = row?.id != null ? Number(row.id) : null;

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

  it('GET /cotizaciones/:id con token de otra organizacion → 404 si existe una cotizacion en BD', async () => {
    if (anyCotizacionId == null) {
      console.warn(
        '[cotizaciones-tenant-isolation] Sin filas en `cotizaciones`: omitido (seed o datos de prueba).',
      );
      return;
    }
    const res = await request(app)
      .get(`/api/v1/cotizaciones/${anyCotizacionId}`)
      .set('Authorization', `Bearer ${fixture.token}`);
    expect(res.status).toBe(404);
  });
});
