/**
 * Aislamiento multi-tenant en proveedores: GET /proveedores/:id con JWT de otra org → 403
 * (el proveedor existe pero assertTenantMatch rechaza el acceso).
 *
 * Ejecutar: `npm run test:integration` desde `apps/backend`
 */
import request from 'supertest';
import app from '../../app';
import { AppDataSource, initDatabaseForTests } from '../../config/database';
import { redis } from '../../config/redis';
import { Proveedor } from '../../entities/Proveedor.entity';
import {
  createOtherTenantAdmin,
  deleteOtherTenantUser,
  OtherTenantFixture,
} from './helpers/other-tenant-auth';

describe('proveedores - aislamiento por tenant', () => {
  let fixture: OtherTenantFixture;
  let anyProveedorId: number | null = null;

  beforeAll(async () => {
    await initDatabaseForTests();
    await redis.connect();

    const row = await AppDataSource.getRepository(Proveedor)
      .createQueryBuilder('p')
      .select('p.id', 'id')
      .orderBy('p.id', 'ASC')
      .getRawOne<{ id: number }>();
    anyProveedorId = row?.id != null ? Number(row.id) : null;

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

  it('GET /proveedores/:id con token de otra organizacion → 403 si existe un proveedor en BD', async () => {
    if (anyProveedorId == null) {
      console.warn(
        '[proveedores-tenant-isolation] Sin filas en `proveedores`: omitido (seed o datos de prueba).',
      );
      return;
    }
    const res = await request(app)
      .get(`/api/v1/proveedores/${anyProveedorId}`)
      .set('Authorization', `Bearer ${fixture.token}`);
    expect(res.status).toBe(403);
    expect(String(res.body?.message ?? '')).toContain('organización');
  });
});
