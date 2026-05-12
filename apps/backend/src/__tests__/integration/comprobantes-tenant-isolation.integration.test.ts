/**
 * Aislamiento multi-tenant en comprobantes: no hay GET /:id; el listado es GET /.
 * Se comprueba que un JWT de otra org no recibe series fiscales de otra organizacion
 * (ningun elemento con el id de una fila ajena). PUT /:id ajeno -> 403 (findById + assertTenantMatch).
 *
 * Ejecutar: `npm run test:integration` desde `apps/backend`
 */
import request from 'supertest';
import app from '../../app';
import { AppDataSource, initDatabaseForTests } from '../../config/database';
import { redis } from '../../config/redis';
import { Comprobante } from '../../entities/Comprobante.entity';
import {
  createOtherTenantAdmin,
  deleteOtherTenantUser,
  OtherTenantFixture,
} from './helpers/other-tenant-auth';

describe('comprobantes - aislamiento por tenant', () => {
  let fixture: OtherTenantFixture;
  let baseline: Comprobante | null = null;

  beforeAll(async () => {
    await initDatabaseForTests();
    await redis.connect();

    fixture = await createOtherTenantAdmin();

    baseline = await AppDataSource.getRepository(Comprobante)
      .createQueryBuilder('c')
      .where('c.tenantId != :tid', { tid: fixture.tenantId })
      .orderBy('c.id', 'ASC')
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

  it('GET /comprobantes con token de otra organizacion -> 200 y sin filas ajenas si hay series en BD', async () => {
    if (baseline == null) {
      console.warn(
        '[comprobantes-tenant-isolation] Sin filas en `comprobantes` (ajenas al fixture): omitido.',
      );
      return;
    }
    const res = await request(app)
      .get('/api/v1/comprobantes')
      .set('Authorization', `Bearer ${fixture.token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const rows = Array.isArray(res.body.data) ? res.body.data : [];
    expect(rows.some((r: { id?: number }) => r.id === baseline!.id)).toBe(false);
  });

  it('PUT /comprobantes/:id con token de otra organizacion -> 403 si existe una serie ajena', async () => {
    if (baseline == null) {
      console.warn(
        '[comprobantes-tenant-isolation] Sin filas en `comprobantes`: omitido (PUT).',
      );
      return;
    }
    const res = await request(app)
      .put(`/api/v1/comprobantes/${baseline.id}`)
      .set('Authorization', `Bearer ${fixture.token}`)
      .send({ descripcion: 'no-deberia-actualizar' });
    expect(res.status).toBe(403);
    expect(String(res.body?.message ?? '')).toContain('organización');
  });
});
