/**
 * Forma de GET /api/v1/tenants/panel (rol plataforma).
 * Requiere SQL Server + Redis + seed (plataforma@pos.com).
 */
import request from 'supertest';
import app from '../../app';
import { initDatabaseForTests } from '../../config/database';

const PLATAFORMA_EMAIL = 'plataforma@pos.com';
const PLATAFORMA_PASS = 'Plataforma123!';

describe('GET /api/v1/tenants/panel', () => {
  let token: string;

  beforeAll(async () => {
    await initDatabaseForTests();
    const login = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: PLATAFORMA_EMAIL, password: PLATAFORMA_PASS });
    if (login.status !== 200) {
      throw new Error(`Login plataforma falló: ${login.status} ${JSON.stringify(login.body)}`);
    }
    token = login.body.data.accessToken as string;
  });

  it('devuelve lista con usage, limits y ventasMesActual', async () => {
    const res = await request(app)
      .get('/api/v1/tenants/panel')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);

    if (res.body.data.length === 0) {
      console.warn('tenants-panel: sin filas en BD — omitiendo aserciones de fila');
      return;
    }

    const row = res.body.data[0];
    expect(row).toMatchObject({
      id: expect.any(Number),
      nombre: expect.any(String),
      slug: expect.any(String),
      activo: expect.any(Boolean),
      planCode: expect.any(String),
      planLabel: expect.any(String),
    });
    expect(row.usage).toMatchObject({
      seats: expect.any(Number),
      tiendasActivas: expect.any(Number),
      articulosActivos: expect.any(Number),
      ventasMesActual: expect.any(Number),
    });
    expect(row.usage.seats).toBeGreaterThanOrEqual(0);
    if (row.limits.maxUsers != null) {
      expect(row.usage.seats).toBeLessThanOrEqual(row.limits.maxUsers);
    }
  });
});
