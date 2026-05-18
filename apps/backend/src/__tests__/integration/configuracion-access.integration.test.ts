/**
 * Permisos y validación en configuración.
 * Ejecutar: `npm run test:integration` desde `apps/backend`
 */
import request from 'supertest';
import app from '../../app';
import { AppDataSource, initDatabaseForTests } from '../../config/database';
import { redis } from '../../config/redis';

const basePayload = {
  nombreCompania: 'Mi Negocio SRL',
  rnc: '132428668',
  simboloMoneda: 'RD$',
  numeroDecimales: 2,
  preciosIncluyenImpuesto: true,
  tasaImpuesto1: 18,
  tasaImpuesto2: 0,
  comprobanteDefecto: '02',
  nombreCaja: 'CAJA 1',
  zonaHoraria: 'America/Santo_Domingo',
};

describe('configuracion — permisos y validación', () => {
  let adminToken = '';
  let cajeroToken = '';

  beforeAll(async () => {
    await initDatabaseForTests();
    await redis.connect();

    const adminLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'admin@pos.com', password: 'Admin123!' });
    if (adminLogin.status !== 200 || !adminLogin.body?.data?.accessToken) {
      throw new Error(`Login admin falló: ${adminLogin.status}`);
    }
    adminToken = String(adminLogin.body.data.accessToken);

    const cajeroLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'cajero@pos.com', password: 'Cajero123!' });
    if (cajeroLogin.status !== 200 || !cajeroLogin.body?.data?.accessToken) {
      throw new Error(`Login cajero falló: ${cajeroLogin.status}`);
    }
    cajeroToken = String(cajeroLogin.body.data.accessToken);
  });

  afterAll(async () => {
    try {
      if (AppDataSource.isInitialized) await AppDataSource.destroy();
    } finally {
      try {
        await redis.quit();
      } catch {
        /* sin conexión previa */
      }
    }
  });

  it('PUT con RNC inválido → 400', async () => {
    const res = await request(app)
      .put('/api/v1/configuracion')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ ...basePayload, rnc: '12345' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('PUT como cajero (no admin) → 403', async () => {
    const res = await request(app)
      .put('/api/v1/configuracion')
      .set('Authorization', `Bearer ${cajeroToken}`)
      .send(basePayload);

    expect(res.status).toBe(403);
  });

  it('GET /configuracion/fiscal-status como admin → 200 con campos esperados', async () => {
    const res = await request(app)
      .get('/api/v1/configuracion/fiscal-status')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toMatchObject({
      ok: expect.any(Boolean),
      jurisdiccion: expect.any(String),
      rncConfigured: expect.any(Boolean),
      tasaItbis: expect.any(Number),
    });
  });
});
