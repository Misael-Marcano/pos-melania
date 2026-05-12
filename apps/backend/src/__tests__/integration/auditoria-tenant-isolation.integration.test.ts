/**
 * Aislamiento multi-tenant en auditoria: solo GET / y GET /tablas (sin /:id).
 * El servicio filtra por usuarios.tenantId del JWT; una entrada de otro tenant
 * no debe aparecer en la primera pagina del listado.
 *
 * Ejecutar: `npm run test:integration` desde `apps/backend`
 */
import request from 'supertest';
import app from '../../app';
import { AppDataSource, initDatabaseForTests } from '../../config/database';
import { redis } from '../../config/redis';
import { AuditLog } from '../../entities/AuditLog.entity';
import {
  createOtherTenantAdmin,
  deleteOtherTenantUser,
  OtherTenantFixture,
} from './helpers/other-tenant-auth';

describe('auditoria - aislamiento por tenant', () => {
  let fixture: OtherTenantFixture;
  let baseline: AuditLog | null = null;

  beforeAll(async () => {
    await initDatabaseForTests();
    await redis.connect();

    fixture = await createOtherTenantAdmin();

    baseline = await AppDataSource.getRepository(AuditLog)
      .createQueryBuilder('a')
      .innerJoin('a.usuario', 'u')
      .where('u.tenantId IS NOT NULL')
      .andWhere('u.tenantId != :tid', { tid: fixture.tenantId })
      .orderBy('a.id', 'ASC')
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

  it('GET /auditoria con token de otra organizacion -> 200 y sin filas ajenas si hay logs en BD', async () => {
    if (baseline == null) {
      console.warn(
        '[auditoria-tenant-isolation] Sin `audit_logs` con usuario de otro tenant: omitido.',
      );
      return;
    }
    const res = await request(app)
      .get('/api/v1/auditoria')
      .set('Authorization', `Bearer ${fixture.token}`)
      .query({ limit: 100, page: 1 });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const rows = Array.isArray(res.body.data) ? res.body.data : [];
    expect(rows.some((r: { id?: number }) => r.id === baseline!.id)).toBe(false);
  });
});
