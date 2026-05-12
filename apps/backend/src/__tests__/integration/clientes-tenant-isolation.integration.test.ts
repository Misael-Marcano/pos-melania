/**
 * Aislamiento multi-tenant en clientes: GET /clientes/:id con JWT de otra org → 404
 * (el cliente existe en otra organización pero no es visible para esta).
 *
 * Ejecutar: `npm run test:integration` desde `apps/backend`
 */
import request from 'supertest';
import app from '../../app';
import { AppDataSource, initDatabaseForTests } from '../../config/database';
import { redis } from '../../config/redis';
import { Cliente } from '../../entities/Cliente.entity';
import {
  createOtherTenantAdmin,
  deleteOtherTenantUser,
  OtherTenantFixture,
} from './helpers/other-tenant-auth';

describe('clientes - aislamiento por tenant', () => {
  let fixture: OtherTenantFixture;
  let anyClienteId: number | null = null;

  beforeAll(async () => {
    await initDatabaseForTests();
    await redis.connect();

    const row = await AppDataSource.getRepository(Cliente)
      .createQueryBuilder('c')
      .select('c.id', 'id')
      .orderBy('c.id', 'ASC')
      .getRawOne<{ id: number }>();
    anyClienteId = row?.id != null ? Number(row.id) : null;

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

  it('GET /clientes/:id con token de otra organización → 404 si existe un cliente en BD', async () => {
    if (anyClienteId == null) {
      console.warn(
        '[clientes-tenant-isolation] Sin filas en `clientes`: omitido (seed o datos de prueba).',
      );
      return;
    }
    const res = await request(app)
      .get(`/api/v1/clientes/${anyClienteId}`)
      .set('Authorization', `Bearer ${fixture.token}`);
    expect(res.status).toBe(404);
  });
});
