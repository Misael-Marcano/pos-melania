/**
 * Reportes multi-tenant: otra organización no debe ver inventario ni sesiones de caja ajenas.
 * Requiere SQL Server + Redis + migraciones + seed (admin en tenant 1 con datos demo).
 *
 * Ejecutar: `npm run test:integration` desde `apps/backend`
 */
import bcrypt from 'bcryptjs';
import request from 'supertest';
import app from '../../app';
import { AppDataSource, initDatabaseForTests } from '../../config/database';
import { redis } from '../../config/redis';
import { CajaApertura } from '../../entities/CajaApertura.entity';
import { Tenant } from '../../entities/Tenant.entity';
import { Usuario } from '../../entities/Usuario.entity';
import { uniqueIntegrationSuffix } from './helpers/integration-ids';

describe('reportes — aislamiento por tenant', () => {
  let otherTenantToken: string;
  let createdUserId: number | null = null;
  let createdTenantId: number | null = null;
  /** Primera sesión de caja en BD (típicamente tenant 1 tras seed/uso) */
  let anyAperturaId: number | null = null;

  beforeAll(async () => {
    await initDatabaseForTests();
    await redis.connect();

    const rowAp = await AppDataSource.getRepository(CajaApertura)
      .createQueryBuilder('ca')
      .select('ca.id', 'id')
      .orderBy('ca.id', 'ASC')
      .getRawOne<{ id: number }>();
    anyAperturaId = rowAp?.id != null ? Number(rowAp.id) : null;

    const suffix = uniqueIntegrationSuffix();
    const tenantRepo = AppDataSource.getRepository(Tenant);
    const userRepo = AppDataSource.getRepository(Usuario);

    const t2 = await tenantRepo.save(
      tenantRepo.create({
        nombre:   `Org reportes ${suffix}`,
        slug:     `org-rep-${suffix}`,
        activo:   true,
        planCode: 'standard',
      }),
    );
    createdTenantId = t2.id;

    const hash = await bcrypt.hash('Test1234!', 10);
    const u2 = await userRepo.save(
      userRepo.create({
        nombre:       'Admin reportes otra org',
        email:        `admin-rep-otra-${suffix}@example.com`,
        passwordHash: hash,
        rol:          'admin',
        tenant:       t2,
      }),
    );
    createdUserId = u2.id;

    const login = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: `admin-rep-otra-${suffix}@example.com`, password: 'Test1234!' });
    if (login.status !== 200 || !login.body?.data?.accessToken) {
      throw new Error(`Login usuario otra org falló: ${login.status} ${JSON.stringify(login.body)}`);
    }
    otherTenantToken = String(login.body.data.accessToken);
  });

  afterAll(async () => {
    try {
      if (AppDataSource.isInitialized && createdUserId != null) {
        await AppDataSource.getRepository(Usuario).delete({ id: createdUserId });
      }
      if (AppDataSource.isInitialized && createdTenantId != null) {
        await AppDataSource.getRepository(Tenant).delete({ id: createdTenantId });
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

  it('GET /reportes/inventario-valorizado — org nueva sin artículos (totales en cero)', async () => {
    const res = await request(app)
      .get('/api/v1/reportes/inventario-valorizado')
      .set('Authorization', `Bearer ${otherTenantToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const tot = res.body.data?.totales;
    expect(tot).toBeDefined();
    expect(Number(tot.totalArticulos)).toBe(0);
    expect(Array.isArray(res.body.data?.articulos)).toBe(true);
    expect(res.body.data.articulos.length).toBe(0);
  });

  it('GET /reportes/conciliacion-caja/:id — sesión de otra org no accesible', async () => {
    if (anyAperturaId == null) return;
    const res = await request(app)
      .get(`/api/v1/reportes/conciliacion-caja/${anyAperturaId}`)
      .set('Authorization', `Bearer ${otherTenantToken}`);
    expect(res.body.success).toBe(false);
    expect(String(res.body.message ?? '')).toMatch(/Sesión de caja no encontrada|no encontrada/i);
  });

  it('GET /reportes/cierre-caja/:id — sesión de otra org no accesible', async () => {
    if (anyAperturaId == null) {
      console.warn(
        '[reportes-tenant-isolation] Sin `caja_aperturas`: omitido (abre caja en POS al menos una vez).',
      );
      return;
    }
    const res = await request(app)
      .get(`/api/v1/reportes/cierre-caja/${anyAperturaId}`)
      .set('Authorization', `Bearer ${otherTenantToken}`);
    expect(res.body.success).toBe(false);
    expect(String(res.body.message ?? '')).toMatch(/Sesión de caja no encontrada|no encontrada/i);
  });
});
