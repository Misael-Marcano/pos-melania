/**
 * Aislamiento multi-tenant en ventas: un usuario de otra organización no debe ver el detalle de una venta ajena.
 * Requiere SQL Server + Redis + migraciones. Si existe al menos una fila en `ventas` (p. ej. tras usar el POS),
 * valida 404 en GET /ventas/:id con token de otra org.
 *
 * Ejecutar: `npm run test:integration` desde `apps/backend`
 */
import bcrypt from 'bcryptjs';
import request from 'supertest';
import app from '../../app';
import { AppDataSource, initDatabaseForTests } from '../../config/database';
import { redis } from '../../config/redis';
import { Tenant } from '../../entities/Tenant.entity';
import { Usuario } from '../../entities/Usuario.entity';
import { Venta } from '../../entities/Venta.entity';

describe('ventas — aislamiento por tenant', () => {
  let otherTenantToken: string;
  let createdUserId: number | null = null;
  let createdTenantId: number | null = null;
  /** Primera venta en BD (cualquier org), para probar acceso cruzado */
  let anyVentaId: number | null = null;

  beforeAll(async () => {
    await initDatabaseForTests();
    await redis.connect();

    const first = await AppDataSource.getRepository(Venta).findOne({
      order: { id: 'ASC' },
      select: ['id'],
    });
    anyVentaId = first?.id ?? null;

    const ts = Date.now();
    const tenantRepo = AppDataSource.getRepository(Tenant);
    const userRepo = AppDataSource.getRepository(Usuario);

    const t2 = await tenantRepo.save(
      tenantRepo.create({
        nombre:   `Org aislamiento ${ts}`,
        slug:     `org-aisl-${ts}`,
        activo:   true,
        planCode: 'standard',
      }),
    );
    createdTenantId = t2.id;

    const hash = await bcrypt.hash('Test1234!', 10);
    const u2 = await userRepo.save(
      userRepo.create({
        nombre:       'Admin otra org',
        email:        `admin-otra-${ts}@example.com`,
        passwordHash: hash,
        rol:          'admin',
        tenant:       t2,
      }),
    );
    createdUserId = u2.id;

    const login = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: `admin-otra-${ts}@example.com`, password: 'Test1234!' });
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

  it('GET /ventas/:id con token de otra organización → 404 si existe una venta en BD', async () => {
    if (anyVentaId == null) {
      console.warn(
        '[ventas-tenant-isolation] Sin filas en `ventas`: omitido (crea una venta en POS para cubrir el caso).',
      );
      return;
    }
    const res = await request(app)
      .get(`/api/v1/ventas/${anyVentaId}`)
      .set('Authorization', `Bearer ${otherTenantToken}`);
    expect(res.status).toBe(404);
  });

  it('GET /ventas/resumen-hoy con otra org → 200 y cuerpo acotado', async () => {
    const res = await request(app)
      .get('/api/v1/ventas/resumen-hoy')
      .set('Authorization', `Bearer ${otherTenantToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(typeof res.body.data?.totalMonto).toBe('number');
    expect(typeof res.body.data?.totalTransacciones).toBe('number');
  });
});
