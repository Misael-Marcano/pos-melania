/**
 * Integración real: SQL Server + Redis + JWT.
 * Requiere `.env` con DB_* y REDIS_URL, BD migrada y seed (`npm run seed`) con usuarios demo.
 *
 * Ejecutar: desde `apps/backend` → `npm run test:integration`
 * Con Docker Compose: levantar `sqlserver` y `redis`, exponer 1433 y 6379.
 */
import request from 'supertest';
import app from '../../app';
import { AppDataSource, initDatabaseForTests } from '../../config/database';
import { redis } from '../../config/redis';

describe('Integración API (SQL Server + Redis)', () => {
  let adminToken: string;

  beforeAll(async () => {
    await initDatabaseForTests();
    await redis.connect();
    const login = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'admin@pos.com', password: 'Admin123!' });
    if (login.status !== 200 || !login.body?.data?.accessToken) {
      throw new Error(
        `Login seed admin falló: ${login.status} ${JSON.stringify(login.body)}`
      );
    }
    adminToken = login.body.data.accessToken;
  });

  afterAll(async () => {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
    try {
      await redis.quit();
    } catch {
      /* sin conexión previa */
    }
  });

  describe('auth + ventas', () => {
    it('GET /api/v1/auth/profile — con Bearer → 200', async () => {
      const res = await request(app)
        .get('/api/v1/auth/profile')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data?.email).toBe('admin@pos.com');
    });

    it('GET /api/v1/ventas — listado paginado', async () => {
      const res = await request(app)
        .get('/api/v1/ventas?page=1&limit=5')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.pagination?.total).toBeDefined();
    });

    it('si hay ventas: GET detalle + auditoría recibo', async () => {
      const list = await request(app)
        .get('/api/v1/ventas?page=1&limit=1')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(list.status).toBe(200);
      const first = list.body.data?.[0];
      if (!first?.id) {
        expect(list.body.pagination?.total).toBe(0);
        return;
      }

      const id = first.id as number;

      const det = await request(app)
        .get(`/api/v1/ventas/${id}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(det.status).toBe(200);
      expect(det.body.data?.id).toBe(id);

      const aud = await request(app)
        .post(`/api/v1/ventas/${id}/auditoria-recibo`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(aud.status).toBe(200);
      expect(aud.body.success).toBe(true);
    });
  });

  describe('saas context', () => {
    it('GET /api/v1/saas/context — tenant, limits y usage', async () => {
      const res = await request(app)
        .get('/api/v1/saas/context')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      const d = res.body.data;
      expect(d.tenant?.id).toBeDefined();
      expect(d.tenant?.planCode).toBeDefined();
      expect(d.limits?.code).toBeDefined();
      expect(typeof d.usage?.seats).toBe('number');
      expect(typeof d.usage?.tiendasActivas).toBe('number');
      expect(d.trial).toBeDefined();
      expect(typeof d.trial.active).toBe('boolean');
      expect(typeof d.trial.expired).toBe('boolean');
    });
  });

  describe('caja + resumenCaja', () => {
    it('abrir → resumen (sesión abierta) → cerrar → resumen (sesión cerrada)', async () => {
      const nombre = `INTEG-${Date.now()}`;
      const denom = { '1000': 1 } as Record<string, number>;

      const abrir = await request(app)
        .post('/api/v1/ventas/caja/abrir')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          cajaNombre:     nombre,
          denominaciones: denom,
          montoApertura:  1000,
        });
      expect(abrir.status).toBe(201);
      expect(abrir.body.success).toBe(true);
      const aperturaId = abrir.body.data?.id as number;
      expect(aperturaId).toBeDefined();
      expect(abrir.body.data.cajaNombre).toBe(nombre);

      const rAbierta = await request(app)
        .get(`/api/v1/ventas/caja/resumen/${aperturaId}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(rAbierta.status).toBe(200);
      const dAbierta = rAbierta.body.data;
      expect(dAbierta.cajaNombre).toBe(nombre);
      expect(typeof dAbierta.totalVentas).toBe('number');
      expect(Array.isArray(dAbierta.porMetodo)).toBe(true);
      expect(dAbierta).toHaveProperty('fechaCierrePeriodo');

      const cerrar = await request(app)
        .post('/api/v1/ventas/caja/cerrar')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          aperturaId,
          denominaciones: denom,
          montoCierre:    1000,
        });
      expect(cerrar.status).toBe(200);
      expect(cerrar.body.success).toBe(true);

      const rCerrada = await request(app)
        .get(`/api/v1/ventas/caja/resumen/${aperturaId}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(rCerrada.status).toBe(200);
      expect(rCerrada.body.data.cajaNombre).toBe(nombre);
      expect(typeof rCerrada.body.data.totalVentas).toBe('number');
    });
  });
});
