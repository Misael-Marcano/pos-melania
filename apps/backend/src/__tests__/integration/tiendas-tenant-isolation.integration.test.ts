/**
 * Aislamiento multi-tenant en tiendas: no hay GET /:id; el listado es GET /.
 * Un JWT de otra org no debe ver sucursales de otra organizacion (ningun id ajeno).
 * PUT /:id ajeno -> 403 (findById + assertTenantMatch).
 *
 * Ejecutar: `npm run test:integration` desde `apps/backend`
 */
import request from 'supertest';
import app from '../../app';
import { AppDataSource, initDatabaseForTests } from '../../config/database';
import { redis } from '../../config/redis';
import { Tienda } from '../../entities/Tienda.entity';
import {
  createOtherTenantAdmin,
  deleteOtherTenantUser,
  OtherTenantFixture,
} from './helpers/other-tenant-auth';

describe('tiendas - aislamiento por tenant', () => {
  let fixture: OtherTenantFixture;
  let baseline: Tienda | null = null;

  beforeAll(async () => {
    await initDatabaseForTests();
    await redis.connect();

    fixture = await createOtherTenantAdmin();

    baseline = await AppDataSource.getRepository(Tienda)
      .createQueryBuilder('t')
      .where('t.tenantId != :tid', { tid: fixture.tenantId })
      .andWhere('t.activo = :act', { act: true })
      .orderBy('t.id', 'ASC')
      .getOne();
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

  it('GET /tiendas con token de otra organizacion -> 200 y sin sucursales ajenas si hay tiendas en BD', async () => {
    if (baseline == null) {
      console.warn(
        '[tiendas-tenant-isolation] Sin filas en `tiendas` (ajenas al fixture): omitido.',
      );
      return;
    }
    const res = await request(app)
      .get('/api/v1/tiendas')
      .set('Authorization', `Bearer ${fixture.token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const rows = Array.isArray(res.body.data) ? res.body.data : [];
    expect(rows.some((r: { id?: number }) => r.id === baseline!.id)).toBe(false);
  });

  it('PUT /tiendas/:id con token de otra organizacion -> 403 si existe una sucursal ajena', async () => {
    if (baseline == null) {
      console.warn('[tiendas-tenant-isolation] Sin filas en `tiendas`: omitido (PUT).');
      return;
    }
    const res = await request(app)
      .put(`/api/v1/tiendas/${baseline.id}`)
      .set('Authorization', `Bearer ${fixture.token}`)
      .send({ nombre: 'no-deberia-actualizar' });
    expect(res.status).toBe(403);
    expect(String(res.body?.message ?? '')).toContain('organización');
  });
});
