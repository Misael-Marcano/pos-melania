/**
 * Panel `/tenants` es BY_DESIGN solo para rol `plataforma`. Un admin de organización
 * no debe listar ni ver métricas de otras organizaciones vía estas rutas → 403.
 *
 * Ejecutar: `npm run test:integration` desde `apps/backend`
 */
import request from 'supertest';
import app from '../../app';
import { AppDataSource, initDatabaseForTests } from '../../config/database';
import { redis } from '../../config/redis';

describe('tenants — panel plataforma no accesible como admin de tenant', () => {
  let token: string;

  beforeAll(async () => {
    await initDatabaseForTests();
    await redis.connect();

    const login = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'admin@pos.com', password: 'Admin123!' });
    if (login.status !== 200 || !login.body?.data?.accessToken) {
      throw new Error(`Login seed admin falló: ${login.status} ${JSON.stringify(login.body)}`);
    }
    token = String(login.body.data.accessToken);
  });

  afterAll(async () => {
    try {
      if (AppDataSource.isInitialized) {
        await AppDataSource.destroy();
      }
    } finally {
      try {
        await redis.quit();
      } catch {
        /* sin conexión previa */
      }
    }
  });

  it('GET /tenants con JWT admin (no plataforma) → 403', async () => {
    const res = await request(app).get('/api/v1/tenants').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  it('GET /tenants/panel con JWT admin (no plataforma) → 403', async () => {
    const res = await request(app)
      .get('/api/v1/tenants/panel')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });
});
